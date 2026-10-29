import { createApp } from './create-app.js';
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
  const app = await createApp();
  await app.listen(app.get(AppConfig).port);
}
await bootstrap();
