import { InviteCode } from './invite-code.js';

describe('InviteCode', () => {
  it('만든 코드는 대문자·숫자 8자다', () => {
    expect(InviteCode.generate().value).toMatch(/^[A-Z0-9]{8}$/);
  });

  it('소문자가 섞이면 실패한다', () => {
    expect(() => InviteCode.parse('abcd1234')).toThrow(RangeError);
  });

  it('7자이면 실패한다', () => {
    expect(() => InviteCode.parse('ABCD123')).toThrow(RangeError);
  });
});
