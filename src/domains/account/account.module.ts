import { SESv2Client } from '@aws-sdk/client-sesv2';
import { Module } from '@nestjs/common';
import { DatabaseClient } from '../../foundation/database/database-client.js';
import { SessionVerifier } from '../../foundation/auth/session-verifier.js';
import { MailConfig } from '../../foundation/mail/mail-config.js';
import { MailModule } from '../../foundation/mail/mail.module.js';
import { AUTH, createAuth } from './users/auth/auth.js';
import { AuthConfig } from './users/auth/auth-config.js';
import { AuthMailer } from './users/auth/mailer/auth-mailer.js';
import { BetterAuthSessionVerifier } from './users/auth/better-auth-session-verifier.js';
import { LoggingAuthMailer } from './users/auth/mailer/logging-auth-mailer.js';
import { SesAuthMailer } from './users/auth/mailer/ses-auth-mailer.js';
import { DeviceTokenRepository } from './users/device-tokens/device-token.repository.js';
import { UserRepository } from './users/user.repository.js';

@Module({
  imports: [MailModule],
  providers: [
    { provide: AuthConfig, useFactory: () => AuthConfig.fromEnv(process.env) },
    {
      provide: AuthMailer,
      inject: [MailConfig, SESv2Client],
      useFactory: (mail: MailConfig, client: SESv2Client): AuthMailer =>
        mail.from
          ? new SesAuthMailer(client, mail.from)
          : new LoggingAuthMailer(),
    },
    {
      provide: AUTH,
      inject: [AuthConfig, DatabaseClient, AuthMailer],
      useFactory: createAuth,
    },
    { provide: SessionVerifier, useClass: BetterAuthSessionVerifier },
    UserRepository,
    DeviceTokenRepository,
  ],
  exports: [AUTH, SessionVerifier, UserRepository, DeviceTokenRepository],
})
export class AccountModule {}
