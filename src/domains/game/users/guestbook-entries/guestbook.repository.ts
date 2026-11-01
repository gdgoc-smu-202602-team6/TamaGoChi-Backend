import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
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
    userId: string,
    clubId: string | undefined,
    page: PageRequest,
    query: string,
  ): Promise<Page<GuestbookEntry>> {
    return newestFirstPage(query, page, toEntry, ({ after, ...window }) =>
      this.database.userGuestbookEntry.findMany({
        where: { userId, ...(clubId ? { clubId } : {}), ...after },
        select: entryColumns,
        ...window,
      }),
    );
  }

  /** The entry of `userId`'s room written in `clubId`; null when there is none such. */
  async find(
    id: string,
    userId: string,
    clubId: string,
  ): Promise<GuestbookEntry | null> {
    const row = await this.database.userGuestbookEntry.findFirst({
      where: { id, userId, clubId },
      select: entryColumns,
    });
    return row ? toEntry(row) : null;
  }

  /** Whether one may write it is GuestbookEntry.mayBeWritten, the caller's to check. */
  async write(
    userId: string,
    clubId: string,
    authorUserId: string,
    text: GuestbookText,
  ): Promise<GuestbookEntry> {
    return toEntry(
      await this.database.userGuestbookEntry.create({
        data: { userId, clubId, authorUserId, body: text.value },
        select: entryColumns,
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.userGuestbookEntry.deleteMany({ where: { id } });
  }

  /** Entries of the room written after `since` (all of them when null), for the owner's new-entry badge (H-16). */
  async countNew(userId: string, since: Date | null): Promise<number> {
    return this.database.userGuestbookEntry.count({
      where: { userId, ...(since ? { createdAt: { gt: since } } : {}) },
    });
  }
}

function toEntry(row: EntryRow): GuestbookEntry {
  return new GuestbookEntry(
    row.id,
    row.userId,
    row.clubId,
    row.authorUserId,
    row.body,
    row.createdAt,
  );
}
