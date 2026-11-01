import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import type { User } from '../../../domains/account/users/user.js';
import { UserRepository } from '../../../domains/account/users/user.repository.js';
import {
  Member,
  type MemberChanges,
  type MemberRefusal,
} from '../../../domains/club/clubs/members/member.js';
import { MemberRepository } from '../../../domains/club/clubs/members/member.repository.js';
import type { ClubAccess } from '../../../domains/club/clubs/access/club-access.js';
import {
  CurrentClubAccess,
  RequireClubAccess,
} from '../../../domains/club/clubs/access/club-access.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { Permission } from '../../../domains/club/clubs/access/permission.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { asId, type Id } from '../../../foundation/id/id.js';
import { pageRequest } from '../../../foundation/pagination/page-request.js';
import { type Page, pageBody } from '../../../foundation/pagination/page.js';
import { BadRequest } from '../../../foundation/problem/problems/bad-request.js';
import { Conflict } from '../../../foundation/problem/problems/conflict.js';
import { Forbidden } from '../../../foundation/problem/problems/forbidden.js';
import { NotFound } from '../../../foundation/problem/problems/not-found.js';
import { requireMe, resolveMe } from '../../me.js';

type MemberBody = components['schemas']['Member'];
type MemberPageBody = components['schemas']['MemberPage'];
type MemberUpdateBody = components['schemas']['MemberUpdate'];

@Controller('clubs')
export class MembersController {
  constructor(
    private readonly members: MemberRepository,
    private readonly users: UserRepository,
  ) {}

  /** listMembers across clubs: the caller's own memberships (`/clubs/-/members?userId=me`). */
  @Get('-/members')
  async listMine(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('userId') userId: string | undefined,
    @Query('pageSize') pageSize: number,
    @Query('pageToken') pageToken?: string,
  ): Promise<MemberPageBody> {
    requireMe(userId);
    const query = `members:user:${caller.id}`;
    const page = await this.members.listForUser(
      caller.id,
      pageRequest(query, pageSize, pageToken),
      query,
    );
    return this.toPageBody(page, caller);
  }

  /** listMembers of one club. */
  @Get(':clubId/members')
  @RequireClubAccess()
  async list(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('clubId') clubId: Id<'Club'>,
    @Query('partId') partId: Id<'Part'> | undefined,
    @Query('pageSize') pageSize: number,
    @Query('pageToken') pageToken?: string,
  ): Promise<MemberPageBody> {
    const query = `members:club:${clubId}:${partId ?? ''}`;
    const page = await this.members.list(
      clubId,
      partId,
      pageRequest(query, pageSize, pageToken),
      query,
    );
    return this.toPageBody(page, caller);
  }

  /** getMyPermissions */
  @Get(':clubId/members/me/permissions')
  @RequireClubAccess()
  getMyPermissions(@CurrentClubAccess() access: ClubAccess): {
    items: Permission[];
  } {
    return { items: [...access.permissions] };
  }

  /** getMember */
  @Get(':clubId/members/:memberId')
  @RequireClubAccess()
  async get(
    @CurrentUser() caller: AuthenticatedUser,
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: Id<'Club'>,
    @Param('memberId') memberId: string,
  ): Promise<MemberBody> {
    const member = await this.members.find(
      clubId,
      resolveMe(memberId, access.memberId),
    );
    if (!member) throw new NotFound('member not found');
    return this.toBody(member, caller);
  }

  /** updateMember: who may change which field is Member.changeRefusal. */
  @Patch(':clubId/members/:memberId')
  @RequireClubAccess()
  async update(
    @CurrentUser() caller: AuthenticatedUser,
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: Id<'Club'>,
    @Param('memberId') memberId: string,
    @Body() body: MemberUpdateBody,
  ): Promise<MemberBody> {
    const targetId = resolveMe(memberId, access.memberId);
    const changes: MemberChanges = {
      partId: asId<'Part'>(body.partId),
      roleId: asId<'Role'>(body.roleId),
      notificationsOn: body.notificationsOn,
    };
    const refusal = Member.changeRefusal(access, targetId, changes);
    if (refusal) throw forbidden(refusal);
    const result = await this.members.update(clubId, targetId, changes);
    if (result === null) throw new NotFound('member not found');
    if (result === 'no-part')
      throw new BadRequest([
        { field: '/body/partId', message: 'not a part of this club' },
      ]);
    if (result === 'no-role')
      throw new BadRequest([
        { field: '/body/roleId', message: 'no such role' },
      ]);
    if (result === 'last-manager') throw new Conflict('last-manager');
    return this.toBody(result, caller);
  }

  /** removeMember: `me` leaves; who may remove someone is Member.removalRefusal. */
  @Delete(':clubId/members/:memberId')
  @RequireClubAccess()
  @HttpCode(204)
  async remove(
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: Id<'Club'>,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    const targetId = resolveMe(memberId, access.memberId);
    const refusal = Member.removalRefusal(access, targetId);
    if (refusal) throw forbidden(refusal);
    const result = await this.members.remove(clubId, targetId);
    if (result === null) throw new NotFound('member not found');
    if (result === 'last-manager') throw new Conflict('last-manager');
  }

  private async toBody(
    member: Member,
    caller: AuthenticatedUser,
  ): Promise<MemberBody> {
    const users = await this.users.findMany([member.userId]);
    return toBody(member, users.get(member.userId), caller);
  }

  private async toPageBody(
    page: Page<Member>,
    caller: AuthenticatedUser,
  ): Promise<MemberPageBody> {
    const users = await this.users.findMany(
      page.items.map((item) => item.userId),
    );
    return pageBody(page, (item) =>
      toBody(item, users.get(item.userId), caller),
    );
  }
}

function forbidden(refusal: MemberRefusal): Forbidden {
  return new Forbidden(
    refusal === 'not-own'
      ? 'only the member changes their part and notifications'
      : 'requires members.manage',
  );
}

function toBody(
  member: Member,
  user: User | undefined,
  caller: AuthenticatedUser,
): MemberBody {
  return {
    id: member.id,
    clubId: member.clubId,
    userId: member.userId,
    nickname: user?.nickname.value ?? '',
    partId: member.partId,
    roleId: member.roleId,
    joinedAt: member.joinedAt.toISOString(),
    ...(member.userId === caller.id
      ? { notificationsOn: member.notificationsOn }
      : {}),
  };
}
