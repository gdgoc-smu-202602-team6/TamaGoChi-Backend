import { Controller, Get, Param, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { OwnedItem } from '../../../domains/game/users/items/owned-item.js';
import { ItemRepository } from '../../../domains/game/items/item.repository.js';
import { OwnedItemRepository } from '../../../domains/game/users/items/owned-item.repository.js';
import { PurchaseService } from '../../../domains/game/users/items/purchase.service.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import type { Id } from '../../../foundation/id/id.js';
import { Conflict } from '../../../foundation/problem/problems/conflict.js';
import { NotFound } from '../../../foundation/problem/problems/not-found.js';
import { PlayerViews } from '../player-views.js';

type OwnedItemBody = components['schemas']['OwnedItem'];

@Controller('users/me/items')
export class OwnedItemsController {
  constructor(
    private readonly items: ItemRepository,
    private readonly ownedItems: OwnedItemRepository,
    private readonly purchases: PurchaseService,
    private readonly players: PlayerViews,
  ) {}

  /** listOwnedItems: the items owned from the start included (D-02, M-12). */
  @Get()
  async list(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<{ items: OwnedItemBody[] }> {
    const owned = await this.ownedItems.owned(
      caller.id,
      await this.items.catalog(),
    );
    return { items: owned.map(toBody) };
  }

  /** purchaseItem: 201 when bought, 200 when it was owned already (api.md 3절). */
  @Put(':itemId')
  async purchase(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('itemId') itemId: Id<'Item'>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<OwnedItemBody> {
    const now = new Date();
    const me = await this.players.me(caller);
    const level = (await this.players.stats(me, now)).level;
    const outcome = await this.purchases.purchase(
      caller.id,
      itemId,
      level,
      now,
    );
    if (!outcome) throw new NotFound('item not found');
    if ('reason' in outcome) {
      if (outcome.reason === 'not-on-sale') throw new Conflict('not-on-sale');
      if (outcome.reason === 'level-locked')
        throw new Conflict('level-locked', {
          requiredLevel: outcome.requiredLevel,
        });
      throw new Conflict('insufficient-volts', { shortBy: outcome.shortBy });
    }
    response.status(outcome.bought ? 201 : 200);
    return toBody(outcome.owned);
  }
}

function toBody(owned: OwnedItem): OwnedItemBody {
  return {
    itemId: owned.item.id,
    pricePaid: owned.pricePaid,
    ...(owned.purchasedAt
      ? { purchasedAt: owned.purchasedAt.toISOString() }
      : {}),
  };
}
