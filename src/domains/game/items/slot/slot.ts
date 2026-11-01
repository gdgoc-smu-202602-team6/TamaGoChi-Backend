import type { components } from '../../../../foundation/contract/openapi.js';
import type { PlacementTarget } from '../../users/room/placement-target.js';
import type { ItemCategory } from '../item-category.js';

export type SlotName = components['schemas']['Slot'];

/**
 * Where an item is worn or set (D-03): one item per slot. The slot list is the contract's, and `slotOf` gives each
 * slot its kind. A plain slot's item can be taken off, gives the room no floor and does not stand on it.
 */
export class Slot {
  constructor(
    readonly name: SlotName,
    /** The shop and inventory tab (S-01). */
    readonly category: ItemCategory,
  ) {}

  /** Whether its item can be taken off without another put on. */
  get removable(): boolean {
    return true;
  }

  /** The floor its item gives the room, size × size cells. */
  get floorSize(): number | null {
    return null;
  }

  /** What its item stands on the floor as (D-10). */
  get target(): PlacementTarget | null {
    return null;
  }
}
