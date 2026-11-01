import type { Item } from '../../items/item.js';
import type { SlotName } from '../../items/slot.js';
import { Placement } from './placement.js';
import type { PlacementTarget } from './placement-target.js';

/** Why a change of the room is refused: a request that breaks a rule (400), or an item the user does not have (409). */
export type RoomRefusal =
  | {
      readonly kind: 'invalid';
      readonly field: string;
      readonly message: string;
    }
  | { readonly kind: 'not-owned'; readonly itemId: string };

export interface EquipRequest {
  readonly slot: SlotName;
  readonly itemId: string;
}

/**
 * A user's room (merged 5장): one item per slot, always a house (D-03), the placed things (D-10), and when its owner
 * last opened the guestbook (M-21). No stored room is the default one: the items owned from the start.
 */
export class Room {
  constructor(
    readonly userId: string,
    readonly equipped: ReadonlyMap<SlotName, Item>,
    readonly placements: readonly Placement[],
    readonly guestbookCheckedAt: Date | null,
  ) {}

  /** The room before its owner changed anything. */
  static default(userId: string, catalog: readonly Item[]): Room {
    const equipped = new Map<SlotName, Item>();
    for (const item of catalog)
      if (item.defaultOwned && !equipped.has(item.slot.name))
        equipped.set(item.slot.name, item);
    return new Room(userId, equipped, [], null);
  }

  /** The floor is size × size cells; the house sets it. */
  get size(): number {
    return this.equipped.get('ROOM')?.roomSize ?? 0;
  }

  /** Replaces everything equipped (updateRoom). */
  withEquipped(
    requests: readonly EquipRequest[],
    catalog: ReadonlyMap<string, Item>,
    owned: ReadonlySet<string>,
  ): Room | RoomRefusal {
    const equipped = new Map<SlotName, Item>();
    for (const [index, request] of requests.entries()) {
      const field = `/body/equipped/${index}`;
      const item = catalog.get(request.itemId);
      if (!item) return { kind: 'invalid', field, message: 'no such item' };
      if (item.slot.name !== request.slot)
        return {
          kind: 'invalid',
          field,
          message: `the item is not for ${request.slot}`,
        };
      if (equipped.has(request.slot))
        return { kind: 'invalid', field, message: 'one item per slot' };
      if (!owned.has(item.id)) return { kind: 'not-owned', itemId: item.id };
      equipped.set(request.slot, item);
    }
    if (!equipped.has('ROOM'))
      return {
        kind: 'invalid',
        field: '/body/equipped',
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
    const seen = new Set<PlacementTarget>();
    for (const [index, placement] of placements.entries()) {
      const field = `/body/placements/${index}`;
      if (!targets.has(placement.target))
        return {
          kind: 'invalid',
          field,
          message: `${placement.target} is not equipped`,
        };
      if (seen.has(placement.target))
        return { kind: 'invalid', field, message: 'one placement per target' };
      if (!placement.fitsIn(this.size))
        return {
          kind: 'invalid',
          field,
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

  /** What can be placed: the character and the equipped floor things. */
  private targets(
    equipped: ReadonlyMap<SlotName, Item> = this.equipped,
  ): Set<PlacementTarget> {
    const targets = new Set<PlacementTarget>(['CHARACTER']);
    for (const item of equipped.values()) {
      const target = item.slot.target;
      if (target) targets.add(target);
    }
    return targets;
  }

  /** The new equipment with the placements kept for what is still there, moved when the house changed (S-09). */
  private rearranged(equipped: ReadonlyMap<SlotName, Item>): Room {
    const targets = this.targets(equipped);
    const toSize = equipped.get('ROOM')?.roomSize ?? 0;
    const placements = this.placements
      .filter((placement) => targets.has(placement.target))
      .map((placement) =>
        toSize === this.size ? placement : placement.movedTo(this.size, toSize),
      );
    return new Room(this.userId, equipped, placements, this.guestbookCheckedAt);
  }
}
