import type { components } from '../../../../foundation/contract/openapi.js';
import type { Permission } from '../access/permission.js';

export type ApplicationState = components['schemas']['ApplicationState'];

/** The states an application moves to from each state: PENDING is decided exactly once. */
const transitions = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
} as const satisfies Readonly<
  Record<ApplicationState, readonly ApplicationState[]>
>;

/** What deciding a pending application makes it. */
export type Decision = (typeof transitions)['PENDING'][number];

/**
 * A request to join a club. Decided by those holding `decidedWith`; seen by its applicant and by them; cancelled only
 * by its applicant, only while it is open.
 */
export class Application {
  /** The permission that decides applications and sees all of the club's. */
  static readonly decidedWith: Permission = 'applications.decide';

  /** How long a rejected application stays in the applicant's own list after it was decided (C-19). */
  static readonly rejectedShownForMs = 7 * 24 * 60 * 60 * 1000;

  /** The states an application can still move from: it can be decided or cancelled only in these. */
  static readonly openStates: readonly ApplicationState[] = (
    Object.keys(transitions) as ApplicationState[]
  ).filter((state) => transitions[state].length > 0);

  /** Rejected applications decided before this moment are gone from the applicant's own list. */
  static rejectedShownSince(now: Date): Date {
    return new Date(now.getTime() - Application.rejectedShownForMs);
  }

  /** The states from which an application moves to `to`. */
  static movingTo(to: ApplicationState): readonly ApplicationState[] {
    return (Object.keys(transitions) as ApplicationState[]).filter((from) =>
      (transitions[from] as readonly ApplicationState[]).includes(to),
    );
  }

  constructor(
    readonly id: string,
    readonly clubId: string,
    readonly userId: string,
    /** Null once the part was deleted after the decision; a pending application always has one. */
    readonly partId: string | null,
    readonly state: ApplicationState,
    readonly decidedAt: Date | null,
    readonly createdAt: Date,
  ) {}

  mayBeCancelledBy(userId: string): boolean {
    return userId === this.userId;
  }
}
