import { trimmedWithin } from '../../../foundation/text/text-length.js';

/** A display name: trimmed, 1 to 10 grapheme clusters (an emoji is one). Not unique. */
export class Nickname {
  static readonly maxLength = 10;

  private constructor(readonly value: string) {}

  static parse(input: string): Nickname {
    return new Nickname(
      trimmedWithin(input, 1, Nickname.maxLength, 'nickname'),
    );
  }

  /** A nickname already stored, so already valid. */
  static fromStored(value: string): Nickname {
    return new Nickname(value);
  }

  equals(other: Nickname): boolean {
    return this.value === other.value;
  }
}
