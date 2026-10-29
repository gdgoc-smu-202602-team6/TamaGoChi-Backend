import { Module } from '@nestjs/common';
import { ClubModule } from '../../domains/club/club.module.js';
import { MembersController } from './members/members.controller.js';

@Module({
  imports: [ClubModule],
  controllers: [MembersController],
})
export class ClubsModule {}
