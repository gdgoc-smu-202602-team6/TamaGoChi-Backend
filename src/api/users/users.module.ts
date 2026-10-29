import { Module } from '@nestjs/common';
import { AccountModule } from '../../domains/account/account.module.js';
import { ClubModule } from '../../domains/club/club.module.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [AccountModule, ClubModule],
  controllers: [UsersController],
})
export class UsersModule {}
