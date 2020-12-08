import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, Drawable, mkTxDrawable, TX_SPECS, TxSpec, updateTxDrawable } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';
import { getWorldChunk } from './scene-mgr';
import { Cell, CHUNK_COLS, CHUNK_ROWS, WORLD_COLS, WORLD_ROWS } from '../world-mgr';

export interface Terrain extends Entity<Terrain> {
  worldRow: number; // centre
  worldCol: number; // centre
  offset  : Vec2;
  extent  : { min: Vec2, max: Vec2 };
}

export const TERRAIN_ROWS = 23;
export const TERRAIN_COLS = 33;

const HALF_ROWS = Math.floor(TERRAIN_ROWS / 2); //  11
const HALF_COLS = Math.floor(TERRAIN_COLS / 2); //  16
const TOP_LEFT_ROW =  HALF_COLS - HALF_ROWS;    //   5
const TOP_LEFT_COL = -HALF_COLS - HALF_ROWS;    // -27
const BTM_RIGHT_ROW = HALF_ROWS - HALF_COLS;    // - 5
const BTM_RIGHT_COL = HALF_COLS + HALF_ROWS;    //  27

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

const getCell = (worldRow: number, worldCol: number, row: number, col: number): Cell => {
  let wRow = row + worldRow, wCol = col + worldCol;
  if (wRow < 0) wRow += WORLD_ROWS; else if (wRow >= WORLD_ROWS) wRow -= WORLD_ROWS;
  if (wCol < 0) wCol += WORLD_COLS; else if (wCol >= WORLD_COLS) wCol -= WORLD_COLS;
  const top = Math.floor(wRow / CHUNK_ROWS) * CHUNK_ROWS, left = Math.floor(wCol / CHUNK_COLS) * CHUNK_COLS;
  const chunk = getWorldChunk(top, left);
  const { cells } = chunk;
  const chRow = wRow - top, chCol = wCol - left;
  return cells[chRow][chCol];
};

