import { Vec2 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { CELL_Z_OFFSET, CELL_X_OFFSET, TxSpec, TX_SPECS, world2grid, grid2world } from './drawable';
import { Entity, mkBaseEntity } from './entity';
import { addPolledKeys, Input, poll } from '../input-mgr';
import { mkMoveable } from './moveable';
import { clearPath, Direction, getStep, isLastStep, isPathEmpty } from '../nav-mgr';
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
const TARGET_RADIUS = 0.02;

export interface Player extends Entity<Player> {
  gridRow: number; // position
  gridCol: number; // position
  offset : Vec2;
  txSpec : TxSpec;
  stepIx : number;
}

export const mkPlayer = (): Player => {
  const player = mkBaseEntity(true) as Player;
  player.gridRow = 0;
  player.gridCol = 0;
  player.offset = vec2.zero();
  player.txSpec = TxSpecs[Direction.SE];
  player.stepIx = 0;
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
  const { position, moveable, offset, txSpec: oldTxSpec, stepIx: oldStepIx } = player;
  if (moveable === undefined) return;
  const { velocity } = moveable;
  vec2.setZero(velocity);
  let newTxSpec = oldTxSpec;
  let newStepIx = oldStepIx;

  const cmdLeft = poll(Input.P1_LEFT), cmdRight = poll(Input.P1_RIGHT);
  const cmdUp = poll(Input.P1_UP), cmdDown = poll(Input.P1_DOWN);
  const isCmd = cmdLeft || cmdRight || cmdUp || cmdDown;

  if (isCmd) {
    clearPath();
    if (cmdLeft) velocity.x = -VELOCITY_X;
    else if (cmdRight) velocity.x = VELOCITY_X;
    if (cmdUp) velocity.y = VELOCITY_Y;
    else if (cmdDown) velocity.y = -VELOCITY_Y;
    if (cmdLeft) {
      if (cmdUp) newTxSpec = TxSpecs[Direction.W];
      else if (cmdDown) newTxSpec = TxSpecs[Direction.S];
      else newTxSpec = TxSpecs[Direction.SW];
    } else if (cmdRight) {
      if (cmdUp) newTxSpec = TxSpecs[Direction.N];
      else if (cmdDown) newTxSpec = TxSpecs[Direction.E];
      else newTxSpec = TxSpecs[Direction.NE];
    } else {
      if (cmdUp) newTxSpec = TxSpecs[Direction.NW];
      else if (cmdDown) newTxSpec = TxSpecs[Direction.SE];
    }

  } else if (!isPathEmpty()) {
    const step = getStep(oldStepIx);
    if (step !== undefined) {
      const { posOffset, direction } = step;
      let newDirection = direction;
      vec2.subVInto(posOffset, offset, velocity);
      if (vec2.mag(velocity) < TARGET_RADIUS) {
        vec2.setV(position, posOffset);
        vec2.setZero(velocity);
        if (isLastStep(oldStepIx)) clearPath();
        else {
          const nextStep = getStep(oldStepIx + 1);
          if (nextStep !== undefined) {
            const { posOffset: nextPosOffset, direction: nextDirection } = nextStep;
            vec2.subVInto(nextPosOffset, offset, velocity);
            newDirection = nextDirection;
            newStepIx = oldStepIx + 1;
          }
        }
      }
      newTxSpec = TxSpecs[newDirection];
    }
  }

  if (isPathEmpty()) newStepIx = 0;

  vec2.norm(velocity);
  vec2.mul(velocity, MAX_VELOCITY);
  player.txSpec = newTxSpec;
  player.stepIx = newStepIx;
};

const newOrigin = vec2.zero();

const updatePosition = (player: Player, deltaTimeSeconds: number): void => {
  const { position, moveable, gridRow: oldRow, gridCol: oldCol, offset, stepIx } = player;

  mat3.mulV2(world2grid, position, offset);

  let newRow = Math.floor(-offset.y + 0.5);
  let newCol = Math.floor(offset.x + 0.5);
  const hasEnteredNewCell = !(newRow === oldRow && newCol === oldCol);

  if (hasEnteredNewCell) {
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

  vec2.set(newOrigin, newCol, -newRow);
  mat3.mulV2(grid2world, newOrigin, newOrigin);
  vec2.subVInto(position, newOrigin, offset);

  // Check if following path and just entered a new cell
  if (!isPathEmpty() && hasEnteredNewCell) {
    const step = getStep(stepIx);
    if (step !== undefined) {
      const { rowOffset, colOffset, posOffset } = step;
      const isInTargetCell = (oldRow + rowOffset === newRow && oldCol + colOffset === newCol);
      if (isInTargetCell) vec2.setZero(posOffset);
      else vec2.subVInto(posOffset, newOrigin, posOffset);
    }
  }

  player.gridRow = newRow;
  player.gridCol = newCol;
};
