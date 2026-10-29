import { Problem } from '../problem.js';

/** No token, a wrong token, or an expired one. */
export class Unauthorized extends Problem {
  readonly status = 401;
  readonly title = 'Unauthorized';

  constructor(detail?: string) {
    super('unauthorized', detail);
  }

  override headers(): Record<string, string> {
    return { 'WWW-Authenticate': 'Bearer' };
  }
}
