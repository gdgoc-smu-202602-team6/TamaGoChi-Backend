import { Module } from '@nestjs/common';
import { AccessResolver } from '../../foundation/access/access-resolver.js';
import { ApplicationRepository } from './application/application.repository.js';
import { ClubRepository } from './club/club.repository.js';
import { MemberAccessResolver } from './member/member-access-resolver.js';
import { MemberRepository } from './member/member.repository.js';
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
    ApplicationRepository,
    MemberRepository,
  ],
  exports: [
    AccessResolver,
    RoleRepository,
    ClubRepository,
    PartRepository,
    NoticeCategoryRepository,
    ApplicationRepository,
    MemberRepository,
  ],
})
export class ClubModule {}
