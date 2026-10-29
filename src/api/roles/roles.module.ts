import { Module } from '@nestjs/common';
import { ClubModule } from '../../domains/club/club.module.js';
import { RolesController } from './roles.controller.js';

@Module({
  imports: [ClubModule],
  controllers: [RolesController],
})
export class RolesModule {}
