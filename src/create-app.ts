import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppConfig } from './foundation/config/app-config.js';
import { ProblemFilter } from './foundation/problem/problem.filter.js';

/** Builds the application the same way for the server and for end-to-end tests. */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfig);
  app.useGlobalFilters(new ProblemFilter(!config.production));
  return app;
}
