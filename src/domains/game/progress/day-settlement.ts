import type { Day } from '../day/day.js';
import type { RoomCondition } from './room-condition.js';

/** The confirmed result of a past day: what was studied and the room's state when the day closed. */
export class DaySettlement {
  constructor(
    readonly day: Day,
    readonly studiedSeconds: number,
    readonly attended: boolean,
    readonly goalMet: boolean,
    readonly condition: RoomCondition,
  ) {}
}
