import { BadRequest } from '../problem/problems/bad-request.js';
import { pageRequest } from './page-request.js';
import { toPage } from './page.js';

const rows = [
  { id: 'c', createdAt: new Date('2026-10-29T03:00:00Z') },
  { id: 'b', createdAt: new Date('2026-10-29T02:00:00Z') },
  { id: 'a', createdAt: new Date('2026-10-29T01:00:00Z') },
];

describe('pageRequest and toPage', () => {
  it('페이지 크기보다 하나 더 읽혔으면 다음 페이지 토큰을 주고, 그 토큰은 마지막 항목 뒤에서 시작한다', () => {
    const first = toPage(pageRequest('q', 2), rows, (row) => row.id);

    const next = pageRequest('q', 2, first.nextPageToken);

    expect(first.items).toEqual(['c', 'b']);
    expect(next.after).toEqual({ id: 'b', createdAt: rows[1].createdAt });
  });

  it('남은 행이 페이지 크기 이하이면 토큰이 없다', () => {
    expect(
      toPage(pageRequest('q', 3), rows, (row) => row.id).nextPageToken,
    ).toBeUndefined();
  });

  it('다른 목록의 토큰이면 400이다', () => {
    const token = toPage(
      pageRequest('q', 1),
      rows,
      (row) => row.id,
    ).nextPageToken;

    expect(() => pageRequest('other', 1, token)).toThrow(BadRequest);
  });

  it('깨진 토큰이면 400이다', () => {
    expect(() => pageRequest('q', 1, 'not-base64-json')).toThrow(BadRequest);
  });

  it('맨 앞 정렬 키가 있는 목록의 토큰은 그 키도 기억한다', () => {
    const pinned = rows.map((row, index) => ({
      ...row,
      leadingKey: index === 0,
    }));
    const first = toPage(pageRequest('q', 1), pinned, (row) => row.id);

    const next = pageRequest('q', 1, first.nextPageToken);

    expect(next.after).toEqual({
      id: 'c',
      createdAt: rows[0].createdAt,
      leadingKey: true,
    });
  });

  it('페이지 크기가 0이면 항목도 토큰도 없다', () => {
    expect(toPage(pageRequest('q', 0), rows, (row) => row.id)).toEqual({
      items: [],
    });
  });
});
