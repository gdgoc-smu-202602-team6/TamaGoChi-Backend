import type { FloorGrid } from './floor-grid.js';

/** Moving freely: every coordinate is on it. */
export class FreeGrid implements FloorGrid {
  holds(): boolean {
    return true;
  }

  snap(value: number): number {
    return value;
  }
}
