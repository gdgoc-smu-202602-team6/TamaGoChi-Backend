import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { applicationOptions, configureApp } from './configure-app.js';
import { AppConfig } from './foundation/config/app-config.js';

async function bootstrap() {
  const app = configureApp(
    await NestFactory.create<NestExpressApplication>(
      AppModule,
      applicationOptions,
    ),
  );
  await app.listen(app.get(AppConfig).port);
}
await bootstrap();
