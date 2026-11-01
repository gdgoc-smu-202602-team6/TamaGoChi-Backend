import { trimmedWithin } from '../../../../foundation/text/text-length.js';

/** A notice's title: trimmed, 1 to 50 grapheme clusters (N-11). */
export class NoticeTitle {
  static readonly maxLength = 50;

  private constructor(readonly value: string) {}

  static parse(input: string): NoticeTitle {
    return new NoticeTitle(
      trimmedWithin(input, 1, NoticeTitle.maxLength, 'title'),
    );
  }
}
