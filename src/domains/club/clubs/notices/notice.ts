import type { components } from '../../../../foundation/contract/openapi.js';

export type NotificationState = components['schemas']['NotificationState'];

/** The states a notice's notification moves to from each state (N-13, N-15): sent once, never again (N-16). */
const transitions: Readonly<
  Record<NotificationState, readonly NotificationState[]>
> = {
  NONE: [],
  PENDING: ['SENT', 'FAILED'],
  SENT: [],
  FAILED: [],
};

/**
 * A club notice (merged 10장). Every member sees it; its author is a user, so leaving the club keeps the name and only a
 * deleted account leaves it with no author.
 */
export class Notice {
  constructor(
    readonly id: string,
    readonly clubId: string,
    readonly categoryId: string,
    readonly subcategoryId: string | null,
    /** Null once the author deleted their account. */
    readonly authorUserId: string | null,
    readonly title: string,
    readonly body: string,
    readonly pinned: boolean,
    readonly notificationState: NotificationState,
    readonly createdAt: Date,
    /** Whether the member reading it opened it (N-07). */
    readonly read: boolean,
  ) {}

  /** A new notice notifies when asked; the sending happens after it is created. */
  static initialState(notify: boolean): NotificationState {
    return notify ? 'PENDING' : 'NONE';
  }

  static canMove(from: NotificationState, to: NotificationState): boolean {
    return transitions[from].includes(to);
  }
}
