import type { Label } from '../../label/label.js';
import type { PaletteColor } from '../../palette-color/palette-color.js';
import type { Subcategory } from './subcategories/subcategory.js';

/** A notice category. The preset one ("전체공지") exists from the club's creation and is never deleted. */
export class NoticeCategory {
  constructor(
    readonly id: string,
    readonly name: Label,
    readonly color: PaletteColor,
    readonly preset: boolean,
    readonly subcategories: readonly Subcategory[],
  ) {}
}
