import type { components } from '../../../../foundation/contract/openapi.js';
import { rules } from '../../rules/rules.js';
import { Rectangle } from '../rectangle.js';
import type { SurfaceKind } from './surface-kind.js';

export type SurfaceName = components['schemas']['Surface'];

/**
 * A surface of the room things are placed on (D-10): the floor, or one of the two walls the quarter view shows. Its
 * origin and axes are the contract's (openapi.yaml Surface). The floor is the house's size × size cells; a wall is as
 * wide as the floor and the same height in every house.
 */
export class Surface {
  /** Each of the contract's surfaces; a surface the contract adds is a compile error until it is here. */
  private static readonly byName: Readonly<Record<SurfaceName, Surface>> = {
    FLOOR: new Surface('FLOOR', 'FLOOR'),
    LEFT_WALL: new Surface('LEFT_WALL', 'WALL'),
    RIGHT_WALL: new Surface('RIGHT_WALL', 'WALL'),
  };

  private constructor(
    readonly name: SurfaceName,
    readonly kind: SurfaceKind,
  ) {}

  /** The surface of the contract's name. */
  static of(name: SurfaceName): Surface {
    return Surface.byName[name];
  }

  /** Its cells in a room whose floor is roomSize × roomSize. */
  areaIn(roomSize: number): Rectangle {
    return new Rectangle(
      0,
      0,
      roomSize,
      this.kind === 'FLOOR' ? roomSize : rules.wallHeight,
    );
  }
}
