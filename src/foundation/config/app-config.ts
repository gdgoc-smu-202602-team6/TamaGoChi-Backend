import { assertEnvironment } from './assert-environment.js';

/** How the server process runs. Each other setting is read by the module that uses it. */
export class AppConfig {
  private constructor(
    readonly port: number,
    readonly production: boolean,
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv): AppConfig {
    const problems: string[] = [];

    const port = Number(env.PORT ?? '3000');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      problems.push('PORT must be an integer between 1 and 65535');
    }

    assertEnvironment(problems);
    return new AppConfig(port, env.NODE_ENV === 'production');
  }
}
