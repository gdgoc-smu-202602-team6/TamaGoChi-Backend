import type { components } from '../../../foundation/contract/openapi.js';
import type { Day } from '../day/day.js';
import { rules } from '../rules/rules.js';

export type SessionState = components['schemas']['SessionState'];

/**
 * One study session (merged 6.3). Start and end are server times; a session counts at most 12 hours, so one left
 * running past that is ended at its 12-hour mark without anyone ending it.
 */
export class StudySession {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly startedAt: Date,
    readonly endedAt: Date | null,
  ) {}

  /** When the session reaches its maximum length; the device unlocks apps then. */
  get maxEndAt(): Date {
    return new Date(this.startedAt.getTime() + rules.maxSessionSeconds * 1000);
  }

  state(now: Date): SessionState {
    return this.endedAt || now >= this.maxEndAt ? 'ENDED' : 'RUNNING';
  }

  /** min(endedAt ?? now, startedAt + 12 hours). */
  effectiveEnd(now: Date): Date {
    const end = this.endedAt ?? now;
    return end < this.maxEndAt ? end : this.maxEndAt;
  }

  studiedSeconds(now: Date): number {
    return Math.max(
      0,
      Math.floor(
        (this.effectiveEnd(now).getTime() - this.startedAt.getTime()) / 1000,
      ),
    );
  }

  /** Volts and XP are paid by whole minutes, once the session ends; the seconds left over are dropped (6.3). */
  paidMinutes(now: Date): number {
    return Math.floor(this.studiedSeconds(now) / 60);
  }

  /**
   * The end time of ending it now: the arrival, or the device's time when it lies after the start and before the
   * arrival (it only ever lowers the reward), capped at the 12-hour mark.
   */
  endTimeFor(arrival: Date, clientEndedAt?: Date): Date {
    const end =
      clientEndedAt && clientEndedAt > this.startedAt && clientEndedAt < arrival
        ? clientEndedAt
        : arrival;
    return end < this.maxEndAt ? end : this.maxEndAt;
  }

  /** The part of the session, up to `until`, that lies in `day`, in milliseconds since the epoch. */
  spanOn(day: Day, until: Date): { from: number; to: number } | null {
    const from = Math.max(this.startedAt.getTime(), day.start.getTime());
    const to = Math.min(
      this.effectiveEnd(until).getTime(),
      day.end.getTime(),
      until.getTime(),
    );
    return to > from ? { from, to } : null;
  }
}
