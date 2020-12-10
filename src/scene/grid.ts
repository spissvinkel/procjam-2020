import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, Drawable, mkTxDrawable, TxSpec, TX_SPECS, updateTxDrawable } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';
import { getWorldCell, GRID_COLS, GRID_ROWS, HALF_GRID_COLS, HALF_GRID_ROWS, TOP_LEFT_GRID_COL, TOP_LEFT_GRID_ROW } from '../grid-mgr';
import { ItemType } from '../world-mgr';
import { getScene } from './scene-mgr';

export interface Grid extends Entity<Grid> {
  worldRow: number; // centre
  worldCol: number; // centre
  offset  : Vec2;
  extent  : { min: Vec2, max: Vec2 };
}

export const mkGrid = (): Grid => {
  const grid = mkBaseEntity(true) as Grid;
  grid.worldRow = 0;
  grid.worldCol = 0;
  const offset = grid.offset = vec2.zero();
  const cellOffsetNW = addCellOffset(vec2.ofV(offset), -HALF_GRID_ROWS, -HALF_GRID_COLS);
  const cellOffsetNE = addCellOffset(vec2.ofV(offset), -HALF_GRID_ROWS,  HALF_GRID_COLS);
  const cellOffsetSW = addCellOffset(vec2.ofV(offset),  HALF_GRID_ROWS, -HALF_GRID_COLS);
  const cellOffsetSE = addCellOffset(vec2.ofV(offset),  HALF_GRID_ROWS,  HALF_GRID_COLS);
  grid.extent = {
    min: vec2.of(cellOffsetSW.x, cellOffsetSE.y),
    max: vec2.of(cellOffsetNE.x, cellOffsetNW.y)
  };
  // console.log(`extent min: ${vec2.toString(grid.extent.min)}, max: ${vec2.toString(grid.extent.max)}`);
  return grid;
};

export const initGrid = (grid: Grid): Grid => {
  return grid;
};

export const updateGridCells = (grid: Grid, worldRow: number, worldCol: number): Grid => {
  const { BLOCK, BLOCK_DARK, TREE_O_D_W, LOGS_S_W } = TX_SPECS;
  grid.worldRow = worldRow;
  grid.worldCol = worldCol;
  const { drawables } = grid;
  const {
    feedback: { gridRow: fbGridRow, gridCol: fbGridCol, txSpec: fbTxSpec },
    player: { gridPos: { x: playerGridCol, y: playerGridRow }, facing: playerTxSpec }
  } = getScene();
  let di = 0;
  let txSpec: TxSpec;
  forEachGridCell((gridRow, gridCol) => {
    const { ground, even, item } = getWorldCell(worldRow, worldCol, gridRow, gridCol);
    if (ground)
      di = addOrUpdateTxDrawable(grid, gridRow, gridCol, di, even ? BLOCK_DARK : BLOCK);
    else
      di = updateEdge(grid, worldRow, worldCol, gridRow, gridCol, di);
    if (gridRow === fbGridRow && gridCol === fbGridCol)
      di = addOrUpdateTxDrawable(grid, gridRow, gridCol, di, fbTxSpec);
    if (ground && item !== ItemType.EMPTY) {
      if (item === ItemType.TREE) txSpec = TREE_O_D_W;
      else if (item === ItemType.LOGS) txSpec = LOGS_S_W;
      di = addOrUpdateTxDrawable(grid, gridRow, gridCol, di, txSpec);
    }
    if (gridRow === playerGridRow && gridCol === playerGridCol)
      di = addOrUpdateTxDrawable(grid, gridRow, gridCol, di, playerTxSpec);
  });
  // Disable unused drawables
  while (di < drawables.length) drawables[di++].enabled = false;
  return grid;
};

