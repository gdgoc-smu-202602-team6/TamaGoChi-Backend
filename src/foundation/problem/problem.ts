/**
 * An error that becomes an RFC 9457 Problem Details response. One subclass per row of the status code table;
 * ProblemFilter is the only place that turns these into responses.
 */
export abstract class Problem extends Error {
  abstract readonly status: number;
  abstract readonly title: string;

  protected constructor(
    readonly slug: string,
    detail?: string,
  ) {
    super(detail ?? slug);
  }

  get type(): string {
    return `/problems/${this.slug}`;
  }

  /** Members added to the body besides type, title, status and detail. */
  extensions(): Record<string, unknown> {
    return {};
  }

  /** Headers the response carries besides Content-Type. */
  headers(): Record<string, string> {
    return {};
  }
}
