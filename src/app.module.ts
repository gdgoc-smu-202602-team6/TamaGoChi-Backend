import { Module } from '@nestjs/common';
import { ConfigModule } from './foundation/config/config.module.js';
import { HealthModule } from './foundation/health/health.module.js';

@Module({
  imports: [ConfigModule, HealthModule],
})
export class AppModule {}
