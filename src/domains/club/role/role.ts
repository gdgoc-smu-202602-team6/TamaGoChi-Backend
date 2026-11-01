import type { Permission } from '../clubs/access/permission.js';

/** Seed data. Code never branches on a role's name; it reads the assignment flags and the permissions. */
export class Role {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly permissions: ReadonlySet<Permission>,
  ) {}
}
