import { Module } from '@nestjs/common';
import { ClubModule } from '../../domains/club/club.module.js';
import { ClubsController } from './clubs.controller.js';
import { MembersController } from './members/members.controller.js';

@Module({
  imports: [ClubModule],
  controllers: [ClubsController, MembersController],
})
export class ClubsModule {}
