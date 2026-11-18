import { Module } from '@nestjs/common';
import { ApplicationRepository } from './clubs/applications/application.repository.js';
import { ClubRepository } from './clubs/club.repository.js';
import { NoticeDispatcher } from './clubs/notices/notice-dispatcher.js';
import { NoticeRepository } from './clubs/notices/notice.repository.js';
import { MemberRepository } from './clubs/members/member.repository.js';
import { NoticeCategoryRepository } from './clubs/notice-categories/notice-category.repository.js';
import { PartRepository } from './clubs/parts/part.repository.js';

const providers = [
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
