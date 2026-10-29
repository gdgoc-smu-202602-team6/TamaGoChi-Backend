import { Module } from '@nestjs/common';
import { AppConfig } from '../../foundation/config/app-config.js';
import { DatabaseClient } from '../../foundation/database/database-client.js';
import { SessionVerifier } from '../../foundation/auth/session-verifier.js';
import { AUTH, createAuth } from './auth/auth.js';
import { AuthMailer } from './auth/auth-mailer.js';
import { BetterAuthSessionVerifier } from './auth/better-auth-session-verifier.js';
import { LoggingAuthMailer } from './auth/logging-auth-mailer.js';
import { PushSender } from '../../foundation/push/push-sender.js';
import { DeviceTokenRepository } from './device-token/device-token.repository.js';
import { LoggingPushSender } from './device-token/logging-push-sender.js';
import { UserRepository } from './user/user.repository.js';

@Module({
  providers: [
    { provide: AuthMailer, useClass: LoggingAuthMailer },
    {
      provide: AUTH,
      inject: [AppConfig, DatabaseClient, AuthMailer],
      useFactory: createAuth,
    },
    { provide: SessionVerifier, useClass: BetterAuthSessionVerifier },
    UserRepository,
    DeviceTokenRepository,
    { provide: PushSender, useClass: LoggingPushSender },
  ],
  exports: [
    AUTH,
    SessionVerifier,
    UserRepository,
    DeviceTokenRepository,
    PushSender,
  ],
})
export class AccountModule {}
