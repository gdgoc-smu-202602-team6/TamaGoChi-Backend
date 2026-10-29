import { textLength, trimmedWithin } from './text-length.js';

describe('textLength', () => {
  it('합성 이모지는 한 글자로 센다', () => {
    expect(textLength('가👩‍💻')).toBe(2);
  });

  it('빈 문자열은 0이다', () => {
    expect(textLength('')).toBe(0);
  });
});

describe('trimmedWithin', () => {
  it('앞뒤 공백을 지운 값을 돌려준다', () => {
    expect(trimmedWithin(' 가나 ', 1, 2, 'name')).toBe('가나');
  });

  it('최대보다 한 글자 많으면 실패한다', () => {
    expect(() => trimmedWithin('가나다', 1, 2, 'name')).toThrow(
      /name must be 1 to 2/,
    );
  });
});
