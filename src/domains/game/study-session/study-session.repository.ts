import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import type { Prisma } from '../../../foundation/database/generated/client.js';
import { orOnUniqueViolation } from '../../../foundation/database/database-errors.js';
import { newestFirstPage } from '../../../foundation/pagination/newest-first-page.js';
import type { Page, PageRequest } from '../../../foundation/pagination/page.js';
import { lockPlayer } from '../lock/player-lock.js';
import { type SessionState, StudySession } from './study-session.js';

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
  async start(userId: string, now: Date): Promise<StudySession | 'running'> {
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

  async find(userId: string, id: string): Promise<StudySession | null> {
    const row = await this.database.userStudySession.findFirst({
      where: { id, userId },
      select: sessionColumns,
    });
    return row ? toSession(row) : null;
  }

  /** Every session of the user, oldest first. */
  async all(
    userId: string,
    client: DatabaseClient | Prisma.TransactionClient = this.database,
  ): Promise<StudySession[]> {
    const rows = await client.userStudySession.findMany({
      where: { userId },
      select: sessionColumns,
      orderBy: { startedAt: 'asc' },
    });
    return rows.map(toSession);
  }

  async list(
    userId: string,
    state: SessionState | undefined,
    now: Date,
    page: PageRequest,
    query: string,
  ): Promise<Page<StudySession>> {
    const markPassed = StudySession.markPassedBy(now);
    const byState =
      state === 'RUNNING'
        ? { endedAt: null, startedAt: { gt: markPassed } }
        : state === 'ENDED'
          ? {
              OR: [
                { endedAt: { not: null } },
                { startedAt: { lte: markPassed } },
              ],
            }
          : {};
    return newestFirstPage(query, page, toSession, ({ after, ...window }) =>
      this.database.userStudySession.findMany({
        where: { userId, AND: [byState, after] },
        select: sessionColumns,
        ...window,
      }),
    );
  }

  /** Ends the session at the time `endTime` picks. 'ended': it was ended already. */
  async end(
    userId: string,
    id: string,
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
  return new StudySession(row.id, row.userId, row.startedAt, row.endedAt);
}
