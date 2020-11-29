export const enum ItemType {
  LOGS,
  TREE
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
      row[c] = { ground, item };
    }
  }
  return world;
};
