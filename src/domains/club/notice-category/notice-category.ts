import type { Label, PaletteColor } from '../label/label.js';

/** A notice category's subcategory (LLM under 스터디, …). */
export class Subcategory {
  constructor(
    readonly id: string,
    readonly name: Label,
  ) {}
}

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
