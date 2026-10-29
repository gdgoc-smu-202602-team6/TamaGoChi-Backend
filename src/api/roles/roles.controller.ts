import { Controller, Get } from '@nestjs/common';
import { RoleRepository } from '../../domains/club/role/role.repository.js';
import type { components } from '../../foundation/contract/openapi.js';

type RoleBody = components['schemas']['Role'];

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RoleRepository) {}

  /** listRoles */
  @Get()
  async list(): Promise<{ items: RoleBody[] }> {
    const roles = await this.roles.list();
    return {
      items: roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: [...role.permissions],
      })),
    };
  }
}
