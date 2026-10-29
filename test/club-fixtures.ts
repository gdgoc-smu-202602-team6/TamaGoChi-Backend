import { randomInt } from 'node:crypto';
import type { DatabaseClient } from '../src/foundation/database/database-client.js';

const inviteAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** A club with one part, for tests that need a club before createClub is called. */
export async function insertClub(
  database: DatabaseClient,
): Promise<{ clubId: string; partId: string }> {
  const inviteCode = Array.from(
    { length: 8 },
    () => inviteAlphabet[randomInt(inviteAlphabet.length)],
  ).join('');
  const club = await database.club.create({
    data: {
      name: '테스트 동아리',
      inviteCode,
      parts: { create: { name: 'Dev', color: 'BLUE' } },
    },
    select: { id: true, parts: { select: { id: true } } },
  });
  return { clubId: club.id, partId: club.parts[0].id };
}

/** Makes the user with this email a member, with the role that has this assignment mark. */
export async function insertMember(
  database: DatabaseClient,
  club: { clubId: string; partId: string },
  email: string,
  as: 'operator' | 'member',
): Promise<string> {
  const user = await database.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  const role = await database.role.findFirstOrThrow({
    where:
      as === 'operator' ? { assignedOnCreate: true } : { assignedOnJoin: true },
    select: { id: true },
  });
  const member = await database.clubMember.create({
    data: {
      clubId: club.clubId,
      userId: user.id,
      partId: club.partId,
      roleId: role.id,
    },
    select: { id: true },
  });
  return member.id;
}
