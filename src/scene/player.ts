import { Vec2 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { CELL_Z_OFFSET, CELL_X_OFFSET, TxSpec, TX_SPECS, world2grid, grid2world } from './drawable';
import { Entity, mkBaseEntity } from './entity';
import { addPolledKeys, Input, poll } from '../input-mgr';
import { mkMoveable } from './moveable';
import { Direction } from '../nav-mgr';
import { getScene } from './scene-mgr';
import { getWorldCell } from '../grid-mgr';
import { ItemType } from '../world-mgr';

const TxSpecs = [
  TX_SPECS.CH_DIG_N,
  TX_SPECS.CH_DIG_NE,
  TX_SPECS.CH_DIG_E,
  TX_SPECS.CH_DIG_SE,
  TX_SPECS.CH_DIG_S,
  TX_SPECS.CH_DIG_SW,
  TX_SPECS.CH_DIG_W,
  TX_SPECS.CH_DIG_NW
];

const VELOCITY_Y_FACTOR = CELL_Z_OFFSET / CELL_X_OFFSET;
const MAX_VELOCITY_X = 3.5;
const MAX_VELOCITY_Y = MAX_VELOCITY_X; // * VELOCITY_Y_FACTOR;

export interface Player extends Entity<Player> {
  gridRow: number; // position
  gridCol: number; // position
  offset : Vec2;
  facing : TxSpec;
}

export const mkPlayer = (): Player => {
  const player = mkBaseEntity(true) as Player;
  player.gridRow = 0;
  player.gridCol = 0;
  player.offset = vec2.zero();
  player.facing = TxSpecs[Direction.SE];
  return player;
};

export const initPlayer = (player: Player): Player => {
  player.moveable = mkMoveable(player, vec2.zero(), 0.0);
  player.updateVelocity = updateVelocity;
  player.updatePosition = updatePosition;
  addPolledKeys(Input.P1_LEFT, Input.P1_RIGHT, Input.P1_UP, Input.P1_DOWN, Input.P1_DEBUG);
  return player;
};

const updateVelocity = (player: Player): void => {
  const { moveable, facing } = player;
  if (moveable === undefined) return;
  const { velocity } = moveable;
  let newFacing = facing;
  if (poll(Input.P1_LEFT)) {
    if (poll(Input.P1_UP)) newFacing = TxSpecs[Direction.W];
    else if (poll(Input.P1_DOWN)) newFacing = TxSpecs[Direction.S];
    else newFacing = TxSpecs[Direction.SW];
  } else if (poll(Input.P1_RIGHT)) {
    if (poll(Input.P1_UP)) newFacing = TxSpecs[Direction.N];
    else if (poll(Input.P1_DOWN)) newFacing = TxSpecs[Direction.E];
    else newFacing = TxSpecs[Direction.NE];
  } else {
    if (poll(Input.P1_UP)) newFacing = TxSpecs[Direction.NW];
    else if (poll(Input.P1_DOWN)) newFacing = TxSpecs[Direction.SE];
  }
  player.facing = newFacing;
  vec2.setZero(velocity);
  if (poll(Input.P1_LEFT)) velocity.x = -1.0;
  else if (poll(Input.P1_RIGHT)) velocity.x = 1.0;
  if (poll(Input.P1_UP)) velocity.y = VELOCITY_Y_FACTOR; // 1.0;
  else if (poll(Input.P1_DOWN)) velocity.y = -VELOCITY_Y_FACTOR; // -1.0;
  vec2.norm(velocity);
  velocity.x *= MAX_VELOCITY_X;
  velocity.y *= MAX_VELOCITY_Y;
};

const updatePosition = (player: Player, deltaTimeSeconds: number): void => {
  const { position, moveable, gridRow: oldRow, gridCol: oldCol, offset } = player;
  mat3.mulV2(world2grid, position, offset);
  let newRow = Math.floor(-offset.y + 0.5);
  let newCol = Math.floor(offset.x + 0.5);
  if (!(newRow === oldRow && newCol === oldCol)) {
    // Don't step into the void
    const { grid: { worldRow, worldCol } } = getScene();
    const { ground, item } = getWorldCell(worldRow, worldCol, newRow, newCol);
    if (!(ground && item === ItemType.EMPTY) && moveable !== undefined) {
      const { velocity } = moveable;
      vec2.addMul(position, vec2.inv(velocity), deltaTimeSeconds);
      vec2.setZero(velocity);
      mat3.mulV2(world2grid, position, offset);
      newRow = Math.floor(-offset.y + 0.5);
      newCol = Math.floor(offset.x + 0.5);
    }
  }
  vec2.set(offset, newCol, -newRow);
  mat3.mulV2(grid2world, offset, offset);
  vec2.subVInto(position, offset, offset);
  player.gridRow = newRow;
  player.gridCol = newCol;
};
