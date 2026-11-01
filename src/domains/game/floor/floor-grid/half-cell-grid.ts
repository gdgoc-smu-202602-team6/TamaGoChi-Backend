import type { FloorGrid } from './floor-grid.js';

/** Moving by half a floor cell (D-12). Which slots move on it is slotOf's. */
export class HalfCellGrid implements FloorGrid {
  holds(value: number): boolean {
    return Number.isInteger(value * 2);
  }

  snap(value: number): number {
    return Math.round(value * 2) / 2;
  }
}
