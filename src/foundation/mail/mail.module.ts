import { SESv2Client } from '@aws-sdk/client-sesv2';
import { Module } from '@nestjs/common';
import { MailConfig } from './mail-config.js';

/**
 * The one Amazon SES client and the sender it sends as. The client finds its credentials and region the AWS SDK's
 * way (on EC2, the instance role). Not global: a module that sends mail imports it.
 */
@Module({
  providers: [
    { provide: SESv2Client, useFactory: () => new SESv2Client({}) },
    { provide: MailConfig, useFactory: () => MailConfig.fromEnv(process.env) },
  ],
  exports: [SESv2Client, MailConfig],
})
export class MailModule {}
