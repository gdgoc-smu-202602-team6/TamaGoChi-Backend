export class AppConfig {
  private constructor(
    readonly port: number,
    readonly databaseUrl: string,
    readonly production: boolean,
    /** better-auth's signing secret. */
    readonly authSecret: string,
    /** The server's public base URL; better-auth builds links (email verification) from it. */
    readonly publicUrl: string,
    /** The sender of account mail, e.g. `다마GoC치 <noreply@tmgoc.kro.kr>`; null keeps mail in the log. */
    readonly mailFrom: string | null,
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

    const authSecret = env.BETTER_AUTH_SECRET ?? '';
    if (authSecret.length < 32) {
      problems.push('BETTER_AUTH_SECRET must be at least 32 characters');
    }

    const publicUrl = env.PUBLIC_URL ?? '';
    if (!/^https?:\/\/[^/]+/.test(publicUrl)) {
      problems.push('PUBLIC_URL must be an http(s) URL');
    }

    const mailFrom = env.MAIL_FROM?.trim() || null;
    if (mailFrom !== null && !/@[^@\s>]+\.[^@\s>]+>?$/.test(mailFrom)) {
      problems.push('MAIL_FROM must be an address, optionally with a name');
    }

    if (problems.length > 0) {
      throw new Error(`Invalid environment: ${problems.join('; ')}`);
    }
    return new AppConfig(
      port,
      databaseUrl,
      env.NODE_ENV === 'production',
      authSecret,
      publicUrl,
      mailFrom,
    );
  }
}
