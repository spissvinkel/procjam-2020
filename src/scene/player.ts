import { Vec2 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { CELL_Z_OFFSET, CELL_X_OFFSET, TxSpec, TX_SPECS, world2grid, grid2world } from './drawable';
import { Entity, mkBaseEntity } from './entity';
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
  player.facing = Direction.SE;
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
  vec2.setZero(velocity);
  if (poll(Input.P1_LEFT)) velocity.x = -1.0;
  else if (poll(Input.P1_RIGHT)) velocity.x = 1.0;
  if (poll(Input.P1_UP)) velocity.y = 1.0;
  else if (poll(Input.P1_DOWN)) velocity.y = -1.0;
  vec2.norm(velocity);
  velocity.x *= MAX_VELOCITY_X;
  velocity.y *= MAX_VELOCITY_Y;
};

const updatePosition = (player: Player): void => {
  const { position, offset } = player;
  mat3.mulV2(world2grid, position, offset);
  const gridRow = Math.floor(-offset.y + 0.5);
  const gridCol = Math.floor(offset.x + 0.5);
  vec2.set(offset, gridCol, -gridRow);
  mat3.mulV2(grid2world, offset, offset);
  vec2.subVInto(position, offset, offset);
  player.gridRow = gridRow;
  player.gridCol = gridCol;
};
