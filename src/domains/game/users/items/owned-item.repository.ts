import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import type { Item } from '../../items/item.js';
import type { OwnedItem } from './owned-item.js';
import type { QueryClient } from '../../../../foundation/database/query-client.js';

@Injectable()
export class OwnedItemRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** What the user has: the items owned from the start, then the bought ones (M-12). */
  async owned(
    userId: Id<'User'>,
    catalog: readonly Item[],
    client: QueryClient = this.database,
  ): Promise<OwnedItem[]> {
    const rows = await client.userItem.findMany({
      where: { userId },
      select: { itemId: true, price: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const byId = new Map(catalog.map((item) => [item.id, item]));
    const bought = rows.flatMap((row) => {
      const item = byId.get(asId<'Item'>(row.itemId));
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
  async spent(
    userId: Id<'User'>,
    client: QueryClient = this.database,
  ): Promise<number> {
    const total = await client.userItem.aggregate({
      where: { userId },
      _sum: { price: true },
    });
    return total._sum.price ?? 0;
  }

  /** Records a purchase at the item's price now; the price paid stays when the catalog changes (8.3). */
  async buy(
    userId: Id<'User'>,
    item: Item,
    client: QueryClient = this.database,
  ): Promise<OwnedItem> {
    const row = await client.userItem.create({
      data: { userId, itemId: item.id, price: item.price },
      select: { price: true, createdAt: true },
    });
    return { item, pricePaid: row.price, purchasedAt: row.createdAt };
  }
}
