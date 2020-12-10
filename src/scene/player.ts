import { Vec2 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, CELL_Z_OFFSET, CELL_X_OFFSET, Drawable, mkTxDrawable, TxSpec, TX_SPECS, updateTxDrawable, world2grid } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';
import { addPolledKeys, Input, poll } from '../input-mgr';
import { mkMoveable } from './moveable';

export const Direction = {
  N : TX_SPECS.CH_DIG_N,
  NE: TX_SPECS.CH_DIG_NE,
  E : TX_SPECS.CH_DIG_E,
  SE: TX_SPECS.CH_DIG_SE,
  S : TX_SPECS.CH_DIG_S,
  SW: TX_SPECS.CH_DIG_SW,
  W : TX_SPECS.CH_DIG_W,
  NW: TX_SPECS.CH_DIG_NW
};

const MAX_VELOCITY_X = 2.5;
const MAX_VELOCITY_Y = MAX_VELOCITY_X * CELL_Z_OFFSET / CELL_X_OFFSET;

export interface Player extends Entity<Player> {
  offset : Vec2;
  facing : TxSpec;
  gridPos: Vec2;
}

export const mkPlayer = (): Player => {
  const player = mkBaseEntity(true) as Player;
  player.offset = vec2.zero();
  player.facing = Direction.SE;
  player.gridPos = vec2.zero();
  return player;
};

export const initPlayer = (player: Player): Player => {
  // const { facing } = player;
  // const { txId } = facing;
  // setCellOffset(addDrawable(player, mkTxDrawable(txId, true)), player, facing, 0, 0);
  player.moveable = mkMoveable(player, vec2.zero(), 0.0);
  player.updateVelocity = updateVelocity;
  addPolledKeys(Input.P1_LEFT, Input.P1_RIGHT, Input.P1_UP, Input.P1_DOWN);
  return player;
};

const updateVelocity = (player: Player): void => {
  const { drawables, moveable, facing } = player;
  if (moveable === undefined) return;
  const { velocity } = moveable;
  let newFacing = facing;
  if (poll(Input.P1_LEFT)) {
    if (poll(Input.P1_UP)) newFacing = Direction.W;
    else if (poll(Input.P1_DOWN)) newFacing = Direction.S;
    else newFacing = Direction.SW;
  } else if (poll(Input.P1_RIGHT)) {
    if (poll(Input.P1_UP)) newFacing = Direction.N;
    else if (poll(Input.P1_DOWN)) newFacing = Direction.E;
    else newFacing = Direction.NE;
  } else {
    if (poll(Input.P1_UP)) newFacing = Direction.NW;
    else if (poll(Input.P1_DOWN)) newFacing = Direction.SE;
  }
  player.facing = newFacing;
  // const d = drawables[0];
  // if (d.txInfo !== undefined) {
  //   const { txId } = newFacing;
  //   if (d.txInfo.textureId !== txId)
  //     setCellOffset(updateTxDrawable(d, txId, true), player, newFacing, 0, 0);
  // }
  vec2.setZero(velocity);
  if (poll(Input.P1_LEFT)) velocity.x = -1.0;
  else if (poll(Input.P1_RIGHT)) velocity.x = 1.0;
  if (poll(Input.P1_UP)) velocity.y = 1.0;
  else if (poll(Input.P1_DOWN)) velocity.y = -1.0;
  // vec2.mul(vec2.norm(velocity), MAX_VELOCITY_X);
  vec2.norm(velocity);
  velocity.x *= MAX_VELOCITY_X;
  velocity.y *= MAX_VELOCITY_Y;
};

// const setCellOffset = (drawable: Drawable, player: Player, txSpec: TxSpec, row: number, column: number): void => {
//   const { offset: playerOffset   } = player;
//   const { offset: txSpecOffset   } = txSpec;
//   const { offset: drawableOffset } = drawable;
//   addCellOffset(vec2.addV(vec2.addV(drawableOffset, txSpecOffset), playerOffset), row, column);
// };

const updatePosition = (player: Player): void => {
  const { position, gridPos } = player;
  mat3.mulV2(world2grid, position, gridPos);
};
