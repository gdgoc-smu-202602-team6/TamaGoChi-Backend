import { trimmedWithin } from '../../../foundation/text/text-length.js';

/** A club's name: trimmed, 1 to 20 characters as a person counts them. */
export class ClubName {
  private constructor(readonly value: string) {}

  static parse(input: string): ClubName {
    return new ClubName(trimmedWithin(input, 1, 20, 'club name'));
  }

  static fromStored(value: string): ClubName {
    return new ClubName(value);
  }
}
