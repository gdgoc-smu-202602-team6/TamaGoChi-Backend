import type { GuestbookEntry } from '../../../../domains/game/users/guestbook-entries/guestbook-entry.js';
import type { components } from '../../../../foundation/contract/openapi.js';

export type GuestbookEntryBody = components['schemas']['GuestbookEntry'];

/** A guestbook entry as the contract shapes it; `new` only for the room's owner (`ownerCheckedAt` given). */
export function toGuestbookEntryBody(
  entry: GuestbookEntry,
  ownerCheckedAt?: Date | null,
): GuestbookEntryBody {
  return {
    id: entry.id,
    clubId: entry.clubId,
    userId: entry.userId,
    authorUserId: entry.authorUserId,
    body: entry.body,
    createdAt: entry.createdAt.toISOString(),
    ...(ownerCheckedAt !== undefined
      ? { new: entry.isNewSince(ownerCheckedAt) }
      : {}),
  };
}
