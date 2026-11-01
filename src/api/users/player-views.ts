import { Injectable } from '@nestjs/common';
import type { User } from '../../domains/account/user/user.js';
import { UserRepository } from '../../domains/account/user/user.repository.js';
import { GuestbookRepository } from '../../domains/game/guestbook/guestbook.repository.js';
import { ItemRepository } from '../../domains/game/item/item.repository.js';
import { LevelCurve } from '../../domains/game/level/level-curve.js';
import { LikeRepository } from '../../domains/game/like/like.repository.js';
import { ProgressService } from '../../domains/game/progress/progress.service.js';
import { RoomRepository } from '../../domains/game/room/room.repository.js';
import type { Stats } from '../../domains/game/stats/stats.js';
import { StatsService } from '../../domains/game/stats/stats.service.js';
import type { AuthenticatedUser } from '../../foundation/auth/authenticated-user.js';
import type { components } from '../../foundation/contract/openapi.js';
import { SharedClubs } from '../../foundation/membership/shared-clubs.js';
import { NotFound } from '../../foundation/problem/problems/not-found.js';
import { resolveMe } from '../me.js';

type RoomBody = components['schemas']['Room'];
type StatsBody = components['schemas']['Stats'];

/**
 * What the game shows of users: whom the caller may see (themselves, or someone in a club with them, api.md 3절) and
 * their rooms and stats as the contract shapes them. The account gives when each started; the game the rest.
 */
@Injectable()
export class PlayerViews {
  constructor(
    private readonly users: UserRepository,
    private readonly progress: ProgressService,
    private readonly items: ItemRepository,
    private readonly rooms: RoomRepository,
    private readonly likes: LikeRepository,
    private readonly guestbook: GuestbookRepository,
    private readonly sharedClubs: SharedClubs,
    private readonly statsService: StatsService,
  ) {}

  /** The users of `userIds` (`me` is the caller), in that order; 404 if any is unknown or not visible. */
  async visible(
    caller: AuthenticatedUser,
    userIds: readonly string[],
  ): Promise<User[]> {
    const ids = userIds.map((id) => resolveMe(id, caller.id));
    const [users, sharing] = await Promise.all([
      this.users.findMany(ids),
      this.sharedClubs.sharingWith(
        caller.id,
        ids.filter((id) => id !== caller.id),
      ),
    ]);
    return ids.map((id) => {
      const user = users.get(id);
      if (!user || (id !== caller.id && !sharing.has(id)))
        throw new NotFound('user not found');
      return user;
    });
  }

  /** The caller as a user. */
  async me(caller: AuthenticatedUser): Promise<User> {
    const [user] = await this.visible(caller, [caller.id]);
    return user;
  }

  stats(user: User, now: Date): Promise<Stats> {
    return this.statsService.of(user.id, user.createdAt, now);
  }

  async statsBody(user: User, now: Date): Promise<StatsBody> {
    return toStatsBody(await this.stats(user, now));
  }

  /** Rooms as `viewer` sees them; the owner also sees the count of new guestbook entries. */
  async roomBodies(
    owners: readonly User[],
    viewer: AuthenticatedUser,
    now: Date,
  ): Promise<RoomBody[]> {
    const catalog = await this.items.catalog();
    const tallies = await this.likes.tallies(
      owners.map((owner) => owner.id),
      viewer.id,
    );
    return Promise.all(
      owners.map(async (owner) => {
        const [room, play] = await Promise.all([
          this.rooms.find(owner.id, catalog),
          this.progress.now(owner.id, owner.createdAt, now),
        ]);
        const condition = play.progress.condition;
        const tally = tallies.get(owner.id) ?? {
          count: 0,
          likedByViewer: false,
        };
        return {
          userId: owner.id,
          equipped: [...room.equipped].map(([slot, item]) => ({
            slot,
            itemId: item.id,
          })),
          placements: room.placements.map(({ target, x, y }) => ({
            target,
            x,
            y,
          })),
          condition: {
            hearts: condition.hearts,
            bugs: condition.bugs,
            bugProgressSeconds: condition.bugProgressSeconds,
          },
          likeCount: tally.count,
          likedByMe: tally.likedByViewer,
          ...(owner.id === viewer.id
            ? {
                newGuestbookCount: await this.guestbook.countNew(
                  owner.id,
                  room.guestbookCheckedAt,
                ),
              }
            : {}),
        };
      }),
    );
  }
}

function toStatsBody(stats: Stats): StatsBody {
  return {
    userId: stats.userId,
    xp: stats.xp,
    level: stats.level,
    levelXp: LevelCurve.xpFor(stats.level),
    nextLevelXp: LevelCurve.xpFor(stats.level + 1),
    volts: stats.volts,
    todaySeconds: stats.todaySeconds,
    todayAttended: stats.todayAttended,
    weekSeconds: stats.weekSeconds,
    week: stats.week.map((one) => ({
      day: one.day.toString(),
      studiedSeconds: one.studiedSeconds,
      goalMinutes: one.goalMinutes,
      goalMet: one.goalMet,
    })),
    attendanceStreak: stats.attendanceStreak,
    absenceStreak: stats.absenceStreak,
    dayNumber: stats.dayNumber,
  };
}
