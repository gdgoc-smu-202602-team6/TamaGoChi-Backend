import { randomInt } from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const length = 8;
const pattern = /^[A-Z0-9]{8}$/;

/** The code a club hands out to let people apply. Eight capital letters or digits; it does not expire. */
export class InviteCode {
  private constructor(readonly value: string) {}

  /** A fresh random code. Uniqueness is the database's to check. */
  static generate(): InviteCode {
    return new InviteCode(
      Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join(
        '',
      ),
    );
  }

  static parse(input: string): InviteCode {
    if (!pattern.test(input))
      throw new RangeError('invite code must be 8 capital letters or digits');
    return new InviteCode(input);
  }

  static fromStored(value: string): InviteCode {
    return new InviteCode(value);
  }
}
