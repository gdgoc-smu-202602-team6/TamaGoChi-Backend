import type { Grid } from './grid.js';
import type { SurfaceKind } from './surface/surface-kind.js';

/**
 * How a thing is placed in a room (D-10~D-14): the kind of surface it goes on, its size in cells, the grid it moves on
 * and whether it may not overlap. Catalog data.
 */
export class PlacementPolicy {
  constructor(
    readonly surfaceKind: SurfaceKind,
    /** In cells along its surface's x axis (openapi.yaml Surface). */
    readonly width: number,
    /** In cells along its surface's y axis: along the left wall on the floor, up on a wall. */
    readonly height: number,
    /** The grid it moves on along each axis. */
    readonly grid: Grid,
    /** Whether it may not overlap another solid placement on the same surface. */
    readonly solid: boolean,
  ) {}
}
