import { randomInt } from 'node:crypto';
import { contractPattern } from '../../../foundation/contract/contract-document.js';
import { FixedLengthFormat } from '../../../foundation/contract/fixed-length-format.js';

/** The contract's InviteCode pattern is the format; generating and checking both read it. */
const format = FixedLengthFormat.of(contractPattern('InviteCode'));

/** The code a club hands out to let people apply. It does not expire. */
export class InviteCode {
  private constructor(readonly value: string) {}

  /** A fresh random code. Uniqueness is the database's to check. */
  static generate(): InviteCode {
    return new InviteCode(
      Array.from(
        { length: format.length },
        () => format.alphabet[randomInt(format.alphabet.length)],
      ).join(''),
    );
  }

  static parse(input: string): InviteCode {
    if (!format.matches(input))
      throw new RangeError(`invite code must match ${format.pattern.source}`);
    return new InviteCode(input);
  }

  static fromStored(value: string): InviteCode {
    return new InviteCode(value);
  }
}
