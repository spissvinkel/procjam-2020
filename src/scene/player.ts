import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, Drawable, mkTxDrawable, TxSpec, TX_SPECS, updateTxDrawable } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';

export const Direction = {
  N : TX_SPECS.CH_DIG_N,
  NE: TX_SPECS.CH_DIG_NE,
  SE: TX_SPECS.CH_DIG_SE,
  S : TX_SPECS.CH_DIG_S,
  SW: TX_SPECS.CH_DIG_SW,
  W : TX_SPECS.CH_DIG_W,
  NW: TX_SPECS.CH_DIG_NW
};

export interface Player extends Entity<Player> {
  worldRow: number; // centre
  worldCol: number; // centre
  row     : number; // position
  col     : number; // position
  facing  : TxSpec;
  offset  : Vec2;
}

export const mkPlayer = (): Player => {
  const player = mkBaseEntity(true) as Player;
  player.worldRow = 0;
  player.worldCol = 0;
  player.row = 0;
  player.col = 0;
  player.facing = Direction.SE;
  player.offset = vec2.zero();
  return player;
};

export const initPlayer = (player: Player): Player => {
  const { worldRow, worldCol, row, col, facing } = player;
  const { txId } = facing;
  setCellOffset(addDrawable(player, mkTxDrawable(txId, true)), player, facing, row - worldRow, col - worldCol);
  return player;
};

export const updatePlayer = (player: Player, worldRow: number, worldCol: number, row: number, col: number): Player => {
  player.worldRow = worldRow;
  player.worldCol = worldCol;
  player.row = row;
  player.col = col;
  const { drawables, facing } = player;
  const d = drawables[0];
  if (d.txInfo !== undefined) {
    const { txId } = facing;
    if (d.txInfo.textureId !== txId) setCellOffset(updateTxDrawable(d, txId, true), player, facing, row - worldRow, col - worldCol);
  }
  return player;
};

const setCellOffset = (drawable: Drawable, player: Player, txSpec: TxSpec, row: number, column: number): void => {
  const { offset: playerOffset   } = player;
  const { offset: txSpecOffset   } = txSpec;
  const { offset: drawableOffset } = drawable;
  addCellOffset(vec2.addV(vec2.addV(drawableOffset, txSpecOffset), playerOffset), row, column);
};
