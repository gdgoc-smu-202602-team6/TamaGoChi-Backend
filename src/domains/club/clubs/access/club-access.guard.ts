import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../../../foundation/auth/authenticated-user.js';
import { asId } from '../../../../foundation/id/id.js';
import { Forbidden } from '../../../../foundation/problem/problems/forbidden.js';
import { NotFound } from '../../../../foundation/problem/problems/not-found.js';
import { MemberRepository } from '../members/member.repository.js';
import type { ClubAccess } from './club-access.js';
import type { Permission } from './permission.js';

const clubAccessKey = Symbol('ClubAccess');

/**
 * Marks a route under /clubs/{clubId} as members only, and when a permission is given, as needing it.
 * Not a member: 404 (the club is not visible). A member without the permission: 403.
 */
export const RequireClubAccess = (permission?: Permission) =>
  SetMetadata(clubAccessKey, { permission });

interface ClubAccessRequest extends AuthenticatedRequest {
  clubAccess?: ClubAccess;
}

/** The caller's ClubAccess on a route marked with RequireClubAccess. */
export const CurrentClubAccess = createParamDecorator(
  (_: unknown, context: ExecutionContext): ClubAccess => {
    const access = context
      .switchToHttp()
      .getRequest<ClubAccessRequest>().clubAccess;
    if (!access)
      throw new Error(
        'CurrentClubAccess used on a route without RequireClubAccess',
      );
    return access;
  },
);

@Injectable()
export class ClubAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly members: MemberRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.get<{ permission?: Permission } | undefined>(
      clubAccessKey,
      context.getHandler(),
    );
    if (!rule) return true;

    const request = context.switchToHttp().getRequest<ClubAccessRequest>();
    const clubId = request.params.clubId;
    const user = request.authenticatedUser;
    if (!user || typeof clubId !== 'string')
      throw new Error('RequireClubAccess needs a secured route with :clubId');

    const access = await this.members.accessOf(user.id, asId<'Club'>(clubId));
    if (!access) throw new NotFound('club not found');
    if (rule.permission && !access.permissions.has(rule.permission)) {
      throw new Forbidden(`requires ${rule.permission}`);
    }
    request.clubAccess = access;
    return true;
  }
}
