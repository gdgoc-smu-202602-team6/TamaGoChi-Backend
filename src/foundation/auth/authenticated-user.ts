import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Id } from '../id/id.js';

/** Who sent the request, as SessionGuard verified it. */
export interface AuthenticatedUser {
  readonly id: Id<'User'>;
}

export interface AuthenticatedRequest extends Request {
  authenticatedUser?: AuthenticatedUser;
}

/** Injects the AuthenticatedUser of a route the contract marks as secured. */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().authenticatedUser;
    if (!user)
      throw new Error(
        'CurrentUser used on a route the contract does not secure',
      );
    return user;
  },
);
