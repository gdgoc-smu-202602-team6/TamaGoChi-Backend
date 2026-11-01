import type { Label } from '../../../label/label.js';

/** A notice category's subcategory (LLM under 스터디, …). */
export class Subcategory {
  constructor(
    readonly id: string,
    readonly name: Label,
  ) {}
}
