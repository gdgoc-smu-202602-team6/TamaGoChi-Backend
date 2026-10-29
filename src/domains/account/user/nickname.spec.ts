import { Nickname } from './nickname.js';

describe('Nickname.parse', () => {
  it('앞뒤 공백을 지운 값을 담는다', () => {
    expect(Nickname.parse('  서연 ').value).toBe('서연');
  });

  it('보이는 글자 10자는 받는다(이모지 포함)', () => {
    expect(Nickname.parse('가나다라마바사아자👩‍💻').value).toBe('가나다라마바사아자👩‍💻');
  });

  it('11자이면 실패한다', () => {
    expect(() => Nickname.parse('가나다라마바사아자차카')).toThrow(RangeError);
  });

  it('공백만 있으면 실패한다', () => {
    expect(() => Nickname.parse('   ')).toThrow(RangeError);
  });
});
