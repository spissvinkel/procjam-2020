import { Vec2 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { CELL_Z_OFFSET, CELL_X_OFFSET, TxSpec, TX_SPECS, world2grid, grid2world } from './drawable';
import { Entity, mkBaseEntity } from './entity';
import { addPolledKeys, Input, poll } from '../input-mgr';
import { mkMoveable } from './moveable';
import { clearPath, Direction, getDirection, getPathNode, isPathEmpty } from '../nav-mgr';
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

const MAX_VELOCITY = 3.5;
const VELOCITY_X = 1.0;
const VELOCITY_Y = CELL_Z_OFFSET / CELL_X_OFFSET;

export interface Player extends Entity<Player> {
  gridRow: number; // position
  gridCol: number; // position
  offset : Vec2;
  facing : TxSpec;
  pathIx : number;
}

export const mkPlayer = (): Player => {
  const player = mkBaseEntity(true) as Player;
  player.gridRow = 0;
  player.gridCol = 0;
  player.offset = vec2.zero();
  player.facing = TxSpecs[Direction.SE];
  player.pathIx = 0;
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
  const { position, moveable, gridRow, gridCol, facing, pathIx } = player;
  if (moveable === undefined) return;
  const { velocity } = moveable;
  vec2.setZero(velocity);
  let newFacing = facing;

  const cmdLeft = poll(Input.P1_LEFT), cmdRight = poll(Input.P1_RIGHT);
  const cmdUp = poll(Input.P1_UP), cmdDown = poll(Input.P1_DOWN);
  const isCmd = cmdLeft || cmdRight || cmdUp || cmdDown;

  if (isCmd) {
    clearPath();
    player.pathIx = 0;
    if (cmdLeft) velocity.x = -VELOCITY_X;
    else if (cmdRight) velocity.x = VELOCITY_X;
    if (cmdUp) velocity.y = VELOCITY_Y;
    else if (cmdDown) velocity.y = -VELOCITY_Y;
    if (cmdLeft) {
      if (cmdUp) newFacing = TxSpecs[Direction.W];
      else if (cmdDown) newFacing = TxSpecs[Direction.S];
      else newFacing = TxSpecs[Direction.SW];
    } else if (cmdRight) {
      if (cmdUp) newFacing = TxSpecs[Direction.N];
      else if (cmdDown) newFacing = TxSpecs[Direction.E];
      else newFacing = TxSpecs[Direction.NE];
    } else {
      if (cmdUp) newFacing = TxSpecs[Direction.NW];
      else if (cmdDown) newFacing = TxSpecs[Direction.SE];
    }

  } else if (!isPathEmpty()) {
    const node = getPathNode(pathIx);
    if (node !== undefined) {
      const { row, col, pos } = node;
      vec2.subVInto(pos, position, velocity);
      newFacing = TxSpecs[getDirection(row - gridRow, col - gridCol)];
    }
  }

  const mag = vec2.mag(velocity);
  if (mag < 0.00001) vec2.setZero(velocity);
  else vec2.normFor(velocity, mag);
  vec2.mul(velocity, MAX_VELOCITY);
  player.facing = newFacing;
};

const updatePosition = (player: Player, deltaTimeSeconds: number): void => {
  const { position, moveable, gridRow: oldRow, gridCol: oldCol, offset, pathIx } = player;

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

  if (!isPathEmpty()) {
    const node = getPathNode(pathIx);
    if (node !== undefined) {
      const { row, col } = node;
      if (row === newRow && col === newCol) {
        clearPath();
        player.pathIx = 0;
      } else if (!(newRow === oldRow && newCol === oldCol)) {
        player.pathIx++;
      }
    }
  }

  player.gridRow = newRow;
  player.gridCol = newCol;
};
