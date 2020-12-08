import { AleaState, emptyState, initState, random } from '@spissvinkel/alea';

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

const MAX_BTM = CHUNK_ROWS - 1;
const MAX_RIGHT = CHUNK_COLS - 1;

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
  btm   : number;
  right : number;
}

const mkRect = (): Rect => {
  const top = 0;
  const left = 0;
  const btm = 0;
  const right = 0;
  return { top, left, btm, right };
};

const rects = mkArrayList(mkRect);

const genState = emptyState();

const generateCells = (state: AleaState, chunk: Chunk): void => {
  clearList(rects);
  const { top, left, cells } = chunk;
  console.log(`top: ${top}, left: ${left}`);
  generateCorners(state, generateMain(state));
  const { numElements, elements } = rects;
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row = cells[r];
    for (let c = 0; c < CHUNK_COLS; c++) {
      const cell = row[c];
      let g = false;
      for (let i = 0; i < numElements; i++) if ((g = isInside(r, c, elements[i]))) break;
      cell.ground = g;
      cell.even = (r + top) % 2 === (c + left) % 2;
    }
  }
};

const generateCorners = (state: AleaState, { top: mTop, left: mLeft, btm: mBtm, right: mRight }: Rect): void => {
  let n = 0;
  const topEdgeIsMiddle = random(state) < 0.5; // ... or corners
  const btmEdgeIsMiddle = random(state) < 0.5; // ... or corners
  const topLeft = topEdgeIsMiddle || mTop === 0 || mLeft === 0 ? false : random(state) < 0.3;
  if (topLeft) n++;
  const topRight = topEdgeIsMiddle || mTop === 0 || mRight === MAX_RIGHT ? false : random(state) < 0.3;
  if (topRight) n++;
  const btmLeft = btmEdgeIsMiddle || mBtm === MAX_BTM || mLeft === 0 ? false : random(state) < (n < 2 ? 0.3 : 0.5);
  if (btmLeft) n++;
  const btmRight = n > 2 || btmEdgeIsMiddle || mBtm === MAX_BTM || mRight === MAX_RIGHT ? false : random(state) < 0.5;
  if (btmRight) n++;
  const topMiddle = n < 3 && (topEdgeIsMiddle || !(mTop === 0 || topLeft || topRight)) ? random(state) < 0.5 : false;
  if (topMiddle) n++;
  const btmMiddle = n < 3 && (btmEdgeIsMiddle || !(mBtm === MAX_BTM || btmLeft || btmRight)) ? random(state) < 0.5 : false;
  if (btmMiddle) n++;
  const leftMiddle = n < 3 && !(mLeft === 0 || topLeft || btmLeft) ? random(state) < 0.5 : false;
  if (leftMiddle) n++;
  const rightMiddle = n < 3 && !(mRight === MAX_RIGHT || topRight || btmRight) ? random(state) < 0.5 : false;
  if (rightMiddle) n++;
  console.log(`n: ${n}`);
  if (n > 0) {
    const mW = mRight - mLeft, mH = mBtm - mTop;
    const mHW = Math.floor(mW / 2), mHH = Math.floor(mH / 2);
    const mwEven = mW % 2 === 0, mhEven = mH % 2 === 0;
    if (topLeft) {
      const rect = addToList(rects);
      rect.top = mTop < 3 ? 0 : Math.floor(random(state) * mTop);
      if (rect.top === 1) rect.top = 0;
      rect.left = mLeft < 3 ? 0 : Math.floor(random(state) * mLeft);
      if (rect.left === 1) rect.left = 0;
      rect.btm = mTop + Math.floor(random(state) * (mhEven ? mHH - 1 : mHH));
      rect.right = mLeft + Math.floor(random(state) * (mwEven ? mHW - 1 : mHW));
      console.log('topLeft');
    }
    if (topRight) {
      const rect = addToList(rects);
      rect.top = mTop < 3 ? 0 : Math.floor(random(state) * mTop);
      if (rect.top === 1) rect.top = 0;
      rect.right = mRight > MAX_RIGHT - 3 ? MAX_RIGHT : MAX_RIGHT - Math.floor(random(state) * (MAX_RIGHT - mRight));
      if (rect.right === MAX_RIGHT - 1) rect.right = MAX_RIGHT;
      rect.btm = mTop + Math.floor(random(state) * (mhEven ? mHH - 1 : mHH));
      rect.left = mRight - Math.floor(random(state) * (mwEven ? mHW - 1 : mHW));
      console.log('topRight');
    }
    if (btmLeft) {
      const rect = addToList(rects);
      rect.btm = mBtm > MAX_BTM - 3 ? MAX_BTM : MAX_BTM - Math.floor(random(state) * (MAX_BTM - mBtm));
      if (rect.btm === MAX_BTM - 1) rect.btm = MAX_BTM;
      rect.left = mLeft < 3 ? 0 : Math.floor(random(state) * mLeft);
      if (rect.left === 1) rect.left = 0;
      rect.top = mBtm - Math.floor(random(state) * (mhEven ? mHH - 1 : mHH));
      rect.right = mLeft + Math.floor(random(state) * (mwEven ? mHW - 1 : mHW));
      console.log('btmLeft');
    }
    if (btmRight) {
      const rect = addToList(rects);
      rect.btm = mBtm > MAX_BTM - 3 ? MAX_BTM : MAX_BTM - Math.floor(random(state) * (MAX_BTM - mBtm));
      if (rect.btm === MAX_BTM - 1) rect.btm = MAX_BTM;
      rect.right = mRight > MAX_RIGHT - 3 ? MAX_RIGHT : MAX_RIGHT - Math.floor(random(state) * (MAX_RIGHT - mRight));
      if (rect.right === MAX_RIGHT - 1) rect.right = MAX_RIGHT;
      rect.top = mBtm - Math.floor(random(state) * (mhEven ? mHH - 1 : mHH));
      rect.left = mRight - Math.floor(random(state) * (mwEven ? mHW - 1 : mHW));
      console.log('btmRight');
    }
    if (topMiddle) {
      const rect = addToList(rects);
      rect.top = mTop < 3 ? 0 : Math.floor(random(state) * mTop);
      if (rect.top === 1) rect.top = 0;
      rect.left = mLeft + 2;
      rect.right = mRight - 2;
      rect.btm = mTop + Math.floor(random(state) * (mhEven ? mHH - 1 : mHH));
      console.log('topMiddle');
    }
    if (btmMiddle) {
      const rect = addToList(rects);
      rect.btm = mBtm > MAX_BTM - 3 ? MAX_BTM : MAX_BTM - Math.floor(random(state) * (MAX_BTM - mBtm));
      if (rect.btm === MAX_BTM - 1) rect.btm = MAX_BTM;
      rect.left = mLeft + 2;
      rect.right = mRight - 2;
      rect.top = mBtm - Math.floor(random(state) * (mhEven ? mHH - 1 : mHH));
      console.log('btmMiddle');
    }
    if (leftMiddle) {
      console.log('leftMiddle');
    }
    if (rightMiddle) {
      console.log('rightMiddle');
    }
  }
};

