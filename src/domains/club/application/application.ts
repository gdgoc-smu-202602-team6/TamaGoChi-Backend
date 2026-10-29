import type { components } from '../../../foundation/contract/openapi.js';

export type ApplicationState = components['schemas']['ApplicationState'];
export type Decision = Exclude<ApplicationState, 'PENDING'>;

/** A request to join a club. Always decided by someone with applications.decide; PENDING changes exactly once. */
export class Application {
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
