import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { applicationOptions, configureApp } from '../src/configure-app.js';
import { AuthMailer } from '../src/domains/account/users/auth/mailer/auth-mailer.js';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { CapturingAuthMailer } from './capturing-auth-mailer.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';

/**
 * The application as the server builds it, with mail captured, for the tests
 * of one file: started before them, and closed after them together with the
 * users signed up through it.
 */
export class TestApp {
  readonly mailer = new CapturingAuthMailer();
  readonly #emails: string[] = [];
  #app?: INestApplication;

  /** Starts the application before the file's tests and closes it after. */
  static setUp(): TestApp {
    const testApp = new TestApp();
    beforeAll(() => testApp.#start());
    afterAll(() => testApp.#close());
    return testApp;
  }

  get app(): INestApplication {
    if (!this.#app) throw new Error('the test app starts in beforeAll');
    return this.#app;
  }

  get database(): DatabaseClient {
    return this.app.get(DatabaseClient);
  }

  server(): ReturnType<INestApplication['getHttpServer']> {
    return this.app.getHttpServer();
  }

  /** Signs up a verified user that is deleted when the file's tests end. */
  async signUp(nickname?: string): Promise<SignedInUser> {
    const user = await signUpVerifiedUser(this.app, this.mailer, nickname);
    this.#emails.push(user.email);
    return user;
  }

  async #start(): Promise<void> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthMailer)
      .useValue(this.mailer)
      .compile();
    this.#app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(
        applicationOptions,
      ),
    );
    await this.#app.init();
  }

  async #close(): Promise<void> {
    await this.database.user.deleteMany({
      where: { email: { in: this.#emails } },
    });
    await this.app.close();
  }
}
