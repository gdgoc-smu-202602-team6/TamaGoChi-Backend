import type { components } from '../../../../foundation/contract/openapi.js';
import type { PlacementPolicy } from '../../placement/placement-policy.js';

/** What is placed: the slot of an equipped item that has a placement policy, or the character (D-10). */
export type PlacementTarget = components['schemas']['PlacementTarget'];

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/**
 * Where a placed thing stands, in floor cells (D-10~D-14), and whether that follows its target's placement policy. The
 * room has only its floor, so only a thing whose policy puts it on the floor is placed. Sticking to a wall and the feet
 * line are the screen's, which knows the sprites' sizes.
 */
export class Placement {
  constructor(
    readonly target: PlacementTarget,
    readonly x: number,
    readonly y: number,
  ) {}

  /** Whether it follows the policy in a size × size room: on the floor, inside it, and on the policy's grid. */
  fitsIn(size: number, policy: PlacementPolicy): boolean {
    const inside =
      this.x >= 0 && this.x <= size && this.y >= 0 && this.y <= size;
    return (
      goesOnFloor(policy) &&
      inside &&
      policy.grid.holds(this.x) &&
      policy.grid.holds(this.y)
    );
  }

  /**
   * The position following the policy in a toSize room, from a fromSize one: scaled with the floor, onto the policy's
   * grid and pulled inside it (S-09). None when the policy does not put it on the floor.
   */
  fittedTo(
    fromSize: number,
    toSize: number,
    policy: PlacementPolicy,
  ): Placement | null {
    if (!goesOnFloor(policy)) return null;
    const scale = (value: number) =>
      clamp(
        policy.grid.snap(
          fromSize === toSize ? value : (value * toSize) / fromSize,
        ),
        toSize,
      );
    return new Placement(this.target, scale(this.x), scale(this.y));
  }
}

/** Whether the policy puts its thing on the floor, the room's only surface. */
function goesOnFloor(policy: PlacementPolicy): boolean {
  return policy.surfaceKind === 'FLOOR';
}
