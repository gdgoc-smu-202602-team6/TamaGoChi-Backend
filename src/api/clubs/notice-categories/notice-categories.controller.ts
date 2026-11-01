import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Label } from '../../../domains/club/label/label.js';
import type {
  NoticeCategory,
  Subcategory,
} from '../../../domains/club/notice-category/notice-category.js';
import { NoticeCategoryRepository } from '../../../domains/club/notice-category/notice-category.repository.js';
import { RequireClubAccess } from '../../../domains/club/clubs/access/club-access.guard.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { parseField } from '../../../foundation/problem/parse-field.js';
import { Conflict } from '../../../foundation/problem/problems/conflict.js';
import { NotFound } from '../../../foundation/problem/problems/not-found.js';

type CategoryBody = components['schemas']['NoticeCategory'];
type CategoryCreateBody = components['schemas']['NoticeCategoryCreate'];
type SubcategoryBody = components['schemas']['Subcategory'];
type SubcategoryCreateBody = components['schemas']['SubcategoryCreate'];

@Controller('clubs/:clubId/noticeCategories')
export class NoticeCategoriesController {
  constructor(private readonly categories: NoticeCategoryRepository) {}

  /** listNoticeCategories */
  @Get()
  @RequireClubAccess()
  async list(
    @Param('clubId') clubId: string,
  ): Promise<{ items: CategoryBody[] }> {
    return { items: (await this.categories.list(clubId)).map(toBody) };
  }

  /** createNoticeCategory */
  @Post()
  @RequireClubAccess('noticeCategories.manage')
  async create(
    @Param('clubId') clubId: string,
    @Body() body: CategoryCreateBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CategoryBody> {
    const name = parseField('/body/name', () => Label.parse(body.name));
    const category = await this.categories.create(clubId, name, body.color);
    if (category === 'duplicate') throw new Conflict('duplicate-name');
    response
      .status(201)
      .location(`/clubs/${clubId}/noticeCategories/${category.id}`);
    return toBody(category);
  }

  /** deleteNoticeCategory */
  @Delete(':categoryId')
  @RequireClubAccess('noticeCategories.manage')
  @HttpCode(204)
  async delete(
    @Param('clubId') clubId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<void> {
    const result = await this.categories.delete(clubId, categoryId);
    if (result === null) throw new NotFound('notice category not found');
    if (result !== true) throw new Conflict(result);
  }

  /** createSubcategory */
  @Post(':categoryId/subcategories')
  @RequireClubAccess('noticeCategories.manage')
  async createSubcategory(
    @Param('clubId') clubId: string,
    @Param('categoryId') categoryId: string,
    @Body() body: SubcategoryCreateBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SubcategoryBody> {
    const name = parseField('/body/name', () => Label.parse(body.name));
    const subcategory = await this.categories.createSubcategory(
      clubId,
      categoryId,
      name,
    );
    if (subcategory === null) throw new NotFound('notice category not found');
    if (subcategory === 'duplicate') throw new Conflict('duplicate-name');
    response
      .status(201)
      .location(
        `/clubs/${clubId}/noticeCategories/${categoryId}/subcategories/${subcategory.id}`,
      );
    return toSubcategoryBody(subcategory);
  }

  /** deleteSubcategory */
  @Delete(':categoryId/subcategories/:subcategoryId')
  @RequireClubAccess('noticeCategories.manage')
  @HttpCode(204)
  async deleteSubcategory(
    @Param('clubId') clubId: string,
    @Param('categoryId') categoryId: string,
    @Param('subcategoryId') subcategoryId: string,
  ): Promise<void> {
    const result = await this.categories.deleteSubcategory(
      clubId,
      categoryId,
      subcategoryId,
    );
    if (result === null) throw new NotFound('subcategory not found');
    if (result === 'in-use') throw new Conflict('in-use');
  }
}

function toBody(category: NoticeCategory): CategoryBody {
  return {
    id: category.id,
    name: category.name.value,
    color: category.color,
    preset: category.preset,
    subcategories: category.subcategories.map(toSubcategoryBody),
  };
}

function toSubcategoryBody(subcategory: Subcategory): SubcategoryBody {
  return { id: subcategory.id, name: subcategory.name.value };
}
