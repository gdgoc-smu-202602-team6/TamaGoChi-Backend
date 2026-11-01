import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import type { Prisma } from '../../../foundation/database/generated/client.js';
import type { Item } from '../item/item.js';
import type { PlacementTarget, SlotName } from '../item/slot.js';
import { Placement } from './placement.js';
import { Room } from './room.js';

type Client = DatabaseClient | Prisma.TransactionClient;

@Injectable()
export class RoomRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** The user's room; the default room when none is stored. `catalog` gives the items by id. */
  async find(
    userId: string,
    catalog: readonly Item[],
    client: Client = this.database,
  ): Promise<Room> {
    const row = await client.userRoom.findUnique({
      where: { userId },
      select: {
        guestbookCheckedAt: true,
        items: { select: { slot: true, itemId: true } },
        placements: { select: { target: true, x: true, y: true } },
      },
    });
    const fallback = Room.default(userId, catalog);
    if (!row) return fallback;
    const byId = new Map(catalog.map((item) => [item.id, item]));
    const equipped = new Map<SlotName, Item>();
    for (const one of row.items) {
      const item = byId.get(one.itemId);
      if (item) equipped.set(one.slot as SlotName, item);
    }
    const house = fallback.equipped.get('ROOM');
    if (!equipped.has('ROOM') && house) equipped.set('ROOM', house);
    return new Room(
      userId,
      equipped,
      row.placements.map(
        (one) => new Placement(one.target as PlacementTarget, one.x, one.y),
      ),
      row.guestbookCheckedAt,
    );
  }

  /** When the owner last opened their guestbook (M-21); null if never. */
  async guestbookCheckedAt(userId: string): Promise<Date | null> {
    const row = await this.database.userRoom.findUnique({
      where: { userId },
      select: { guestbookCheckedAt: true },
    });
    return row?.guestbookCheckedAt ?? null;
  }

  /** Stores the whole room: what is equipped, the placements and the guestbook mark. */
  async save(room: Room, client?: Prisma.TransactionClient): Promise<void> {
    const write = async (tx: Prisma.TransactionClient) => {
      await tx.userRoom.upsert({
        where: { userId: room.userId },
        create: {
          userId: room.userId,
          guestbookCheckedAt: room.guestbookCheckedAt,
        },
        update: { guestbookCheckedAt: room.guestbookCheckedAt },
      });
      await tx.userRoomItem.deleteMany({ where: { userId: room.userId } });
      await tx.userRoomItem.createMany({
        data: [...room.equipped].map(([slot, item]) => ({
          userId: room.userId,
          slot,
          itemId: item.id,
        })),
      });
      await tx.userRoomPlacement.deleteMany({ where: { userId: room.userId } });
      await tx.userRoomPlacement.createMany({
        data: room.placements.map((placement) => ({
          userId: room.userId,
          target: placement.target,
          x: placement.x,
          y: placement.y,
        })),
      });
    };
    if (client) await write(client);
    else await this.database.$transaction(write);
  }
}
