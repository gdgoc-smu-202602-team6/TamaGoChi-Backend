import type { Id } from '../../../foundation/id/id.js';
import type { Nickname } from './nickname.js';

/** Who signs in. Credentials, email verification and account linking are better-auth's. */
export class User {
  constructor(
    readonly id: Id<'User'>,
    readonly email: string,
    readonly nickname: Nickname,
    /** The day of this moment is day 1 of use (H-21). */
    readonly createdAt: Date,
  ) {}
}
