import { Module } from '@nestjs/common';
import { AccessResolver } from '../../foundation/access/access-resolver.js';
import { MemberAccessResolver } from './member/member-access-resolver.js';
import { RoleRepository } from './role/role.repository.js';

@Module({
  providers: [{ provide: AccessResolver, useClass: MemberAccessResolver }, RoleRepository],
  exports: [AccessResolver, RoleRepository],
})
export class ClubModule {}
