/** When a user's applications to clubs were approved (B-16: that day has no absence penalty). The club domain implements it. */
export abstract class JoinDays {
  /** The approval moments of the user's current memberships. */
  abstract joinedAt(userId: string): Promise<readonly Date[]>;
}
