import type { Label, PaletteColor } from '../../label/label.js';

/** A part of a club (AI, Dev, …). Members and pending applications point at one. */
export class Part {
  constructor(
    readonly id: string,
    readonly name: Label,
    readonly color: PaletteColor,
  ) {}
}
