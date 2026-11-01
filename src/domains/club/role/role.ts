import type { Permission } from '../../../foundation/access/permission.js';

/** Seed data. Code never branches on a role's name; it reads the assignment flags and the permissions. */
export class Role {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly permissions: ReadonlySet<Permission>,
    /** Given to whoever creates a club. */
    readonly assignedOnCreate: boolean,
    /** Given to an approved applicant. */
    readonly assignedOnJoin: boolean,
  ) {}

  has(permission: Permission): boolean {
    return this.permissions.has(permission);
  }
}
