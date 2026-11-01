import { trimmedWithin } from '../../../foundation/text/text-length.js';

/** A notice's text: trimmed, 1 to 2,000 grapheme clusters (N-11). */
export class NoticeBody {
  static readonly maxLength = 2000;

  private constructor(readonly value: string) {}

  static parse(input: string): NoticeBody {
    return new NoticeBody(
      trimmedWithin(input, 1, NoticeBody.maxLength, 'body'),
    );
  }
}
