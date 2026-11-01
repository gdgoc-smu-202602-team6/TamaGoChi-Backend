import type { PlacementTarget } from './placement-target.js';

/** Desks and bookshelves move by half a floor cell (D-12); the others move freely. */
const halfCellTargets: ReadonlySet<PlacementTarget> = new Set([
  'DESK',
  'BOOKSHELF',
]);

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/**
 * Where a placed thing stands, in floor cells (D-10~D-14). The server keeps it on the floor and on the half-cell grid
 * where one applies; sticking to a wall and the feet line are the screen's, which knows the sprites' sizes.
 */
export class Placement {
  constructor(
    readonly target: PlacementTarget,
    readonly x: number,
    readonly y: number,
  ) {}

  /** Whether it is on the floor of a size × size room, and on its grid. */
  fitsIn(size: number): boolean {
    const onFloor =
      this.x >= 0 && this.x <= size && this.y >= 0 && this.y <= size;
    const onGrid =
      !halfCellTargets.has(this.target) ||
      (Number.isInteger(this.x * 2) && Number.isInteger(this.y * 2));
    return onFloor && onGrid;
  }

  /** Moving house: the position scales with the floor and is pulled inside it (S-09). */
  movedTo(fromSize: number, toSize: number): Placement {
    const scale = (value: number) => {
      const scaled = (value * toSize) / fromSize;
      return clamp(
        halfCellTargets.has(this.target) ? Math.round(scaled * 2) / 2 : scaled,
        toSize,
      );
    };
    return new Placement(this.target, scale(this.x), scale(this.y));
  }
}
