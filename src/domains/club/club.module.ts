import { Module } from '@nestjs/common';
import { ApplicationRepository } from './application/application.repository.js';
import { ClubRepository } from './club/club.repository.js';
import { NoticeDispatcher } from './clubs/notices/notice-dispatcher.js';
import { NoticeRepository } from './clubs/notices/notice.repository.js';
import { MemberRepository } from './member/member.repository.js';
import { NoticeCategoryRepository } from './notice-category/notice-category.repository.js';
import { PartRepository } from './part/part.repository.js';
import { RoleRepository } from './role/role.repository.js';

const providers = [
  RoleRepository,
  ClubRepository,
  PartRepository,
  NoticeCategoryRepository,
  ApplicationRepository,
  MemberRepository,
  NoticeRepository,
  NoticeDispatcher,
];

@Module({ providers, exports: providers })
export class ClubModule {}
