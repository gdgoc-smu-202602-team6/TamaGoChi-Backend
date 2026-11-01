import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ItemRepository } from '../../../domains/game/items/item.repository.js';
import { Placement } from '../../../domains/game/users/room/placement.js';
import type { PlacementTarget } from '../../../domains/game/users/room/placement-target.js';
import type {
  Room,
  RoomRefusal,
} from '../../../domains/game/users/room/room.js';
import { RoomRepository } from '../../../domains/game/users/room/room.repository.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { BadRequest } from '../../../foundation/problem/problems/bad-request.js';
import { Conflict } from '../../../foundation/problem/problems/conflict.js';
import { Forbidden } from '../../../foundation/problem/problems/forbidden.js';
import { resolveMe } from '../../me.js';
import { PlayerViews } from '../player-views.js';
import { userIdsOf } from '../user-ids.js';

type RoomBody = components['schemas']['Room'];
type RoomUpdateBody = components['schemas']['RoomUpdate'];

@Controller('users')
export class RoomController {
  constructor(
    private readonly players: PlayerViews,
    private readonly rooms: RoomRepository,
    private readonly items: ItemRepository,
  ) {}

  /** batchGetRooms: the friend cards (R-01~R-03), in the order asked. */
  @Get('-/room\\:batchGet')
  async batchGet(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('userIds') userIds: string | string[],
  ): Promise<{ items: RoomBody[] }> {
    const owners = await this.players.visible(caller, userIdsOf(userIds));
    return {
      items: await this.players.roomBodies(owners, caller, new Date()),
    };
  }

  /** getRoom */
  @Get(':userId/room')
  async get(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<RoomBody> {
    const owners = await this.players.visible(caller, [userId]);
    const [body] = await this.players.roomBodies(owners, caller, new Date());
    return body;
  }

  /** updateRoom: saved at once when decorating is done (D-16); only one's own room. */
  @Patch(':userId/room')
  async update(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() body: RoomUpdateBody,
  ): Promise<RoomBody> {
    if (resolveMe(userId, caller.id) !== caller.id)
      throw new Forbidden('only the owner changes a room');
    const catalog = await this.items.catalog();
    const owned = body.equipped
      ? new Set(
          (await this.items.owned(caller.id, catalog)).map(
            (one) => one.item.id,
          ),
        )
      : new Set<string>();
    const byId = new Map(catalog.map((item) => [item.id, item]));
    const now = new Date();
    const changed = await this.rooms.change(caller.id, catalog, (current) => {
      let room: Room | RoomRefusal = current;
      if (body.equipped) room = room.withEquipped(body.equipped, byId, owned);
      if (body.placements && !isRefusal(room))
        room = room.withPlacements(
          body.placements.map(
            (one) => new Placement(one.target as PlacementTarget, one.x, one.y),
          ),
        );
      if (body.guestbookCheckedAt && !isRefusal(room)) {
        const sent = new Date(body.guestbookCheckedAt);
        room = room.withGuestbookCheckedAt(sent < now ? sent : now);
      }
      return room;
    });
    if (isRefusal(changed)) {
      if (changed.kind === 'not-owned') throw new Conflict('not-owned');
      throw new BadRequest([
        { field: changed.field, message: changed.message },
      ]);
    }
    const me = await this.players.me(caller);
    const [result] = await this.players.roomBodies([me], caller, new Date());
    return result;
  }
}

function isRefusal(room: Room | RoomRefusal): room is RoomRefusal {
  return 'kind' in room;
}
