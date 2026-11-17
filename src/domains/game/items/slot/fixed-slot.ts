import { Slot } from './slot.js';

/** A slot that always has an item (D-03): its item cannot be taken off, only changed for another. */
export class FixedSlot extends Slot {
  override get removable(): boolean {
    return false;
  }
}
