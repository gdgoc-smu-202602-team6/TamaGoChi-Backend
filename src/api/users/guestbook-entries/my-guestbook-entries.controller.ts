import { Controller, Get, Query } from '@nestjs/common';
import { GuestbookRepository } from '../../../domains/game/guestbook/guestbook.repository.js';
import { RoomRepository } from '../../../domains/game/room/room.repository.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { pageRequest } from '../../../foundation/pagination/page.js';
import { toGuestbookEntryBody } from './guestbook-entry-body.js';

type GuestbookEntryPageBody = components['schemas']['GuestbookEntryPage'];

@Controller('users/me/guestbookEntries')
export class MyGuestbookEntriesController {
  constructor(
    private readonly guestbook: GuestbookRepository,
    private readonly rooms: RoomRepository,
  ) {}

  /** listMyGuestbookEntries: every club's entries in my room, newest first, new ones marked (M-20, M-23). */
  @Get()
  async list(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('pageSize') pageSize?: string,
    @Query('pageToken') pageToken?: string,
  ): Promise<GuestbookEntryPageBody> {
    const query = `guestbook:${caller.id}`;
    const [page, checkedAt] = await Promise.all([
      this.guestbook.list(
        caller.id,
        undefined,
        pageRequest(query, pageSize, pageToken),
        query,
      ),
      this.rooms.guestbookCheckedAt(caller.id),
    ]);
    return {
      items: page.items.map((entry) => toGuestbookEntryBody(entry, checkedAt)),
      ...(page.nextPageToken ? { nextPageToken: page.nextPageToken } : {}),
    };
  }
}
