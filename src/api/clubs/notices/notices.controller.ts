import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { NoticeCategoryRepository } from '../../../domains/club/clubs/notice-categories/notice-category.repository.js';
import { Notice } from '../../../domains/club/clubs/notices/notice.js';
import { NoticeDispatcher } from '../../../domains/club/clubs/notices/notice-dispatcher.js';
import { NoticeText } from '../../../domains/club/clubs/notices/notice-text.js';
import { NoticeTitle } from '../../../domains/club/clubs/notices/notice-title.js';
import {
  type NoticeFilter,
  NoticeRepository,
} from '../../../domains/club/clubs/notices/notice.repository.js';
import type { ClubAccess } from '../../../domains/club/clubs/access/club-access.js';
import { CurrentClubAccess, RequireClubAccess } from '../club-access.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { asId, type Id } from '../../../foundation/id/id.js';
import { pageRequest } from '../../../foundation/pagination/page-request.js';
import { pageBody } from '../../../foundation/pagination/page.js';
import { parseField } from '../../../foundation/problem/parse-field.js';
import { BadRequest } from '../../../foundation/problem/problems/bad-request.js';
import { NotFound } from '../../../foundation/problem/problems/not-found.js';

type NoticeBody = components['schemas']['Notice'];
type NoticePageBody = components['schemas']['NoticePage'];
type NoticeCreateBody = components['schemas']['NoticeCreate'];
type NoticeUpdateBody = components['schemas']['NoticeUpdate'];

@Controller('clubs/:clubId/notices')
export class NoticesController {
  constructor(
    private readonly notices: NoticeRepository,
    private readonly categories: NoticeCategoryRepository,
    private readonly dispatcher: NoticeDispatcher,
  ) {}

  /** listNotices: pinned first, newest first in each group (N-04); the unread count with read=false&totalSize=true. */
  @Get()
  @RequireClubAccess()
  async list(
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: Id<'Club'>,
    @Query('categoryId') categoryId: Id<'NoticeCategory'> | undefined,
    @Query('subcategoryId') subcategoryId: Id<'Subcategory'> | undefined,
    @Query('read') read: string | boolean | undefined,
    @Query('totalSize') totalSize: string | boolean | undefined,
    @Query('pageSize') pageSize: number,
    @Query('pageToken') pageToken?: string,
  ): Promise<NoticePageBody> {
    const filter: NoticeFilter = {
      categoryId,
      subcategoryId,
      read: read === undefined ? undefined : String(read) === 'true',
    };
    const query = `notices:${clubId}:${access.memberId}:${categoryId ?? ''}:${subcategoryId ?? ''}:${filter.read ?? ''}`;
    const [page, total] = await Promise.all([
      this.notices.list(
        clubId,
        access.memberId,
        filter,
        pageRequest(query, pageSize, pageToken),
      ),
      String(totalSize) === 'true'
        ? this.notices.count(clubId, access.memberId, filter)
        : undefined,
    ]);
    return {
      ...pageBody(page, toBody),
      ...(total !== undefined ? { totalSize: total } : {}),
    };
  }

