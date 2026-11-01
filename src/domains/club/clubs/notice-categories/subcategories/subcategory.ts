import type { Id } from '../../../../../foundation/id/id.js';
import type { Label } from '../../../label/label.js';

/** A notice category's subcategory (LLM under 스터디, …). */
export class Subcategory {
  constructor(
    readonly id: Id<'Subcategory'>,
    readonly name: Label,
  ) {}
}
