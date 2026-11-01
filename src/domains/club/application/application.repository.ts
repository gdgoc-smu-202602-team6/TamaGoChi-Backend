import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { orOnUniqueViolation } from '../../../foundation/database/database-errors.js';
import { newestFirstPage } from '../../../foundation/pagination/newest-first-page.js';
import type { Page, PageRequest } from '../../../foundation/pagination/page.js';
import {
  Application,
  type ApplicationState,
  type Decision,
} from './application.js';

const applicationColumns = {
  id: true,
  clubId: true,
  userId: true,
  partId: true,
  state: true,
  decidedAt: true,
  createdAt: true,
} as const;

type ApplicationRow = {
  id: string;
  clubId: string;
  userId: string;
  partId: string | null;
  state: string;
  decidedAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class ApplicationRepository {
  constructor(private readonly database: DatabaseClient) {}

  /**
   * Null: no such club. 'no-part': the part is not the club's. 'already-member', 'pending': the user is a member
   * already, or has a pending application.
   */
  async create(
    clubId: string,
    userId: string,
    partId: string,
  ): Promise<Application | 'no-part' | 'already-member' | 'pending' | null> {
    const club = await this.database.club.findUnique({
      where: { id: clubId },
      select: {
        parts: { where: { id: partId }, select: { id: true } },
        members: { where: { userId }, select: { id: true } },
      },
    });
    if (!club) return null;
    if (club.parts.length === 0) return 'no-part';
    if (club.members.length > 0) return 'already-member';
    return orOnUniqueViolation(async () => {
      return toApplication(
        await this.database.clubApplication.create({
          data: { clubId, userId, partId },
          select: applicationColumns,
        }),
      );
    }, 'pending');
  }

  async find(clubId: string, id: string): Promise<Application | null> {
    const row = await this.database.clubApplication.findFirst({
      where: { id, clubId },
      select: applicationColumns,
    });
    return row ? toApplication(row) : null;
  }

  async listForClub(
    clubId: string,
    state: ApplicationState | undefined,
    page: PageRequest,
    query: string,
  ): Promise<Page<Application>> {
    return newestFirstPage(query, page, toApplication, ({ after, ...window }) =>
      this.database.clubApplication.findMany({
        where: { clubId, ...(state ? { state } : {}), ...after },
        select: applicationColumns,
        ...window,
      }),
    );
  }

  /**
   * Every moment an application of the user was approved, in clubs left since included (B-16: that day has no
   * absence penalty). An application outlives the membership it made, so leaving or being removed from a club keeps
   * the day; creating a club approves nothing, so that day is not one.
   */
  async joinedAt(userId: string): Promise<readonly Date[]> {
    const rows = await this.database.clubApplication.findMany({
      where: { userId, state: 'APPROVED' },
      select: { decidedAt: true },
    });
    return rows.flatMap((row) => (row.decidedAt ? [row.decidedAt] : []));
  }

  /** The applicant's own list: rejected ones only while still shown (Application.rejectedShownSince). */
  async listForUser(
    userId: string,
    page: PageRequest,
    query: string,
  ): Promise<Page<Application>> {
    return newestFirstPage(query, page, toApplication, ({ after, ...window }) =>
      this.database.clubApplication.findMany({
        where: {
          userId,
          AND: [
            {
              OR: [
                { state: { not: 'REJECTED' } },
                {
                  decidedAt: { gt: Application.rejectedShownSince(new Date()) },
                },
              ],
            },
            after,
          ],
        },
        select: applicationColumns,
        ...window,
      }),
    );
  }

  /**
   * Decides a pending application. Approving makes the applicant a member with `joinRoleId` in the same
   * transaction. 'not-pending': already decided. 'already-member': the applicant joined meanwhile.
   */
  async decide(
    clubId: string,
    id: string,
    decision: Decision,
    joinRoleId: string,
  ): Promise<Application | 'not-pending' | 'already-member' | null> {
    return orOnUniqueViolation(
      () =>
        this.database.$transaction(async (tx) => {
          const { count } = await tx.clubApplication.updateMany({
            where: { id, clubId, state: 'PENDING' },
            data: { state: decision, decidedAt: new Date() },
          });
          const row = await tx.clubApplication.findFirst({
            where: { id, clubId },
            select: applicationColumns,
          });
          if (!row) return null;
          if (count === 0) return 'not-pending';
          if (decision === 'APPROVED') {
            // A pending application always has its part (club_applications_part_id_check).
            if (!row.partId)
              throw new Error('a pending application had no part');
            await tx.clubMember.create({
              data: {
                clubId,
                userId: row.userId,
                partId: row.partId,
                roleId: joinRoleId,
              },
            });
          }
          return toApplication(row);
        }),
      'already-member',
    );
  }

  /** Withdraws a pending application. 'not-pending': already decided. */
  async cancel(
    clubId: string,
    id: string,
  ): Promise<true | 'not-pending' | null> {
    const { count } = await this.database.clubApplication.deleteMany({
      where: { id, clubId, state: 'PENDING' },
    });
    if (count === 1) return true;
    return (await this.find(clubId, id)) ? 'not-pending' : null;
  }
}

function toApplication(row: ApplicationRow): Application {
  return new Application(
    row.id,
    row.clubId,
    row.userId,
    row.partId,
    row.state as ApplicationState,
    row.decidedAt,
    row.createdAt,
  );
}
