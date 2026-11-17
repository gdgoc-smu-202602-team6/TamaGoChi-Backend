import type { Item } from '../../items/item.js';
import type { SlotName } from '../../items/slot/slot.js';
import type { PlacementPolicy } from '../../placement/placement-policy.js';
import type { Placement } from './placement.js';
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
 * A user's room (merged 5장): one item per slot, always a house and a character (D-03), the placed things (D-10), and
 * when its owner last opened the guestbook (M-21). No stored room is the default one: the items owned from the start.
 */
export class Room {
  constructor(
    readonly userId: Id<'User'>,
    readonly equipped: ReadonlyMap<SlotName, Item>,
    /** In target order (`inTargetOrder`). */
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

  /**
   * A stored room. A slot that cannot be emptied keeps the default room's item when none is stored for it, and the
   * placements are fitted to what is equipped now, as its placement policies are now.
   */
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
    const size = floorSizeOf(kept);
    return new Room(
      userId,
      kept,
      fitted(placements, size, kept),
      guestbookCheckedAt,
    );
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
          message: `${item.slot.name} must be equipped`,
        };
    return this.rearranged(equipped);
  }

  /** Puts an item on, taking off the one of its slot (a purchase equips what it bought, S-08). */
  equip(item: Item): Room {
    const equipped = new Map(this.equipped);
    equipped.set(item.slot.name, item);
    return this.rearranged(equipped);
  }

  /**
   * Replaces the placements (updateRoom). Only what is equipped with a placement policy is placed
   * (D-10), each as its policy says, and no two solid ones overlap on a surface.
   */
  withPlacements(placements: readonly Placement[]): Room | RoomRefusal {
    const targets = targetsOf(this.equipped);
    const placed: Placed[] = [];
    for (const [index, placement] of placements.entries()) {
      const at = { list: 'placements', index } as const;
      const policy = targets.get(placement.target);
      if (!policy)
        return {
          kind: 'invalid',
          ...at,
          message: `${placement.target} is not equipped, or is not placed`,
        };
      if (placed.some(([one]) => one.target === placement.target))
        return { kind: 'invalid', ...at, message: 'one placement per target' };
      if (!placement.fitsIn(this.size, policy))
        return {
          kind: 'invalid',
          ...at,
          message:
            'not on a surface of its kind, outside the surface or off its grid',
        };
      if (clashes(placement, policy, placed))
        return {
          kind: 'invalid',
          ...at,
          message: 'overlaps another placement on its surface',
        };
      placed.push([placement, policy]);
    }
    return new Room(
      this.userId,
      this.equipped,
      inTargetOrder(placements),
      this.guestbookCheckedAt,
    );
  }

  withGuestbookCheckedAt(moment: Date): Room {
    return new Room(this.userId, this.equipped, this.placements, moment);
  }

  /** The new equipment, with the placements fitted to it (S-09). */
  private rearranged(equipped: ReadonlyMap<SlotName, Item>): Room {
    return new Room(
      this.userId,
      equipped,
      fitted(this.placements, this.size, equipped),
      this.guestbookCheckedAt,
    );
  }
}

/**
 * A room's placements always follow what is equipped and its placement policies (D-10~D-14, S-09): each placement,
 * made in a fromSize room, is fitted to its target's policy in the equipped house. One whose target is not placed now,
 * that no longer fits, or that then overlaps one kept before it in target order goes, so the screen puts it where it
 * starts.
 */
function fitted(
  placements: readonly Placement[],
  fromSize: number,
  equipped: ReadonlyMap<SlotName, Item>,
): Placement[] {
  const targets = targetsOf(equipped);
  const toSize = floorSizeOf(equipped);
  const kept: Placed[] = [];
  for (const placement of inTargetOrder(placements)) {
    const policy = targets.get(placement.target);
    const moved = policy && placement.fittedTo(fromSize, toSize, policy);
    if (moved && !clashes(moved, policy, kept)) kept.push([moved, policy]);
  }
  return kept.map(([placement]) => placement);
}

/**
 * The placements ordered by their target's name, compared by code point: the order a room keeps and answers them in,
 * and so which of two that come to overlap stays (the earlier).
 */
function inTargetOrder(placements: readonly Placement[]): Placement[] {
  return [...placements].sort((a, b) =>
    a.target < b.target ? -1 : a.target > b.target ? 1 : 0,
  );
}

/** A placement with its target's policy. */
type Placed = readonly [Placement, PlacementPolicy];

/** Whether the placement, placed as `policy` says, cannot stand with one already placed. */
function clashes(
  placement: Placement,
  policy: PlacementPolicy,
  placed: readonly Placed[],
): boolean {
  return placed.some(([other, otherPolicy]) =>
    placement.clashesWith(policy, other, otherPolicy),
  );
}

/** What can be placed, with how: the slot of each equipped item that has a placement policy. */
function targetsOf(
  equipped: ReadonlyMap<SlotName, Item>,
): Map<SlotName, PlacementPolicy> {
  const targets = new Map<SlotName, PlacementPolicy>();
  for (const [slot, item] of equipped)
    if (item.placementPolicy) targets.set(slot, item.placementPolicy);
  return targets;
}

/** The floor the equipped house gives; none without one. */
function floorSizeOf(equipped: ReadonlyMap<SlotName, Item>): number {
  for (const item of equipped.values()) {
    const size = item.slot.floorSize;
    if (size !== null) return size;
  }
  return 0;
}
