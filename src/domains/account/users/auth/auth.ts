import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { bearer } from 'better-auth/plugins';
import type { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { parseOrBadRequest } from '../../../../foundation/problem/parse-field.js';
import { Nickname } from '../nickname.js';
import { Password } from '../password.js';
import type { AuthConfig } from './auth-config.js';
import type { AuthMailer } from './mailer/auth-mailer.js';

/** Where better-auth's own routes live. The API contract does not describe them. */
export const authBasePath = '/auth';

/** better-auth's routes that set a password, and the body field that carries it. */
const passwordFields: Readonly<Record<string, string>> = {
  '/sign-up/email': 'password',
  '/reset-password': 'newPassword',
  '/change-password': 'newPassword',
};

/** better-auth's 400, for a value that breaks its type's rule. */
const badRequest = (message: string) =>
  new APIError('BAD_REQUEST', { message });

/** better-auth keeps the user's nickname as `name`; it goes through Nickname on the way in. */
function nicknameOf(name: string): string {
  return parseOrBadRequest(() => Nickname.parse(name), badRequest).value;
}

export function createAuth(
  config: AuthConfig,
  database: DatabaseClient,
  mailer: AuthMailer,
) {
  return betterAuth({
    baseURL: config.publicUrl,
    basePath: authBasePath,
    secret: config.secret,
    trustedOrigins: [...config.trustedOrigins],
    database: prismaAdapter(database, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }) =>
        mailer.sendPasswordReset(user.email, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: ({ user, url }) =>
        mailer.sendVerification(user.email, url),
    },
    hooks: {
      before: createAuthMiddleware((ctx) => {
        const field = passwordFields[ctx.path];
        const body = ctx.body as Record<string, unknown> | undefined;
        const input = field ? body?.[field] : undefined;
        if (typeof input === 'string')
          parseOrBadRequest(() => Password.parse(input), badRequest);
        return Promise.resolve();
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: (user) =>
            Promise.resolve({ data: { ...user, name: nicknameOf(user.name) } }),
        },
        update: {
          before: (user) =>
            Promise.resolve(
              typeof user.name === 'string'
                ? { data: { ...user, name: nicknameOf(user.name) } }
                : undefined,
            ),
        },
      },
    },
    plugins: [bearer()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** The injection token for the Auth instance. */
export const AUTH = Symbol('Auth');
