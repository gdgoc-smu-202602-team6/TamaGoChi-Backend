import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppConfig } from './foundation/config/app-config.js';

function loadDotEnv(): void {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function bootstrap() {
  loadDotEnv();
  const app = await NestFactory.create(AppModule);
  await app.listen(app.get(AppConfig).port);
}
await bootstrap();