const generateMain = (state: AleaState): Rect => {
  let mainWidth = Math.floor(random(state) * MAIN_WIDTH_VAR) + MIN_MAIN_WIDTH;
  let mainHeight = Math.floor(random(state) * MAIN_HEIGHT_VAR) + MIN_MAIN_HEIGHT;
  const mainWD = CHUNK_COLS - mainWidth + 1, mainHD = CHUNK_ROWS - mainHeight + 1;
  let mainLeft = Math.floor(random(state) * mainWD);
  let mainTop = Math.floor(random(state) * mainHD);

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
  main.btm = mainBtm;
  main.right = mainRight;

  return main;
};

const isInside = (row: number, col: number, { top, left, btm, right }: Rect): boolean => {
  return row >= top && row <= btm && col >= left && col <= right;
};

const generateItems = (state: AleaState, chunk: Chunk): void => {
  const { cells } = chunk;
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row = cells[r];
    for (let c = 0; c < CHUNK_COLS; c++) {
      const cell = row[c];
      if (!cell.ground || (r === HALF_ROWS && c === HALF_COLS)) {
        cell.item = ItemType.EMPTY;
        continue;
      }
      const n = random(state);
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
  const state = initState(seed, genState);
  generateCells(state, chunk);
  generateItems(state, chunk);
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
