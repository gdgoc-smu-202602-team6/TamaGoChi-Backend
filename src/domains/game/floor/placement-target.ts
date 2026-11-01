import type { components } from '../../../foundation/contract/openapi.js';
import type { FloorGrid } from './floor-grid/floor-grid.js';
import { FreeGrid } from './floor-grid/free-grid.js';

export type PlacementTargetName = components['schemas']['PlacementTarget'];

/** What can stand on a room's floor (D-10), and the grid it moves on (D-12). The target list is the contract's. */
export class PlacementTarget {
  /** The character is always in the room and moves freely; the other targets are the floor slots'. */
  static readonly character = new PlacementTarget('CHARACTER', new FreeGrid());

  constructor(
    readonly name: PlacementTargetName,
    readonly grid: FloorGrid,
  ) {}
}
