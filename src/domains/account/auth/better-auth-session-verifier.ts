import { Inject, Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import type { AuthenticatedUser } from '../../../foundation/auth/authenticated-user.js';
import { SessionVerifier } from '../../../foundation/auth/session-verifier.js';
import { AUTH, type Auth } from './auth.js';

/** Verifies a better-auth session (bearer token or cookie). */
@Injectable()
export class BetterAuthSessionVerifier extends SessionVerifier {
  constructor(@Inject(AUTH) private readonly auth: Auth) {
    super();
  }

  async verify(
    headers: IncomingHttpHeaders,
  ): Promise<AuthenticatedUser | null> {
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });
    return session ? { id: session.user.id } : null;
  }
}
