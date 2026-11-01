import { Label } from '../../label/label.js';
import type { PaletteColor } from '../../palette-color/palette-color.js';
import type { Subcategory } from './subcategories/subcategory.js';

/** A notice category. The preset one ("전체공지") exists from the club's creation and is never deleted. */
export class NoticeCategory {
  /** The preset category every club is created with. */
  static readonly presetName = Label.fromStored('전체공지');
  static readonly presetColor: PaletteColor = 'RED';

  constructor(
    readonly id: string,
    readonly name: Label,
    readonly color: PaletteColor,
    readonly preset: boolean,
    readonly subcategories: readonly Subcategory[],
  ) {}

  /** Only a category that is not the preset one can be deleted (the notices using it are the database's to check). */
  get deletable(): boolean {
    return !this.preset;
  }

  /** Whether the subcategory is this category's (N-10). */
  has(subcategoryId: string): boolean {
    return this.subcategories.some((one) => one.id === subcategoryId);
  }
}