export const updateTerrain = (terrain: Terrain, wr: number, wc: number): Terrain => {
  const {
    BLOCK, BLOCK_DARK,
    TOP_SIDE_N, TOP_SIDE_E, TOP_SIDE_S, TOP_SIDE_W,
    TOP_OUT_NW, TOP_OUT_NE, TOP_OUT_SW, TOP_OUT_SE,
    TOP_IN_NW, TOP_IN_NE, TOP_IN_SW, TOP_IN_SE
  } = TX_SPECS;
  const { drawables } = terrain;
  terrain.worldRow = wr;
  terrain.worldCol = wc;
  let di = -1;
  forEachCell((r, c) => {
    const d = drawables[++di];
    d.enabled = false;
    let txSpec: TxSpec | undefined = undefined;
    const cell = getCell(wr, wc, r, c);
    if (cell.ground) txSpec = cell.even ? BLOCK_DARK : BLOCK;
    else {
      let gRm1Cm1: boolean | undefined = undefined;
      let gRm1C  : boolean | undefined = undefined;
      let gRm1Cp1: boolean | undefined = undefined;
      let gRCm1  : boolean | undefined = undefined;
      let gRCp1  : boolean | undefined = undefined;
      let gRp1Cm1: boolean | undefined = undefined;
      let gRp1C  : boolean | undefined = undefined;
      let gRp1Cp1: boolean | undefined = undefined;
      if ((gRp1Cp1 ?? (gRp1Cp1 = getCell(wr, wc, r + 1, c + 1).ground))
          && !(gRp1C ?? (gRp1C = getCell(wr, wc, r + 1, c).ground))
          && !(gRCp1 ?? (gRCp1 = getCell(wr, wc, r, c + 1).ground)))
        txSpec = TOP_OUT_NW;
      else if ((gRp1C ?? (gRp1C = getCell(wr, wc, r + 1, c).ground))
          && (gRCp1 ?? (gRCp1 = getCell(wr, wc, r, c + 1).ground)))
        txSpec = TOP_IN_NW;
      else if ((gRp1Cm1 ?? (gRp1Cm1 = getCell(wr, wc, r + 1, c - 1).ground))
          && !(gRp1C ?? (gRp1C = getCell(wr, wc, r + 1, c).ground))
          && !(gRCm1 ?? (gRCm1 = getCell(wr, wc, r, c - 1).ground)))
        txSpec = TOP_OUT_NE;
      else if ((gRp1C ?? (gRp1C = getCell(wr, wc, r + 1, c).ground))
          && (gRCm1 ?? (gRCm1 = getCell(wr, wc, r, c - 1).ground)))
        txSpec = TOP_IN_NE;
      else if ((gRm1Cm1 ?? (gRm1Cm1 = getCell(wr, wc, r - 1, c - 1).ground))
          && !(gRm1C ?? (gRm1C = getCell(wr, wc, r - 1, c).ground))
          && !(gRCm1 ?? (gRCm1 = getCell(wr, wc, r, c - 1).ground)))
        txSpec = TOP_OUT_SE;
      else if ((gRm1C ?? (gRm1C = getCell(wr, wc, r - 1, c).ground))
          && (gRCm1 ?? (gRCm1 = getCell(wr, wc, r, c - 1).ground)))
        txSpec = TOP_IN_SE;
      else if ((gRm1Cp1 ?? (gRm1Cp1 = getCell(wr, wc, r - 1, c + 1).ground))
          && !(gRm1C ?? (gRm1C = getCell(wr, wc, r - 1, c).ground))
          && !(gRCp1 ?? (gRCp1 = getCell(wr, wc, r, c + 1).ground)))
        txSpec = TOP_OUT_SW;
      else if ((gRm1C ?? (gRm1C = getCell(wr, wc, r - 1, c).ground))
          && (gRCp1 ?? (gRCp1 = getCell(wr, wc, r, c + 1).ground)))
        txSpec = TOP_IN_SW;
      else if ((gRp1C ?? (gRp1C = getCell(wr, wc, r + 1, c).ground))
          && !(gRCm1 ?? (gRCm1 = getCell(wr, wc, r, c - 1).ground))
          && !(gRCp1 ?? (gRCp1 = getCell(wr, wc, r, c + 1).ground)))
        txSpec = TOP_SIDE_N;
      else if ((gRCm1 ?? (gRCm1 = getCell(wr, wc, r, c - 1).ground))
          && !(gRm1C ?? (gRm1C = getCell(wr, wc, r - 1, c).ground))
          && !(gRp1C ?? (gRp1C = getCell(wr, wc, r + 1, c).ground)))
        txSpec = TOP_SIDE_E;
      else if ((gRm1C ?? (gRm1C = getCell(wr, wc, r - 1, c).ground))
          && !(gRCm1 ?? (gRCm1 = getCell(wr, wc, r, c - 1).ground))
          && !(gRCp1 ?? (gRCp1 = getCell(wr, wc, r, c + 1).ground)))
        txSpec = TOP_SIDE_S;
      else if ((gRCp1 ?? (gRCp1 = getCell(wr, wc, r, c + 1).ground))
          && !(gRm1C ?? (gRm1C = getCell(wr, wc, r - 1, c).ground))
          && !(gRp1C ?? (gRp1C = getCell(wr, wc, r + 1, c).ground)))
        txSpec = TOP_SIDE_W;
    }
    if (txSpec !== undefined && d.txInfo !== undefined) {
      const { txId } = txSpec;
      if (d.txInfo.textureId === txId) d.enabled = true;
      else setCellOffset(updateTxDrawable(d, txId, true), terrain, txSpec, r, c);
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
  for (let y = 0; y < TERRAIN_ROWS - 1; y++) {
    for (let k = 0; k < 2; k++) {
      r = r0;
      c = c0 + k;
      for (let x = k; x < TERRAIN_COLS; x++) {
        f(r, c);
        r--;
        c++;
      }
    }
    r0++;
    c0++;
  }
  for (let x = 0; x < TERRAIN_COLS; x++) {
    f(r0, c0);
    r0--;
    c0++;
  }
};
