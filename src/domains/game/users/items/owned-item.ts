import type { Item } from '../../items/item.js';

/** An item the user has: bought (with the price paid then) or owned from the start. */
export interface OwnedItem {
  readonly item: Item;
  readonly pricePaid: number;
  /** Absent for an item owned from the start. */
  readonly purchasedAt?: Date;
}
