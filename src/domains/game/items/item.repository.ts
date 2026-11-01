import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import type { Prisma } from '../../../foundation/database/generated/client.js';
import type { OwnedItem } from '../users/items/owned-item.js';
import { type Grade, Item } from './item.js';
import { Slot, type SlotName } from './slot.js';

type Client = DatabaseClient | Prisma.TransactionClient;

const itemColumns = {
  id: true,
  code: true,
  slot: true,
  name: true,
  grade: true,
  price: true,
  minLevel: true,
  defaultOwned: true,
  roomSize: true,
} as const;

@Injectable()
export class ItemRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** The whole catalog, in a fixed order. */
  async catalog(client: Client = this.database): Promise<Item[]> {
    const rows = await client.item.findMany({
      select: itemColumns,
      orderBy: [{ minLevel: 'asc' }, { price: 'asc' }, { code: 'asc' }],
    });
    return rows.map(
      (row) =>
        new Item(
          row.id,
          row.code,
          Slot.of(row.slot as SlotName),
          row.name,
          row.grade as Grade,
          row.price,
          row.minLevel,
          row.defaultOwned,
          row.roomSize,
        ),
    );
  }

  /** What the user has: the items owned from the start, then the bought ones (M-12). */
  async owned(
    userId: string,
    catalog: readonly Item[],
    client: Client = this.database,
  ): Promise<OwnedItem[]> {
    const rows = await client.userItem.findMany({
      where: { userId },
      select: { itemId: true, price: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const byId = new Map(catalog.map((item) => [item.id, item]));
    const bought = rows.flatMap((row) => {
      const item = byId.get(row.itemId);
      return item
        ? [{ item, pricePaid: row.price, purchasedAt: row.createdAt }]
        : [];
    });
    const boughtIds = new Set(bought.map((one) => one.item.id));
    const fromStart = catalog
      .filter((item) => item.defaultOwned && !boughtIds.has(item.id))
      .map((item) => ({ item, pricePaid: 0 }));
    return [...fromStart, ...bought];
  }

  /** The volts the user has paid for items. */
  async spent(userId: string, client: Client = this.database): Promise<number> {
    const total = await client.userItem.aggregate({
      where: { userId },
      _sum: { price: true },
    });
    return total._sum.price ?? 0;
  }

  /** Records a purchase at the item's price now; the price paid stays when the catalog changes (8.3). */
  async buy(
    userId: string,
    item: Item,
    client: Client = this.database,
  ): Promise<OwnedItem> {
    const row = await client.userItem.create({
      data: { userId, itemId: item.id, price: item.price },
      select: { price: true, createdAt: true },
    });
    return { item, pricePaid: row.price, purchasedAt: row.createdAt };
  }
}
