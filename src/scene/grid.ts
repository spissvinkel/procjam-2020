import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { DebugState, getDebugState } from '../debug/debug-mgr';
import { addCellOffset, Drawable, mkTxDrawable, TxSpec, TX_SPECS, updateTxDrawable } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';
import { updateFeedback } from './feedback';
import { adjustWorldCol, adjustWorldRow, freeWorldChunks, getWorldCell, GRID_COLS, GRID_ROWS, HALF_GRID_COLS, HALF_GRID_ROWS } from '../grid-mgr';
import { Input, poll } from '../input-mgr';
import { mkMoveable } from './moveable';
import { updateOutlines } from '../debug/outlines';
import { getScene } from './scene-mgr';
import { ItemType } from '../world-mgr';

export const TOP_LEFT_GRID_ROW  =  HALF_GRID_COLS - HALF_GRID_ROWS; //   7
export const TOP_LEFT_GRID_COL  = -HALF_GRID_COLS - HALF_GRID_ROWS; // -25
export const TOP_RIGHT_GRID_ROW = -HALF_GRID_COLS - HALF_GRID_ROWS; // -25
export const TOP_RIGHT_GRID_COL =  HALF_GRID_COLS - HALF_GRID_ROWS; //   7
export const BTM_LEFT_GRID_ROW  =  HALF_GRID_ROWS + HALF_GRID_COLS; //  25
export const BTM_LEFT_GRID_COL  =  HALF_GRID_ROWS - HALF_GRID_COLS; // - 7
export const BTM_RIGHT_GRID_ROW =  HALF_GRID_ROWS - HALF_GRID_COLS; // - 7
export const BTM_RIGHT_GRID_COL =  HALF_GRID_ROWS + HALF_GRID_COLS; //  25

export interface Grid extends Entity<Grid> {
  worldRow  : number; // centre
  worldCol  : number; // centre
  offset    : Vec2;
  extent    : { min: Vec2, max: Vec2 };
  playerDI  : number; // drawable index
  feedbackDI: number; // drawable index
}

export const mkGrid = (): Grid => {
  console.log(`[mkGrid] TOP_LEFT_GRID_ROW : ${TOP_LEFT_GRID_ROW}, TOP_LEFT_GRID_COL : ${TOP_LEFT_GRID_COL}`);
  console.log(`[mkGrid] TOP_RIGHT_GRID_ROW: ${TOP_RIGHT_GRID_ROW}, TOP_RIGHT_GRID_COL: ${TOP_RIGHT_GRID_COL}`);
  console.log(`[mkGrid] BTM_LEFT_GRID_ROW : ${BTM_LEFT_GRID_ROW}, BTM_LEFT_GRID_COL : ${BTM_LEFT_GRID_COL}`);
  console.log(`[mkGrid] BTM_RIGHT_GRID_ROW: ${BTM_RIGHT_GRID_ROW}, BTM_RIGHT_GRID_COL: ${BTM_RIGHT_GRID_COL}`);

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
  grid.playerDI = -1;
  grid.feedbackDI = -1;
  return grid;
};

export const initGrid = (grid: Grid): Grid => {
  grid.moveable = mkMoveable(grid, vec2.zero(), 0.0);
  grid.updateVelocity = updateVelocity;
  grid.updatePosition = updatePosition;
  return grid;
};

const updateVelocity = (grid: Grid): void => {
  const { moveable: gridMoveable } = grid;
  const { player: { moveable: playerMoveable } } = getScene();
  if (gridMoveable === undefined || playerMoveable === undefined) return;
  const { velocity: gridVelocity } = gridMoveable;
  const { velocity: playerVelocity } = playerMoveable;
  vec2.setV(gridVelocity, playerVelocity);
  vec2.inv(gridVelocity);
};

const updatePosition = (grid: Grid): void => {
  const { position: gridPos, drawables, worldRow, worldCol, playerDI } = grid;
  const maxPdi = drawables.length - 1;
  let pdi = playerDI;
  if (pdi < 0) return;
  const { feedback, player, outlines } = getScene();
  const { position: playerPos, gridRow: playerRow, gridCol: playerCol, offset: playerOffset, facing } = player;
  const { position: outlinesPos } = outlines;
  const debug = getDebugState() !== DebugState.DEBUG_OFF;
  const pd = drawables[pdi];
  if (playerRow === 0 && playerCol === 0) {
    // Update player drawable
    setGridCellOffset(updateTxDrawable(pd, facing, true), 0, 0, playerOffset);
    let di: number;
    let d: Drawable;
    while (pdi > 0 && compareOffsets(pd, (d = drawables[di = pdi - 1])) < 0) {
      if (d.txInfo !== undefined && !d.txInfo.txSpec.isItem) break; // we have reached the terrain drawables
      drawables[di] = pd;
      drawables[pdi] = d;
      pdi = di;
    }
    if (pdi === playerDI) { // no change - check other direction
      while (pdi < maxPdi && compareOffsets(pd, (d = drawables[di = pdi + 1])) > 0) {
        if (!d.enabled) break; // we have reached the unused drawables
        drawables[di] = pd;
        drawables[pdi] = d;
        pdi = di;
      }
    }
    grid.playerDI = pdi;
  } else {
    // Reset grid world pos
    vec2.setV(playerPos, playerOffset);
    player.gridRow = 0;
    player.gridCol = 0;
    vec2.setV(gridPos, playerOffset);
    vec2.inv(gridPos);
    const newWorldRow = adjustWorldRow(worldRow, playerRow);
    const newWorldCol = adjustWorldCol(worldCol, playerCol);
    updateFeedback(feedback, newWorldRow, newWorldCol, 0, 0);
    updateGridCells(grid, newWorldRow, newWorldCol);
    if (debug) {
      vec2.setV(outlinesPos, gridPos);
      updateOutlines(outlines, newWorldRow, newWorldCol);
    }
    freeWorldChunks();
  }


  if (poll(Input.P1_DEBUG)) {
    const counts: { [ key: string ]: number } = {};
    for (let i = 0; i < drawables.length; i++) {
      const { txInfo } = drawables[i];
      if (txInfo === undefined) continue;
      const { txSpec: { txId } } = txInfo;
      if (txId in counts) counts[txId]++;
      else counts[txId] = 1;
    }
    console.log('***** tx drawables *****');
    for (const key in counts) {
      console.log(`${key}: ${counts[key]}`);
    }
  }
};

