import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '../../../domains/account/users/user.js';
import { UserRepository } from '../../../domains/account/users/user.repository.js';
import type {
  Application,
  ApplicationState,
} from '../../../domains/club/clubs/applications/application.js';
import { decidedMessage } from '../../../domains/club/clubs/applications/application-messages.js';
import { ApplicationRepository } from '../../../domains/club/clubs/applications/application.repository.js';
import { MemberRepository } from '../../../domains/club/clubs/members/member.repository.js';
import { RoleRepository } from '../../../domains/club/roles/role.repository.js';
import { RequireClubAccess } from '../../../domains/club/clubs/access/club-access.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import {
  type Page,
  pageBody,
  pageRequest,
} from '../../../foundation/pagination/page.js';
import { BadRequest } from '../../../foundation/problem/problems/bad-request.js';
import { Conflict } from '../../../foundation/problem/problems/conflict.js';
import { Forbidden } from '../../../foundation/problem/problems/forbidden.js';
import { NotFound } from '../../../foundation/problem/problems/not-found.js';
import { PushSender } from '../../../foundation/push/push-sender.js';
import { requireMe } from '../../me.js';

type ApplicationBody = components['schemas']['Application'];
type ApplicationPageBody = components['schemas']['ApplicationPage'];
type ApplicationCreateBody = components['schemas']['ApplicationCreate'];
type ApplicationDecisionBody = components['schemas']['ApplicationDecision'];

@Controller('clubs')
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationRepository,
    private readonly roles: RoleRepository,
    private readonly users: UserRepository,
    private readonly members: MemberRepository,
    private readonly push: PushSender,
  ) {}

  /** listApplications across clubs: the caller's own (`/clubs/-/applications?userId=me`). */
  @Get('-/applications')
  async listMine(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('userId') userId: string | undefined,
    @Query('pageSize') pageSize: number,
    @Query('pageToken') pageToken?: string,
  ): Promise<ApplicationPageBody> {
    requireMe(userId);
    const query = `applications:user:${caller.id}`;
    const page = await this.applications.listForUser(
      caller.id,
      pageRequest(query, pageSize, pageToken),
      query,
    );
    return this.toPageBody(page);
  }

  /** createApplication */
  @Post(':clubId/applications')
  async create(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('clubId') clubId: string,
    @Body() body: ApplicationCreateBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApplicationBody> {
    if (clubId === '-')
      throw new BadRequest([
        { field: '/params/clubId', message: 'apply to one club' },
      ]);
    const result = await this.applications.create(
      clubId,
      caller.id,
      body.partId,
    );
    if (result === null) throw new NotFound('club not found');
    if (result === 'no-part')
      throw new BadRequest([
        { field: '/body/partId', message: 'not a part of this club' },
      ]);
    if (result === 'already-member') throw new Conflict('already-member');
    if (result === 'pending') throw new Conflict('application-pending');
    response.status(201).location(`/clubs/${clubId}/applications/${result.id}`);
    return this.toBody(result);
  }

  /** listApplications of one club (the waiting list). */
  @Get(':clubId/applications')
  @RequireClubAccess('applications.decide')
  async list(
    @Param('clubId') clubId: string,
    @Query('state') state: ApplicationState | undefined,
    @Query('pageSize') pageSize: number,
    @Query('pageToken') pageToken?: string,
  ): Promise<ApplicationPageBody> {
    const query = `applications:club:${clubId}:${state ?? ''}`;
    const page = await this.applications.listForClub(
      clubId,
      state,
      pageRequest(query, pageSize, pageToken),
      query,
    );
    return this.toPageBody(page);
  }

  /** getApplication: the applicant, or someone who decides applications. */
  @Get(':clubId/applications/:applicationId')
  async get(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('clubId') clubId: string,
    @Param('applicationId') applicationId: string,
  ): Promise<ApplicationBody> {
    const application = await this.applications.find(clubId, applicationId);
    if (!application || !(await this.canSee(caller, application)))
      throw new NotFound('application not found');
    return this.toBody(application);
  }

  /** decideApplication */
  @Patch(':clubId/applications/:applicationId')
  @RequireClubAccess('applications.decide')
  async decide(
    @Param('clubId') clubId: string,
    @Param('applicationId') applicationId: string,
    @Body() body: ApplicationDecisionBody,
  ): Promise<ApplicationBody> {
    const joinRole = await this.roles.assignedOnJoin();
    const result = await this.applications.decide(
      clubId,
      applicationId,
      body.state,
      joinRole.id,
    );
    if (result === null) throw new NotFound('application not found');
    if (result === 'not-pending') throw new Conflict('not-pending');
    if (result === 'already-member') throw new Conflict('already-member');
    await this.push.send(decidedMessage(result));
    return this.toBody(result);
  }

  /** cancelApplication: only the applicant, only while pending. */
  @Delete(':clubId/applications/:applicationId')
  @HttpCode(204)
  async cancel(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('clubId') clubId: string,
    @Param('applicationId') applicationId: string,
  ): Promise<void> {
    const application = await this.applications.find(clubId, applicationId);
    if (!application || !(await this.canSee(caller, application)))
      throw new NotFound('application not found');
    if (application.userId !== caller.id)
      throw new Forbidden('only the applicant can cancel');
    const result = await this.applications.cancel(clubId, applicationId);
    if (result === null) throw new NotFound('application not found');
    if (result === 'not-pending') throw new Conflict('not-pending');
  }

  private async canSee(
    caller: AuthenticatedUser,
    application: Application,
  ): Promise<boolean> {
    if (application.userId === caller.id) return true;
    const access = await this.members.permissionsOf(
      caller.id,
      application.clubId,
    );
    return access?.permissions.has('applications.decide') ?? false;
  }

  private async toBody(application: Application): Promise<ApplicationBody> {
    const users = await this.users.findMany([application.userId]);
    return toBody(application, users.get(application.userId));
  }

  private async toPageBody(
    page: Page<Application>,
  ): Promise<ApplicationPageBody> {
    const users = await this.users.findMany(
      page.items.map((item) => item.userId),
    );
    return pageBody(page, (item) => toBody(item, users.get(item.userId)));
  }
}

function toBody(
  application: Application,
  user: User | undefined,
): ApplicationBody {
  return {
    id: application.id,
    clubId: application.clubId,
    userId: application.userId,
    nickname: user?.nickname.value ?? '',
    email: user?.email ?? '',
    partId: application.partId,
    state: application.state,
    ...(application.decidedAt
      ? { decidedAt: application.decidedAt.toISOString() }
      : {}),
    createdAt: application.createdAt.toISOString(),
  };
}
