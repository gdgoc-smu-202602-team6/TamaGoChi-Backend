import { Controller, Get, Query } from '@nestjs/common';
import type { Item } from '../../domains/game/item/item.js';
import { ItemRepository } from '../../domains/game/item/item.repository.js';
import type { ItemCategory } from '../../domains/game/item/slot.js';
import type { components } from '../../foundation/contract/openapi.js';

type ItemBody = components['schemas']['Item'];

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
    ...(item.roomSize !== null ? { roomSize: item.roomSize } : {}),
  };
}
