import { AleaState, emptyState, initState, random } from '@spissvinkel/alea';
import { DebugState, getDebugState } from './debug/debug-mgr';

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

export const HALF_CHUNK_ROWS = Math.floor(CHUNK_ROWS / 2);
export const HALF_CHUNK_COLS = Math.floor(CHUNK_COLS / 2);

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
  // Position in world row/col
  top : number;
  left: number;
  // Centre of main ground rect in chunk row/col
  cRow: number;
  cCol: number;
  // Which sides have bridge to neighbour
  bridgeInfos: BridgeInfo;
  // The cells
  cells: Cell[][];
  // Debug info
  mainRect?   : Rect;
  bridgeRects?: Rect[];
  cornerRects?: Rect[];
}

export interface BridgeInfo {
  top  : boolean;
  left : boolean;
  btm  : boolean;
  right: boolean;
}

export interface Cell {
  // Solid ground or the void
  ground: boolean;
  // "Even" or "odd" cell, used for checkerboard pattern, should ideally live in the `terrain` module
  even  : boolean;
  // Type of item in this cell
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
  const cRow = 0;
  const cCol = 0;
  const bridgeInfos: BridgeInfo = { top: false, left: false, btm: false, right: false };
  const cells: Cell[][] = [ ];
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row: Cell[] = cells[r] = [ ];
    for (let c = 0; c < CHUNK_COLS; c++) {
      row[c] = { ground: false, item: ItemType.EMPTY, even: true };
    }
  }
  return { top, left, cRow, cCol, bridgeInfos, cells };
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

interface Bridges {
  top?  : Rect;
  left? : Rect;
  btm?  : Rect;
  right?: Rect;
}

const bridges: Bridges = { };

const genState = emptyState();

const generateChunk = (top: number, left: number, chunk: Chunk): Chunk => {
  chunk.top = top;
  chunk.left = left;
  const seed = `${top}:${left}:${PRNG_SEED}`;
  const state = initState(seed, genState);
  const { bridgeInfos } = chunk;
  bridgeInfos.top = random(state) < 0.75;
  bridgeInfos.left = random(state) < 0.75;
  bridgeInfos.btm = random(state) < 0.75;
  bridgeInfos.right = random(state) < 0.75;
  generateCells(state, chunk);
  generateItems(state, chunk);
  return chunk;
};

