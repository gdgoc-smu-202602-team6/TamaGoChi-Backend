import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Unauthorized } from '../problem/problems/unauthorized.js';
import type { AuthenticatedRequest } from './authenticated-user.js';
import { SessionVerifier } from './session-verifier.js';

interface ContractRequest extends AuthenticatedRequest {
  /** Set by the contract validator: the operation this request matched. */
  openapi?: { schema?: { security?: unknown[] } };
}

/**
 * Verifies the bearer token of every route the contract secures. Whether a route is secured is read from the
 * contract (an operation with `security: []` is public), so it is written in one place.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly verifier: SessionVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ContractRequest>();
    const security = request.openapi?.schema?.security;
    if (Array.isArray(security) && security.length === 0) return true;

    const user = await this.verifier.verify(request.headers);
    if (!user) throw new Unauthorized('invalid or expired token');
    request.authenticatedUser = user;
    return true;
  }
}
