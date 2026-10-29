import { Problem } from '../problem.js';

/** If-Match does not match the current ETag. */
export class PreconditionFailed extends Problem {
  readonly status = 412;
  readonly title = 'Precondition Failed';

  constructor(detail?: string) {
    super('precondition-failed', detail);
  }
}
