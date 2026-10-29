import { Injectable } from '@nestjs/common';
import { isPermission, type Permission } from '../../../foundation/access/permission.js';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { Role } from './role.js';

export const roleColumns = {
  id: true,
  name: true,
  assignedOnCreate: true,
  assignedOnJoin: true,
  permissions: { select: { permission: true } },
} as const;

type RoleRow = {
  id: string;
  name: string;
  assignedOnCreate: boolean;
  assignedOnJoin: boolean;
  permissions: { permission: string }[];
};

@Injectable()
export class RoleRepository {
  constructor(private readonly database: DatabaseClient) {}

  async list(): Promise<Role[]> {
    const rows = await this.database.role.findMany({ select: roleColumns, orderBy: { name: 'asc' } });
    return rows.map(toRole);
  }

  async find(id: string): Promise<Role | null> {
    const row = await this.database.role.findUnique({ where: { id }, select: roleColumns });
    return row ? toRole(row) : null;
  }

  /** The role given to whoever creates a club. Seed data guarantees exactly one. */
  async assignedOnCreate(): Promise<Role> {
    return toRole(await this.database.role.findFirstOrThrow({ where: { assignedOnCreate: true }, select: roleColumns }));
  }

  /** The role given to an approved applicant. Seed data guarantees exactly one. */
  async assignedOnJoin(): Promise<Role> {
    return toRole(await this.database.role.findFirstOrThrow({ where: { assignedOnJoin: true }, select: roleColumns }));
  }
}

export function toRole(row: RoleRow): Role {
  const permissions = new Set<Permission>(row.permissions.map((p) => p.permission).filter(isPermission));
  return new Role(row.id, row.name, permissions, row.assignedOnCreate, row.assignedOnJoin);
}
