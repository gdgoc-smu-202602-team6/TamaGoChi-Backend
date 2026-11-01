/** When a user's applications to clubs were approved (B-16: that day has no absence penalty). The club domain implements it. */
export abstract class JoinDays {
  /** Every moment an application of the user was approved, in clubs left since included. */
  abstract joinedAt(userId: string): Promise<readonly Date[]>;
}
