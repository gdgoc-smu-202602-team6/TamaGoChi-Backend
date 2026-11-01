import { trimmedWithin } from '../../../foundation/text/text-length.js';

/** What a guestbook entry says: trimmed, 1 to 60 grapheme clusters, so blank text is refused (R-14). */
export class GuestbookText {
  static readonly maxLength = 60;

  private constructor(readonly value: string) {}

  static parse(input: string): GuestbookText {
    return new GuestbookText(
      trimmedWithin(input, 1, GuestbookText.maxLength, 'guestbook text'),
    );
  }
}