type CompRes = -1 | 0 | 1;

const E = 0.0000001;

const compareOffsets = (d1: Drawable, d2: Drawable): CompRes => {
  const { offset: dOffset1, txInfo: txInfo1 } = d1;
  const { offset: dOffset2, txInfo: txInfo2 } = d2;
  if (txInfo1 === undefined || txInfo2 === undefined) return 0;
  const { txSpec: { offset: txOffset1 } } = txInfo1;
  const { txSpec: { offset: txOffset2 } } = txInfo2;
  // const x1 = dOffset1.x - txOffset1.x;
  const y1 = dOffset1.y - txOffset1.y;
  // const x2 = dOffset2.x - txOffset2.x;
  const y2 = dOffset2.y - txOffset2.y;
  const yd = y1 - y2;
  // const xd = x1 - x2;
  if (yd > E) return -1;
  else if (yd < E) return 1;
  // else if (xd < E) return -1;
  // else if (xd > E) return 1;
  return 0;
};

export const updateGridCells = (grid: Grid, worldRow: number, worldCol: number): Grid => {
  const { BLOCK, BLOCK_DARK, TREE_O_D_W, LOGS_S_W } = TX_SPECS;
  grid.worldRow = worldRow;
  grid.worldCol = worldCol;
  const { drawables, offset: gridOffset } = grid;
  const { feedback, player } = getScene();
  const { gridRow: fbGridRow, gridCol: fbGridCol, offset: fbOffset, txSpec: fbTxSpec } = feedback;
  const { gridRow: playerGridRow, gridCol: playerGridCol, offset: playerOffset, facing: playerTxSpec } = player;
  let di = 0;
  // Add terrain drawables
  forEachGridCell((gridRow, gridCol) => {
    const { ground, even } = getWorldCell(worldRow, worldCol, gridRow, gridCol);
    if (ground)
      di = addOrUpdateTxDrawable(grid, gridRow, gridCol, di, even ? BLOCK_DARK : BLOCK, gridOffset);
    else
      di = updateEdge(grid, worldRow, worldCol, gridRow, gridCol, di);
    if (gridRow === fbGridRow && gridCol === fbGridCol) {
      grid.feedbackDI = di;
      di = addOrUpdateTxDrawable(grid, fbGridRow, fbGridCol, di, fbTxSpec, fbOffset);
    }
  });
  // Add item drawables
  forEachGridCell((gridRow, gridCol) => {
    const { item } = getWorldCell(worldRow, worldCol, gridRow, gridCol);
    let txSpec: TxSpec | undefined = undefined;
    if (item === ItemType.TREE) txSpec = TREE_O_D_W;
    else if (item === ItemType.LOGS) txSpec = LOGS_S_W;
    if (txSpec !== undefined)
      di = addOrUpdateTxDrawable(grid, gridRow, gridCol, di, txSpec, gridOffset);
    if (gridRow === playerGridRow && gridCol === playerGridCol) {
      grid.playerDI = di;
      di = addOrUpdateTxDrawable(grid, playerGridRow, playerGridCol, di, playerTxSpec, playerOffset);
    }
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
  return addOrUpdateTxDrawable(grid, gr, gc, di, txSpec, grid.offset);
};

const addOrUpdateTxDrawable = (
  grid: Grid, gridRow: number, gridCol: number, di: number, txSpec: TxSpec, entityOffset: Vec2
): number => {
  const { drawables } = grid;
  const d = drawables.length === di ? addDrawable(grid, mkTxDrawable(txSpec, false)) : drawables[di];
  d.enabled = true;
  setGridCellOffset(updateTxDrawable(d, txSpec, true), gridRow, gridCol, entityOffset);
  return di + 1;
};

export const setGridCellOffset = (drawable: Drawable, gridRow: number, gridCol: number, entityOffset: Vec2): void => {
  const { offset: drawableOffset, txInfo } = drawable;
  if (txInfo === undefined) return;
  const { txSpec: { offset: txSpecOffset } } = txInfo;
  addCellOffset(vec2.addV(vec2.addV(drawableOffset, txSpecOffset), entityOffset), gridRow, gridCol);
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
