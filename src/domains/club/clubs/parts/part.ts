import type { Id } from '../../../../foundation/id/id.js';
import type { Label } from '../../label/label.js';
import type { PaletteColor } from '../../palette-color/palette-color.js';

/** A part of a club (AI, Dev, …). Members and pending applications point at one. */
export class Part {
  constructor(
    readonly id: Id<'Part'>,
    readonly name: Label,
    readonly color: PaletteColor,
  ) {}
}
