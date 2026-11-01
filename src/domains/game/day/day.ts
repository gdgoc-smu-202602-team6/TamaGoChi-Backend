const msPerDay = 24 * 60 * 60 * 1000;
/** A day starts at 04:00 in Korea (UTC+9, no daylight saving), which is 19:00 UTC of the day before. */
const startOffsetMs = (4 - 9) * 60 * 60 * 1000;

/**
 * One day of the game (merged 7.4): from 04:00 Korea time to 03:59 of the next morning. Held as the number of days
 * since 1970-01-01, so days order and step by integers.
 */
export class Day {
  private constructor(readonly index: number) {}

  /** The day a moment falls in. */
  static of(moment: Date): Day {
    return new Day(Math.floor((moment.getTime() - startOffsetMs) / msPerDay));
  }

  /** `YYYY-MM-DD`; throws RangeError otherwise. */
  static parse(text: string): Day {
    const ms = /^\d{4}-\d{2}-\d{2}$/.test(text)
      ? Date.parse(`${text}T00:00:00Z`)
      : NaN;
    if (Number.isNaN(ms)) throw new RangeError('day must be YYYY-MM-DD');
    return new Day(ms / msPerDay);
  }

  /** A day stored as a `date` column (midnight UTC of that date). */
  static fromDate(date: Date): Day {
    return new Day(Math.round(date.getTime() / msPerDay));
  }

  /** The `date` column value of this day. */
  toDate(): Date {
    return new Date(this.index * msPerDay);
  }

  toString(): string {
    return this.toDate().toISOString().slice(0, 10);
  }

  /** The first moment of the day. */
  get start(): Date {
    return new Date(this.index * msPerDay + startOffsetMs);
  }

  /** The first moment of the next day. */
  get end(): Date {
    return new Date((this.index + 1) * msPerDay + startOffsetMs);
  }

  plus(days: number): Day {
    return new Day(this.index + days);
  }

  /** Days from `other` to this day. */
  since(other: Day): number {
    return this.index - other.index;
  }

  /** The Monday of this day's week (M-04 shows Monday to Sunday). */
  get monday(): Day {
    // 1970-01-01 was a Thursday, three days after a Monday.
    return new Day(this.index - ((this.index + 3) % 7));
  }

  equals(other: Day): boolean {
    return this.index === other.index;
  }
}
