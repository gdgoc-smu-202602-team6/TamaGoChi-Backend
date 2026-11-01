import { Prisma } from './generated/client.js';

/** The row breaks a unique constraint (Prisma P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Runs `work`; when it breaks a unique constraint, gives `outcome`, the caller's name for that clash, instead. */
export async function orOnUniqueViolation<T, const O>(
  work: () => Promise<T>,
  outcome: O,
): Promise<T | O> {
  try {
    return await work();
  } catch (error) {
    if (isUniqueViolation(error)) return outcome;
    throw error;
  }
}

/** The row is still referenced by a RESTRICT foreign key (Prisma P2003). */
export function isStillReferenced(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  );
}
