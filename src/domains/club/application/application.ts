import type { components } from '../../../foundation/contract/openapi.js';

export type ApplicationState = components['schemas']['ApplicationState'];
export type Decision = Exclude<ApplicationState, 'PENDING'>;

/** A request to join a club. Always decided by someone with applications.decide; PENDING changes exactly once. */
export class Application {
  /** How long a rejected application stays in the applicant's own list after it was decided (C-19). */
  static readonly rejectedShownForMs = 7 * 24 * 60 * 60 * 1000;

  /** Rejected applications decided before this moment are gone from the applicant's own list. */
  static rejectedShownSince(now: Date): Date {
    return new Date(now.getTime() - Application.rejectedShownForMs);
  }

  constructor(
    readonly id: string,
    readonly clubId: string,
    readonly userId: string,
    readonly partId: string,
    readonly state: ApplicationState,
    readonly decidedAt: Date | null,
    readonly createdAt: Date,
  ) {}

  /** Only a pending application can be decided or cancelled. */
  get open(): boolean {
    return this.state === 'PENDING';
  }
}
