import { Module } from '@nestjs/common';
import { ConfigModule } from './foundation/config/config.module.js';
import { ContractModule } from './foundation/contract/contract.module.js';
import { DatabaseModule } from './foundation/database/database.module.js';
import { HealthModule } from './foundation/health/health.module.js';

@Module({
  imports: [ConfigModule, DatabaseModule, ContractModule, HealthModule],
})
export class AppModule {}
