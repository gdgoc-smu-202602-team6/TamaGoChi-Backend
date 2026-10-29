import { Global, Module } from '@nestjs/common';
import { DatabaseClient } from './database-client.js';

@Global()
@Module({
  providers: [DatabaseClient],
  exports: [DatabaseClient],
})
export class DatabaseModule {}
