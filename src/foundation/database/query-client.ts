import type { DatabaseClient } from './database-client.js';
import type { Prisma } from './generated/client.js';

/** What a repository runs its queries on: the client itself, or the transaction a caller already opened. */
export type QueryClient = DatabaseClient | Prisma.TransactionClient;
