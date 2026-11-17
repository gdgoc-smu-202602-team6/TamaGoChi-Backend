import { CharacterSlot } from './character-slot.js';
import { HouseSlot } from './house-slot.js';
import { Slot, type SlotName } from './slot.js';

/**
 * The slot of each name: its kind and its shop tab (D-01, D-03, S-01). `roomSize` is the house item's floor; the
 * catalog has one exactly for the house (items_room_size_check).
 */
export function slotOf(name: SlotName, roomSize: number | null): Slot {
  switch (name) {
    case 'CLOCK':
    case 'WINDOW':
    case 'DESK':
    case 'LAMP':
    case 'PLANT':
    case 'BOOKSHELF':
    case 'RUG':
      return new Slot(name, 'FURNITURE');
    case 'WALLPAPER':
      return new Slot(name, 'WALLPAPER');
    case 'HEAD':
    case 'FACE':
    case 'NECK':
      return new Slot(name, 'ACCESSORY');
    case 'ROOM':
      if (roomSize === null) throw new Error('a house item has no room size');
      return new HouseSlot(name, 'ROOM_SIZE', roomSize);
    case 'CHARACTER':
      return new CharacterSlot(name, 'CHARACTER');
  }
}
