import { Module } from '@nestjs/common';
import { DailyGoalRepository } from './users/daily-goals/daily-goal.repository.js';
import { GuestbookRepository } from './users/guestbook-entries/guestbook.repository.js';
import { ItemRepository } from './items/item.repository.js';
import { LevelRepository } from './level/level.repository.js';
import { OwnedItemRepository } from './users/items/owned-item.repository.js';
import { PurchaseService } from './users/items/purchase.service.js';
import { LikeRepository } from './users/likes/like.repository.js';
import { DaySettlementRepository } from './users/progress/day-settlement.repository.js';
import { ProgressService } from './users/progress/progress.service.js';
import { RoomRepository } from './users/room/room.repository.js';
import { StatsService } from './users/stats/stats.service.js';
import { StudySessionRepository } from './users/study-sessions/study-session.repository.js';

const providers = [
  DailyGoalRepository,
  StudySessionRepository,
  DaySettlementRepository,
  ProgressService,
  LevelRepository,
  StatsService,
  ItemRepository,
  OwnedItemRepository,
  PurchaseService,
  RoomRepository,
  LikeRepository,
  GuestbookRepository,
];

/** game: per user (merged 0.1). */
@Module({
  providers,
  exports: providers,
})
export class GameModule {}
