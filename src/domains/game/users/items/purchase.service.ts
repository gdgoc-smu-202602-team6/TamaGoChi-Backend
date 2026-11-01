import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { lockPlayer } from '../../lock/player-lock.js';
import { Earnings } from '../progress/earnings.js';
import { RoomRepository } from '../room/room.repository.js';
import { StudySessionRepository } from '../study-sessions/study-session.repository.js';
import type { OwnedItem, PurchaseVerdict } from '../../items/item.js';
import { ItemRepository } from '../../items/item.repository.js';

export type PurchaseOutcome =
  | { readonly owned: OwnedItem; readonly bought: boolean }
  | Extract<PurchaseVerdict, { ok: false }>;

/**
 * Buying an item (S-06~S-09): one purchase of a user at a time, each checking the balance the one before left, then
 * paying, owning and wearing it in one transaction. Buying what one has changes nothing.
 */
@Injectable()
export class PurchaseService {
  constructor(
    private readonly database: DatabaseClient,
    private readonly items: ItemRepository,
    private readonly sessions: StudySessionRepository,
    private readonly rooms: RoomRepository,
  ) {}

  /** Null: no such item. `level` is the user's level now (it never drops, F-36). */
  async purchase(
    userId: string,
    itemId: string,
    level: number,
    now: Date,
  ): Promise<PurchaseOutcome | null> {
    return this.database.$transaction(async (tx) => {
      await lockPlayer(tx, userId);
      const catalog = await this.items.catalog(tx);
      const item = catalog.find((one) => one.id === itemId);
      if (!item) return null;
      const had = (await this.items.owned(userId, catalog, tx)).find(
        (one) => one.item.id === itemId,
      );
      if (had) return { owned: had, bought: false };
      const volts = Earnings.volts(
        Earnings.paidMinutes(await this.sessions.all(userId, tx), now),
        await this.items.spent(userId, tx),
      );
      const verdict = item.purchaseVerdict(level, volts);
      if (!verdict.ok) return verdict;
      const owned = await this.items.buy(userId, item, tx);
      const room = await this.rooms.find(userId, catalog, tx);
      await this.rooms.save(room.equip(item), tx);
      return { owned, bought: true };
    });
  }
}
