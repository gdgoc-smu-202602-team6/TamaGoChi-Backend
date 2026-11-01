import type { IncomingHttpHeaders } from 'node:http';
import type { AuthenticatedUser } from './authenticated-user.js';

/** Tells who sent a request from its headers. The account domain implements it; SessionGuard uses it. */
export abstract class SessionVerifier {
  abstract verify(
    headers: IncomingHttpHeaders,
  ): Promise<AuthenticatedUser | null>;
}
