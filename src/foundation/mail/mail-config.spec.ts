import { MailConfig } from './mail-config.js';

const valid = {};

describe('MailConfig.fromEnv', () => {
  it('MAIL_FROM이 없으면 메일 발신자는 null이다', () => {
    expect(MailConfig.fromEnv(valid).from).toBeNull();
  });

  it('MAIL_FROM은 이름과 주소를 함께 받는다', () => {
    expect(
      MailConfig.fromEnv({
        ...valid,
        MAIL_FROM: '다마GoC치 <noreply@tmgoc.kro.kr>',
      }).from,
    ).toBe('다마GoC치 <noreply@tmgoc.kro.kr>');
  });

  it('MAIL_FROM이 주소가 아니면 실패한다', () => {
    expect(() =>
      MailConfig.fromEnv({ ...valid, MAIL_FROM: 'noreply' }),
    ).toThrow(/MAIL_FROM/);
  });
});
