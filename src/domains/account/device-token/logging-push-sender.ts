import { Injectable, Logger } from '@nestjs/common';
import {
  type PushMessage,
  type PushOutcome,
  PushSender,
} from '../../../foundation/push/push-sender.js';

/** Writes push messages to the log instead of sending them. Until FCM is wired. */
@Injectable()
export class LoggingPushSender extends PushSender {
  private readonly logger = new Logger(LoggingPushSender.name);

  send(message: PushMessage): Promise<PushOutcome> {
    this.logger.log(
      `push to ${message.userIds.length} user(s): ${message.title} → ${message.link}`,
    );
    return Promise.resolve({ delivered: message.userIds.length, failed: 0 });
  }
}
