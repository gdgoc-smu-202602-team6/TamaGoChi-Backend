import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { orOnUniqueViolation } from '../../../../foundation/database/database-errors.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import { Label } from '../../label/label.js';
import type { PaletteColor } from '../../palette-color/palette-color.js';
import { Application } from '../applications/application.js';
import { Part } from './part.js';

const partColumns = { id: true, name: true, color: true } as const;

@Injectable()
export class PartRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** Null when the club does not exist. */
  async list(clubId: Id<'Club'>): Promise<Part[] | null> {
    const club = await this.database.club.findUnique({
      where: { id: clubId },
      select: { parts: { select: partColumns, orderBy: { name: 'asc' } } },
    });
    return club ? club.parts.map(toPart) : null;
  }

  /** 'duplicate': the club already has a part with this name. */
  async create(
    clubId: Id<'Club'>,
    name: Label,
    color: PaletteColor,
  ): Promise<Part | 'duplicate'> {
    return orOnUniqueViolation(async () => {
      return toPart(
        await this.database.clubPart.create({
          data: { clubId, name: name.value, color },
          select: partColumns,
        }),
      );
    }, 'duplicate');
  }

  /**
   * Deletes the part unless a member or an open application uses it. Decided applications that named it stay,
   * with no part, so their approval days remain (B-16). Null: no such part. 'in-use': still used.
   */
  async delete(
    clubId: Id<'Club'>,
    partId: Id<'Part'>,
  ): Promise<true | 'in-use' | null> {
    return this.database.$transaction(async (tx) => {
      const part = await tx.clubPart.findFirst({
        where: { id: partId, clubId },
        select: {
          _count: {
            select: {
              members: true,
              applications: {
                where: { state: { in: [...Application.openStates] } },
              },
            },
          },
        },
      });
      if (!part) return null;
      if (part._count.members > 0 || part._count.applications > 0)
        return 'in-use';
      await tx.clubPart.delete({ where: { id: partId } });
      return true;
    });
  }
}

function toPart(row: { id: string; name: string; color: string }): Part {
  return new Part(
    asId<'Part'>(row.id),
    Label.fromStored(row.name),
    row.color as PaletteColor,
  );
}
