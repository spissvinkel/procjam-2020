import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, Drawable, mkTxDrawable, TX_SPECS, TxSpec, updateTxDrawable } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';
import { World, WORLD_ROWS, WORLD_COLS, ItemType, Cell } from '../world-mgr';

export interface ItemsChunk extends Entity<ItemsChunk> {
  worldRow: number; // centre
  worldCol: number; // centre
  offset  : Vec2;
  extent  : { min: Vec2, max: Vec2 };
}

const NUM_ROWS = 11;
const NUM_COLS = 11;

const HALF_ROWS = Math.floor(NUM_ROWS / 2);
const HALF_COLS = Math.floor(NUM_COLS / 2);
const TOP_LEFT_ROW =  HALF_COLS - HALF_ROWS;
const TOP_LEFT_COL = -HALF_COLS - HALF_ROWS;

export const mkItemsChunk = (): ItemsChunk => {
  const chunk = mkBaseEntity(true) as ItemsChunk;
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

export const initItemsChunk = (chunk: ItemsChunk): ItemsChunk => {
  const { LOGS_S_W } = TX_SPECS;
  const { txId } = LOGS_S_W;
  forEachCell((r, c) => setCellOffset(addDrawable(chunk, mkTxDrawable(txId, false)), chunk, LOGS_S_W, r, c));
  return chunk;
};

export const updateItemsChunk = (chunk: ItemsChunk, world: World, worldRow: number, worldCol: number): ItemsChunk => {
  const { TREE_O_D_W, LOGS_S_W } = TX_SPECS;
  const { drawables } = chunk;
  const { cells } = world;
  chunk.worldRow = worldRow;
  chunk.worldCol = worldCol;
  let di = -1;
  forEachCell((r, c) => {
    const d = drawables[++di];
    const wr = r + worldRow, wc = c + worldCol;
    // console.log(`[updateItemsChunk] [${di}] (${r}, ${c}) (${wr}, ${wc})`);
    let cell: Cell, item: ItemType | null;
    d.enabled = false;
    if (wr >= 0 && wr < WORLD_ROWS && wc >= 0 && wc < WORLD_COLS
        && (cell = cells[wr][wc]) !== undefined && (item = cell.item) !== null) {
      let txSpec: TxSpec | null = null;
      if (item === ItemType.TREE) txSpec = TREE_O_D_W;
      else if (item === ItemType.LOGS) txSpec = LOGS_S_W;
      if (txSpec !== null) {
        const { txId } = txSpec;
        if (d.txInfo!.textureId === txId) d.enabled = true;
        else setCellOffset(updateTxDrawable(d, txId, true), chunk, txSpec, r, c);
      }
    }
  });
  return chunk;
};

const setCellOffset = (drawable: Drawable, chunk: ItemsChunk, txSpec: TxSpec, row: number, column: number): void => {
  const { offset: chunkOffset    } = chunk;
  const { offset: txSpecOffset   } = txSpec;
  const { offset: drawableOffset } = drawable;
  addCellOffset(vec2.addV(vec2.addV(drawableOffset, txSpecOffset), chunkOffset), row, column);
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
