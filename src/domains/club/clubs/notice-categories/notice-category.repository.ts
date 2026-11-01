import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import {
  isStillReferenced,
  orOnUniqueViolation,
} from '../../../../foundation/database/database-errors.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import { Label } from '../../label/label.js';
import type { PaletteColor } from '../../palette-color/palette-color.js';
import { NoticeCategory } from './notice-category.js';
import { Subcategory } from './subcategories/subcategory.js';

const categoryColumns = {
  id: true,
  name: true,
  color: true,
  preset: true,
  subcategories: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} as const;

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  preset: boolean;
  subcategories: { id: string; name: string }[];
};

@Injectable()
export class NoticeCategoryRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** The preset category first, then by name. */
  async list(clubId: Id<'Club'>): Promise<NoticeCategory[]> {
    const rows = await this.database.clubNoticeCategory.findMany({
      where: { clubId },
      select: categoryColumns,
      orderBy: [{ preset: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toCategory);
  }

  /** 'duplicate': the club already has a category with this name. */
  async create(
    clubId: Id<'Club'>,
    name: Label,
    color: PaletteColor,
  ): Promise<NoticeCategory | 'duplicate'> {
    return orOnUniqueViolation(async () => {
      return toCategory(
        await this.database.clubNoticeCategory.create({
          data: { clubId, name: name.value, color },
          select: categoryColumns,
        }),
      );
    }, 'duplicate');
  }

  /**
   * Null: no such category. 'preset': not NoticeCategory.deletable. 'in-use': a notice uses it or one of its
   * subcategories, which the foreign keys decide at the delete.
   */
  async delete(
    clubId: Id<'Club'>,
    categoryId: Id<'NoticeCategory'>,
  ): Promise<true | 'preset' | 'in-use' | null> {
    const row = await this.database.clubNoticeCategory.findFirst({
      where: { id: categoryId, clubId },
      select: categoryColumns,
    });
    if (!row) return null;
    if (!toCategory(row).deletable) return 'preset';
    try {
      await this.database.clubNoticeCategory.delete({
        where: { id: categoryId },
      });
      return true;
    } catch (error) {
      if (isStillReferenced(error)) return 'in-use';
      throw error;
    }
  }

  /** Null: no such category in the club. 'duplicate': the category already has a subcategory with this name. */
  async createSubcategory(
    clubId: Id<'Club'>,
    categoryId: Id<'NoticeCategory'>,
    name: Label,
  ): Promise<Subcategory | 'duplicate' | null> {
    const category = await this.database.clubNoticeCategory.findFirst({
      where: { id: categoryId, clubId },
      select: { id: true },
    });
    if (!category) return null;
    return orOnUniqueViolation(async () => {
      const row = await this.database.clubNoticeCategorySubcategory.create({
        data: { categoryId, name: name.value },
        select: { id: true, name: true },
      });
      return new Subcategory(
        asId<'Subcategory'>(row.id),
        Label.fromStored(row.name),
      );
    }, 'duplicate');
  }

  /** Null: no such subcategory in the club's category. 'in-use': a notice uses it. */
  async deleteSubcategory(
    clubId: Id<'Club'>,
    categoryId: Id<'NoticeCategory'>,
    subcategoryId: Id<'Subcategory'>,
  ): Promise<true | 'in-use' | null> {
    const subcategory =
      await this.database.clubNoticeCategorySubcategory.findFirst({
        where: { id: subcategoryId, categoryId, category: { clubId } },
        select: { id: true },
      });
    if (!subcategory) return null;
    try {
      await this.database.clubNoticeCategorySubcategory.delete({
        where: { id: subcategoryId },
      });
      return true;
    } catch (error) {
      if (isStillReferenced(error)) return 'in-use';
      throw error;
    }
  }
}

function toCategory(row: CategoryRow): NoticeCategory {
  return new NoticeCategory(
    asId<'NoticeCategory'>(row.id),
    Label.fromStored(row.name),
    row.color as PaletteColor,
    row.preset,
    row.subcategories.map(
      (sub) =>
        new Subcategory(
          asId<'Subcategory'>(sub.id),
          Label.fromStored(sub.name),
        ),
    ),
  );
}
