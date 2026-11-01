import { Module } from '@nestjs/common';
import { AppConfig } from './app-config.js';

/** The server process's settings, read by main and configureApp. */
@Module({
  providers: [
    { provide: AppConfig, useFactory: () => AppConfig.fromEnv(process.env) },
  ],
  exports: [AppConfig],
})
export class ConfigModule {}
