import type { Id } from '../../../foundation/id/id.js';
import type { Permission } from '../clubs/access/permission.js';

/** Seed data. Code never branches on a role's name; it reads the permissions. */
export class Role {
  constructor(
    readonly id: Id<'Role'>,
    readonly name: string,
    readonly permissions: ReadonlySet<Permission>,
  ) {}
}
