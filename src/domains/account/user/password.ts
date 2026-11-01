import { textLength } from '../../../foundation/text/text-length.js';

/** OWASP's list of password special characters: ASCII punctuation and the space. */
const special = /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

/**
 * A password a person may choose: at least 8 grapheme clusters, with an ASCII letter, a digit
 * and a special character. better-auth hashes and keeps it; this only checks the rule.
 */
export class Password {
  static readonly minLength = 8;

  private constructor(readonly value: string) {}

  static parse(input: string): Password {
    if (textLength(input) < Password.minLength)
      throw new RangeError(
        `password must be at least ${Password.minLength} characters`,
      );
    if (!/[A-Za-z]/.test(input) || !/[0-9]/.test(input) || !special.test(input))
      throw new RangeError(
        'password must have a letter, a digit and a special character',
      );
    return new Password(input);
  }
}
