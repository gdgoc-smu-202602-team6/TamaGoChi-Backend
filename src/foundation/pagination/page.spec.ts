import { BadRequest } from '../problem/problems/bad-request.js';
import { pageRequest, toPage } from './page.js';

const rows = [
  { id: 'c', createdAt: new Date('2026-10-29T03:00:00Z') },
  { id: 'b', createdAt: new Date('2026-10-29T02:00:00Z') },
  { id: 'a', createdAt: new Date('2026-10-29T01:00:00Z') },
];

describe('pageRequest and toPage', () => {
  it('크기보다 하나 더 읽혔으면 다음 쪽 토큰을 주고, 그 토큰은 마지막 항목 뒤에서 시작한다', () => {
    const first = toPage('q', pageRequest('q', 2), rows, (row) => row.id);

    const next = pageRequest('q', 2, first.nextPageToken);

    expect(first.items).toEqual(['c', 'b']);
    expect(next.after).toEqual({ id: 'b', createdAt: rows[1].createdAt });
  });

  it('남은 행이 크기 이하이면 토큰이 없다', () => {
    expect(
      toPage('q', pageRequest('q', 3), rows, (row) => row.id).nextPageToken,
    ).toBeUndefined();
  });

  it('다른 목록의 토큰이면 400이다', () => {
    const token = toPage(
      'q',
      pageRequest('q', 1),
      rows,
      (row) => row.id,
    ).nextPageToken;

    expect(() => pageRequest('other', 1, token)).toThrow(BadRequest);
  });

  it('깨진 토큰이면 400이다', () => {
    expect(() => pageRequest('q', 1, 'not-base64-json')).toThrow(BadRequest);
  });
});
