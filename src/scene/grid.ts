import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, Drawable, TxSpec } from './drawable';
import { Entity, mkBaseEntity } from './entity';
import { GRID_COLS, GRID_ROWS, HALF_GRID_COLS, HALF_GRID_ROWS, TOP_LEFT_GRID_COL, TOP_LEFT_GRID_ROW } from './grid-mgr';

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
  return grid;
};

export const setGridCellOffset = (drawable: Drawable, grid: Grid, txSpec: TxSpec, row: number, column: number): void => {
  const { offset: gridOffset     } = grid;
  const { offset: txSpecOffset   } = txSpec;
  const { offset: drawableOffset } = drawable;
  addCellOffset(vec2.addV(vec2.addV(drawableOffset, txSpecOffset), gridOffset), row, column);
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
