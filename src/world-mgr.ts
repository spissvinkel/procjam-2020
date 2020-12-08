import { emptyState, initState, random } from '@spissvinkel/alea';

import { addToList, clearList, mkArrayList } from './utils';

/**
 * Top left world coords is (0, 0)
 */

export const WORLD_CHUNKS_V = 10;
export const WORLD_CHUNKS_H = 10;
export const CHUNK_ROWS = 11;
export const CHUNK_COLS = 11;
export const WORLD_ROWS = WORLD_CHUNKS_V * CHUNK_ROWS;
export const WORLD_COLS = WORLD_CHUNKS_H * CHUNK_COLS;

const HALF_ROWS = Math.floor(CHUNK_ROWS / 2);
const HALF_COLS = Math.floor(CHUNK_COLS / 2);

const MAX_MAIN_WIDTH = 11;
const MIN_MAIN_WIDTH = 5;
const MAIN_WIDTH_VAR = MAX_MAIN_WIDTH - MIN_MAIN_WIDTH + 1;
const MAX_MAIN_HEIGHT = 11;
const MIN_MAIN_HEIGHT = 5;
const MAIN_HEIGHT_VAR = MAX_MAIN_HEIGHT - MIN_MAIN_HEIGHT + 1;

const PRNG_SEED = '0';

export interface Chunk {
  top  : number;
  left : number;
  cells: Cell[][];
}

export interface Cell {
  ground: boolean;
  even  : boolean;
  item  : ItemType;
}

export const enum ItemType {
  EMPTY,
  LOGS,
  TREE
}

interface Rect {
  top   : number;
  left  : number;
  width : number;
  height: number;
}

const mkChunk = (): Chunk => {
  const top = 0;
  const left = 0;
  const cells: Cell[][] = [ ];
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row: Cell[] = cells[r] = [ ];
    for (let c = 0; c < CHUNK_COLS; c++) {
      row[c] = { ground: false, item: ItemType.EMPTY, even: true };
    }
  }
  return { top, left, cells };
};

const chunks = mkArrayList(mkChunk);

interface Rect {
  top   : number;
  left  : number;
  width : number;
  height: number;
}

const mkRect = (): Rect => {
  const top = 0;
  const left = 0;
  const width = 0;
  const height = 0;
  return { top, left, width, height };
};

const rects = mkArrayList(mkRect);

const genState = emptyState();

const generateCells = (chunk: Chunk): void => {
  clearList(rects);

  let mainWidth = Math.floor(random(genState) * MAIN_WIDTH_VAR) + MIN_MAIN_WIDTH;
  let mainHeight = Math.floor(random(genState) * MAIN_HEIGHT_VAR) + MIN_MAIN_HEIGHT;
  const mainWD = CHUNK_COLS - mainWidth + 1, mainHD = CHUNK_ROWS - mainHeight + 1;
  let mainLeft = Math.floor(random(genState) * mainWD);
  let mainTop = Math.floor(random(genState) * mainHD);

  let mainRight = mainLeft + mainWidth - 1;
  let mainBtm = mainTop + mainHeight - 1;

  // Gap min 2 cells
  if (mainLeft === 1) {
    if (mainWidth > MIN_MAIN_WIDTH) mainWidth--;
    else mainRight++;
    mainLeft++;
  }
  if (mainRight === CHUNK_COLS - 2) {
    if (mainWidth > MIN_MAIN_WIDTH) mainWidth--;
    else mainLeft--;
    mainRight--;
  }
  if (mainTop === 1) {
    if (mainHeight > MIN_MAIN_HEIGHT) mainHeight--;
    else mainBtm++;
    mainTop++;
  }
  if (mainBtm === CHUNK_ROWS - 2) {
    if (mainHeight > MIN_MAIN_HEIGHT) mainHeight--;
    else mainTop--;
    mainBtm--;
  }

  const main = addToList(rects);
  main.top = mainTop;
  main.left = mainLeft;
  main.width = mainWidth;
  main.height = mainHeight;

  const { top, left, cells } = chunk;
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row = cells[r];
    for (let c = 0; c < CHUNK_COLS; c++) {
      const cell = row[c];
      if (r < mainTop || r > mainBtm || c < mainLeft || c > mainRight) {
        cell.ground = false;
      } else {
        cell.ground = true;
      }
      cell.even = (r + top) % 2 === (c + left) % 2;
    }
  }
};

const generateItems = (chunk: Chunk): void => {
  const { cells } = chunk;
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row = cells[r];
    for (let c = 0; c < CHUNK_COLS; c++) {
      const cell = row[c];
      if (!cell.ground || (r === HALF_ROWS && c === HALF_COLS)) {
        cell.item = ItemType.EMPTY;
        continue;
      }
      const n = random(genState);
      if (n < 0.01) cell.item = ItemType.LOGS;
      else if (n < 0.04) cell.item = ItemType.TREE;
      else cell.item = ItemType.EMPTY;
    }
  }
};

const generateChunk = (top: number, left: number, chunk: Chunk): Chunk => {
  chunk.top = top;
  chunk.left = left;
  const seed = `${top}:${left}:${PRNG_SEED}`;
  initState(seed, genState);
  generateCells(chunk);
  generateItems(chunk);
  return chunk;
};

export const getChunk = (top: number, left: number): Chunk => {
  const { elements, numElements } = chunks;
  for (let i = 0; i < numElements; i++) {
    const chunk = elements[i];
    const { top: t, left: l } = chunk;
    if (t === top && l === left) return chunk;
  }
  return generateChunk(top, left, addToList(chunks));
};

export const freeChunk = (chunk: Chunk): void => {
  chunks.numElements--;
  const { elements, numElements } = chunks;
  const last = elements[numElements];
  if (last === chunk) return;
  for (let i = 0; i < numElements; i++) {
    if (elements[i] === chunk) {
      elements[i] = last;
      elements[numElements] = chunk;
      break;
    }
  }
};

// For debug-mgr mostly
export const getNumChunks = (): number => chunks.numElements;
export const getChunkPoolSize = (): number => chunks.elements.length;
