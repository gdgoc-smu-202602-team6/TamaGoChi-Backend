import { Module } from '@nestjs/common';
import { ClubModule } from '../../domains/club/club.module.js';
import { ClubsController } from './clubs.controller.js';
import { MembersController } from './members/members.controller.js';
import { NoticeCategoriesController } from './notice-categories/notice-categories.controller.js';
import { PartsController } from './parts/parts.controller.js';

@Module({
  imports: [ClubModule],
  controllers: [
    ClubsController,
    MembersController,
    PartsController,
    NoticeCategoriesController,
  ],
})
export class ClubsModule {}
