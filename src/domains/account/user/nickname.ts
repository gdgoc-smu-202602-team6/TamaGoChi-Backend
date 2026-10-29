const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' });

/** A display name: trimmed, 1 to 10 characters as a person counts them (an emoji is one). Not unique. */
export class Nickname {
  static readonly maxLength = 10;

  private constructor(readonly value: string) {}

  static parse(input: string): Nickname {
    const value = input.trim();
    const length = [...segmenter.segment(value)].length;
    if (length < 1 || length > Nickname.maxLength) {
      throw new RangeError(
        `nickname must be 1 to ${Nickname.maxLength} characters`,
      );
    }
    return new Nickname(value);
  }

  /** A nickname already stored, so already valid. */
  static fromStored(value: string): Nickname {
    return new Nickname(value);
  }

  equals(other: Nickname): boolean {
    return this.value === other.value;
  }
}
