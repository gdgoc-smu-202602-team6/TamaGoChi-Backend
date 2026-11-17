import type { ItemCategory } from '../item-category.js';
import { FixedSlot } from './fixed-slot.js';
import type { SlotName } from './slot.js';

/** The house (D-03): one moves to another house instead of taking it off, and it gives the room its floor. */
export class HouseSlot extends FixedSlot {
  constructor(
    name: SlotName,
    category: ItemCategory,
    private readonly size: number,
  ) {
    super(name, category);
  }

  override get floorSize(): number {
    return this.size;
  }
}
