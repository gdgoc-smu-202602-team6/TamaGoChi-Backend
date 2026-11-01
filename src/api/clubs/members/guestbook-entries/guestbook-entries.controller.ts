import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { MemberRepository } from '../../../../domains/club/clubs/members/member.repository.js';
import { GuestbookText } from '../../../../domains/game/users/guestbook-entries/guestbook-text.js';
import { GuestbookRepository } from '../../../../domains/game/users/guestbook-entries/guestbook.repository.js';
import { RoomRepository } from '../../../../domains/game/users/room/room.repository.js';
import type { ClubAccess } from '../../../../domains/club/clubs/access/club-access.js';
import {
  CurrentClubAccess,
  RequireClubAccess,
} from '../../../../domains/club/clubs/access/club-access.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../../foundation/contract/openapi.js';
import { pageRequest } from '../../../../foundation/pagination/page-request.js';
import { pageBody } from '../../../../foundation/pagination/page.js';
import { parseField } from '../../../../foundation/problem/parse-field.js';
import { BadRequest } from '../../../../foundation/problem/problems/bad-request.js';
import { Forbidden } from '../../../../foundation/problem/problems/forbidden.js';
import { NotFound } from '../../../../foundation/problem/problems/not-found.js';
import {
  type GuestbookEntryBody,
  toGuestbookEntryBody,
} from './guestbook-entry-body.js';
import { resolveMe } from '../../../me.js';

type GuestbookEntryPageBody = components['schemas']['GuestbookEntryPage'];
type GuestbookEntryCreateBody = components['schemas']['GuestbookEntryCreate'];

/** A member's guestbook as seen in one club: only what was written in this club (9.2). */
@Controller('clubs/:clubId/members/:memberId/guestbookEntries')
export class GuestbookEntriesController {
  constructor(
    private readonly members: MemberRepository,
    private readonly guestbook: GuestbookRepository,
    private readonly rooms: RoomRepository,
  ) {}

  /** listGuestbookEntries */
  @Get()
  @RequireClubAccess()
  async list(
    @CurrentUser() caller: AuthenticatedUser,
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: string,
    @Param('memberId') memberId: string,
    @Query('pageSize') pageSize: number,
    @Query('pageToken') pageToken?: string,
  ): Promise<GuestbookEntryPageBody> {
    const ownerId = await this.ownerOf(clubId, memberId, access);
    const query = `guestbook:${ownerId}:${clubId}`;
    const page = await this.guestbook.list(
      ownerId,
      clubId,
      pageRequest(query, pageSize, pageToken),
      query,
    );
    const checkedAt =
      ownerId === caller.id
        ? await this.rooms.guestbookCheckedAt(ownerId)
        : undefined;
    return pageBody(page, (entry) => toGuestbookEntryBody(entry, checkedAt));
  }

  /** createGuestbookEntry: by the caller, in this club; not in one's own room (9.2). */
  @Post()
  @RequireClubAccess()
  async create(
    @CurrentUser() caller: AuthenticatedUser,
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: string,
    @Param('memberId') memberId: string,
    @Body() body: GuestbookEntryCreateBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GuestbookEntryBody> {
    const ownerId = await this.ownerOf(clubId, memberId, access);
    const text = parseField('/body/body', () => GuestbookText.parse(body.body));
    const entry = await this.guestbook.write(ownerId, clubId, caller.id, text);
    if (entry === 'own-room')
      throw new BadRequest([
        { field: '/params/memberId', message: 'not your own room' },
      ]);
    response
      .status(201)
      .location(
        `/clubs/${clubId}/members/${memberId}/guestbookEntries/${entry.id}`,
      );
    return toGuestbookEntryBody(entry);
  }

  /** deleteGuestbookEntry: its author or the room's owner. */
  @Delete(':entryId')
  @RequireClubAccess()
  @HttpCode(204)
  async delete(
    @CurrentUser() caller: AuthenticatedUser,
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: string,
    @Param('memberId') memberId: string,
    @Param('entryId') entryId: string,
  ): Promise<void> {
    const ownerId = await this.ownerOf(clubId, memberId, access);
    const entry = await this.guestbook.find(entryId);
    if (!entry || entry.userId !== ownerId || entry.clubId !== clubId)
      throw new NotFound('entry not found');
    if (!entry.mayBeDeletedBy(caller.id))
      throw new Forbidden('only its author or the room owner deletes it');
    await this.guestbook.delete(entryId);
  }

  /** The user whose room it is; `me` is the caller's membership. */
  private async ownerOf(
    clubId: string,
    memberId: string,
    access: ClubAccess,
  ): Promise<string> {
    const member = await this.members.find(
      clubId,
      resolveMe(memberId, access.memberId),
    );
    if (!member) throw new NotFound('member not found');
    return member.userId;
  }
}
