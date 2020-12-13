import { Vec2 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { DebugState, getDebugState } from '../debug/debug-mgr';
import { addCellOffset, Drawable, grid2world, mkTxDrawable, TxSpec, TX_SPECS, updateTxDrawable } from './drawable';
import { addDrawable, Entity, mkBaseEntity } from './entity';
import { updateFeedback } from './feedback';
import { adjustWorldCol, adjustWorldRow, BTM_RIGHT_GRID_COL, BTM_RIGHT_GRID_ROW, forEachGridCell, freeWorldChunks, getWorldCell, TOP_LEFT_GRID_COL, TOP_LEFT_GRID_ROW } from '../grid-mgr';
import { mkMoveable } from './moveable';
import { updateOutlines } from '../debug/outlines';
import { getScene } from './scene-mgr';
import { ItemType } from '../world-mgr';

export interface Grid extends Entity<Grid> {
  worldRow  : number; // centre
  worldCol  : number; // centre
  offset    : Vec2;
  itemOffset: Vec2;
  extent    : { min: Vec2, max: Vec2 };
  playerDI  : number; // drawable index
  feedbackDI: number; // drawable index
}

export const mkGrid = (): Grid => {
  const grid = mkBaseEntity(true) as Grid;
  grid.worldRow = 0;
  grid.worldCol = 0;
  grid.offset = vec2.zero();
  grid.itemOffset = vec2.of(-0.05, 0.225);
  const topLeft = vec2.of(TOP_LEFT_GRID_COL, -TOP_LEFT_GRID_ROW);
  mat3.mulV2(grid2world, topLeft, topLeft);
  const btmRight = vec2.of(BTM_RIGHT_GRID_COL, -BTM_RIGHT_GRID_ROW);
  mat3.mulV2(grid2world, btmRight, btmRight);
  grid.extent = {
    min: vec2.of(topLeft.x, btmRight.y),
    max: vec2.of(btmRight.x, topLeft.y)
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
  const { position: playerPos, gridRow: playerRow, gridCol: playerCol, offset: playerOffset, txSpec } = player;
  const { position: outlinesPos } = outlines;
  const debug = getDebugState() !== DebugState.DEBUG_OFF;
  const pd = drawables[pdi];
  if (playerRow === 0 && playerCol === 0) {
    // Update player drawable
    setGridCellOffset(updateTxDrawable(pd, txSpec, true), 0, 0, playerOffset);
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
    const newFbRow = feedback.gridRow - playerRow;
    const newFbCol = feedback.gridCol - playerCol;
    updateFeedback(feedback, newFbRow, newFbCol);
    updateGridCells(grid, newWorldRow, newWorldCol);
    if (debug) {
      vec2.setV(outlinesPos, gridPos);
      updateOutlines(outlines, newWorldRow, newWorldCol);
    }
    freeWorldChunks();
  }

  const fbd = drawables[grid.feedbackDI];
  const { gridRow: fbRow, gridCol: fbCol, offset: fbOffset, txSpec: fbTxSpec, isTarget } = feedback;
  // if (isTarget) setGridCellOffset(updateTxDrawable(fbd, fbTxSpec, true), fbRow, fbCol, fbOffset);
  // else setGridCellOffset(updateTxDrawable(fbd, fbTxSpec, true), 0, 0, fbOffset);
  setGridCellOffset(updateTxDrawable(fbd, fbTxSpec, isTarget), fbRow, fbCol, fbOffset);
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
  const {
    BLOCK, BLOCK_DARK,
    TREE_O_D_W, TREE_O_F_S, TREE_T_D_S, TREE_T_F_W,
    PLANT_B_D_E, PLANT_B_N, GRASS_D_W, GRASS_E, SHROOM_R_G_S, SHROOM_B_G_E,
    LOGS_S_W, LOG_L_E, ROCK_T_2_N, ROCK_S_T_2_N,
    TENT_S_O_S
  } = TX_SPECS;
  grid.worldRow = worldRow;
  grid.worldCol = worldCol;
  const { drawables, offset: gridOffset, itemOffset } = grid;
  const { feedback, player } = getScene();
  const { gridRow: fbGridRow, gridCol: fbGridCol, offset: fbOffset, txSpec: fbTxSpec } = feedback;
  const { gridRow: playerGridRow, gridCol: playerGridCol, offset: playerOffset, txSpec: playerTxSpec } = player;
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
    if (item === ItemType.TREE_OAK) txSpec = TREE_O_D_W;
    else if (item === ItemType.TREE_OAK_FALL) txSpec = TREE_O_F_S;
    else if (item === ItemType.TREE_THIN) txSpec = TREE_T_D_S;
    else if (item === ItemType.TREE_THIN_FALL) txSpec = TREE_T_F_W;
    else if (item === ItemType.PLANT_LARGE) txSpec = PLANT_B_D_E;
    else if (item === ItemType.PLANT_SMALL) txSpec = PLANT_B_N;
    else if (item === ItemType.GRASS_LARGE) txSpec = GRASS_D_W;
    else if (item === ItemType.GRASS_SMALL) txSpec = GRASS_E;
    else if (item === ItemType.SHROOM_RED) txSpec = SHROOM_R_G_S;
    else if (item === ItemType.SHROOM_BROWN) txSpec = SHROOM_B_G_E;
    else if (item === ItemType.LOGS_STACK) txSpec = LOGS_S_W;
    else if (item === ItemType.LOG_LARGE) txSpec = LOG_L_E;
    else if (item === ItemType.ROCK_TALL) txSpec = ROCK_T_2_N;
    else if (item === ItemType.ROCK_SMALL) txSpec = ROCK_S_T_2_N;
    else if (item === ItemType.TENT) txSpec = TENT_S_O_S;
    if (txSpec !== undefined)
      di = addOrUpdateTxDrawable(grid, gridRow, gridCol, di, txSpec, itemOffset);
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
