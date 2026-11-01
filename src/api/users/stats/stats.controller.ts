import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { PlayerViews } from '../player-views.js';
import { userIdsOf } from '../user-ids.js';

type StatsBody = components['schemas']['Stats'];

@Controller('users')
export class StatsController {
  constructor(private readonly players: PlayerViews) {}

  /** batchGetStats: the friend cards (R-01), in the order asked. */
  @Get('-/stats\\:batchGet')
  async batchGet(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('userIds') userIds: string | string[],
  ): Promise<{ items: StatsBody[] }> {
    const users = await this.players.visible(caller, userIdsOf(userIds));
    const now = new Date();
    return {
      items: await Promise.all(
        users.map((user) => this.players.statsBody(user, now)),
      ),
    };
  }

  /** getStats */
  @Get(':userId/stats')
  async get(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<StatsBody> {
    const [user] = await this.players.visible(caller, [userId]);
    return this.players.statsBody(user, new Date());
  }
}
