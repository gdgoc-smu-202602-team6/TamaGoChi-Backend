import { Module } from '@nestjs/common';
import { ConfigModule } from './foundation/config/config.module.js';
import { ContractModule } from './foundation/contract/contract.module.js';
import { HealthModule } from './foundation/health/health.module.js';

@Module({
  imports: [ConfigModule, ContractModule, HealthModule],
})
export class AppModule {}
