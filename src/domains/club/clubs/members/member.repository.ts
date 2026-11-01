import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import { newestFirstPage } from '../../../../foundation/pagination/newest-first-page.js';
import type { PageRequest } from '../../../../foundation/pagination/page-request.js';
import type { Page } from '../../../../foundation/pagination/page.js';
import type { Prisma } from '../../../../foundation/database/generated/client.js';
import type { ClubAccess } from '../access/club-access.js';
import { roleColumns, toRole } from '../../roles/role.repository.js';
import { ClubManagers } from './club-managers.js';
import { Member, type MemberChanges } from './member.js';

/** The members holding ClubManagers.permission, as a query condition. */
const managing = {
  role: { permissions: { some: { permission: ClubManagers.permission } } },
} as const;

const memberColumns = {
  id: true,
  clubId: true,
  userId: true,
  partId: true,
  roleId: true,
  notificationsOn: true,
  createdAt: true,
} as const;

type MemberRow = {
  id: string;
  clubId: string;
  userId: string;
  partId: string;
  roleId: string;
  notificationsOn: boolean;
  createdAt: Date;
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class MemberRepository {
  constructor(private readonly database: DatabaseClient) {}

  async find(
    clubId: Id<'Club'>,
    memberId: Id<'Member'>,
  ): Promise<Member | null> {
    const row = await this.database.clubMember.findFirst({
      where: { id: memberId, clubId },
      select: memberColumns,
    });
    return row ? toMember(row) : null;
  }

  async list(
    clubId: Id<'Club'>,
    partId: Id<'Part'> | undefined,
    page: PageRequest,
  ): Promise<Page<Member>> {
    return newestFirstPage(page, toMember, ({ after, ...window }) =>
      this.database.clubMember.findMany({
        where: { clubId, ...(partId ? { partId } : {}), ...after },
        select: memberColumns,
        ...window,
      }),
    );
  }

  async listForUser(
    userId: Id<'User'>,
    page: PageRequest,
  ): Promise<Page<Member>> {
    return newestFirstPage(page, toMember, ({ after, ...window }) =>
      this.database.clubMember.findMany({
        where: { userId, ...after },
        select: memberColumns,
        ...window,
      }),
    );
  }

  /** What the user may do in the club: their membership and its role. Null when not a member (the club is not visible). */
  async accessOf(
    userId: Id<'User'>,
    clubId: Id<'Club'>,
  ): Promise<ClubAccess | null> {
    const member = await this.database.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
      select: { id: true, role: { select: roleColumns } },
    });
    return member
      ? {
          memberId: asId<'Member'>(member.id),
          permissions: toRole(member.role).permissions,
        }
      : null;
  }

  /** Those of `others` who share at least one club with `userId` (seeing a friend's room). */
  async sharingAClubWith(
    userId: Id<'User'>,
    others: readonly Id<'User'>[],
  ): Promise<ReadonlySet<Id<'User'>>> {
    if (others.length === 0) return new Set();
    const rows = await this.database.clubMember.findMany({
      where: {
        userId: { in: [...others] },
        club: { members: { some: { userId } } },
      },
      select: { userId: true },
    });
    return new Set(rows.map((row) => asId<'User'>(row.userId)));
  }

  /** The users of the club's members who turned notice notifications on (M-13). */
  async notificationRecipients(
    clubId: Id<'Club'>,
  ): Promise<readonly Id<'User'>[]> {
    const rows = await this.database.clubMember.findMany({
      where: { clubId, notificationsOn: true },
      select: { userId: true },
    });
    return rows.map((row) => asId<'User'>(row.userId));
  }

  /**
   * Null: no such member. 'no-part', 'no-role': the part is not the club's, the role does not exist.
   * 'last-manager': ClubManagers refuses the role. Judged under the club lock, so two managers cannot both step down.
   */
  async update(
    clubId: Id<'Club'>,
    memberId: Id<'Member'>,
    changes: MemberChanges,
  ): Promise<Member | 'no-part' | 'no-role' | 'last-manager' | null> {
    return this.database.$transaction(async (tx) => {
      await lockClub(tx, clubId);
      const current = await tx.clubMember.findFirst({
        where: { id: memberId, clubId },
        select: memberColumns,
      });
      if (!current) return null;
      if (
        changes.partId &&
        !(await tx.clubPart.findFirst({
          where: { id: changes.partId, clubId },
        }))
      )
        return 'no-part';
      if (changes.roleId) {
        const role = await tx.role.findUnique({
          where: { id: changes.roleId },
          select: roleColumns,
        });
        if (!role) return 'no-role';
        if (!(await managersOf(tx, clubId)).allowRole(memberId, toRole(role)))
          return 'last-manager';
      }
      return toMember(
        await tx.clubMember.update({
          where: { id: memberId },
          data: changes,
          select: memberColumns,
        }),
      );
    });
  }

  /**
   * Leaving or removal. Deletes the member's game data with it (foreign keys). 'last-manager': ClubManagers refuses
   * the leaving, judged under the club lock.
   */
  async remove(
    clubId: Id<'Club'>,
    memberId: Id<'Member'>,
  ): Promise<true | 'last-manager' | null> {
    return this.database.$transaction(async (tx) => {
      await lockClub(tx, clubId);
      const current = await tx.clubMember.findFirst({
        where: { id: memberId, clubId },
        select: { id: true },
      });
      if (!current) return null;
      if (!(await managersOf(tx, clubId)).allowLeaving(memberId))
        return 'last-manager';
      await tx.clubMember.delete({ where: { id: memberId } });
      return true;
    });
  }

  /** The managers of every club the user manages, by the user's member id there (deleting the account leaves them all). */
  async managedBy(
    userId: Id<'User'>,
  ): Promise<ReadonlyMap<Id<'Member'>, ClubManagers>> {
    const rows = await this.database.clubMember.findMany({
      where: {
        ...managing,
        club: { members: { some: { userId, ...managing } } },
      },
      select: { id: true, clubId: true, userId: true },
    });
    const managed = new Map<Id<'Member'>, ClubManagers>();
    for (const own of rows.filter((row) => row.userId === userId)) {
      const ids = rows
        .filter((row) => row.clubId === own.clubId)
        .map((row) => asId<'Member'>(row.id));
      managed.set(asId<'Member'>(own.id), new ClubManagers(new Set(ids)));
    }
    return managed;
  }
}

/** Serializes membership changes of one club, so two managers cannot both step down at once. */
async function lockClub(tx: Tx, clubId: Id<'Club'>): Promise<void> {
  await tx.$queryRaw`SELECT id FROM clubs WHERE id = ${clubId}::uuid FOR UPDATE`;
}

async function managersOf(tx: Tx, clubId: Id<'Club'>): Promise<ClubManagers> {
  const rows = await tx.clubMember.findMany({
    where: { clubId, ...managing },
    select: { id: true },
  });
  return new ClubManagers(new Set(rows.map((row) => asId<'Member'>(row.id))));
}

function toMember(row: MemberRow): Member {
  return new Member(
    asId<'Member'>(row.id),
    asId<'Club'>(row.clubId),
    asId<'User'>(row.userId),
    asId<'Part'>(row.partId),
    asId<'Role'>(row.roleId),
    row.notificationsOn,
    row.createdAt,
  );
}
