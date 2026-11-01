import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { bearer } from 'better-auth/plugins';
import type { AppConfig } from '../../../foundation/config/app-config.js';
import type { DatabaseClient } from '../../../foundation/database/database-client.js';
import { Nickname } from '../user/nickname.js';
import { Password } from '../user/password.js';
import type { AuthMailer } from './auth-mailer.js';

/** Where better-auth's own routes live. The API contract does not describe them. */
export const authBasePath = '/auth';

/** better-auth's routes that set a password, and the body field that carries it. */
const passwordFields: Readonly<Record<string, string>> = {
  '/sign-up/email': 'password',
  '/reset-password': 'newPassword',
  '/change-password': 'newPassword',
};

/** Runs a value object's parse, turning its RangeError into better-auth's 400. */
function parsed<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof RangeError)
      throw new APIError('BAD_REQUEST', { message: error.message });
    throw error;
  }
}

/** better-auth keeps the user's nickname as `name`; it goes through Nickname on the way in. */
function nicknameOf(name: string): string {
  return parsed(() => Nickname.parse(name)).value;
}

export function createAuth(
  config: AppConfig,
  database: DatabaseClient,
  mailer: AuthMailer,
) {
  return betterAuth({
    baseURL: config.publicUrl,
    basePath: authBasePath,
    secret: config.authSecret,
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
        if (typeof input === 'string') parsed(() => Password.parse(input));
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
