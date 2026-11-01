import type { FloorGrid } from '../../users/room/floor-grid/floor-grid.js';
import {
  PlacementTarget,
  type PlacementTargetName,
} from '../../users/room/placement-target.js';
import type { ItemCategory } from '../item-category.js';
import { Slot, type SlotName } from './slot.js';

/** A slot whose item stands on the floor (D-10) and moves on its grid there (D-12). */
export class FloorSlot extends Slot {
  private readonly placed: PlacementTarget;

  constructor(
    name: Extract<SlotName, PlacementTargetName>,
    category: ItemCategory,
    grid: FloorGrid,
  ) {
    super(name, category);
    this.placed = new PlacementTarget(name, grid);
  }

  override get target(): PlacementTarget {
    return this.placed;
  }
}
