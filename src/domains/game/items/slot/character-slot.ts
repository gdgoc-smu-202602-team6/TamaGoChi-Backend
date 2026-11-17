import { FixedSlot } from './fixed-slot.js';

/** The character (D-03, D-13): one is always worn, and it always stands in the room. */
export class CharacterSlot extends FixedSlot {
  override get alwaysPlaced(): boolean {
    return true;
  }
}
