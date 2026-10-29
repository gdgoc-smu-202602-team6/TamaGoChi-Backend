import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './api/users/users.module.js';
import { AccountModule } from './domains/account/account.module.js';
import { authBasePath } from './domains/account/auth/auth.js';
import { SessionGuard } from './foundation/auth/session.guard.js';
import { ConfigModule } from './foundation/config/config.module.js';
import { ContractModule } from './foundation/contract/contract.module.js';
import { DatabaseModule } from './foundation/database/database.module.js';
import { HealthModule } from './foundation/health/health.module.js';

/** The composition point: wires the account area's implementations into the foundation's interfaces. */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ContractModule.forRoot(new RegExp(`^${authBasePath}/`)),
    HealthModule,
    AccountModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: SessionGuard }],
})
export class AppModule {}
