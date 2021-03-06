import { addToList, clearList, mkArrayList } from './utils';
import { Cell, Chunk, CHUNK_COLS, CHUNK_ROWS, freeChunk, getChunk, WORLD_COLS, WORLD_ROWS } from './world-mgr';

export const GRID_ROWS = 19;
export const GRID_COLS = 33;

export const HALF_GRID_ROWS = Math.floor(GRID_ROWS / 2); //  9
export const HALF_GRID_COLS = Math.floor(GRID_COLS / 2); // 16

export const TOP_LEFT_GRID_ROW  =  HALF_GRID_COLS - HALF_GRID_ROWS; //   7
export const TOP_LEFT_GRID_COL  = -HALF_GRID_COLS - HALF_GRID_ROWS; // -25
export const TOP_RIGHT_GRID_ROW = -HALF_GRID_COLS - HALF_GRID_ROWS; // -25
export const TOP_RIGHT_GRID_COL =  HALF_GRID_COLS - HALF_GRID_ROWS; //   7
export const BTM_LEFT_GRID_ROW  =  HALF_GRID_ROWS + HALF_GRID_COLS; //  25
export const BTM_LEFT_GRID_COL  =  HALF_GRID_ROWS - HALF_GRID_COLS; // - 7
export const BTM_RIGHT_GRID_ROW =  HALF_GRID_ROWS - HALF_GRID_COLS; // - 7
export const BTM_RIGHT_GRID_COL =  HALF_GRID_ROWS + HALF_GRID_COLS; //  25

export interface ChunkKey { top: number, left: number }

const mkChunkKey = (): ChunkKey => ({ top: 0, left: 0 });

let previousChunkKeys = mkArrayList(mkChunkKey);
let currentChunkKeys  = mkArrayList(mkChunkKey);

export const getWorldChunk = (top: number, left: number): Chunk => {
  addChunkKey(top, left);
  return getChunk(top, left);
};

export const addChunkKey = (top: number, left: number): void => {
  if (isCurrentChunkKey(top, left)) return;
  const key = addToList(currentChunkKeys);
  key.top = top;
  key.left = left;
};

export const freeWorldChunks = (): void => {
  const { numElements: numPrevElems, elements: prevElems } = previousChunkKeys;
  for (let i = 0; i < numPrevElems; i++) {
    const { top, left } = prevElems[i];
    if (!isCurrentChunkKey(top, left)) freeChunk(getChunk(top, left));
  }
  clearList(previousChunkKeys);
  const tmp = previousChunkKeys;
  previousChunkKeys = currentChunkKeys;
  currentChunkKeys = tmp;
};

export const isCurrentChunkKey = (top: number, left: number): boolean => {
  const { numElements, elements } = currentChunkKeys;
  for (let i = 0; i < numElements; i++) {
    const { top: t, left: l } = elements[i];
    if (t === top && l === left) return true;
  }
  return false;
};

export const getWorldCell = (worldRow: number, worldCol: number, gridRow: number, gridCol: number): Cell => {
  const wRow = adjustWorldRow(worldRow, gridRow), wCol = adjustWorldCol(worldCol, gridCol);
  const chTop = getWorldChunkTop(wRow), chLeft = getWorldChunkLeft(wCol);
  const chunk = getWorldChunk(chTop, chLeft);
  const { cells } = chunk;
  const chRow = wRow - chTop, chCol = wCol - chLeft;
  return cells[chRow][chCol];
};

export const adjustWorldRow = (worldRow: number, gridRow: number): number => {
  let adjustedRow = gridRow + worldRow;
  if (adjustedRow < 0) adjustedRow += WORLD_ROWS;
  else if (adjustedRow >= WORLD_ROWS) adjustedRow -= WORLD_ROWS;
  return adjustedRow;
};

export const adjustWorldCol = (worldCol: number, gridCol: number): number => {
  let adjustedCol = gridCol + worldCol;
  if (adjustedCol < 0) adjustedCol += WORLD_COLS;
  else if (adjustedCol >= WORLD_COLS) adjustedCol -= WORLD_COLS;
  return adjustedCol;
};

export const getWorldChunkTop  = (worldRow: number): number => Math.floor(worldRow / CHUNK_ROWS) * CHUNK_ROWS;
export const getWorldChunkLeft = (worldCol: number): number => Math.floor(worldCol / CHUNK_COLS) * CHUNK_COLS;

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
