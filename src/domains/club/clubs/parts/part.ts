import type { Id } from '../../../../foundation/id/id.js';
import type { Permission } from '../access/permission.js';
import type { Label } from '../../label/label.js';
import type { PaletteColor } from '../../palette-color/palette-color.js';

/** A part of a club (AI, Dev, …). Members and pending applications point at one. */
export class Part {
  /** The permission that creates and deletes parts. */
  static readonly managedWith: Permission = 'parts.manage';

  constructor(
    readonly id: Id<'Part'>,
    readonly name: Label,
    readonly color: PaletteColor,
  ) {}
}
