import { Module } from '@nestjs/common';
import { DailyGoalRepository } from './daily-goal/daily-goal.repository.js';
import { GuestbookRepository } from './guestbook/guestbook.repository.js';
import { ItemRepository } from './item/item.repository.js';
import { LevelRepository } from './level/level.repository.js';
import { PurchaseService } from './item/purchase.service.js';
import { LikeRepository } from './like/like.repository.js';
import { DaySettlementRepository } from './progress/day-settlement.repository.js';
import { ProgressService } from './progress/progress.service.js';
import { RoomRepository } from './room/room.repository.js';
import { StatsService } from './stats/stats.service.js';
import { StudySessionRepository } from './study-session/study-session.repository.js';

const providers = [
  DailyGoalRepository,
  StudySessionRepository,
  DaySettlementRepository,
  ProgressService,
  LevelRepository,
  StatsService,
  ItemRepository,
  PurchaseService,
  RoomRepository,
  LikeRepository,
  GuestbookRepository,
];

/** game: per user (merged 0.1). JoinDays comes from the foundation; AppModule wires its implementation. */
@Module({
  providers,
  exports: providers,
})
export class GameModule {}
