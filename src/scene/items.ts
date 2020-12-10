import { mkTxDrawable, TX_SPECS, TxSpec, updateTxDrawable } from './drawable';
import { addDrawable } from './entity';
import { forEachGridCell, Grid, mkGrid, setGridCellOffset } from './grid';
import { getWorldCell } from './grid-mgr';
import { ItemType } from '../world-mgr';

export const mkItems = (): Grid => {
  const items = mkGrid();
  return items;
};

export const initItems = (items: Grid): Grid => {
  const { TREE_O_D_W } = TX_SPECS;
  const { txId } = TREE_O_D_W;
  forEachGridCell((r, c) =>
    setGridCellOffset(addDrawable(items, mkTxDrawable(txId, false)), items, TREE_O_D_W, r, c)
  );
  return items;
};

export const updateItems = (items: Grid, worldRow: number, worldCol: number): Grid => {
  const {
    TREE_O_D_W, LOGS_S_W
  } = TX_SPECS;
  const { drawables } = items;
  items.worldRow = worldRow;
  items.worldCol = worldCol;
  let di = -1;
  forEachGridCell((gridRow, gridCol) => {
    const d = drawables[++di];
    d.enabled = false;
    let txSpec: TxSpec | undefined = undefined;
    const { ground, item } = getWorldCell(worldRow, worldCol, gridRow, gridCol);
    if (ground) {
      if (item === ItemType.TREE) txSpec = TREE_O_D_W;
      else if (item === ItemType.LOGS) txSpec = LOGS_S_W;
    }
    if (txSpec !== undefined && d.txInfo !== undefined) {
      const { txId } = txSpec;
      if (d.txInfo.textureId === txId) d.enabled = true;
      else setGridCellOffset(updateTxDrawable(d, txId, true), items, txSpec, gridRow, gridCol);
    }
  });
  return items;
};
