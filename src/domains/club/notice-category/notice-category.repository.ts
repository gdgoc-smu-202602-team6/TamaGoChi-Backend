import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import {
  isStillReferenced,
  orOnUniqueViolation,
} from '../../../foundation/database/database-errors.js';
import { Label, type PaletteColor } from '../label/label.js';
import { NoticeCategory, Subcategory } from './notice-category.js';

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
  async list(clubId: string): Promise<NoticeCategory[]> {
    const rows = await this.database.clubNoticeCategory.findMany({
      where: { clubId },
      select: categoryColumns,
      orderBy: [{ preset: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toCategory);
  }

  /** 'duplicate': the club already has a category with this name. */
  async create(
    clubId: string,
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

  /** Null: no such category. 'preset': the preset one. 'in-use': a notice uses it or one of its subcategories. */
  async delete(
    clubId: string,
    categoryId: string,
  ): Promise<true | 'preset' | 'in-use' | null> {
    const category = await this.database.clubNoticeCategory.findFirst({
      where: { id: categoryId, clubId },
      select: { preset: true },
    });
    if (!category) return null;
    if (category.preset) return 'preset';
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
    clubId: string,
    categoryId: string,
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
      return new Subcategory(row.id, Label.fromStored(row.name));
    }, 'duplicate');
  }

  /** Null: no such subcategory in the club's category. 'in-use': a notice uses it. */
  async deleteSubcategory(
    clubId: string,
    categoryId: string,
    subcategoryId: string,
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
    row.id,
    Label.fromStored(row.name),
    row.color as PaletteColor,
    row.preset,
    row.subcategories.map(
      (sub) => new Subcategory(sub.id, Label.fromStored(sub.name)),
    ),
  );
}
