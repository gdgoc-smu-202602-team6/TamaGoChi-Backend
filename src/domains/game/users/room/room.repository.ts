import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import type { Prisma } from '../../../../foundation/database/generated/client.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import type { Item } from '../../items/item.js';
import type { SlotName } from '../../items/slot/slot.js';
import { lockPlayer } from '../../lock/player-lock.js';
import { Placement, type PlacementTarget } from './placement.js';
import { Room } from './room.js';
import type { QueryClient } from '../../../../foundation/database/query-client.js';

@Injectable()
export class RoomRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** The user's room; the default room when none is stored. `catalog` gives the items by id. */
  async find(
    userId: Id<'User'>,
    catalog: readonly Item[],
    client: QueryClient = this.database,
  ): Promise<Room> {
    const row = await client.userRoom.findUnique({
      where: { userId },
      select: {
        guestbookCheckedAt: true,
        items: { select: { slot: true, itemId: true } },
        placements: { select: { target: true, x: true, y: true } },
      },
    });
    if (!row) return Room.default(userId, catalog);
    const byId = new Map(catalog.map((item) => [item.id, item]));
    const equipped = new Map<SlotName, Item>();
    for (const one of row.items) {
      const item = byId.get(asId<'Item'>(one.itemId));
      if (item) equipped.set(one.slot as SlotName, item);
    }
    return Room.stored(
      userId,
      equipped,
      row.placements.map(
        (one) => new Placement(one.target as PlacementTarget, one.x, one.y),
      ),
      row.guestbookCheckedAt,
      catalog,
    );
  }

  /** When the owner last opened their guestbook (M-21); null if never. */
  async guestbookCheckedAt(userId: Id<'User'>): Promise<Date | null> {
    const row = await this.database.userRoom.findUnique({
      where: { userId },
      select: { guestbookCheckedAt: true },
    });
    return row?.guestbookCheckedAt ?? null;
  }

  /**
   * Changes the room under the player lock (S-08), so a purchase equipping meanwhile is neither lost nor clashed with.
   * `apply` gives the new room or why it is refused; a refusal stores nothing.
   */
  async change<R>(
    userId: Id<'User'>,
    catalog: readonly Item[],
    apply: (room: Room) => Room | R,
  ): Promise<Room | R> {
    return this.database.$transaction(async (tx) => {
      await lockPlayer(tx, userId);
      const changed = apply(await this.find(userId, catalog, tx));
      if (changed instanceof Room) await this.save(changed, tx);
      return changed;
    });
  }

  /** Stores the whole room: what is equipped, the placements and the guestbook mark. Inside the player lock. */
  async save(room: Room, tx: Prisma.TransactionClient): Promise<void> {
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
  }
}
