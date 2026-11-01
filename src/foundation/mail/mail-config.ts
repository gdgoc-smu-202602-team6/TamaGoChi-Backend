import { assertEnvironment } from '../config/assert-environment.js';

/** Who outgoing mail is from. */
export class MailConfig {
  private constructor(
    /** The sender, e.g. `다마GoC치 <noreply@tmgoc.kro.kr>`, of an identity SES has verified; null keeps mail in the log. */
    readonly from: string | null,
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv): MailConfig {
    const problems: string[] = [];

    const from = env.MAIL_FROM?.trim() || null;
    if (from !== null && !/@[^@\s>]+\.[^@\s>]+>?$/.test(from)) {
      problems.push('MAIL_FROM must be an address, optionally with a name');
    }

    assertEnvironment(problems);
    return new MailConfig(from);
  }
}
