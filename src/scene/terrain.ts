import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, Drawable, mkTxDrawable, TX_SPECS, TxSpec, updateTxDrawable } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';
import { World, WORLD_ROWS, WORLD_COLS } from '../world-mgr';

export interface Terrain extends Entity<Terrain> {
  worldRow: number; // centre
  worldCol: number; // centre
  offset  : Vec2;
  extent  : { min: Vec2, max: Vec2 };
}

const NUM_ROWS = 13; // includes +2 edges
const NUM_COLS = 13; // includes +2 edges

const HALF_ROWS = Math.floor(NUM_ROWS / 2);
const HALF_COLS = Math.floor(NUM_COLS / 2);
const TOP_LEFT_ROW =  HALF_COLS - HALF_ROWS;
const TOP_LEFT_COL = -HALF_COLS - HALF_ROWS;

export const mkTerrain = (): Terrain => {
  const terrain = mkBaseEntity(true) as Terrain;
  terrain.worldRow = 0;
  terrain.worldCol = 0;
  const offset = terrain.offset = vec2.zero();
  const cellOffsetNW = addCellOffset(vec2.ofV(offset), -HALF_ROWS, -HALF_COLS);
  const cellOffsetNE = addCellOffset(vec2.ofV(offset), -HALF_ROWS,  HALF_COLS);
  const cellOffsetSW = addCellOffset(vec2.ofV(offset),  HALF_ROWS, -HALF_COLS);
  const cellOffsetSE = addCellOffset(vec2.ofV(offset),  HALF_ROWS,  HALF_COLS);
  terrain.extent = {
    min: vec2.of(cellOffsetSW.x, cellOffsetSE.y),
    max: vec2.of(cellOffsetNE.x, cellOffsetNW.y)
  };
  return terrain;
};

export const initTerrain = (terrain: Terrain): Terrain => {
  const { BLOCK } = TX_SPECS;
  const { txId } = BLOCK;
  forEachCell((r, c) => setCellOffset(addDrawable(terrain, mkTxDrawable(txId, false)), terrain, BLOCK, r, c));
  return terrain;
};

export const updateTerrain = (terrain: Terrain, world: World, worldRow: number, worldCol: number): Terrain => {
  const { BLOCK, TOP_NW, TOP_N, TOP_NE, TOP_W, TOP_E, TOP_SW, TOP_S, TOP_SE } = TX_SPECS;
  const { drawables } = terrain;
  const { cells } = world;
  terrain.worldRow = worldRow;
  terrain.worldCol = worldCol;
  let di = -1;
  forEachCell((r, c) => {
    const d = drawables[++di];
    const wr = r + worldRow, wc = c + worldCol;
    // console.log(`[updateTerrain] [${di}] (${r}, ${c}) (${wr}, ${wc})`);
    if (wr < -1 || wr > WORLD_ROWS || wc < -1 || wc > WORLD_COLS) d.enabled = false;
    else {
      let txSpec: TxSpec | null = null;
      if (wc === -1) txSpec = wr === -1 ? TOP_NW : (wr === WORLD_ROWS ? TOP_SW : TOP_W);
      else if (wc === WORLD_COLS) txSpec = wr === -1 ? TOP_NE : (wr === WORLD_ROWS ? TOP_SE : TOP_E);
      else if (wr === -1) txSpec = TOP_N;
      else if (wr === WORLD_ROWS) txSpec = TOP_S;
      else if (cells[wr][wc] === undefined) d.enabled = false;
      else txSpec = BLOCK;
      if (txSpec !== null && d.txInfo !== undefined) {
        const { txId } = txSpec;
        if (d.txInfo.textureId === txId) d.enabled = true;
        else setCellOffset(updateTxDrawable(d, txId, true), terrain, txSpec, r, c);
      }
    }
  });
  return terrain;
};

const setCellOffset = (drawable: Drawable, terrain: Terrain, txSpec: TxSpec, row: number, column: number): void => {
  const { offset: terrainOffset  } = terrain;
  const { offset: txSpecOffset   } = txSpec;
  const { offset: drawableOffset } = drawable;
  addCellOffset(vec2.addV(vec2.addV(drawableOffset, txSpecOffset), terrainOffset), row, column);
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
