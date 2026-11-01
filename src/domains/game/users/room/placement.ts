import type { FloorGrid } from '../../floor/floor-grid/floor-grid.js';
import type { PlacementTargetName } from '../../floor/placement-target.js';

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/**
 * Where a placed thing stands, in floor cells (D-10~D-14). The server keeps it on the floor and on its target's grid;
 * sticking to a wall and the feet line are the screen's, which knows the sprites' sizes.
 */
export class Placement {
  constructor(
    readonly target: PlacementTargetName,
    readonly x: number,
    readonly y: number,
  ) {}

  /** Whether it is on the floor of a size × size room, and on the grid its target moves on. */
  fitsIn(size: number, grid: FloorGrid): boolean {
    const onFloor =
      this.x >= 0 && this.x <= size && this.y >= 0 && this.y <= size;
    return onFloor && grid.holds(this.x) && grid.holds(this.y);
  }

  /** Moving house: the position scales with the floor, onto the grid, and is pulled inside it (S-09). */
  movedTo(fromSize: number, toSize: number, grid: FloorGrid): Placement {
    const scale = (value: number) =>
      clamp(grid.snap((value * toSize) / fromSize), toSize);
    return new Placement(this.target, scale(this.x), scale(this.y));
  }
}
