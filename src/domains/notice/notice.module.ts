import { Module } from '@nestjs/common';
import { NoticeDispatcher } from './notice/notice-dispatcher.js';
import { NoticeRepository } from './notice/notice.repository.js';

/** notice: per club. NoticeAudience and PushSender come from the foundation; AppModule wires them. */
@Module({
  providers: [NoticeRepository, NoticeDispatcher],
  exports: [NoticeRepository, NoticeDispatcher],
})
export class NoticeModule {}
