import type { Nickname } from './nickname.js';

/** Who signs in. Credentials, email verification and account linking are better-auth's. */
export class User {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly nickname: Nickname,
  ) {}
}
