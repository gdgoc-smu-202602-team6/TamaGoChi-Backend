import { Injectable, Logger } from '@nestjs/common';
import { AuthMailer } from './auth-mailer.js';

/** Writes the mail to the log instead of sending it. For development. */
@Injectable()
export class LoggingAuthMailer extends AuthMailer {
  private readonly logger = new Logger(LoggingAuthMailer.name);

  sendVerification(to: string, url: string): Promise<void> {
    this.logger.log(`email verification for ${to}: ${url}`);
    return Promise.resolve();
  }
}
