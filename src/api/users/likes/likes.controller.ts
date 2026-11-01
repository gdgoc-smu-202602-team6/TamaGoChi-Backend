import { Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { LikeRepository } from '../../../domains/game/users/likes/like.repository.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import { BadRequest } from '../../../foundation/problem/problems/bad-request.js';
import { PlayerViews } from '../player-views.js';

@Controller('users/:userId/likes/me')
export class LikesController {
  constructor(
    private readonly likes: LikeRepository,
    private readonly players: PlayerViews,
  ) {}

  /** likeRoom: one per user, whichever club (9.2); not one's own room. */
  @Put()
  @HttpCode(204)
  async like(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<void> {
    const [owner] = await this.players.visible(caller, [userId]);
    if ((await this.likes.like(owner.id, caller.id)) === 'own-room')
      throw new BadRequest([
        { field: '/params/userId', message: 'not your own room' },
      ]);
  }

  /** unlikeRoom */
  @Delete()
  @HttpCode(204)
  async unlike(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<void> {
    const [owner] = await this.players.visible(caller, [userId]);
    await this.likes.unlike(owner.id, caller.id);
  }
}
