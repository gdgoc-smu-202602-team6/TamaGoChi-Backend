import request from 'supertest';
import { insertMember } from './club-fixtures.js';
import { as, type SignedInUser } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('parts and notice categories', () => {
  const testApp = TestApp.setUp();
  let operator: SignedInUser;
  let member: SignedInUser;
  let outsider: SignedInUser;
  let clubId: string;
  let devPartId: string;

  beforeAll(async () => {
    [operator, member, outsider] = await Promise.all([
      testApp.signUp(),
      testApp.signUp(),
      testApp.signUp(),
    ]);
    const created = await request(testApp.server())
      .post('/clubs')
      .set(as(operator))
      .send({
        name: '라벨',
        parts: [{ name: 'Dev', color: 'BLUE' }],
        myPartName: 'Dev',
      });
    clubId = created.body.id;
    devPartId = (
      await testApp.database.clubPart.findFirstOrThrow({
        where: { clubId, name: 'Dev' },
      })
    ).id;
    await insertMember(
      testApp.database,
      { clubId, partId: devPartId },
      member.email,
      'member',
    );
  });

  afterAll(async () => {
    await testApp.database.club.delete({ where: { id: clubId } });
  });

  describe('parts', () => {
    it('부원이 아니어도 파트 목록을 읽는다(신청 화면)', async () => {
      const response = await request(testApp.server())
        .get(`/clubs/${clubId}/parts`)
        .set(as(outsider));

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([
        { id: devPartId, name: 'Dev', color: 'BLUE' },
      ]);
    });

    it('이름이 겹치면 409 duplicate-name이다', async () => {
      const response = await request(testApp.server())
        .post(`/clubs/${clubId}/parts`)
        .set(as(operator))
        .send({ name: ' Dev ', color: 'GRAY' });

      expect(response.status).toBe(409);
      expect(JSON.parse(response.text).type).toBe('/problems/duplicate-name');
    });

    it('parts.manage가 없으면 403이다', async () => {
      const response = await request(testApp.server())
        .post(`/clubs/${clubId}/parts`)
        .set(as(member))
        .send({ name: 'AI', color: 'PURPLE' });

      expect(response.status).toBe(403);
    });

    it('부원이 쓰는 파트는 409 in-use, 쓰지 않는 파트는 삭제한다', async () => {
      const created = await request(testApp.server())
        .post(`/clubs/${clubId}/parts`)
        .set(as(operator))
        .send({ name: '디자인', color: 'PINK' });

      const inUse = await request(testApp.server())
        .delete(`/clubs/${clubId}/parts/${devPartId}`)
        .set(as(operator));
      const unused = await request(testApp.server())
        .delete(`/clubs/${clubId}/parts/${created.body.id}`)
        .set(as(operator));

      expect(created.status).toBe(201);
      expect(JSON.parse(inUse.text).type).toBe('/problems/in-use');
      expect(unused.status).toBe(204);
    });
  });

  describe('notice categories', () => {
    it('부원은 전체공지가 맨 앞인 분류 목록을 읽는다', async () => {
      await request(testApp.server())
        .post(`/clubs/${clubId}/noticeCategories`)
        .set(as(operator))
        .send({ name: 'AI', color: 'PURPLE' });

      const response = await request(testApp.server())
        .get(`/clubs/${clubId}/noticeCategories`)
        .set(as(member));

      expect(response.status).toBe(200);
      expect(
        response.body.items.map((c: { name: string; preset: boolean }) => [
          c.name,
          c.preset,
        ]),
      ).toEqual([
        ['전체공지', true],
        ['AI', false],
      ]);
    });

    it('전체공지는 지울 수 없다(409 preset)', async () => {
      const preset = await testApp.database.clubNoticeCategory.findFirstOrThrow(
        {
          where: { clubId, preset: true },
        },
      );

      const response = await request(testApp.server())
        .delete(`/clubs/${clubId}/noticeCategories/${preset.id}`)
        .set(as(operator));

      expect(response.status).toBe(409);
      expect(JSON.parse(response.text).type).toBe('/problems/preset');
    });

    it('세부 분류를 생성하고, 이름이 겹치면 409, 삭제하면 204다', async () => {
      const study = await request(testApp.server())
        .post(`/clubs/${clubId}/noticeCategories`)
        .set(as(operator))
        .send({ name: '스터디', color: 'GREEN' });
      const path = `/clubs/${clubId}/noticeCategories/${study.body.id}/subcategories`;

      const first = await request(testApp.server())
        .post(path)
        .set(as(operator))
        .send({ name: 'LLM' });
      const duplicate = await request(testApp.server())
        .post(path)
        .set(as(operator))
        .send({ name: 'LLM' });
      const removed = await request(testApp.server())
        .delete(`${path}/${first.body.id}`)
        .set(as(operator));

      expect([first.status, duplicate.status, removed.status]).toEqual([
        201, 409, 204,
      ]);
    });

    it('공지가 쓰는 분류는 409 in-use다', async () => {
      const category = await request(testApp.server())
        .post(`/clubs/${clubId}/noticeCategories`)
        .set(as(operator))
        .send({ name: 'Dev', color: 'BLUE' });
      const author = await testApp.database.user.findUniqueOrThrow({
        where: { email: operator.email },
      });
      await testApp.database.clubNotice.create({
        data: {
          clubId,
          categoryId: category.body.id,
          authorUserId: author.id,
          title: '제목',
          body: '본문',
          notificationState: 'NONE',
        },
      });

      const response = await request(testApp.server())
        .delete(`/clubs/${clubId}/noticeCategories/${category.body.id}`)
        .set(as(operator));

      expect(response.status).toBe(409);
      expect(JSON.parse(response.text).type).toBe('/problems/in-use');
    });
  });
});
