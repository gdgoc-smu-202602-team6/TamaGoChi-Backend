import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClubsModule } from './api/clubs/clubs.module.js';
import { ItemsModule } from './api/items/items.module.js';
import { RolesModule } from './api/roles/roles.module.js';
import { UsersModule } from './api/users/users.module.js';
import { AccountModule } from './domains/account/account.module.js';
import { authBasePath } from './domains/account/auth/auth.js';
import { ClubModule } from './domains/club/club.module.js';
import { MembershipModule } from './domains/club/membership.module.js';
import { ClubAccessGuard } from './foundation/access/club-access.guard.js';
import { SessionGuard } from './foundation/auth/session.guard.js';
import { ConfigModule } from './foundation/config/config.module.js';
import { ContractModule } from './foundation/contract/contract.module.js';
import { DatabaseModule } from './foundation/database/database.module.js';
import { HealthModule } from './foundation/health/health.module.js';

/**
 * The composition root: wires the domains' implementations into the foundation's interfaces. Guards run in the
 * order listed: who the caller is (SessionGuard), then what they may do in the club (ClubAccessGuard).
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ContractModule.forRoot(new RegExp(`^${authBasePath}/`)),
    HealthModule,
    AccountModule,
    MembershipModule,
    ClubModule,
    UsersModule,
    RolesModule,
    ClubsModule,
    ItemsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: ClubAccessGuard },
  ],
})
export class AppModule {}
