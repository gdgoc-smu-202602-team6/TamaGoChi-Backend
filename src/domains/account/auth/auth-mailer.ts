/** Sends the mail better-auth asks for. Development logs it; production sends it through SES. */
export abstract class AuthMailer {
  abstract sendVerification(to: string, url: string): Promise<void>;

  /** The link that resets a forgotten password (merged 3.2). */
  abstract sendPasswordReset(to: string, url: string): Promise<void>;
}
