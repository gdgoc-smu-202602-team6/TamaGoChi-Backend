import { Global, Module } from '@nestjs/common';
import { DatabaseClient } from './database-client.js';
import { DatabaseConfig } from './database-config.js';

/** Global for DatabaseClient; DatabaseConfig is not exported, so the database URL stays here. */
@Global()
@Module({
  providers: [
    {
      provide: DatabaseConfig,
      useFactory: () => DatabaseConfig.fromEnv(process.env),
    },
    DatabaseClient,
  ],
  exports: [DatabaseClient],
})
export class DatabaseModule {}
