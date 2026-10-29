import { Problem } from '../problem.js';

/** The caller can see the target but may not do this to it. */
export class Forbidden extends Problem {
  readonly status = 403;
  readonly title = 'Forbidden';

  constructor(detail?: string) {
    super('forbidden', detail);
  }
}
