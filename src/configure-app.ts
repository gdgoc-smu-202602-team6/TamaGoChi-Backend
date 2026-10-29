import type { NestApplicationOptions } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';
import { AUTH, authBasePath, type Auth } from './domains/account/auth/auth.js';
import { AppConfig } from './foundation/config/app-config.js';
import { ProblemFilter } from './foundation/problem/problem.filter.js';

/** better-auth reads request bodies itself, so Nest's body parser is added after its handler. */
export const applicationOptions: NestApplicationOptions = { bodyParser: false };

/** Wires the application the same way for the server and for end-to-end tests. */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  app.getHttpAdapter().getInstance().all(`${authBasePath}/{*path}`, toNodeHandler(app.get<Auth>(AUTH)));
  app.useBodyParser('json');

  app.useGlobalFilters(new ProblemFilter(!app.get(AppConfig).production));
  return app;
}
