import { SESv2Client } from '@aws-sdk/client-sesv2';
import { Module } from '@nestjs/common';
import { AppConfig } from '../../foundation/config/app-config.js';
import { DatabaseClient } from '../../foundation/database/database-client.js';
import { SessionVerifier } from '../../foundation/auth/session-verifier.js';
import { AUTH, createAuth } from './auth/auth.js';
import { AuthMailer } from './auth/mailer/auth-mailer.js';
import { BetterAuthSessionVerifier } from './auth/better-auth-session-verifier.js';
import { LoggingAuthMailer } from './auth/mailer/logging-auth-mailer.js';
import { SesAuthMailer } from './auth/mailer/ses-auth-mailer.js';
import { DeviceTokenRepository } from './device-token/device-token.repository.js';
import { UserRepository } from './user/user.repository.js';

@Module({
  providers: [
    {
      provide: AuthMailer,
      inject: [AppConfig],
      useFactory: (config: AppConfig): AuthMailer =>
        config.mailFrom
          ? new SesAuthMailer(new SESv2Client({}), config.mailFrom)
          : new LoggingAuthMailer(),
    },
    {
      provide: AUTH,
      inject: [AppConfig, DatabaseClient, AuthMailer],
      useFactory: createAuth,
    },
    { provide: SessionVerifier, useClass: BetterAuthSessionVerifier },
    UserRepository,
    DeviceTokenRepository,
  ],
  exports: [AUTH, SessionVerifier, UserRepository, DeviceTokenRepository],
})
export class AccountModule {}
