import { Global, Module } from '@nestjs/common';
import { AccessResolver } from '../../foundation/access/access-resolver.js';
import { JoinDays } from '../../foundation/membership/join-days.js';
import { NoticeAudience } from '../../foundation/membership/notice-audience.js';
import { SharedClubs } from '../../foundation/membership/shared-clubs.js';
import { ApplicationJoinDays } from './application/application-join-days.js';
import { MemberAccessResolver } from './member/member-access-resolver.js';
import { MemberNoticeAudience } from './member/member-notice-audience.js';
import { MemberSharedClubs } from './member/member-shared-clubs.js';

/**
 * The club domain's implementations of the foundation's membership interfaces. Global, so other domains get them
 * through the foundation's types without importing the club domain; AppModule imports it once.
 */
@Global()
@Module({
  providers: [
    { provide: AccessResolver, useClass: MemberAccessResolver },
    { provide: JoinDays, useClass: ApplicationJoinDays },
    { provide: SharedClubs, useClass: MemberSharedClubs },
    { provide: NoticeAudience, useClass: MemberNoticeAudience },
  ],
  exports: [AccessResolver, JoinDays, SharedClubs, NoticeAudience],
})
export class MembershipModule {}
