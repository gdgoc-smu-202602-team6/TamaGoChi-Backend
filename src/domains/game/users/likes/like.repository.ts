import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { asId, type Id } from '../../../../foundation/id/id.js';
import { Like } from './like.js';
import type { LikeTally } from './like-tally.js';

@Injectable()
export class LikeRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** 'own-room': nobody likes their own room. */
  async like(
    ownerId: Id<'User'>,
    likerId: Id<'User'>,
  ): Promise<'own-room' | void> {
    if (!Like.allowed(ownerId, likerId)) return 'own-room';
    await this.database.userLike.upsert({
      where: { userId_likerUserId: { userId: ownerId, likerUserId: likerId } },
      create: { userId: ownerId, likerUserId: likerId },
      update: {},
    });
  }

  async unlike(ownerId: Id<'User'>, likerId: Id<'User'>): Promise<void> {
    await this.database.userLike.deleteMany({
      where: { userId: ownerId, likerUserId: likerId },
    });
  }

  /** The tally of each owner's room as `viewerId` sees it. */
  async tallies(
    ownerIds: readonly Id<'User'>[],
    viewerId: Id<'User'>,
  ): Promise<Map<Id<'User'>, LikeTally>> {
    const [counts, mine] = await Promise.all([
      this.database.userLike.groupBy({
        by: ['userId'],
        where: { userId: { in: [...ownerIds] } },
        _count: { _all: true },
      }),
      this.database.userLike.findMany({
        where: { userId: { in: [...ownerIds] }, likerUserId: viewerId },
        select: { userId: true },
      }),
    ]);
    const countOf = new Map(
      counts.map((row) => [asId<'User'>(row.userId), row._count._all]),
    );
    const liked = new Set(mine.map((row) => asId<'User'>(row.userId)));
    return new Map(
      ownerIds.map((id) => [
        id,
        { count: countOf.get(id) ?? 0, likedByViewer: liked.has(id) },
      ]),
    );
  }
}
