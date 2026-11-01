import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import { newestFirstPage } from '../../../../foundation/pagination/newest-first-page.js';
import type { PageRequest } from '../../../../foundation/pagination/page-request.js';
import type { Page } from '../../../../foundation/pagination/page.js';
import { GuestbookEntry } from './guestbook-entry.js';
import type { GuestbookText } from './guestbook-text.js';

const entryColumns = {
  id: true,
  userId: true,
  clubId: true,
  authorUserId: true,
  body: true,
  createdAt: true,
} as const;

type EntryRow = {
  id: string;
  userId: string;
  clubId: string;
  authorUserId: string | null;
  body: string;
  createdAt: Date;
};

@Injectable()
export class GuestbookRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** The entries of a room; only those written in `clubId` when given. Newest first. */
  async list(
    ownerId: Id<'User'>,
    clubId: Id<'Club'> | undefined,
    page: PageRequest,
    query: string,
  ): Promise<Page<GuestbookEntry>> {
    return newestFirstPage(query, page, toEntry, ({ after, ...window }) =>
      this.database.userGuestbookEntry.findMany({
        where: { userId: ownerId, ...(clubId ? { clubId } : {}), ...after },
        select: entryColumns,
        ...window,
      }),
    );
  }

  /** The entry of `ownerId`'s room written in `clubId`; null when there is none such. */
  async find(
    id: Id<'GuestbookEntry'>,
    ownerId: Id<'User'>,
    clubId: Id<'Club'>,
  ): Promise<GuestbookEntry | null> {
    const row = await this.database.userGuestbookEntry.findFirst({
      where: { id, userId: ownerId, clubId },
      select: entryColumns,
    });
    return row ? toEntry(row) : null;
  }

  /** Whether one may write it is GuestbookEntry.mayBeWritten, the caller's to check. */
  async write(
    ownerId: Id<'User'>,
    clubId: Id<'Club'>,
    authorUserId: Id<'User'>,
    text: GuestbookText,
  ): Promise<GuestbookEntry> {
    return toEntry(
      await this.database.userGuestbookEntry.create({
        data: { userId: ownerId, clubId, authorUserId, body: text.value },
        select: entryColumns,
      }),
    );
  }

  async delete(id: Id<'GuestbookEntry'>): Promise<void> {
    await this.database.userGuestbookEntry.deleteMany({ where: { id } });
  }

  /** Entries of the room written after `since` (all of them when null), for the owner's new-entry badge (H-16). */
  async countNew(ownerId: Id<'User'>, since: Date | null): Promise<number> {
    return this.database.userGuestbookEntry.count({
      where: {
        userId: ownerId,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
    });
  }
}

function toEntry(row: EntryRow): GuestbookEntry {
  return new GuestbookEntry(
    asId<'GuestbookEntry'>(row.id),
    asId<'User'>(row.userId),
    asId<'Club'>(row.clubId),
    asId<'User'>(row.authorUserId),
    row.body,
    row.createdAt,
  );
}
