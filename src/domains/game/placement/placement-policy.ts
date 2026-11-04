import { Grid } from './grid.js';
import type { SurfaceKind } from './surface-kind.js';

/**
 * How a thing is placed in a room (D-10~D-14): the kind of surface it goes on, its size in cells, the grid it moves on
 * and whether it may not overlap. Catalog data for the items; only the character's is code.
 */
export class PlacementPolicy {
  /** The character is always in the room, stands on the floor and moves freely (D-13). */
  static readonly character = new PlacementPolicy(
    'FLOOR',
    1,
    1,
    Grid.free,
    true,
  );

  constructor(
    readonly surfaceKind: SurfaceKind,
    /** In cells. */
    readonly width: number,
    /** In cells: into the room on the floor, up on a wall. */
    readonly height: number,
    /** The grid it moves on along each axis. */
    readonly grid: Grid,
    /** Whether it may not overlap another solid placement on the same surface. */
    readonly solid: boolean,
  ) {}
}