  /** createNotice: notifying is sent after the response, its result kept on the notice (N-13, N-15). */
  @Post()
  @RequireClubAccess(Notice.writtenWith)
  async create(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('clubId') clubId: Id<'Club'>,
    @Body() body: NoticeCreateBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<NoticeBody> {
    const categoryId = asId<'NoticeCategory'>(body.categoryId);
    const subcategoryId = asId<'Subcategory'>(body.subcategoryId);
    await this.checkCategory(clubId, categoryId, subcategoryId);
    const notice = await this.notices.create(
      clubId,
      caller.id,
      {
        categoryId,
        subcategoryId: subcategoryId ?? null,
        title: parseField('/body/title', () => NoticeTitle.parse(body.title)),
        body: parseField('/body/body', () => NoticeText.parse(body.body)),
        pinned: body.pinned ?? false,
      },
      Notice.initialState(body.notify ?? false),
    );
    response.status(201).location(`/clubs/${clubId}/notices/${notice.id}`);
    if (notice.notificationState === 'PENDING') this.dispatcher.sendPending();
    return toBody(notice);
  }

  /** getNotice */
  @Get(':noticeId')
  @RequireClubAccess()
  async get(
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: Id<'Club'>,
    @Param('noticeId') noticeId: Id<'Notice'>,
  ): Promise<NoticeBody> {
    const notice = await this.notices.find(clubId, noticeId, access.memberId);
    if (!notice) throw new NotFound('notice not found');
    return toBody(notice);
  }

  /** updateNotice: never notifies again (N-16). */
  @Patch(':noticeId')
  @RequireClubAccess(Notice.writtenWith)
  async update(
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: Id<'Club'>,
    @Param('noticeId') noticeId: Id<'Notice'>,
    @Body() body: NoticeUpdateBody,
  ): Promise<NoticeBody> {
    const current = await this.notices.find(clubId, noticeId, access.memberId);
    if (!current) throw new NotFound('notice not found');
    const { categoryId, subcategoryId } = current.reclassified(
      asId<'NoticeCategory'>(body.categoryId),
      asId<'Subcategory'>(body.subcategoryId),
    );
    await this.checkCategory(clubId, categoryId, subcategoryId ?? undefined);
    const { title, body: text, pinned } = body;
    const updated = await this.notices.update(
      clubId,
      noticeId,
      access.memberId,
      {
        categoryId,
        subcategoryId,
        ...(title !== undefined
          ? { title: parseField('/body/title', () => NoticeTitle.parse(title)) }
          : {}),
        ...(text !== undefined
          ? { body: parseField('/body/body', () => NoticeText.parse(text)) }
          : {}),
        ...(pinned !== undefined ? { pinned } : {}),
      },
    );
    if (!updated) throw new NotFound('notice not found');
    return toBody(updated);
  }

  /** deleteNotice */
  @Delete(':noticeId')
  @RequireClubAccess(Notice.writtenWith)
  @HttpCode(204)
  async delete(
    @Param('clubId') clubId: Id<'Club'>,
    @Param('noticeId') noticeId: Id<'Notice'>,
  ): Promise<void> {
    if (!(await this.notices.delete(clubId, noticeId)))
      throw new NotFound('notice not found');
  }

  /** markNoticeRead: when the body is opened (N-07). */
  @Put(':noticeId/reads/me')
  @RequireClubAccess()
  @HttpCode(204)
  async markRead(
    @CurrentClubAccess() access: ClubAccess,
    @Param('clubId') clubId: Id<'Club'>,
    @Param('noticeId') noticeId: Id<'Notice'>,
  ): Promise<void> {
    if (!(await this.notices.markRead(clubId, noticeId, access.memberId)))
      throw new NotFound('notice not found');
  }

  /** The category must be the club's, and the subcategory that category's (N-09, N-10). */
  private async checkCategory(
    clubId: Id<'Club'>,
    categoryId: Id<'NoticeCategory'>,
    subcategoryId: Id<'Subcategory'> | undefined,
  ): Promise<void> {
    const category = (await this.categories.list(clubId)).find(
      (one) => one.id === categoryId,
    );
    if (!category)
      throw new BadRequest([
        { field: '/body/categoryId', message: 'not a category of this club' },
      ]);
    if (subcategoryId && !category.has(subcategoryId))
      throw new BadRequest([
        {
          field: '/body/subcategoryId',
          message: 'not a subcategory of the category',
        },
      ]);
  }
}

function toBody(notice: Notice): NoticeBody {
  return {
    id: notice.id,
    categoryId: notice.categoryId,
    ...(notice.subcategoryId ? { subcategoryId: notice.subcategoryId } : {}),
    authorUserId: notice.authorUserId,
    title: notice.title,
    body: notice.body,
    pinned: notice.pinned,
    notificationState: notice.notificationState,
    read: notice.read,
    createdAt: notice.createdAt.toISOString(),
  };
}
