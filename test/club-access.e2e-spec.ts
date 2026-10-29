import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertClub, insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('club access and roles', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  let club: { clubId: string; partId: string };
  let operator: SignedInUser;
  let member: SignedInUser;
  let outsider: SignedInUser;
  const as = (user: SignedInUser) => ({ Authorization: `Bearer ${user.token}` });

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
    [operator, member, outsider] = await Promise.all([
      signUpVerifiedUser(app, mailer),
      signUpVerifiedUser(app, mailer),
      signUpVerifiedUser(app, mailer),
    ]);
    club = await insertClub(database);
    await insertMember(database, club, operator.email, 'operator');
    await insertMember(database, club, member.email, 'member');
  });

  afterAll(async () => {
    await database.club.delete({ where: { id: club.clubId } });
    await database.user.deleteMany({ where: { email: { in: [operator.email, member.email, outsider.email] } } });
    await app.close();
  });

  it('역할 목록에 운영진(모든 권한)과 부원(권한 없음)이 있다', async () => {
    const response = await request(app.getHttpServer()).get('/roles').set(as(outsider));

    expect(response.status).toBe(200);
    const byName = Object.fromEntries(
      response.body.items.map((role: { name: string; permissions: string[] }) => [role.name, role.permissions.length]),
    );
    expect(byName).toEqual({ 운영진: 7, 부원: 0 });
  });

  it('운영진의 내 권한은 키 7개다', async () => {
    const response = await request(app.getHttpServer())
      .get(`/clubs/${club.clubId}/members/me/permissions`)
      .set(as(operator));

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(7);
  });

  it('부원의 내 권한은 비어 있다', async () => {
    const response = await request(app.getHttpServer())
      .get(`/clubs/${club.clubId}/members/me/permissions`)
      .set(as(member));

    expect({ status: response.status, items: response.body.items }).toEqual({ status: 200, items: [] });
  });

  it('부원이 아니면 그 동아리는 404다', async () => {
    const response = await request(app.getHttpServer())
      .get(`/clubs/${club.clubId}/members/me/permissions`)
      .set(as(outsider));

    expect(response.status).toBe(404);
  });
});
