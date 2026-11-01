import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import { afterCursor } from '../../../../foundation/pagination/cursor.js';
import type { PageRequest } from '../../../../foundation/pagination/page-request.js';
import { type Page, toPage } from '../../../../foundation/pagination/page.js';
import { Notice, type NotificationState } from './notice.js';
import type { NoticeText } from './notice-text.js';
import type { NoticeTitle } from './notice-title.js';

const noticeColumns = {
  id: true,
  clubId: true,
  categoryId: true,
  subcategoryId: true,
  authorUserId: true,
  title: true,
  body: true,
  pinned: true,
  notificationState: true,
  createdAt: true,
} as const;

type NoticeRow = {
  id: string;
  clubId: string;
  categoryId: string;
  subcategoryId: string | null;
  authorUserId: string | null;
  title: string;
  body: string;
  pinned: boolean;
  notificationState: string;
  createdAt: Date;
};

export interface NoticeFilter {
  readonly categoryId?: Id<'NoticeCategory'>;
  readonly subcategoryId?: Id<'Subcategory'>;
  /** Only the ones the member read (true) or did not (false). */
  readonly read?: boolean;
}

export interface NoticeDraft {
  readonly categoryId: Id<'NoticeCategory'>;
  readonly subcategoryId: Id<'Subcategory'> | null;
  readonly title: NoticeTitle;
  readonly body: NoticeText;
  readonly pinned: boolean;
}

export interface NoticeChanges {
  readonly categoryId?: Id<'NoticeCategory'>;
  readonly subcategoryId?: Id<'Subcategory'> | null;
  readonly title?: NoticeTitle;
  readonly body?: NoticeText;
  readonly pinned?: boolean;
}

/** Pinned first, newest first in each group (N-04). */
const pinnedFirst = [
  { pinned: 'desc' },
  { createdAt: 'desc' },
  { id: 'desc' },
] as const;

/** Notices of a club, each read as one member sees it (`memberId` gives `read`). */
@Injectable()
export class NoticeRepository {
  constructor(private readonly database: DatabaseClient) {}

  async list(
    clubId: Id<'Club'>,
    memberId: Id<'Member'>,
    filter: NoticeFilter,
    page: PageRequest,
    query: string,
  ): Promise<Page<Notice>> {
    const rows = await this.database.clubNotice.findMany({
      where: {
        AND: [
          this.matching(clubId, memberId, filter),
          afterCursor(page.after, 'pinned'),
        ],
      },
      select: { ...noticeColumns, reads: readBy(memberId) },
      orderBy: [...pinnedFirst],
      take: page.size + 1,
    });
    return toPage(
      query,
      page,
      rows.map((row) => ({ ...row, leadingKey: row.pinned })),
      toNotice,
    );
  }

  async count(
    clubId: Id<'Club'>,
    memberId: Id<'Member'>,
    filter: NoticeFilter,
  ): Promise<number> {
    return this.database.clubNotice.count({
      where: this.matching(clubId, memberId, filter),
    });
  }

  async find(
    clubId: Id<'Club'>,
    id: Id<'Notice'>,
    memberId: Id<'Member'>,
  ): Promise<Notice | null> {
    const row = await this.database.clubNotice.findFirst({
      where: { id, clubId },
      select: { ...noticeColumns, reads: readBy(memberId) },
    });
    return row ? toNotice(row) : null;
  }

  async create(
    clubId: Id<'Club'>,
    authorUserId: Id<'User'>,
    draft: NoticeDraft,
    notificationState: NotificationState,
  ): Promise<Notice> {
    const row = await this.database.clubNotice.create({
      data: {
        clubId,
        authorUserId,
        categoryId: draft.categoryId,
        subcategoryId: draft.subcategoryId,
        title: draft.title.value,
        body: draft.body.value,
        pinned: draft.pinned,
        notificationState,
      },
      select: noticeColumns,
    });
    return toNotice({ ...row, reads: [] });
  }

  /** Null: no such notice in the club. Editing never notifies again (N-16). */
  async update(
    clubId: Id<'Club'>,
    id: Id<'Notice'>,
    memberId: Id<'Member'>,
    changes: NoticeChanges,
  ): Promise<Notice | null> {
    const { count } = await this.database.clubNotice.updateMany({
      where: { id, clubId },
      data: {
        ...(changes.categoryId !== undefined
          ? { categoryId: changes.categoryId }
          : {}),
        ...(changes.subcategoryId !== undefined
          ? { subcategoryId: changes.subcategoryId }
          : {}),
        ...(changes.title ? { title: changes.title.value } : {}),
        ...(changes.body ? { body: changes.body.value } : {}),
        ...(changes.pinned !== undefined ? { pinned: changes.pinned } : {}),
      },
    });
    return count === 0 ? null : this.find(clubId, id, memberId);
  }

  async delete(clubId: Id<'Club'>, id: Id<'Notice'>): Promise<boolean> {
    const { count } = await this.database.clubNotice.deleteMany({
      where: { id, clubId },
    });
    return count > 0;
  }

  /** Marks it read by the member (N-07). False: no such notice in the club. */
  async markRead(
    clubId: Id<'Club'>,
    id: Id<'Notice'>,
    memberId: Id<'Member'>,
  ): Promise<boolean> {
    const notice = await this.database.clubNotice.findFirst({
      where: { id, clubId },
      select: { id: true },
    });
    if (!notice) return false;
    await this.database.clubNoticeRead.upsert({
      where: { noticeId_memberId: { noticeId: id, memberId } },
      create: { noticeId: id, memberId },
      update: {},
    });
    return true;
  }

  /**
   * Takes the oldest pending notice no one else holds (`FOR UPDATE SKIP LOCKED`), lets `send` deliver it, and records
   * the state it returns, all in one transaction, so two servers never send the same notice. False: none was pending.
   */
  async sendNextPending(
    send: (notice: Notice) => Promise<NotificationState>,
  ): Promise<boolean> {
    return this.database.$transaction(
      async (tx) => {
        const [next] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM club_notices WHERE notification_state = 'PENDING'
          ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`;
        if (!next) return false;
        const row = await tx.clubNotice.findUniqueOrThrow({
          where: { id: next.id },
          select: noticeColumns,
        });
        const to = await send(toNotice({ ...row, reads: [] }));
        if (!Notice.canMove('PENDING', to))
          throw new Error(`notification cannot go from PENDING to ${to}`);
        await tx.clubNotice.update({
          where: { id: row.id },
          data: { notificationState: to },
        });
        return true;
      },
      { timeout: 60_000 },
    );
  }

  private matching(
    clubId: Id<'Club'>,
    memberId: Id<'Member'>,
    filter: NoticeFilter,
  ) {
    return {
      clubId,
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.subcategoryId ? { subcategoryId: filter.subcategoryId } : {}),
      ...(filter.read === true ? { reads: { some: { memberId } } } : {}),
      ...(filter.read === false ? { reads: { none: { memberId } } } : {}),
    };
  }
}

function readBy(memberId: Id<'Member'>) {
  return { where: { memberId }, select: { memberId: true } } as const;
}

function toNotice(row: NoticeRow & { reads: readonly unknown[] }): Notice {
  return new Notice(
    asId<'Notice'>(row.id),
    asId<'Club'>(row.clubId),
    asId<'NoticeCategory'>(row.categoryId),
    asId<'Subcategory'>(row.subcategoryId),
    asId<'User'>(row.authorUserId),
    row.title,
    row.body,
    row.pinned,
    row.notificationState as NotificationState,
    row.createdAt,
    row.reads.length > 0,
  );
}
