import type { components } from '../../../foundation/contract/openapi.js';
import type { Id } from '../../../foundation/id/id.js';
import type { PlacementPolicy } from '../placement/placement-policy.js';
import type { Slot } from './slot/slot.js';

export type Grade = components['schemas']['Grade'];

/** Why an item cannot be bought now (S-06, S-07, 8.3-6), or that it can. */
export type PurchaseVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'not-on-sale' }
  | {
      readonly ok: false;
      readonly reason: 'level-locked';
      readonly requiredLevel: number;
    }
  | {
      readonly ok: false;
      readonly reason: 'insufficient-volts';
      readonly shortBy: number;
    };

/** One item of the catalog (merged 8.2). Catalog data, the same for everyone; developers change it, not code. */
export class Item {
  constructor(
    readonly id: Id<'Item'>,
    readonly code: string,
    readonly slot: Slot,
    readonly name: string,
    readonly grade: Grade,
    readonly price: number,
    readonly minLevel: number,
    readonly defaultOwned: boolean,
    /** False: out of the shop; whoever bought it keeps it (8.3-6). */
    readonly onSale: boolean,
    /** How it is placed in the room (D-10~D-14); null for an item that is not placed. */
    readonly placementPolicy: PlacementPolicy | null,
  ) {
    if (slot.alwaysPlaced && !placementPolicy)
      throw new Error(`${code}: a ${slot.name} item has no placement policy`);
  }

  /** Whether it is on sale comes first, then the level, then the volts (8.3). */
  purchaseVerdict(level: number, volts: number): PurchaseVerdict {
    if (!this.onSale) return { ok: false, reason: 'not-on-sale' };
    if (level < this.minLevel)
      return {
        ok: false,
        reason: 'level-locked',
        requiredLevel: this.minLevel,
      };
    if (volts < this.price)
      return {
        ok: false,
        reason: 'insufficient-volts',
        shortBy: this.price - volts,
      };
    return { ok: true };
  }
}
