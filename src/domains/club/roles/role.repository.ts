import { Injectable } from '@nestjs/common';
import { isPermission, type Permission } from '../clubs/access/permission.js';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { asId } from '../../../foundation/id/id.js';
import { Role } from './role.js';

export const roleColumns = {
  id: true,
  name: true,
  permissions: { select: { permission: true } },
} as const;

type RoleRow = {
  id: string;
  name: string;
  permissions: { permission: string }[];
};

@Injectable()
export class RoleRepository {
  constructor(private readonly database: DatabaseClient) {}

  async list(): Promise<Role[]> {
    const rows = await this.database.role.findMany({
      select: roleColumns,
      orderBy: { name: 'asc' },
    });
    return rows.map(toRole);
  }

  /** The role given to whoever creates a club. Seed data guarantees exactly one. */
  async assignedOnCreate(): Promise<Role> {
    return toRole(
      await this.database.role.findFirstOrThrow({
        where: { assignedOnCreate: true },
        select: roleColumns,
      }),
    );
  }

  /** The role given to an approved applicant. Seed data guarantees exactly one. */
  async assignedOnJoin(): Promise<Role> {
    return toRole(
      await this.database.role.findFirstOrThrow({
        where: { assignedOnJoin: true },
        select: roleColumns,
      }),
    );
  }
}

export function toRole(row: RoleRow): Role {
  const permissions = new Set<Permission>(
    row.permissions.map((p) => p.permission).filter(isPermission),
  );
  return new Role(asId<'Role'>(row.id), row.name, permissions);
}
