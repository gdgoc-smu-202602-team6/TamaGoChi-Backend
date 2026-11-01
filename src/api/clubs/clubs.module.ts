import { Module } from '@nestjs/common';
import { AccountModule } from '../../domains/account/account.module.js';
import { ClubModule } from '../../domains/club/club.module.js';
import { GameModule } from '../../domains/game/game.module.js';
import { ApplicationsController } from './applications/applications.controller.js';
import { ClubsController } from './clubs.controller.js';
import { GuestbookEntriesController } from './members/guestbook-entries/guestbook-entries.controller.js';
import { MembersController } from './members/members.controller.js';
import { NoticesController } from './notices/notices.controller.js';
import { NoticeCategoriesController } from './notice-categories/notice-categories.controller.js';
import { PartsController } from './parts/parts.controller.js';

@Module({
  imports: [ClubModule, AccountModule, GameModule],
  controllers: [
    ApplicationsController,
    ClubsController,
    MembersController,
    GuestbookEntriesController,
    PartsController,
    NoticeCategoriesController,
    NoticesController,
  ],
})
export class ClubsModule {}
