import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Club } from '../../domains/club/club/club.js';
import { ClubName } from '../../domains/club/club/club-name.js';
import { ClubRepository } from '../../domains/club/club/club.repository.js';
import { InviteCode } from '../../domains/club/club/invite-code.js';
import { Label } from '../../domains/club/label/label.js';
import { RoleRepository } from '../../domains/club/role/role.repository.js';
import type { ClubAccess } from '../../domains/club/clubs/access/club-access.js';
import {
  CurrentClubAccess,
  RequireClubAccess,
} from '../../domains/club/clubs/access/club-access.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../foundation/auth/authenticated-user.js';
import type { components } from '../../foundation/contract/openapi.js';
import { parseField } from '../../foundation/problem/parse-field.js';
import { BadRequest } from '../../foundation/problem/problems/bad-request.js';
import { NotFound } from '../../foundation/problem/problems/not-found.js';
import { PreconditionFailed } from '../../foundation/problem/problems/precondition-failed.js';

type ClubBody = components['schemas']['Club'];
type ClubPreviewBody = components['schemas']['ClubPreview'];
type ClubCreateBody = components['schemas']['ClubCreate'];
type ClubUpdateBody = components['schemas']['ClubUpdate'];

@Controller('clubs')
export class ClubsController {
  constructor(
    private readonly clubs: ClubRepository,
    private readonly roles: RoleRepository,
  ) {}

  /** createClub */
  @Post()
  async create(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() body: ClubCreateBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClubBody> {
    const name = parseField('/body/name', () => ClubName.parse(body.name));
    const parts = body.parts.map((part, index) => ({
      name: parseField(`/body/parts/${index}/name`, () =>
        Label.parse(part.name),
      ),
      color: part.color,
    }));
    const names = parts.map((part) => part.name.value);
    if (new Set(names).size !== names.length) {
      throw new BadRequest([
        { field: '/body/parts', message: 'part names must be unique' },
      ]);
    }
    const creatorPartName = parseField('/body/myPartName', () =>
      Label.parse(body.myPartName),
    );
    if (!names.includes(creatorPartName.value)) {
      throw new BadRequest([
        { field: '/body/myPartName', message: 'must be one of parts' },
      ]);
    }

    const club = await this.clubs.create({
      name,
      parts,
      creatorUserId: caller.id,
      creatorPartName,
      creatorRoleId: (await this.roles.assignedOnCreate()).id,
    });
    response
      .status(201)
      .location(`/clubs/${club.id}`)
      .setHeader('ETag', club.etag);
    return toBody(club, true);
  }

  /** findClubByInviteCode */
  @Get()
  async findByInviteCode(
    @Query('inviteCode') inviteCode: string,
  ): Promise<{ items: ClubPreviewBody[] }> {
    const found = await this.clubs.findByInviteCode(
      InviteCode.parse(inviteCode),
    );
    if (!found) return { items: [] };
    return {
      items: [
        {
          id: found.club.id,
          name: found.club.name.value,
          memberCount: found.club.memberCount,
          parts: found.parts.map((part) => ({
            id: part.id,
            name: part.name.value,
            color: part.color,
          })),
        },
      ],
    };
  }

  /** getClub */
  @Get(':clubId')
  @RequireClubAccess()
  async get(
    @Param('clubId') clubId: string,
    @CurrentClubAccess() access: ClubAccess,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClubBody> {
    const club = found(await this.clubs.find(clubId));
    response.setHeader('ETag', club.etag);
    return toBody(club, access.permissions.has('club.update'));
  }

  /** updateClub */
  @Patch(':clubId')
  @RequireClubAccess('club.update')
  async update(
    @Param('clubId') clubId: string,
    @Body() body: ClubUpdateBody,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClubBody> {
    const current = found(await this.clubs.find(clubId));
    const expectedRevision = revisionFrom(ifMatch);
    if (
      expectedRevision !== undefined &&
      expectedRevision !== current.revision
    ) {
      throw new PreconditionFailed('the club changed since it was read');
    }
    const input = body.name;
    const name =
      input === undefined
        ? current.name
        : parseField('/body/name', () => ClubName.parse(input));
    const result = await this.clubs.rename(
      clubId,
      name,
      expectedRevision ?? current.revision,
    );
    if (result === 'stale')
      throw new PreconditionFailed('the club changed since it was read');
    const club = found(result);
    response.setHeader('ETag', club.etag);
    return toBody(club, true);
  }

  /** regenerateInviteCode */
  @Post(':clubId\\:regenerateInviteCode')
  @RequireClubAccess('club.update')
  async regenerateInviteCode(
    @Param('clubId') clubId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClubBody> {
    const club = found(await this.clubs.regenerateInviteCode(clubId));
    response.status(200).setHeader('ETag', club.etag);
    return toBody(club, true);
  }
}

function found(club: Club | null): Club {
  if (!club) throw new NotFound('club not found');
  return club;
}

function toBody(club: Club, withInviteCode: boolean): ClubBody {
  return {
    id: club.id,
    name: club.name.value,
    memberCount: club.memberCount,
    ...(withInviteCode ? { inviteCode: club.inviteCode.value } : {}),
    createdAt: club.createdAt.toISOString(),
  };
}

/** A strong ETag `"<revision>"`; `*` and absent mean no condition. Anything else can never match. */
function revisionFrom(ifMatch: string | undefined): number | undefined {
  if (ifMatch === undefined || ifMatch.trim() === '*') return undefined;
  const match = /^"(\d+)"$/.exec(ifMatch.trim());
  return match ? Number(match[1]) : -1;
}
