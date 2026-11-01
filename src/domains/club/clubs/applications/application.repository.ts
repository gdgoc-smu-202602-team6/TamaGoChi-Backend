import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { orOnUniqueViolation } from '../../../../foundation/database/database-errors.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import { newestFirstPage } from '../../../../foundation/pagination/newest-first-page.js';
import type { PageRequest } from '../../../../foundation/pagination/page-request.js';
import type { Page } from '../../../../foundation/pagination/page.js';
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
    clubId: Id<'Club'>,
    userId: Id<'User'>,
    partId: Id<'Part'>,
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

  /** The application as `viewerId` may see it: their own, or any of the club when they decide applications. */
  async findVisibleTo(
    clubId: Id<'Club'>,
    id: Id<'Application'>,
    viewerId: Id<'User'>,
  ): Promise<Application | null> {
    const row = await this.database.clubApplication.findFirst({
      where: {
        id,
        clubId,
        OR: [
          { userId: viewerId },
          {
            club: {
              members: {
                some: {
                  userId: viewerId,
                  role: {
                    permissions: {
                      some: { permission: Application.decidedWith },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: applicationColumns,
    });
    return row ? toApplication(row) : null;
  }

  async listForClub(
    clubId: Id<'Club'>,
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
  async approvedAt(userId: Id<'User'>): Promise<readonly Date[]> {
    const rows = await this.database.clubApplication.findMany({
      where: { userId, state: 'APPROVED' },
      select: { decidedAt: true },
    });
    return rows.flatMap((row) => (row.decidedAt ? [row.decidedAt] : []));
  }

  /** The applicant's own list: rejected ones only while still shown (Application.rejectedShownSince). */
  async listForUser(
    userId: Id<'User'>,
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
   * transaction. 'not-pending': already decided. 'already-member': the applicant joined meanwhile. Whether it may
   * move is the update's condition, so two deciders at once cannot both move it.
   */
  async decide(
    clubId: Id<'Club'>,
    id: Id<'Application'>,
    decision: Decision,
    joinRoleId: Id<'Role'>,
  ): Promise<Application | 'not-pending' | 'already-member' | null> {
    return orOnUniqueViolation(
      () =>
        this.database.$transaction(async (tx) => {
          const { count } = await tx.clubApplication.updateMany({
            where: {
              id,
              clubId,
              state: { in: [...Application.movingTo(decision)] },
            },
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

  /**
   * Withdraws an open application. 'not-pending': already decided. Whether it is open is the delete's condition, so a
   * decision at the same moment cannot be lost.
   */
  async cancel(
    clubId: Id<'Club'>,
    id: Id<'Application'>,
  ): Promise<true | 'not-pending' | null> {
    const { count } = await this.database.clubApplication.deleteMany({
      where: { id, clubId, state: { in: [...Application.openStates] } },
    });
    if (count === 1) return true;
    const left = await this.database.clubApplication.findFirst({
      where: { id, clubId },
      select: { id: true },
    });
    return left ? 'not-pending' : null;
  }
}

function toApplication(row: ApplicationRow): Application {
  return new Application(
    asId<'Application'>(row.id),
    asId<'Club'>(row.clubId),
    asId<'User'>(row.userId),
    asId<'Part'>(row.partId),
    row.state as ApplicationState,
    row.decidedAt,
    row.createdAt,
  );
}
