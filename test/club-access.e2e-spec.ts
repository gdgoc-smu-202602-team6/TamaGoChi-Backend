import request from 'supertest';
import { insertClub, insertMember } from './club-fixtures.js';
import { as, type SignedInUser } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('club access and roles', () => {
  const testApp = TestApp.setUp();
  let club: { clubId: string; partId: string };
  let operator: SignedInUser;
  let member: SignedInUser;
  let outsider: SignedInUser;

  beforeAll(async () => {
    [operator, member, outsider] = await Promise.all([
      testApp.signUp(),
      testApp.signUp(),
      testApp.signUp(),
    ]);
    club = await insertClub(testApp.database);
    await insertMember(testApp.database, club, operator.email, 'operator');
    await insertMember(testApp.database, club, member.email, 'member');
  });

  afterAll(async () => {
    await testApp.database.club.delete({ where: { id: club.clubId } });
  });

  it('운영진의 내 권한은 키 6개다', async () => {
    const response = await request(testApp.server())
      .get(`/clubs/${club.clubId}/members/me/permissions`)
      .set(as(operator));

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(6);
  });

  it('부원의 내 권한은 비어 있다', async () => {
    const response = await request(testApp.server())
      .get(`/clubs/${club.clubId}/members/me/permissions`)
      .set(as(member));

    expect({ status: response.status, items: response.body.items }).toEqual({
      status: 200,
      items: [],
    });
  });

  it('부원이 아니면 그 동아리는 404다', async () => {
    const response = await request(testApp.server())
      .get(`/clubs/${club.clubId}/members/me/permissions`)
      .set(as(outsider));

    expect(response.status).toBe(404);
  });
});
