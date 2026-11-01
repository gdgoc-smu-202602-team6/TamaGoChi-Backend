import { FreeGrid } from '../../floor/floor-grid/free-grid.js';
import { HalfCellGrid } from '../../floor/floor-grid/half-cell-grid.js';
import { FloorSlot } from './floor-slot.js';
import { HouseSlot } from './house-slot.js';
import { Slot, type SlotName } from './slot.js';

/**
 * The slot of each name: its kind, its shop tab and a floor slot's grid (D-01, D-03, D-10, D-12, S-01). `roomSize` is
 * the house item's floor; the catalog has one exactly for the house (items_room_size_check).
 */
export function slotOf(name: SlotName, roomSize: number | null): Slot {
  switch (name) {
    case 'DESK':
    case 'BOOKSHELF':
      return new FloorSlot(name, 'FURNITURE', new HalfCellGrid());
    case 'PLANT':
    case 'RUG':
      return new FloorSlot(name, 'FURNITURE', new FreeGrid());
    case 'CLOCK':
    case 'WINDOW':
    case 'LAMP':
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
  }
}
