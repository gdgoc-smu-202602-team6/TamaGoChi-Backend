import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { newestFirstPage } from '../../../foundation/pagination/newest-first-page.js';
import type { Page, PageRequest } from '../../../foundation/pagination/page.js';
import type { Prisma } from '../../../foundation/database/generated/client.js';
import type { ClubAccess } from '../clubs/access/club-access.js';
import type { Permission } from '../clubs/access/permission.js';
import { roleColumns, toRole } from '../role/role.repository.js';
import { Member, type MemberChanges } from './member.js';

/** The permission whose holders must never drop to zero in a club. */
const managing: Permission = 'members.manage';

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

  async find(clubId: string, memberId: string): Promise<Member | null> {
    const row = await this.database.clubMember.findFirst({
      where: { id: memberId, clubId },
      select: memberColumns,
    });
    return row ? toMember(row) : null;
  }

  async list(
    clubId: string,
    partId: string | undefined,
    page: PageRequest,
    query: string,
  ): Promise<Page<Member>> {
    return newestFirstPage(query, page, toMember, ({ after, ...window }) =>
      this.database.clubMember.findMany({
        where: { clubId, ...(partId ? { partId } : {}), ...after },
        select: memberColumns,
        ...window,
      }),
    );
  }

  async listForUser(
    userId: string,
    page: PageRequest,
    query: string,
  ): Promise<Page<Member>> {
    return newestFirstPage(query, page, toMember, ({ after, ...window }) =>
      this.database.clubMember.findMany({
        where: { userId, ...after },
        select: memberColumns,
        ...window,
      }),
    );
  }

  /** What the user may do in the club: their membership and its role. Null when not a member (the club is not visible). */
  async permissionsOf(
    userId: string,
    clubId: string,
  ): Promise<ClubAccess | null> {
    const member = await this.database.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
      select: { id: true, role: { select: roleColumns } },
    });
    return member
      ? { memberId: member.id, permissions: toRole(member.role).permissions }
      : null;
  }

  /** Those of `others` who share at least one club with `userId` (seeing a friend's room). */
  async sharingWith(
    userId: string,
    others: readonly string[],
  ): Promise<ReadonlySet<string>> {
    if (others.length === 0) return new Set();
    const rows = await this.database.clubMember.findMany({
      where: {
        userId: { in: [...others] },
        club: { members: { some: { userId } } },
      },
      select: { userId: true },
    });
    return new Set(rows.map((row) => row.userId));
  }

  /** The users of the club's members who turned notice notifications on (M-13). */
  async notificationRecipients(clubId: string): Promise<readonly string[]> {
    const rows = await this.database.clubMember.findMany({
      where: { clubId, notificationsOn: true },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }

  /**
   * Null: no such member. 'no-part', 'no-role': the part is not the club's, the role does not exist.
   * 'last-manager': the change would leave the club without anyone holding members.manage.
   */
  async update(
    clubId: string,
    memberId: string,
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
          select: {
            permissions: {
              where: { permission: managing },
              select: { permission: true },
            },
          },
        });
        if (!role) return 'no-role';
        const keepsManaging = role.permissions.length > 0;
        if (
          !keepsManaging &&
          (await managersOtherThan(tx, clubId, memberId)) === 0 &&
          (await manages(tx, memberId))
        ) {
          return 'last-manager';
        }
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

  /** Leaving or removal. Deletes the member's game data with it (foreign keys). */
  async remove(
    clubId: string,
    memberId: string,
  ): Promise<true | 'last-manager' | null> {
    return this.database.$transaction(async (tx) => {
      await lockClub(tx, clubId);
      const current = await tx.clubMember.findFirst({
        where: { id: memberId, clubId },
        select: { id: true },
      });
      if (!current) return null;
      if (
        (await manages(tx, memberId)) &&
        (await managersOtherThan(tx, clubId, memberId)) === 0
      ) {
        return 'last-manager';
      }
      await tx.clubMember.delete({ where: { id: memberId } });
      return true;
    });
  }

  /** Whether the user is the only holder of members.manage in some club (so cannot delete their account). */
  async isLastManagerSomewhere(userId: string): Promise<boolean> {
    const held = await this.database.clubMember.findMany({
      where: {
        userId,
        role: { permissions: { some: { permission: managing } } },
      },
      select: { id: true, clubId: true },
    });
    for (const member of held) {
      if (
        (await managersOtherThan(this.database, member.clubId, member.id)) === 0
      )
        return true;
    }
    return false;
  }
}

/** Serializes membership changes of one club, so two managers cannot both step down at once. */
async function lockClub(tx: Tx, clubId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM clubs WHERE id = ${clubId}::uuid FOR UPDATE`;
}

async function manages(tx: Tx, memberId: string): Promise<boolean> {
  const count = await tx.clubMember.count({
    where: {
      id: memberId,
      role: { permissions: { some: { permission: managing } } },
    },
  });
  return count > 0;
}

async function managersOtherThan(
  tx: Tx | DatabaseClient,
  clubId: string,
  memberId: string,
): Promise<number> {
  return tx.clubMember.count({
    where: {
      clubId,
      id: { not: memberId },
      role: { permissions: { some: { permission: managing } } },
    },
  });
}

function toMember(row: MemberRow): Member {
  return new Member(
    row.id,
    row.clubId,
    row.userId,
    row.partId,
    row.roleId,
    row.notificationsOn,
    row.createdAt,
  );
}
