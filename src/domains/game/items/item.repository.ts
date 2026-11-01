import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { asId } from '../../../foundation/id/id.js';
import { type Grade, Item } from './item.js';
import type { SlotName } from './slot/slot.js';
import { slotOf } from './slot/slot-of.js';
import type { QueryClient } from '../../../foundation/database/query-client.js';

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
  async catalog(client: QueryClient = this.database): Promise<Item[]> {
    const rows = await client.item.findMany({
      select: itemColumns,
      orderBy: [{ minLevel: 'asc' }, { price: 'asc' }, { code: 'asc' }],
    });
    return rows.map(
      (row) =>
        new Item(
          asId<'Item'>(row.id),
          row.code,
          slotOf(row.slot as SlotName, row.roomSize),
          row.name,
          row.grade as Grade,
          row.price,
          row.minLevel,
          row.defaultOwned,
        ),
    );
  }
}