const generateCells = (state: AleaState, chunk: Chunk): void => {
  clearList(rects);
  const { top, left, bridgeInfos, cells } = chunk;
  const main = generateMain(state, chunk);
  generateBridges(chunk, main, bridgeInfos, bridges);
  generateCorners(state, chunk, main, bridges);
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

// Generate the main rectangle og ground cells - width/height is about 50%-100% of chunk width/height
const generateMain = (state: AleaState, chunk: Chunk): Rect => {
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

  chunk.cRow = mainTop + Math.floor((mainBtm - mainTop) * 0.5);
  chunk.cCol = mainLeft + Math.floor((mainRight - mainLeft) * 0.5);

  const main = addToList(rects);
  main.top = mainTop;
  main.left = mainLeft;
  main.btm = mainBtm;
  main.right = mainRight;

  if (getDebugState() !== DebugState.DEBUG_OFF)
    chunk.mainRect = { top: mainTop, left: mainLeft, btm: mainBtm, right: mainRight };

  return main;
};

// Generate bridges from main rectangle to neighbours
const generateBridges = (
  chunk: Chunk,
  { top: mTop, left: mLeft, btm: mBtm, right: mRight }: Rect,
  { top: bTop, left: bLeft, btm: bBtm, right: bRight }: BridgeInfo,
  bridges: Bridges
): Bridges => {
  const mW = mRight - mLeft, mH = mBtm - mTop;
  const mHW = Math.floor(mW * 0.5), mHH = Math.floor(mH * 0.5);
  const minMidW = mLeft + mHW, maxMidW = mRight - mHW;
  const minMidH = mTop + mHH, maxMidH = mBtm - mHH;

  if (getDebugState() !== DebugState.DEBUG_OFF) chunk.bridgeRects = [ ];

  if (!bTop) bridges.top = undefined;
  else {
    const rect = addToList(rects);
    rect.top = 0;
    rect.left = minMidW < HALF_CHUNK_COLS ? minMidW : HALF_CHUNK_COLS;
    rect.btm = mTop > 0 ? mTop - 1 : 0;
    rect.right = maxMidW > HALF_CHUNK_COLS ? maxMidW : HALF_CHUNK_COLS;
    bridges.top = rect;
  }

  if (!bLeft) bridges.left = undefined;
  else {
    const rect = addToList(rects);
    rect.top = minMidH < HALF_CHUNK_ROWS ? minMidH : HALF_CHUNK_ROWS;
    rect.left = 0;
    rect.btm = maxMidH > HALF_CHUNK_ROWS ? maxMidH : HALF_CHUNK_ROWS;
    rect.right = mLeft > 0 ? mLeft - 1 : 0;
    bridges.left = rect;
  }

  if (!bBtm) bridges.btm = undefined;
  else {
    const rect = addToList(rects);
    rect.top = mBtm < MAX_BTM ? mBtm + 1 : MAX_BTM;
    rect.left = minMidW < HALF_CHUNK_COLS ? minMidW : HALF_CHUNK_COLS;
    rect.btm = MAX_BTM;
    rect.right = maxMidW > HALF_CHUNK_COLS ? maxMidW : HALF_CHUNK_COLS;
    bridges.btm = rect;
  }

  if (!bRight) bridges.right = undefined;
  else {
    const rect = addToList(rects);
    rect.top = minMidH < HALF_CHUNK_ROWS ? minMidH : HALF_CHUNK_ROWS;
    rect.left = mRight < MAX_RIGHT ? mRight + 1 : MAX_RIGHT;
    rect.btm = maxMidH > HALF_CHUNK_ROWS ? maxMidH : HALF_CHUNK_ROWS;
    rect.right = MAX_RIGHT;
    bridges.right = rect;
  }

  const { top, left, btm, right } = bridges;

  if (top !== undefined && right !== undefined) {
    if (top.right > mRight && right.top - mTop === 1) right.top--;
  }
  if (right !== undefined && btm !== undefined) {
    if (right.btm > mBtm && mRight - btm.right === 1) btm.right++;
  }
  if (btm !== undefined && left !== undefined) {
    if (btm.left < mLeft && mBtm - left.btm === 1) left.btm++;
  }
  if (left !== undefined && top !== undefined) {
    if (left.top < mTop && top.left - mLeft === 1) top.left--;
  }

  if (getDebugState() !== DebugState.DEBUG_OFF && chunk.bridgeRects !== undefined) {
    if (top !== undefined)
      chunk.bridgeRects.push({ top: top.top, left: top.left, btm: top.btm, right: top.right });
    if (left !== undefined)
      chunk.bridgeRects.push({ top: left.top, left: left.left, btm: left.btm, right: left.right });
    if (btm !== undefined)
      chunk.bridgeRects.push({ top: btm.top, left: btm.left, btm: btm.btm, right: btm.right });
    if (right !== undefined)
      chunk.bridgeRects.push({ top: right.top, left: right.left, btm: right.btm, right: right.right });
  }

  return bridges;
};

// Generate up to 3 smaller rectangles of ground cells on the corners/edges of the main rectangle
const generateCorners = (
  state: AleaState,
  chunk: Chunk,
  { top: mTop, left: mLeft, btm: mBtm, right: mRight }: Rect,
  { top: bTop, left: bLeft, btm: bBtm, right: bRight }: Bridges
): void => {
  let n = 0; // Count the rectangles to be created

  const topEdgeIsMiddle = random(state) < 0.4; // ... or corners
  const btmEdgeIsMiddle = random(state) < 0.4; // ... or corners

  const topLeft
    = topEdgeIsMiddle
      || (mTop === 0 && mLeft === 0)
      || (bTop  !== undefined && bTop.left - mLeft < 3)
      || (bLeft !== undefined && bLeft.top - mTop  < 3)
    ? false : random(state) < 0.33;
  if (topLeft) n++;

  const topRight
    = topEdgeIsMiddle
      || (mTop === 0 && mRight === MAX_RIGHT)
      || (bTop   !== undefined && mRight     - bTop.right < 3)
      || (bRight !== undefined && bRight.top - mTop       < 3)
    ? false : random(state) < 0.33;
  if (topRight) n++;

  const btmLeft
    = btmEdgeIsMiddle
      || (mBtm === MAX_BTM && mLeft === 0)
      || (bBtm  !== undefined && bBtm.left - mLeft      < 3)
      || (bLeft !== undefined && mBtm      - bLeft.btm  < 3)
    ? false : random(state) < (n < 2 ? 0.33 : 0.5);
  if (btmLeft) n++;

  const btmRight
    = n > 2
      || btmEdgeIsMiddle
      || (mBtm === MAX_BTM && mRight === MAX_RIGHT)
      || (bBtm   !== undefined && mRight - bBtm.right < 3)
      || (bRight !== undefined && mBtm   - bRight.btm < 3)
    ? false : random(state) < 0.5;
  if (btmRight) n++;

  const topMiddle = n < 3 && (topEdgeIsMiddle || !(mTop === 0 || topLeft || topRight)) ? random(state) < 0.5 : false;
  if (topMiddle) n++;

  const btmMiddle = n < 3 && (btmEdgeIsMiddle || !(mBtm === MAX_BTM || btmLeft || btmRight)) ? random(state) < 0.5 : false;
  if (btmMiddle) n++;

  const leftMiddle = n < 3 && !(mLeft === 0 || topLeft || btmLeft) ? random(state) < 0.5 : false;
  if (leftMiddle) n++;

  const rightMiddle = n < 3 && !(mRight === MAX_RIGHT || topRight || btmRight) ? random(state) < 0.5 : false;
  if (rightMiddle) n++;

  if (n === 0) return;

  const mW = mRight - mLeft, mH = mBtm - mTop;
  const mHW = Math.floor(mW * 0.5), mHH = Math.floor(mH * 0.5);
  const mwEven = mW % 2 === 0, mhEven = mH % 2 === 0;
  const minMHW = mwEven ? mHW - 1 : mHW, minMHH = mhEven ? mHH - 1 : mHH;

  if (getDebugState() !== DebugState.DEBUG_OFF) chunk.cornerRects = [ ];

  if (topLeft) {
    const rect = addToList(rects);
    rect.top = mTop < 3 ? 0 : Math.floor(random(state) * mTop);
    if (rect.top === 1) rect.top = 0;
    rect.left = mLeft < 3 ? 0 : Math.floor(random(state) * mLeft);
    if (rect.left === 1) rect.left = 0;
    rect.btm   = mTop  + Math.floor(random(state) * (bLeft !== undefined ? bLeft.top - mTop  - 2 : minMHH));
    rect.right = mLeft + Math.floor(random(state) * (bTop  !== undefined ? bTop.left - mLeft - 2 : minMHW));

    if (getDebugState() !== DebugState.DEBUG_OFF && chunk.cornerRects !== undefined)
      chunk.cornerRects.push({ top: rect.top, left: rect.left, btm: rect.btm, right: rect.right });
  }

  if (topRight) {
    const rect = addToList(rects);
    rect.top = mTop < 3 ? 0 : Math.floor(random(state) * mTop);
    if (rect.top === 1) rect.top = 0;
    rect.right = mRight > MAX_RIGHT - 3 ? MAX_RIGHT : MAX_RIGHT - Math.floor(random(state) * (MAX_RIGHT - mRight));
    if (rect.right === MAX_RIGHT - 1) rect.right = MAX_RIGHT;
    rect.btm  = mTop   + Math.floor(random(state) * (bRight !== undefined ? bRight.top - mTop - 2   : minMHH));
    rect.left = mRight - Math.floor(random(state) * (bTop   !== undefined ? mRight - bTop.right - 2 : minMHW));

    if (getDebugState() !== DebugState.DEBUG_OFF && chunk.cornerRects !== undefined)
      chunk.cornerRects.push({ top: rect.top, left: rect.left, btm: rect.btm, right: rect.right });
  }

  if (btmLeft) {
    const rect = addToList(rects);
    rect.btm = mBtm > MAX_BTM - 3 ? MAX_BTM : MAX_BTM - Math.floor(random(state) * (MAX_BTM - mBtm));
    if (rect.btm === MAX_BTM - 1) rect.btm = MAX_BTM;
    rect.left = mLeft < 3 ? 0 : Math.floor(random(state) * mLeft);
    if (rect.left === 1) rect.left = 0;
    rect.top   = mBtm  - Math.floor(random(state) * (bLeft !== undefined ? mBtm - bLeft.btm - 2  : minMHH));
    rect.right = mLeft + Math.floor(random(state) * (bBtm  !== undefined ? bBtm.left - mLeft - 2 : minMHW));

    if (getDebugState() !== DebugState.DEBUG_OFF && chunk.cornerRects !== undefined)
      chunk.cornerRects.push({ top: rect.top, left: rect.left, btm: rect.btm, right: rect.right });
  }

  if (btmRight) {
    const rect = addToList(rects);
    rect.btm = mBtm > MAX_BTM - 3 ? MAX_BTM : MAX_BTM - Math.floor(random(state) * (MAX_BTM - mBtm));
    if (rect.btm === MAX_BTM - 1) rect.btm = MAX_BTM;
    rect.right = mRight > MAX_RIGHT - 3 ? MAX_RIGHT : MAX_RIGHT - Math.floor(random(state) * (MAX_RIGHT - mRight));
    if (rect.right === MAX_RIGHT - 1) rect.right = MAX_RIGHT;
    rect.top  = mBtm   - Math.floor(random(state) * (bRight !== undefined ? mBtm - bRight.btm - 2   : minMHH));
    rect.left = mRight - Math.floor(random(state) * (bBtm   !== undefined ? mRight - bBtm.right - 2 : minMHW));

    if (getDebugState() !== DebugState.DEBUG_OFF && chunk.cornerRects !== undefined)
      chunk.cornerRects.push({ top: rect.top, left: rect.left, btm: rect.btm, right: rect.right });
  }

  if (topMiddle) {
    const rect = addToList(rects);
    rect.top = mTop < 3 ? 0 : Math.floor(random(state) * mTop);
    if (rect.top === 1) rect.top = 0;
    rect.left = mLeft + 2 + Math.floor(random(state) * (minMHW - 1));
    rect.right = mRight - 2 - Math.floor(random(state) * (minMHW - 1));
    rect.btm = mTop > 0 ? mTop - 1 : 0;

    if (getDebugState() !== DebugState.DEBUG_OFF && chunk.cornerRects !== undefined)
      chunk.cornerRects.push({ top: rect.top, left: rect.left, btm: rect.btm, right: rect.right });
  }

  if (btmMiddle) {
    const rect = addToList(rects);
    rect.btm = mBtm > MAX_BTM - 3 ? MAX_BTM : MAX_BTM - Math.floor(random(state) * (MAX_BTM - mBtm));
    if (rect.btm === MAX_BTM - 1) rect.btm = MAX_BTM;
    rect.left = mLeft + 2 + Math.floor(random(state) * (minMHW - 1));
    rect.right = mRight - 2 - Math.floor(random(state) * (minMHW - 1));
    rect.top = mBtm < MAX_BTM ? mBtm + 1 : MAX_BTM;

    if (getDebugState() !== DebugState.DEBUG_OFF && chunk.cornerRects !== undefined)
      chunk.cornerRects.push({ top: rect.top, left: rect.left, btm: rect.btm, right: rect.right });
  }

  if (leftMiddle) {
    const rect = addToList(rects);
    rect.left = mLeft < 3 ? 0 : Math.floor(random(state) * mLeft);
    if (rect.left === 1) rect.left = 0;
    rect.top = mTop + 2 + Math.floor(random(state) * (minMHH - 1));
    rect.btm = mBtm - 2 - Math.floor(random(state) * (minMHH - 1));
    rect.right = mLeft > 0 ? mLeft - 1 : 0;

    if (getDebugState() !== DebugState.DEBUG_OFF && chunk.cornerRects !== undefined)
      chunk.cornerRects.push({ top: rect.top, left: rect.left, btm: rect.btm, right: rect.right });
  }

  if (rightMiddle) {
    const rect = addToList(rects);
    rect.right = mRight > MAX_RIGHT - 3 ? MAX_RIGHT : MAX_RIGHT - Math.floor(random(state) * (MAX_RIGHT - mRight));
    if (rect.right === MAX_RIGHT - 1) rect.right = MAX_RIGHT;
    rect.top = mTop + 2 + Math.floor(random(state) * (minMHH - 1));
    rect.btm = mBtm - 2 - Math.floor(random(state) * (minMHH - 1));
    rect.left = mRight < MAX_RIGHT ? mRight + 1 : MAX_RIGHT;

    if (getDebugState() !== DebugState.DEBUG_OFF && chunk.cornerRects !== undefined)
      chunk.cornerRects.push({ top: rect.top, left: rect.left, btm: rect.btm, right: rect.right });
  }
};

const isInside = (row: number, col: number, { top, left, btm, right }: Rect): boolean => {
  return row >= top && row <= btm && col >= left && col <= right;
};

const generateItems = (state: AleaState, chunk: Chunk): void => {
  const { cRow, cCol, cells } = chunk;
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row = cells[r];
    for (let c = 0; c < CHUNK_COLS; c++) {
      const cell = row[c];
      if (!cell.ground || r === cRow || c === cCol) {
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
