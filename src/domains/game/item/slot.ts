import type { components } from '../../../foundation/contract/openapi.js';

export type SlotName = components['schemas']['Slot'];
export type ItemCategory = components['schemas']['ItemCategory'];
export type PlacementTarget = components['schemas']['PlacementTarget'];

/** The shop and inventory tab of each slot (D-01, S-01). */
const categories: Readonly<Record<SlotName, ItemCategory>> = {
  CLOCK: 'FURNITURE',
  WINDOW: 'FURNITURE',
  DESK: 'FURNITURE',
  LAMP: 'FURNITURE',
  PLANT: 'FURNITURE',
  BOOKSHELF: 'FURNITURE',
  RUG: 'FURNITURE',
  WALLPAPER: 'WALLPAPER',
  HEAD: 'ACCESSORY',
  FACE: 'ACCESSORY',
  NECK: 'ACCESSORY',
  ROOM: 'ROOM_SIZE',
};

/** The things placed on the floor (D-10); the character is always there. */
const placeable: ReadonlySet<SlotName> = new Set([
  'DESK',
  'BOOKSHELF',
  'PLANT',
  'RUG',
]);

/** Where an item is worn or set (D-03): one item per slot. The slot list is the contract's. */
export class Slot {
  private constructor(readonly name: SlotName) {}

  static of(name: SlotName): Slot {
    return new Slot(name);
  }

  get category(): ItemCategory {
    return categories[this.name];
  }

  /** Only the house cannot be taken off; one moves to another house instead. */
  get removable(): boolean {
    return this.name !== 'ROOM';
  }

  /** The placement target this slot's item is, if it is placed on the floor. */
  get target(): PlacementTarget | null {
    return placeable.has(this.name) ? (this.name as PlacementTarget) : null;
  }
}
