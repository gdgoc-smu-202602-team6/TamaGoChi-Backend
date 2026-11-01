import type { NestApplicationOptions } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';
import {
  AUTH,
  authBasePath,
  type Auth,
} from './domains/account/users/auth/auth.js';
import { AppConfig } from './foundation/config/app-config.js';
import { ProblemFilter } from './foundation/problem/problem.filter.js';

/** better-auth reads request bodies itself, so Nest's body parser is added after its handler. */
export const applicationOptions: NestApplicationOptions = { bodyParser: false };

/** Wires the application the same way for the server and for end-to-end tests. */
export function configureApp(
  app: NestExpressApplication,
): NestExpressApplication {
  const auth = app.get<Auth>(AUTH);
  // Browsers may call from the origins better-auth trusts, and only those; it answers preflights before any route.
  app.enableCors({
    origin: (origin, allow) => {
      if (origin === undefined) return allow(null, false);
      auth.$context.then(
        (context) => allow(null, context.isTrustedOrigin(origin)),
        allow,
      );
    },
  });
  app
    .getHttpAdapter()
    .getInstance()
    .all(`${authBasePath}/{*path}`, toNodeHandler(auth));
  app.useBodyParser('json');

  app.useGlobalFilters(new ProblemFilter(!app.get(AppConfig).production));
  return app;
}
