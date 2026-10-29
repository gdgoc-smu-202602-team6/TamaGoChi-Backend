export class AppConfig {
  private constructor(
    readonly port: number,
    readonly databaseUrl: string,
    readonly production: boolean,
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv): AppConfig {
    const problems: string[] = [];

    const port = Number(env.PORT ?? '3000');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      problems.push('PORT must be an integer between 1 and 65535');
    }

    const databaseUrl = env.DATABASE_URL ?? '';
    if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
      problems.push('DATABASE_URL must be a postgresql:// URL');
    }

    if (problems.length > 0) {
      throw new Error(`Invalid environment: ${problems.join('; ')}`);
    }
    return new AppConfig(port, databaseUrl, env.NODE_ENV === 'production');
  }
}
