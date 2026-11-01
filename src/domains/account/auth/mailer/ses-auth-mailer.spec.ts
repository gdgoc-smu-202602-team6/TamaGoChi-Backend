import type { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { SesAuthMailer } from './ses-auth-mailer.js';

describe('SesAuthMailer', () => {
  it('인증 메일은 발신자·수신자·제목과 링크가 든 본문으로 SES에 보낸다', async () => {
    const sent: SendEmailCommand[] = [];
    const mailer = new SesAuthMailer(
      {
        send: (command: SendEmailCommand) => {
          sent.push(command);
          return Promise.resolve({});
        },
      } as never,
      '다마GoC치 <noreply@tmgoc.kro.kr>',
    );

    await mailer.sendVerification(
      'user@example.com',
      'https://api.tmgoc.kro.kr/auth/verify-email?token=t&a=1',
    );

    const input = sent[0].input;
    expect(input.FromEmailAddress).toBe('다마GoC치 <noreply@tmgoc.kro.kr>');
    expect(input.Destination?.ToAddresses).toEqual(['user@example.com']);
    expect(input.Content?.Simple?.Subject?.Data).toBe(
      '[다마GoC치] 이메일 인증',
    );
    expect(input.Content?.Simple?.Body?.Text?.Data).toContain(
      'https://api.tmgoc.kro.kr/auth/verify-email?token=t&a=1',
    );
    expect(input.Content?.Simple?.Body?.Html?.Data).toContain(
      'href="https://api.tmgoc.kro.kr/auth/verify-email?token=t&amp;a=1"',
    );
  });

  it('SES가 실패하면 그 오류를 던진다', async () => {
    const mailer = new SesAuthMailer(
      { send: () => Promise.reject(new Error('throttled')) } as never,
      'noreply@tmgoc.kro.kr',
    );

    await expect(
      mailer.sendPasswordReset('user@example.com', 'https://x'),
    ).rejects.toThrow('throttled');
  });
});
