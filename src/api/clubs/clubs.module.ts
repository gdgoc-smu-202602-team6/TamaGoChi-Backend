import { Module } from '@nestjs/common';
import { AccountModule } from '../../domains/account/account.module.js';
import { ClubModule } from '../../domains/club/club.module.js';
import { ApplicationsController } from './applications/applications.controller.js';
import { ClubsController } from './clubs.controller.js';
import { MembersController } from './members/members.controller.js';
import { NoticeCategoriesController } from './notice-categories/notice-categories.controller.js';
import { PartsController } from './parts/parts.controller.js';

@Module({
  imports: [ClubModule, AccountModule],
  controllers: [
    ApplicationsController,
    ClubsController,
    MembersController,
    PartsController,
    NoticeCategoriesController,
  ],
})
export class ClubsModule {}
