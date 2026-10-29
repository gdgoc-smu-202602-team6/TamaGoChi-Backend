import { Problem } from '../problem.js';

/**
 * The request clashes with the current state. The reason is the last segment of `type`; the reasons a client
 * branches on are listed under Problem.type in openapi.yaml.
 */
export class Conflict extends Problem {
  readonly status = 409;
  readonly title = 'Conflict';

  constructor(
    reason: string,
    private readonly extra: Record<string, unknown> = {},
    detail?: string,
  ) {
    super(reason, detail);
  }

  override extensions(): Record<string, unknown> {
    return this.extra;
  }
}
