import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { orOnUniqueViolation } from '../../../../foundation/database/database-errors.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import { newestFirstPage } from '../../../../foundation/pagination/newest-first-page.js';
import type { PageRequest } from '../../../../foundation/pagination/page-request.js';
import type { Page } from '../../../../foundation/pagination/page.js';
import { lockPlayer } from '../../lock/player-lock.js';
import { type SessionState, StudySession } from './study-session.js';
import type { QueryClient } from '../../../../foundation/database/query-client.js';

const sessionColumns = {
  id: true,
  userId: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
} as const;

type SessionRow = {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class StudySessionRepository {
  constructor(private readonly database: DatabaseClient) {}

  /**
   * Starts a session at `now`. A session left running past its 12-hour mark is ended at the mark first.
   * 'running': the user has a session running.
   */
  async start(
    userId: Id<'User'>,
    now: Date,
  ): Promise<StudySession | 'running'> {
    return orOnUniqueViolation(
      () =>
        this.database.$transaction(async (tx) => {
          await lockPlayer(tx, userId);
          const open = await tx.userStudySession.findFirst({
            where: { userId, endedAt: null },
            select: sessionColumns,
          });
          if (open) {
            const session = toSession(open);
            if (session.state(now) === 'RUNNING') return 'running';
            await tx.userStudySession.update({
              where: { id: open.id },
              data: { endedAt: session.maxEndAt },
            });
          }
          return toSession(
            await tx.userStudySession.create({
              data: { userId, startedAt: now },
              select: sessionColumns,
            }),
          );
        }),
      'running',
    );
  }

  async find(
    userId: Id<'User'>,
    id: Id<'StudySession'>,
  ): Promise<StudySession | null> {
    const row = await this.database.userStudySession.findFirst({
      where: { id, userId },
      select: sessionColumns,
    });
    return row ? toSession(row) : null;
  }

  /** Every session of the user, oldest first. */
  async all(
    userId: Id<'User'>,
    client: QueryClient = this.database,
  ): Promise<StudySession[]> {
    const rows = await client.userStudySession.findMany({
      where: { userId },
      select: sessionColumns,
      orderBy: { startedAt: 'asc' },
    });
    return rows.map(toSession);
  }

  async list(
    userId: Id<'User'>,
    state: SessionState | undefined,
    now: Date,
    page: PageRequest,
  ): Promise<Page<StudySession>> {
    // StudySession.state as a query: RUNNING is not ended and started after the mark; ENDED is everything else.
    const running = {
      endedAt: null,
      startedAt: { gt: StudySession.markPassedBy(now) },
    };
    const byState =
      state === 'RUNNING' ? running : state === 'ENDED' ? { NOT: running } : {};
    return newestFirstPage(page, toSession, ({ after, ...window }) =>
      this.database.userStudySession.findMany({
        where: { userId, AND: [byState, after] },
        select: sessionColumns,
        ...window,
      }),
    );
  }

  /** Ends the session at the time `endTime` picks. 'ended': it was ended already. */
  async end(
    userId: Id<'User'>,
    id: Id<'StudySession'>,
    endTime: (session: StudySession) => Date,
  ): Promise<StudySession | 'ended' | null> {
    return this.database.$transaction(async (tx) => {
      await lockPlayer(tx, userId);
      const row = await tx.userStudySession.findFirst({
        where: { id, userId },
        select: sessionColumns,
      });
      if (!row) return null;
      if (row.endedAt) return 'ended';
      const session = toSession(row);
      return toSession(
        await tx.userStudySession.update({
          where: { id },
          data: { endedAt: endTime(session) },
          select: sessionColumns,
        }),
      );
    });
  }
}

function toSession(row: SessionRow): StudySession {
  return new StudySession(
    asId<'StudySession'>(row.id),
    asId<'User'>(row.userId),
    row.startedAt,
    row.endedAt,
  );
}
