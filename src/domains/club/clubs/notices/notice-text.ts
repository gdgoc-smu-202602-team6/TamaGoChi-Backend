import { trimmedWithin } from '../../../../foundation/text/text-length.js';

/** A notice's text: trimmed, 1 to 2,000 grapheme clusters (N-11). */
export class NoticeText {
  static readonly maxLength = 2000;

  private constructor(readonly value: string) {}

  static parse(input: string): NoticeText {
    return new NoticeText(
      trimmedWithin(input, 1, NoticeText.maxLength, 'body'),
    );
  }
}
