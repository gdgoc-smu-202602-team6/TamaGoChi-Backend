import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { NoticeAudience } from '../../../foundation/membership/notice-audience.js';
import { PushSender } from '../../../foundation/push/push-sender.js';
import type { Notice } from './notice.js';
import { NoticeRepository } from './notice.repository.js';

/**
 * Sends the pending notices to the members who turned notifications on (N-13, M-13) and records SENT or FAILED on
 * each (N-15). What is pending is the database's PENDING state, so a notice left pending by a restart is sent when
 * the server starts. Nothing waits for it, and no failure escapes it.
 */
@Injectable()
export class NoticeDispatcher implements OnApplicationBootstrap {
  private readonly logger = new Logger(NoticeDispatcher.name);
  private running = false;
  private again = false;

  constructor(
    private readonly audience: NoticeAudience,
    private readonly push: PushSender,
    private readonly notices: NoticeRepository,
  ) {}

  onApplicationBootstrap(): void {
    this.sendPending();
  }

  /** Starts sending what is pending, unless a run is going (that run then goes once more). */
  sendPending(): void {
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    void this.run()
      .catch((error: unknown) =>
        this.logger.error('pending notices were not read', error),
      )
      .finally(() => {
        this.running = false;
        if (this.again) {
          this.again = false;
          this.sendPending();
        }
      });
  }

  private async run(): Promise<void> {
    for (const notice of await this.notices.pending()) await this.send(notice);
  }

  private async send(notice: Notice): Promise<void> {
    let delivered = false;
    try {
      delivered = await this.push.send({
        userIds: await this.audience.recipients(notice.clubId),
        title: notice.title,
        body: notice.body,
        link: `club/${notice.clubId}/notices/${notice.id}`,
      });
    } catch (error) {
      this.logger.error(`notice ${notice.id} was not sent`, error);
    }
    try {
      await this.notices.moveNotification(
        notice.id,
        'PENDING',
        delivered ? 'SENT' : 'FAILED',
      );
    } catch (error) {
      this.logger.error(`notice ${notice.id} result was not recorded`, error);
    }
  }
}
