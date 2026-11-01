import { Password } from './password.js';

describe('Password.parse', () => {
  it('영문·숫자·특수문자가 모두 있는 8자는 받는다', () => {
    expect(Password.parse('abcd123!').value).toBe('abcd123!');
  });

  it('7자이면 실패한다', () => {
    expect(() => Password.parse('abc123!')).toThrow(RangeError);
  });

  it('특수문자가 없으면 실패한다', () => {
    expect(() => Password.parse('abcd1234')).toThrow(RangeError);
  });

  it('숫자가 없으면 실패한다', () => {
    expect(() => Password.parse('abcdefg!')).toThrow(RangeError);
  });

  it('영문이 없으면 실패한다', () => {
    expect(() => Password.parse('가나다라123!')).toThrow(RangeError);
  });

  it('공백도 특수문자로 센다', () => {
    expect(Password.parse('abcd 123').value).toBe('abcd 123');
  });
});
