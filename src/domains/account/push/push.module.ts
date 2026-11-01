import { Global, Module } from '@nestjs/common';
import { PushSender } from '../../../foundation/push/push-sender.js';
import { LoggingPushSender } from './logging-push-sender.js';

/**
 * The account domain's implementation of the foundation's PushSender (it owns the device tokens). Global, so other
 * domains send through the foundation's type without importing the account domain; AppModule imports it once.
 */
@Global()
@Module({
  providers: [{ provide: PushSender, useClass: LoggingPushSender }],
  exports: [PushSender],
})
export class PushModule {}
