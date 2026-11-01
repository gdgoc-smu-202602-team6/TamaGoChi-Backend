import { assertEnvironment } from '../../../../foundation/config/assert-environment.js';

/** What better-auth signs with and the address it builds links (email verification) from. */
export class AuthConfig {
  private constructor(
    /** better-auth's signing secret. */
    readonly secret: string,
    /** The server's public base URL. */
    readonly publicUrl: string,
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv): AuthConfig {
    const problems: string[] = [];

    const secret = env.BETTER_AUTH_SECRET ?? '';
    if (secret.length < 32) {
      problems.push('BETTER_AUTH_SECRET must be at least 32 characters');
    }

    const publicUrl = env.PUBLIC_URL ?? '';
    if (!/^https?:\/\/[^/]+/.test(publicUrl)) {
      problems.push('PUBLIC_URL must be an http(s) URL');
    }

    assertEnvironment(problems);
    return new AuthConfig(secret, publicUrl);
  }
}
