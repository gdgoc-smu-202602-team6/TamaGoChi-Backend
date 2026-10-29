import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';
import { bearer } from 'better-auth/plugins';
import type { AppConfig } from '../../../foundation/config/app-config.js';
import type { DatabaseClient } from '../../../foundation/database/database-client.js';
import { Nickname } from '../user/nickname.js';
import type { AuthMailer } from './auth-mailer.js';

/** Where better-auth's own routes live. The API contract does not describe them. */
export const authBasePath = '/auth';

/** better-auth keeps the user's nickname as `name`; it goes through Nickname on the way in. */
function nicknameOf(name: string): string {
  try {
    return Nickname.parse(name).value;
  } catch (error) {
    if (error instanceof RangeError) throw new APIError('BAD_REQUEST', { message: error.message });
    throw error;
  }
}

export function createAuth(config: AppConfig, database: DatabaseClient, mailer: AuthMailer) {
  return betterAuth({
    baseURL: config.publicUrl,
    basePath: authBasePath,
    secret: config.authSecret,
    database: prismaAdapter(database, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: ({ user, url }) => mailer.sendVerification(user.email, url),
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ['google'] },
    },
    databaseHooks: {
      user: {
        create: { before: (user) => Promise.resolve({ data: { ...user, name: nicknameOf(user.name) } }) },
        update: {
          before: (user) =>
            Promise.resolve(typeof user.name === 'string' ? { data: { ...user, name: nicknameOf(user.name) } } : undefined),
        },
      },
    },
    plugins: [bearer()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** The injection token for the Auth instance. */
export const AUTH = Symbol('Auth');
