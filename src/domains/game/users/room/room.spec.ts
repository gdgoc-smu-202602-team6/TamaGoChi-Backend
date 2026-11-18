import { asId } from '../../../../foundation/id/id.js';
import { Item } from '../../items/item.js';
import { slotOf } from '../../items/slot/slot-of.js';
import { Grid } from '../../placement/grid.js';
import { PlacementPolicy } from '../../placement/placement-policy.js';
import { Surface } from '../../placement/surface/surface.js';
import { Placement } from './placement.js';
import { Room } from './room.js';

const house = (code: string, size: number) =>
  new Item(
    asId<'Item'>(code),
    code,
    slotOf('ROOM', size),
    code,
    'BASIC',
    0,
    1,
    false,
    true,
    null,
  );

describe('Room', () => {
  it('작은 집으로 이사해 당긴 끝이 그리드 밖일 때 그 안쪽 마지막 그리드 점으로 당겨진다', () => {
    const twoCellDesk = new Item(
      asId<'Item'>('two_cell_desk'),
      'two_cell_desk',
      slotOf('DESK', null),
      '두 칸 책상',
      'BASIC',
      0,
      1,
      false,
      true,
      new PlacementPolicy('FLOOR', 2, 2, new Grid(2), true),
    );
    const room = new Room(
      asId<'User'>('user'),
      new Map([
        ['ROOM', house('big', 6)],
        ['DESK', twoCellDesk],
      ]),
      [new Placement('DESK', Surface.of('FLOOR'), 4, 4)],
      null,
    );

    const moved = room.equip(house('small', 3));

    expect(
      moved.placements.map(({ target, surface, x, y }) => ({
        target,
        surface: surface.name,
        x,
        y,
      })),
    ).toStrictEqual([{ target: 'DESK', surface: 'FLOOR', x: 0, y: 0 }]);
  });
});
