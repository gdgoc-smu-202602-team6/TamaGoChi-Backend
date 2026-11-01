import { AuthMailer } from '../src/domains/account/users/auth/mailer/auth-mailer.js';

/** Keeps the links better-auth asks to send, instead of sending them. */
export class CapturingAuthMailer extends AuthMailer {
  readonly verificationUrls = new Map<string, string>();
  readonly passwordResetUrls = new Map<string, string>();

  sendVerification(to: string, url: string): Promise<void> {
    this.verificationUrls.set(to, url);
    return Promise.resolve();
  }

  sendPasswordReset(to: string, url: string): Promise<void> {
    this.passwordResetUrls.set(to, url);
    return Promise.resolve();
  }
}
