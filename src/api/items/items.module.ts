import { Module } from '@nestjs/common';
import { GameModule } from '../../domains/game/game.module.js';
import { ItemsController } from './items.controller.js';

@Module({
  imports: [GameModule],
  controllers: [ItemsController],
})
export class ItemsModule {}
