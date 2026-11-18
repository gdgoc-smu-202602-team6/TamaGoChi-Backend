import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { isUniqueViolation } from '../../../foundation/database/database-errors.js';
import { asId, type Id } from '../../../foundation/id/id.js';
import { Label } from '../label/label.js';
import type { PaletteColor } from '../palette-color/palette-color.js';
import { NoticeCategory } from './notice-categories/notice-category.js';
import { Part } from './parts/part.js';
import { Club } from './club.js';
import { ClubName } from './club-name.js';
import { InviteCode } from './invite-code.js';
import { MemberRole } from './members/member-role.js';

const inviteCodeAttempts = 3;

const clubColumns = {
  id: true,
  name: true,
  inviteCode: true,
  revision: true,
  createdAt: true,
  _count: { select: { members: true } },
} as const;

type ClubRow = {
  id: string;
  name: string;
  inviteCode: string;
  revision: number;
  createdAt: Date;
  _count: { members: number };
};

export interface NewClub {
  readonly name: ClubName;
  readonly parts: readonly { name: Label; color: PaletteColor }[];
  readonly creatorUserId: Id<'User'>;
  /** One of `parts`. */
  readonly creatorPartName: Label;
}

@Injectable()
export class ClubRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** Creates the club, its parts, its preset notice category and its creator's membership in one transaction. */
  async create(club: NewClub): Promise<Club> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.database.$transaction(async (tx) => {
          const created = await tx.club.create({
            data: {
              name: club.name.value,
              inviteCode: InviteCode.generate().value,
              parts: {
                create: club.parts.map((part) => ({
                  name: part.name.value,
                  color: part.color,
                })),
              },
              noticeCategories: {
                create: {
                  name: NoticeCategory.presetName.value,
                  color: NoticeCategory.presetColor,
                  preset: true,
                },
              },
            },
            select: { id: true, parts: { select: { id: true, name: true } } },
          });
          const creatorPart = created.parts.find(
            (part) => part.name === club.creatorPartName.value,
          );
          if (!creatorPart)
            throw new Error('creatorPartName must be one of parts');
          await tx.clubMember.create({
            data: {
              clubId: created.id,
              userId: club.creatorUserId,
              partId: creatorPart.id,
              role: MemberRole.onCreate,
            },
          });
          return toClub(
            await tx.club.findUniqueOrThrow({
              where: { id: created.id },
              select: clubColumns,
            }),
          );
        });
      } catch (error) {
        if (attempt < inviteCodeAttempts && isUniqueViolation(error)) continue;
        throw error;
      }
    }
  }

  async find(id: Id<'Club'>): Promise<Club | null> {
    const row = await this.database.club.findUnique({
      where: { id },
      select: clubColumns,
    });
    return row ? toClub(row) : null;
  }

  async findByInviteCode(
    code: InviteCode,
  ): Promise<{ club: Club; parts: Part[] } | null> {
    const row = await this.database.club.findUnique({
      where: { inviteCode: code.value },
      select: {
        ...clubColumns,
        parts: {
          select: { id: true, name: true, color: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!row) return null;
    return {
      club: toClub(row),
      parts: row.parts.map(
        (part) =>
          new Part(
            asId<'Part'>(part.id),
            Label.fromStored(part.name),
            part.color as PaletteColor,
          ),
      ),
    };
  }

  /**
   * Renames the club. With `expectedRevision`, only if the club is still at that revision.
   * Null: no such club. 'stale': the revision moved on.
   */
  async rename(
    id: Id<'Club'>,
    name: ClubName,
    expectedRevision?: number,
  ): Promise<Club | 'stale' | null> {
    const { count } = await this.database.club.updateMany({
      where: {
        id,
        ...(expectedRevision === undefined
          ? {}
          : { revision: expectedRevision }),
      },
      data: { name: name.value, revision: { increment: 1 } },
    });
    if (count === 1) return this.find(id);
    return (await this.find(id)) ? 'stale' : null;
  }

  /** Replaces the invite code; the old one stops working at once. */
  async regenerateInviteCode(id: Id<'Club'>): Promise<Club | null> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const { count } = await this.database.club.updateMany({
          where: { id },
          data: {
            inviteCode: InviteCode.generate().value,
            revision: { increment: 1 },
          },
        });
        return count === 1 ? this.find(id) : null;
      } catch (error) {
        if (attempt < inviteCodeAttempts && isUniqueViolation(error)) continue;
        throw error;
      }
    }
  }
}

function toClub(row: ClubRow): Club {
  return new Club(
    asId<'Club'>(row.id),
    ClubName.fromStored(row.name),
    InviteCode.fromStored(row.inviteCode),
    row.revision,
    row._count.members,
    row.createdAt,
  );
}
