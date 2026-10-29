import { Module } from '@nestjs/common';
import { AppConfig } from '../../foundation/config/app-config.js';
import { DatabaseClient } from '../../foundation/database/database-client.js';
import { SessionVerifier } from '../../foundation/auth/session-verifier.js';
import { AUTH, createAuth } from './auth/auth.js';
import { AuthMailer } from './auth/auth-mailer.js';
import { BetterAuthSessionVerifier } from './auth/better-auth-session-verifier.js';
import { LoggingAuthMailer } from './auth/logging-auth-mailer.js';
import { UserRepository } from './user/user.repository.js';

@Module({
  providers: [
    { provide: AuthMailer, useClass: LoggingAuthMailer },
    { provide: AUTH, inject: [AppConfig, DatabaseClient, AuthMailer], useFactory: createAuth },
    { provide: SessionVerifier, useClass: BetterAuthSessionVerifier },
    UserRepository,
  ],
  exports: [AUTH, SessionVerifier, UserRepository],
})
export class AccountModule {}
