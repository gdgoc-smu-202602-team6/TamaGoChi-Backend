import { Controller, Get, Query } from '@nestjs/common';
import type { Item } from '../../domains/game/items/item.js';
import { ItemRepository } from '../../domains/game/items/item.repository.js';
import type { ItemCategory } from '../../domains/game/items/item-category.js';
import type { PlacementPolicy } from '../../domains/game/placement/placement-policy.js';
import type { components } from '../../foundation/contract/openapi.js';

type ItemBody = components['schemas']['Item'];
type PlacementPolicyBody = components['schemas']['PlacementPolicy'];

@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemRepository) {}

  /** listItems: the catalog, the same for everyone (8.2); one tab with `category`. */
  @Get()
  async list(
    @Query('category') category?: ItemCategory,
  ): Promise<{ items: ItemBody[] }> {
    const catalog = await this.items.catalog();
    return {
      items: catalog
        .filter((item) => !category || item.slot.category === category)
        .map(toBody),
    };
  }
}

function toBody(item: Item): ItemBody {
  const floorSize = item.slot.floorSize;
  return {
    id: item.id,
    code: item.code,
    slot: item.slot.name,
    category: item.slot.category,
    name: item.name,
    grade: item.grade,
    price: item.price,
    minLevel: item.minLevel,
    defaultOwned: item.defaultOwned,
    ...(floorSize !== null ? { roomSize: floorSize } : {}),
    ...(item.placementPolicy
      ? { placementPolicy: toPolicyBody(item.placementPolicy) }
      : {}),
  };
}

function toPolicyBody(policy: PlacementPolicy): PlacementPolicyBody {
  const step = policy.grid.step;
  return {
    surfaceKind: policy.surfaceKind,
    width: policy.width,
    height: policy.height,
    ...(step !== null ? { step } : {}),
    solid: policy.solid,
  };
}
