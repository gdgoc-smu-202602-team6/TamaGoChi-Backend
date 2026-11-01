import { FixedLengthFormat } from './fixed-length-format.js';

describe('FixedLengthFormat', () => {
  it('문자 집합의 범위를 글자 목록으로 풀고 길이를 읽는다', () => {
    const format = FixedLengthFormat.of('^[A-C0-2_]{4}$');

    expect([format.alphabet, format.length]).toEqual(['ABC012_', 4]);
  });

  it('그 모양이 아닌 pattern이면 실패한다', () => {
    expect(() => FixedLengthFormat.of('^[a-z]+$')).toThrow(Error);
  });
});
