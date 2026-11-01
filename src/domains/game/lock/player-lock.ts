import type { Prisma } from '../../../foundation/database/generated/client.js';

/**
 * Serializes the game writes of one user (purchases, starting and ending sessions) inside the
 * transaction, so each sees the balance and the running session the one before left (S-08).
 */
export async function lockPlayer(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
}
