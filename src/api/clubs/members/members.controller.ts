import { Controller, Get } from '@nestjs/common';
import type { ClubAccess } from '../../../foundation/access/access-resolver.js';
import {
  CurrentClubAccess,
  RequireClubAccess,
} from '../../../foundation/access/club-access.guard.js';
import type { components } from '../../../foundation/contract/openapi.js';

type Permission = components['schemas']['Permission'];

@Controller('clubs/:clubId/members')
export class MembersController {
  /** getMyPermissions */
  @Get('me/permissions')
  @RequireClubAccess()
  getMyPermissions(@CurrentClubAccess() access: ClubAccess): {
    items: Permission[];
  } {
    return { items: [...access.permissions] };
  }
}
