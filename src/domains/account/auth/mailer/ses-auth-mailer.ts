import { SendEmailCommand, type SESv2Client } from '@aws-sdk/client-sesv2';
import { type AuthMail, authMails } from './auth-mail.js';
import { AuthMailer } from './auth-mailer.js';

/**
 * Sends the mail through Amazon SES. The client finds its credentials and region the AWS SDK's way (on EC2, the
 * instance role); `from` is a sender of an identity SES has verified.
 */
export class SesAuthMailer extends AuthMailer {
  constructor(
    private readonly client: Pick<SESv2Client, 'send'>,
    private readonly from: string,
  ) {
    super();
  }

  sendVerification(to: string, url: string): Promise<void> {
    return this.send(to, authMails.verification(url));
  }

  sendPasswordReset(to: string, url: string): Promise<void> {
    return this.send(to, authMails.passwordReset(url));
  }

  private async send(to: string, mail: AuthMail): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: mail.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: mail.text, Charset: 'UTF-8' },
              Html: { Data: mail.html, Charset: 'UTF-8' },
            },
          },
        },
      }),
    );
  }
}
