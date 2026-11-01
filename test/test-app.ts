import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { applicationOptions, configureApp } from '../src/configure-app.js';
import { AuthMailer } from '../src/domains/account/users/auth/mailer/auth-mailer.js';

/** Keeps the links better-auth asks to send, instead of sending them. */
export class CapturingAuthMailer extends AuthMailer {
  readonly verificationUrls = new Map<string, string>();
  readonly passwordResetUrls = new Map<string, string>();

  sendVerification(to: string, url: string): Promise<void> {
    this.verificationUrls.set(to, url);
    return Promise.resolve();
  }

  sendPasswordReset(to: string, url: string): Promise<void> {
    this.passwordResetUrls.set(to, url);
    return Promise.resolve();
  }
}

/** The application as the server builds it, with mail captured. */
export async function createTestApp(): Promise<{
  app: INestApplication;
  mailer: CapturingAuthMailer;
}> {
  const mailer = new CapturingAuthMailer();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AuthMailer)
    .useValue(mailer)
    .compile();
  const app = configureApp(
    moduleRef.createNestApplication<NestExpressApplication>(applicationOptions),
  );
  await app.init();
  return { app, mailer };
}
