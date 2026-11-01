import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { NoticeAudience } from '../../../foundation/membership/notice-audience.js';

@Injectable()
export class MemberNoticeAudience extends NoticeAudience {
  constructor(private readonly database: DatabaseClient) {
    super();
  }

  async recipients(clubId: string): Promise<readonly string[]> {
    const rows = await this.database.clubMember.findMany({
      where: { clubId, notificationsOn: true },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }
}
