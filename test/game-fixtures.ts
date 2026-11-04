import type { DatabaseClient } from '../src/foundation/database/database-client.js';
import type {
  Item,
  Prisma,
} from '../src/foundation/database/generated/client.js';

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

/** Runs `use` with an item added to the catalog for the test, then takes it out of every room, inventory and the catalog. */
export async function withCatalogItem(
  database: DatabaseClient,
  data: Prisma.ItemCreateInput,
  use: (item: Item) => Promise<void>,
) {
  const item = await database.item.create({ data });
  try {
    await use(item);
  } finally {
    await database.userRoomItem.deleteMany({ where: { itemId: item.id } });
    await database.userItem.deleteMany({ where: { itemId: item.id } });
    await database.item.delete({ where: { id: item.id } });
  }
}