const updateEdge = (grid: Grid, wr: number, wc: number, gr: number, gc: number, di: number): number => {
  const {
    TOP_SIDE_N, TOP_SIDE_E, TOP_SIDE_S, TOP_SIDE_W,
    TOP_OUT_NW, TOP_OUT_NE, TOP_OUT_SW, TOP_OUT_SE,
    TOP_IN_NW, TOP_IN_NE, TOP_IN_SW, TOP_IN_SE
  } = TX_SPECS;
  let txSpec: TxSpec | undefined = undefined;
  // TODO: use pattern of 8 cells -> 256 LUT
  let gRm1Cm1: boolean | undefined = undefined;
  let gRm1C  : boolean | undefined = undefined;
  let gRm1Cp1: boolean | undefined = undefined;
  let gRCm1  : boolean | undefined = undefined;
  let gRCp1  : boolean | undefined = undefined;
  let gRp1Cm1: boolean | undefined = undefined;
  let gRp1C  : boolean | undefined = undefined;
  let gRp1Cp1: boolean | undefined = undefined;
  if ((gRp1Cp1 ?? (gRp1Cp1 = getWorldCell(wr, wc, gr + 1, gc + 1).ground))
      && !(gRp1C ?? (gRp1C = getWorldCell(wr, wc, gr + 1, gc).ground))
      && !(gRCp1 ?? (gRCp1 = getWorldCell(wr, wc, gr, gc + 1).ground)))
    txSpec = TOP_OUT_NW;
  if ((gRp1C ?? (gRp1C = getWorldCell(wr, wc, gr + 1, gc).ground))
      && (gRCp1 ?? (gRCp1 = getWorldCell(wr, wc, gr, gc + 1).ground)))
    txSpec = TOP_IN_NW;
  if ((gRp1Cm1 ?? (gRp1Cm1 = getWorldCell(wr, wc, gr + 1, gc - 1).ground))
      && !(gRp1C ?? (gRp1C = getWorldCell(wr, wc, gr + 1, gc).ground))
      && !(gRCm1 ?? (gRCm1 = getWorldCell(wr, wc, gr, gc - 1).ground)))
    txSpec = TOP_OUT_NE;
  if ((gRp1C ?? (gRp1C = getWorldCell(wr, wc, gr + 1, gc).ground))
      && (gRCm1 ?? (gRCm1 = getWorldCell(wr, wc, gr, gc - 1).ground)))
    txSpec = TOP_IN_NE;
  if ((gRm1Cm1 ?? (gRm1Cm1 = getWorldCell(wr, wc, gr - 1, gc - 1).ground))
      && !(gRm1C ?? (gRm1C = getWorldCell(wr, wc, gr - 1, gc).ground))
      && !(gRCm1 ?? (gRCm1 = getWorldCell(wr, wc, gr, gc - 1).ground)))
    txSpec = TOP_OUT_SE;

  if (
    ((gRm1C ?? (gRm1C = getWorldCell(wr, wc, gr - 1, gc).ground))
      && ((gRCm1 ?? (gRCm1 = getWorldCell(wr, wc, gr, gc - 1).ground))
        || (gRp1Cm1 ?? (gRp1Cm1 = getWorldCell(wr, wc, gr + 1, gc - 1).ground))))
    || ((gRCm1 ?? (gRCm1 = getWorldCell(wr, wc, gr, gc - 1).ground))
      && ((gRm1C ?? (gRm1C = getWorldCell(wr, wc, gr - 1, gc).ground))
        || (gRm1Cp1 ?? (gRm1Cp1 = getWorldCell(wr, wc, gr - 1, gc + 1).ground))))
  ) txSpec = TOP_IN_SE;

  if ((gRm1Cp1 ?? (gRm1Cp1 = getWorldCell(wr, wc, gr - 1, gc + 1).ground))
      && !(gRm1C ?? (gRm1C = getWorldCell(wr, wc, gr - 1, gc).ground))
      && !(gRCp1 ?? (gRCp1 = getWorldCell(wr, wc, gr, gc + 1).ground)))
    txSpec = TOP_OUT_SW;
  if ((gRm1C ?? (gRm1C = getWorldCell(wr, wc, gr - 1, gc).ground))
      && (gRCp1 ?? (gRCp1 = getWorldCell(wr, wc, gr, gc + 1).ground)))
    txSpec = TOP_IN_SW;
  if ((gRp1C ?? (gRp1C = getWorldCell(wr, wc, gr + 1, gc).ground))
      && !(gRCm1 ?? (gRCm1 = getWorldCell(wr, wc, gr, gc - 1).ground))
      && !(gRCp1 ?? (gRCp1 = getWorldCell(wr, wc, gr, gc + 1).ground)))
    txSpec = TOP_SIDE_N;
  if ((gRCm1 ?? (gRCm1 = getWorldCell(wr, wc, gr, gc - 1).ground))
      && !(gRm1C ?? (gRm1C = getWorldCell(wr, wc, gr - 1, gc).ground))
      && !(gRp1C ?? (gRp1C = getWorldCell(wr, wc, gr + 1, gc).ground)))
    txSpec = TOP_SIDE_E;
  if ((gRm1C ?? (gRm1C = getWorldCell(wr, wc, gr - 1, gc).ground))
      && !(gRCm1 ?? (gRCm1 = getWorldCell(wr, wc, gr, gc - 1).ground))
      && !(gRCp1 ?? (gRCp1 = getWorldCell(wr, wc, gr, gc + 1).ground)))
    txSpec = TOP_SIDE_S;
  if ((gRCp1 ?? (gRCp1 = getWorldCell(wr, wc, gr, gc + 1).ground))
      && !(gRm1C ?? (gRm1C = getWorldCell(wr, wc, gr - 1, gc).ground))
      && !(gRp1C ?? (gRp1C = getWorldCell(wr, wc, gr + 1, gc).ground)))
    txSpec = TOP_SIDE_W;
  if (txSpec === undefined) return di;
  return addOrUpdateTxDrawable(grid, gr, gc, di, txSpec);
};

const addOrUpdateTxDrawable = (grid: Grid, gridRow: number, gridCol: number, di: number, txSpec: TxSpec): number => {
  const { drawables } = grid;
  const { txId } = txSpec;
  const d = drawables.length === di ? addDrawable(grid, mkTxDrawable(txId, false)) : drawables[di];
  d.enabled = true;
  setGridCellOffset(updateTxDrawable(d, txId, true), grid, txSpec, gridRow, gridCol);
  return di + 1;
};

export const setGridCellOffset = (drawable: Drawable, grid: Grid, txSpec: TxSpec, gridRow: number, gridCol: number): void => {
  const { offset: gridOffset     } = grid;
  const { offset: txSpecOffset   } = txSpec;
  const { offset: drawableOffset } = drawable;
  addCellOffset(vec2.addV(vec2.addV(drawableOffset, txSpecOffset), gridOffset), gridRow, gridCol);
};

export const forEachGridCell = (f: (gridRow: number, gridCol: number) => void): void => {
  let r0 = TOP_LEFT_GRID_ROW, c0 = TOP_LEFT_GRID_COL, r, c;
  for (let y = 0; y < GRID_ROWS - 1; y++) {
    for (let k = 0; k < 2; k++) {
      r = r0;
      c = c0 + k;
      for (let x = k; x < GRID_COLS; x++) {
        f(r, c);
        r--;
        c++;
      }
    }
    r0++;
    c0++;
  }
  for (let x = 0; x < GRID_COLS; x++) {
    f(r0, c0);
    r0--;
    c0++;
  }
};
