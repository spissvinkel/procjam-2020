export const enum ItemType {
  LOGS,
  TREE,
  PLAYER_NE,
  PLAYER_NW,
  PLAYER_SE,
  PLAYER_SW,
  PLAYER_E,
  PLAYER_N,
  PLAYER_S,
  PLAYER_W
}

export interface World {
  cells: Cell[][];
}

export interface Cell {
  ground: number;
  item  : ItemType | null;
}

export const WORLD_ROWS = 11;
export const WORLD_COLS = 11;

export const mkWorld = (): World => {
  const cells: Cell[][] = [ ];
  return { cells };
};

export const initWorld = (world: World): World => {
  const { cells } = world;
  const ground = 0;
  for (let r = 0; r < WORLD_ROWS; r++) {
    const row: Cell[] = cells[r] = [ ];
    for (let c = 0; c < WORLD_COLS; c++) {
      if (r === 5 && c === 5) continue;
      let item: ItemType | null = null;
      if (r === 3 && c === 2) item = ItemType.TREE;
      else if (r === 2 && c === 8) item = ItemType.LOGS;
      else if (r === 10 && c === 1) item = ItemType.PLAYER_NE;
      else if (r === 9 && c === 2) item = ItemType.PLAYER_NW;
      else if (r === 8 && c === 3) item = ItemType.PLAYER_SE;
      else if (r === 7 && c === 4) item = ItemType.PLAYER_SW;
      else if (r === 6 && c === 5) item = ItemType.PLAYER_E;
      else if (r === 5 && c === 6) item = ItemType.PLAYER_N;
      else if (r === 4 && c === 7) item = ItemType.PLAYER_S;
      else if (r === 3 && c === 8) item = ItemType.PLAYER_W;
      row[c] = { ground, item };
    }
  }
  return world;
};
