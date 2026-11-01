/** Sends the mail better-auth asks for: through SES when MAIL_FROM is set (SesAuthMailer), else to the log. */
export abstract class AuthMailer {
  abstract sendVerification(to: string, url: string): Promise<void>;

  /** The link that resets a forgotten password (merged 3.2). */
  abstract sendPasswordReset(to: string, url: string): Promise<void>;
}
