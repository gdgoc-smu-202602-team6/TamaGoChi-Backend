import { Module } from '@nestjs/common';
import { AccountModule } from '../../domains/account/account.module.js';
import { ClubModule } from '../../domains/club/club.module.js';
import { GameModule } from '../../domains/game/game.module.js';
import { DailyGoalsController } from './daily-goals/daily-goals.controller.js';
import { MyGuestbookEntriesController } from './guestbook-entries/my-guestbook-entries.controller.js';
import { OwnedItemsController } from './items/owned-items.controller.js';
import { LikesController } from './likes/likes.controller.js';
import { PlayerViews } from './player-views.js';
import { RoomController } from './room/room.controller.js';
import { StatsController } from './stats/stats.controller.js';
import { StudySessionsController } from './study-sessions/study-sessions.controller.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [AccountModule, ClubModule, GameModule],
  providers: [PlayerViews],
  controllers: [
    UsersController,
    DailyGoalsController,
    StudySessionsController,
    RoomController,
    StatsController,
    OwnedItemsController,
    LikesController,
    MyGuestbookEntriesController,
  ],
})
export class UsersModule {}
