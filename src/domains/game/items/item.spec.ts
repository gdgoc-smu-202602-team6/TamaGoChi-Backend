import { asId } from '../../../foundation/id/id.js';
import { Grid } from '../placement/grid.js';
import { PlacementPolicy } from '../placement/placement-policy.js';
import { Item } from './item.js';
import { slotOf } from './slot/slot-of.js';

const character = (placementPolicy: PlacementPolicy | null) =>
  new Item(
    asId<'Item'>('e2e_character'),
    'e2e_character',
    slotOf('CHARACTER', null),
    '캐릭터',
    'BASIC',
    0,
    1,
    false,
    placementPolicy,
  );

describe('Item', () => {
  it('배치 정책이 없는 캐릭터는 만들 수 없다', () => {
    expect(() => character(null)).toThrow(
      'e2e_character: a CHARACTER item has no placement policy',
    );
  });

  it('배치 정책이 있는 캐릭터는 만들어진다', () => {
    const policy = new PlacementPolicy('FLOOR', 1, 1, new Grid(null), true);

    expect(character(policy).placementPolicy).toBe(policy);
  });
});
