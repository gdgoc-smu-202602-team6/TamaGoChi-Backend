import type { SlotName } from '../../items/slot/slot.js';
import type { PlacementPolicy } from '../../placement/placement-policy.js';
import { Rectangle } from '../../placement/rectangle.js';
import type { Surface } from '../../placement/surface/surface.js';

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/**
 * Where a placed thing stands (D-10~D-14): the surface, and the corner of its size rectangle nearest the surface's
 * origin, in cells. Whether that follows its target's placement policy is decided here. Sticking to a wall and the
 * feet line are the screen's, which knows the sprites' sizes.
 */
export class Placement {
  constructor(
    /** The slot of an equipped item that has a placement policy (D-10). */
    readonly target: SlotName,
    readonly surface: Surface,
    readonly x: number,
    readonly y: number,
  ) {}

  /** The cells it covers, as large as the policy says. */
  areaFor(policy: PlacementPolicy): Rectangle {
    return new Rectangle(this.x, this.y, policy.width, policy.height);
  }

  /**
   * Whether it follows the policy in a room whose floor is size × size: on a surface of the policy's kind, its size
   * rectangle inside that surface, and on the policy's grid.
   */
  fitsIn(size: number, policy: PlacementPolicy): boolean {
    return (
      this.surface.kind === policy.surfaceKind &&
      this.areaFor(policy).within(this.surface.areaIn(size)) &&
      policy.grid.holds(this.x) &&
      policy.grid.holds(this.y)
    );
  }

  /** Whether it and `other` cannot both stand: both solid, on the same surface, and their size rectangles overlap. */
  clashesWith(
    policy: PlacementPolicy,
    other: Placement,
    otherPolicy: PlacementPolicy,
  ): boolean {
    return (
      policy.solid &&
      otherPolicy.solid &&
      this.surface === other.surface &&
      this.areaFor(policy).overlaps(other.areaFor(otherPolicy))
    );
  }

  /**
   * The position following the policy in a toSize room, from a fromSize one: scaled from the surface's origin along
   * each axis, onto the policy's grid and pulled inside the surface to the last grid point that fits (S-09). None when
   * it then does not follow the policy, as when the policy puts it on another kind of surface or it is larger than the
   * surface.
   */
  fittedTo(
    fromSize: number,
    toSize: number,
    policy: PlacementPolicy,
  ): Placement | null {
    const from = this.surface.areaIn(fromSize);
    const to = this.surface.areaIn(toSize);
    const scale = (value: number, fromLength: number, toLength: number) =>
      fromLength === toLength ? value : (value * toLength) / fromLength;
    const moved = new Placement(
      this.target,
      this.surface,
      clamp(
        policy.grid.snap(scale(this.x, from.width, to.width)),
        policy.grid.largestUpTo(to.width - policy.width),
      ),
      clamp(
        policy.grid.snap(scale(this.y, from.height, to.height)),
        policy.grid.largestUpTo(to.height - policy.height),
      ),
    );
    return moved.fitsIn(toSize, policy) ? moved : null;
  }
}
