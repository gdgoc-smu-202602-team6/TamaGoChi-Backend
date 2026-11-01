import type { ItemCategory } from '../item-category.js';
import { Slot, type SlotName } from './slot.js';

/** The house (D-03): it cannot be taken off, one moves to another house instead, and it gives the room its floor. */
export class HouseSlot extends Slot {
  constructor(
    name: SlotName,
    category: ItemCategory,
    private readonly size: number,
  ) {
    super(name, category);
  }

  override get removable(): boolean {
    return false;
  }

  override get floorSize(): number {
    return this.size;
  }
}
