import { Problem } from '../problem.js';

/** The target does not exist, or the caller cannot see it. */
export class NotFound extends Problem {
  readonly status = 404;
  readonly title = 'Not Found';

  constructor(detail?: string) {
    super('not-found', detail);
  }
}
