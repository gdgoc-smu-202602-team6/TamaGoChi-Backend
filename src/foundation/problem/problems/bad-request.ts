import { Problem } from '../problem.js';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

/** The request alone is wrong: shape, relation between fields, or allowed values. */
export class BadRequest extends Problem {
  readonly status = 400;
  readonly title = 'Bad Request';

  constructor(
    readonly errors: readonly FieldError[] = [],
    detail?: string,
  ) {
    super('bad-request', detail);
  }

  override extensions(): Record<string, unknown> {
    return this.errors.length > 0 ? { errors: this.errors } : {};
  }
}
