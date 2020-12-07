import { AleaState, emptyState, initState, random } from '@spissvinkel/alea';

import { addToList, mkArrayList } from './utils';

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

const PRNG_SEED = '0';

export interface Chunk {
  top  : number;
  left : number;
  cells: Cell[][];
  state: AleaState;
}

export interface Cell {
  ground: boolean;
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
  const state = emptyState();
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row: Cell[] = cells[r] = [ ];
    for (let c = 0; c < CHUNK_COLS; c++) {
      row[c] = { ground: false, item: ItemType.EMPTY };
    }
  }
  return { top, left, cells, state };
};

const chunks = mkArrayList(mkChunk);

const generateChunk = (top: number, left: number, chunk: Chunk): Chunk => {
  const { cells, state } = chunk;
  const seed = `${top}:${left}:${PRNG_SEED}`;
  initState(seed, state);
  chunk.top = top;
  chunk.left = left;
  for (let r = 0; r < CHUNK_ROWS; r++) {
    const row = cells[r];
    for (let c = 0; c < CHUNK_COLS; c++) {
      const cell = row[c];
      if (r === 0 || r === CHUNK_ROWS - 1 || c === 0 || c === CHUNK_COLS - 1) {
        cell.ground = false;
        cell.item = ItemType.EMPTY;
      } else {
        cell.ground = true;
        if (r === HALF_ROWS && c === HALF_COLS) cell.item = ItemType.EMPTY;
        else {
          const n = random(state);
          if (n < 0.01) cell.item = ItemType.LOGS;
          else if (n < 0.04) cell.item = ItemType.TREE;
          else cell.item = ItemType.EMPTY;
        }
      }
    }
  }
  return chunk;
};

export const getChunkByTopLeft = (top: number, left: number): Chunk => {
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
