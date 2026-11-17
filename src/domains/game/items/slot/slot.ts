import type { components } from '../../../../foundation/contract/openapi.js';
import type { ItemCategory } from '../item-category.js';

export type SlotName = components['schemas']['Slot'];

/**
 * Where an item is worn or set (D-03): one item per slot. The slot list is the contract's, and `slotOf` gives each
 * slot its kind. A plain slot's item can be taken off and gives the room no floor.
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

  /** Whether its item always stands in the room, and so always has a placement policy. */
  get alwaysPlaced(): boolean {
    return false;
  }

  /** The floor its item gives the room, size × size cells. */
  get floorSize(): number | null {
    return null;
  }
}
