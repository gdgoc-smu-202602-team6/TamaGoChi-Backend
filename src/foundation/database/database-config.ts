import { assertEnvironment } from '../config/assert-environment.js';

/** Where the database is. The URL carries its password, so only DatabaseClient receives it. */
export class DatabaseConfig {
  private constructor(readonly url: string) {}

  static fromEnv(env: NodeJS.ProcessEnv): DatabaseConfig {
    const problems: string[] = [];

    const url = env.DATABASE_URL ?? '';
    if (!/^postgres(ql)?:\/\//.test(url)) {
      problems.push('DATABASE_URL must be a postgresql:// URL');
    }

    assertEnvironment(problems);
    return new DatabaseConfig(url);
  }
}
