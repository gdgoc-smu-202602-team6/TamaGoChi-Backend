import type { components } from '../../../foundation/contract/openapi.js';
import { trimmedWithin } from '../../../foundation/text/text-length.js';

export type PaletteColor = components['schemas']['PaletteColor'];

/**
 * The short name of a part, a notice category or a subcategory: trimmed, 1 to 10 characters as a person counts
 * them, unique among its siblings.
 */
export class Label {
  private constructor(readonly value: string) {}

  static parse(input: string): Label {
    return new Label(trimmedWithin(input, 1, 10, 'name'));
  }

  static fromStored(value: string): Label {
    return new Label(value);
  }
}
