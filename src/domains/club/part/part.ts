import { trimmedWithin } from '../../../foundation/text/text-length.js';
import type { components } from '../../../foundation/contract/openapi.js';

export type PaletteColor = components['schemas']['PaletteColor'];

/** A part's name: trimmed, 1 to 10 characters, unique within its club. */
export class PartName {
  private constructor(readonly value: string) {}

  static parse(input: string): PartName {
    return new PartName(trimmedWithin(input, 1, 10, 'part name'));
  }

  static fromStored(value: string): PartName {
    return new PartName(value);
  }
}

/** A part of a club (AI, Dev, …). Members and pending applications point at one. */
export class Part {
  constructor(
    readonly id: string,
    readonly name: PartName,
    readonly color: PaletteColor,
  ) {}
}
