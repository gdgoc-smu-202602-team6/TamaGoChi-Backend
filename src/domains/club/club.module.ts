import { Module } from '@nestjs/common';
import { AccessResolver } from '../../foundation/access/access-resolver.js';
import { ClubRepository } from './club/club.repository.js';
import { MemberAccessResolver } from './member/member-access-resolver.js';
import { NoticeCategoryRepository } from './notice-category/notice-category.repository.js';
import { PartRepository } from './part/part.repository.js';
import { RoleRepository } from './role/role.repository.js';

@Module({
  providers: [
    { provide: AccessResolver, useClass: MemberAccessResolver },
    RoleRepository,
    ClubRepository,
    PartRepository,
    NoticeCategoryRepository,
  ],
  exports: [
    AccessResolver,
    RoleRepository,
    ClubRepository,
    PartRepository,
    NoticeCategoryRepository,
  ],
})
export class ClubModule {}
