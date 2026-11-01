import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';

/** How many liked a room, and whether the viewer did. */
export interface LikeTally {
  readonly count: number;
  readonly likedByViewer: boolean;
}

/** Likes are per user, whichever club the room was seen through (9.2). Nobody likes their own room. */
@Injectable()
export class LikeRepository {
  constructor(private readonly database: DatabaseClient) {}

  async like(ownerId: string, likerId: string): Promise<void> {
    await this.database.userLike.upsert({
      where: { userId_likerUserId: { userId: ownerId, likerUserId: likerId } },
      create: { userId: ownerId, likerUserId: likerId },
      update: {},
    });
  }

  async unlike(ownerId: string, likerId: string): Promise<void> {
    await this.database.userLike.deleteMany({
      where: { userId: ownerId, likerUserId: likerId },
    });
  }

  /** The tally of each owner's room as `viewerId` sees it. */
  async tallies(
    ownerIds: readonly string[],
    viewerId: string,
  ): Promise<Map<string, LikeTally>> {
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
    const countOf = new Map(counts.map((row) => [row.userId, row._count._all]));
    const liked = new Set(mine.map((row) => row.userId));
    return new Map(
      ownerIds.map((id) => [
        id,
        { count: countOf.get(id) ?? 0, likedByViewer: liked.has(id) },
      ]),
    );
  }
}
