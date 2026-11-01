import type { Item } from '../../items/item.js';
import type { SlotName } from '../../items/slot/slot.js';
import type { Placement } from './placement.js';
import {
  PlacementTarget,
  type PlacementTargetName,
} from '../../floor/placement-target.js';
import type { Id } from '../../../../foundation/id/id.js';

/**
 * Why a change of the room is refused: a change that breaks a rule (400), or an item the user does not have (409).
 * An invalid one names the list of the change and its entry; no index is the list as a whole.
 */
export type RoomRefusal =
  | {
      readonly kind: 'invalid';
      readonly list: 'equipped' | 'placements';
      readonly index?: number;
      readonly message: string;
    }
  | { readonly kind: 'not-owned'; readonly itemId: Id<'Item'> };

export interface EquipRequest {
  readonly slot: SlotName;
  readonly itemId: Id<'Item'>;
}

/**
 * A user's room (merged 5장): one item per slot, always a house (D-03), the placed things (D-10), and when its owner
 * last opened the guestbook (M-21). No stored room is the default one: the items owned from the start.
 */
export class Room {
  constructor(
    readonly userId: Id<'User'>,
    readonly equipped: ReadonlyMap<SlotName, Item>,
    readonly placements: readonly Placement[],
    readonly guestbookCheckedAt: Date | null,
  ) {}

  /** The room before its owner changed anything. */
  static default(userId: Id<'User'>, catalog: readonly Item[]): Room {
    const equipped = new Map<SlotName, Item>();
    for (const item of catalog)
      if (item.defaultOwned && !equipped.has(item.slot.name))
        equipped.set(item.slot.name, item);
    return new Room(userId, equipped, [], null);
  }

  /** A stored room. A slot that cannot be emptied keeps the default room's item when none is stored for it. */
  static stored(
    userId: Id<'User'>,
    equipped: ReadonlyMap<SlotName, Item>,
    placements: readonly Placement[],
    guestbookCheckedAt: Date | null,
    catalog: readonly Item[],
  ): Room {
    const kept = new Map(equipped);
    for (const [slot, item] of Room.default(userId, catalog).equipped)
      if (!item.slot.removable && !kept.has(slot)) kept.set(slot, item);
    return new Room(userId, kept, placements, guestbookCheckedAt);
  }

  /** The floor is size × size cells; the house sets it. */
  get size(): number {
    return floorSizeOf(this.equipped);
  }

  /** Replaces everything equipped (updateRoom). */
  withEquipped(
    requests: readonly EquipRequest[],
    catalog: ReadonlyMap<Id<'Item'>, Item>,
    owned: ReadonlySet<Id<'Item'>>,
  ): Room | RoomRefusal {
    const equipped = new Map<SlotName, Item>();
    for (const [index, request] of requests.entries()) {
      const at = { list: 'equipped', index } as const;
      const item = catalog.get(request.itemId);
      if (!item) return { kind: 'invalid', ...at, message: 'no such item' };
      if (item.slot.name !== request.slot)
        return {
          kind: 'invalid',
          ...at,
          message: `the item is not for ${request.slot}`,
        };
      if (equipped.has(request.slot))
        return { kind: 'invalid', ...at, message: 'one item per slot' };
      if (!owned.has(item.id)) return { kind: 'not-owned', itemId: item.id };
      equipped.set(request.slot, item);
    }
    for (const item of catalog.values())
      if (!item.slot.removable && !equipped.has(item.slot.name))
        return {
          kind: 'invalid',
          list: 'equipped',
          message: 'a house must be equipped',
        };
    return this.rearranged(equipped);
  }

  /** Puts an item on, taking off the one of its slot (a purchase equips what it bought, S-08). */
  equip(item: Item): Room {
    const equipped = new Map(this.equipped);
    equipped.set(item.slot.name, item);
    return this.rearranged(equipped);
  }

  /** Replaces the placements (updateRoom). Only what is equipped, and the character, is placed (D-10). */
  withPlacements(placements: readonly Placement[]): Room | RoomRefusal {
    const targets = this.targets();
    const seen = new Set<PlacementTargetName>();
    for (const [index, placement] of placements.entries()) {
      const at = { list: 'placements', index } as const;
      const target = targets.get(placement.target);
      if (!target)
        return {
          kind: 'invalid',
          ...at,
          message: `${placement.target} is not equipped`,
        };
      if (seen.has(placement.target))
        return { kind: 'invalid', ...at, message: 'one placement per target' };
      if (!placement.fitsIn(this.size, target.grid))
        return {
          kind: 'invalid',
          ...at,
          message: 'outside the room or off its grid',
        };
      seen.add(placement.target);
    }
    return new Room(
      this.userId,
      this.equipped,
      placements,
      this.guestbookCheckedAt,
    );
  }

  withGuestbookCheckedAt(moment: Date): Room {
    return new Room(this.userId, this.equipped, this.placements, moment);
  }

  /** What can be placed, by name: the character and the equipped floor things. */
  private targets(
    equipped: ReadonlyMap<SlotName, Item> = this.equipped,
  ): Map<PlacementTargetName, PlacementTarget> {
    const targets = new Map([
      [PlacementTarget.character.name, PlacementTarget.character],
    ]);
    for (const item of equipped.values()) {
      const target = item.slot.target;
      if (target) targets.set(target.name, target);
    }
    return targets;
  }

  /** The new equipment with the placements kept for what is still there, moved when the house changed (S-09). */
  private rearranged(equipped: ReadonlyMap<SlotName, Item>): Room {
    const targets = this.targets(equipped);
    const toSize = floorSizeOf(equipped);
    const placements = this.placements.flatMap((placement) => {
      const target = targets.get(placement.target);
      if (!target) return [];
      return toSize === this.size
        ? [placement]
        : [placement.movedTo(this.size, toSize, target.grid)];
    });
    return new Room(this.userId, equipped, placements, this.guestbookCheckedAt);
  }
}

/** The floor the equipped house gives; none without one. */
function floorSizeOf(equipped: ReadonlyMap<SlotName, Item>): number {
  for (const item of equipped.values()) {
    const size = item.slot.floorSize;
    if (size !== null) return size;
  }
  return 0;
}
