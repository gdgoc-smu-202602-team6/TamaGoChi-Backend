import { Prisma } from './generated/client.js';

/** The row breaks a unique constraint (Prisma P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** The row is still referenced by a RESTRICT foreign key (Prisma P2003). */
export function isStillReferenced(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  );
}
