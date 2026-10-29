import { Module } from '@nestjs/common';
import { AccessResolver } from '../../foundation/access/access-resolver.js';
import { ClubRepository } from './club/club.repository.js';
import { MemberAccessResolver } from './member/member-access-resolver.js';
import { RoleRepository } from './role/role.repository.js';

@Module({
  providers: [
    { provide: AccessResolver, useClass: MemberAccessResolver },
    RoleRepository,
    ClubRepository,
  ],
  exports: [AccessResolver, RoleRepository, ClubRepository],
})
export class ClubModule {}
