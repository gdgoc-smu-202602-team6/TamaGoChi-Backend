import type { DatabaseClient } from '../src/foundation/database/database-client.js';

export const minute = 60 * 1000;

/** An ended session of `length` minutes that started `ago` minutes ago. */
export function studied(
  database: DatabaseClient,
  userId: string,
  ago: number,
  length: number,
) {
  return database.userStudySession.create({
    data: {
      userId,
      startedAt: new Date(Date.now() - ago * minute),
      endedAt: new Date(Date.now() - (ago - length) * minute),
    },
  });
}

/** The seeded catalog item with this code. */
export function itemByCode(database: DatabaseClient, code: string) {
  return database.item.findUniqueOrThrow({ where: { code } });
}
