/** Sends the mail better-auth asks for. Development logs it; production sends it through SES. */
export abstract class AuthMailer {
  abstract sendVerification(to: string, url: string): Promise<void>;
}
