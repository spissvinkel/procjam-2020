import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, Drawable, mkTxDrawable, TX_SPECS, TxSpec, updateTxDrawable } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';
import { Chunk, CHUNK_COLS, CHUNK_ROWS, getChunk, ItemType, WORLD_COLS, WORLD_ROWS } from '../world-mgr';

export interface Items extends Entity<Items> {
  worldRow: number; // centre
  worldCol: number; // centre
  offset  : Vec2;
  extent  : { min: Vec2, max: Vec2 };
}

const NUM_ROWS = 23;
const NUM_COLS = 33;

const HALF_ROWS = Math.floor(NUM_ROWS / 2);
const HALF_COLS = Math.floor(NUM_COLS / 2);
const TOP_LEFT_ROW =  HALF_COLS - HALF_ROWS;
const TOP_LEFT_COL = -HALF_COLS - HALF_ROWS;

export const mkItems = (): Items => {
  const chunk = mkBaseEntity(true) as Items;
  chunk.worldRow = 0;
  chunk.worldCol = 0;
  const offset = chunk.offset = vec2.zero();
  const cellOffsetNW = addCellOffset(vec2.ofV(offset), -HALF_ROWS, -HALF_COLS);
  const cellOffsetNE = addCellOffset(vec2.ofV(offset), -HALF_ROWS,  HALF_COLS);
  const cellOffsetSW = addCellOffset(vec2.ofV(offset),  HALF_ROWS, -HALF_COLS);
  const cellOffsetSE = addCellOffset(vec2.ofV(offset),  HALF_ROWS,  HALF_COLS);
  chunk.extent = {
    min: vec2.of(cellOffsetSW.x, cellOffsetSE.y),
    max: vec2.of(cellOffsetNE.x, cellOffsetNW.y)
  };
  return chunk;
};

export const initItems = (items: Items): Items => {
  const { TREE_O_D_W } = TX_SPECS;
  const { txId } = TREE_O_D_W;
  forEachCell((r, c) => setCellOffset(addDrawable(items, mkTxDrawable(txId, false)), items, TREE_O_D_W, r, c));
  return items;
};

export const updateItems = (items: Items, worldRow: number, worldCol: number): Items => {
  const {
    TREE_O_D_W, LOGS_S_W
  } = TX_SPECS;
  const { drawables } = items;
  items.worldRow = worldRow;
  items.worldCol = worldCol;
  let di = -1;
  let chunk: Chunk | undefined = undefined;
  forEachCell((r, c) => {
    const d = drawables[++di];
    d.enabled = false;
    let wRow = r + worldRow, wCol = c + worldCol;
    if (wRow < 0) wRow += WORLD_ROWS; else if (wRow >= WORLD_ROWS) wRow -= WORLD_ROWS;
    if (wCol < 0) wCol += WORLD_COLS; else if (wCol >= WORLD_COLS) wCol -= WORLD_COLS;
    const top = Math.floor(wRow / CHUNK_ROWS) * CHUNK_ROWS, left = Math.floor(wCol / CHUNK_COLS) * CHUNK_COLS;
    if (chunk === undefined || !(chunk.top === top && chunk.left === left)) chunk = getChunk(top, left);
    const { cells } = chunk;
    const chRow = wRow - top, chCol = wCol - left;
    let txSpec: TxSpec | undefined = undefined;
    const { ground, item } = cells[chRow][chCol];
    if (ground) {
      if (item === ItemType.TREE) txSpec = TREE_O_D_W;
      else if (item === ItemType.LOGS) txSpec = LOGS_S_W;
    }
    if (txSpec !== undefined && d.txInfo !== undefined) {
      const { txId } = txSpec;
      if (d.txInfo.textureId === txId) d.enabled = true;
      else setCellOffset(updateTxDrawable(d, txId, true), items, txSpec, r, c);
    }
  });
  return items;
};

const setCellOffset = (drawable: Drawable, items: Items, txSpec: TxSpec, row: number, column: number): void => {
  const { offset: itemsOffset    } = items;
  const { offset: txSpecOffset   } = txSpec;
  const { offset: drawableOffset } = drawable;
  addCellOffset(vec2.addV(vec2.addV(drawableOffset, txSpecOffset), itemsOffset), row, column);
};

const forEachCell = (f: (row: number, col: number) => void): void => {
  let r0 = TOP_LEFT_ROW, c0 = TOP_LEFT_COL, r, c;
  for (let y = 0; y < NUM_ROWS - 1; y++) {
    for (let k = 0; k < 2; k++) {
      r = r0;
      c = c0 + k;
      for (let x = k; x < NUM_COLS; x++) {
        f(r, c);
        r--;
        c++;
      }
    }
    r0++;
    c0++;
  }
  for (let x = 0; x < NUM_COLS; x++) {
    f(r0, c0);
    r0--;
    c0++;
  }
};
