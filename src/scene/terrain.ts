import { mkTxDrawable, TX_SPECS, TxSpec, updateTxDrawable } from './drawable';
import { addDrawable } from './entity';
import { forEachGridCell, Grid, mkGrid, setGridCellOffset } from './grid';
import { getWorldCell } from './grid-mgr';

export const mkTerrain = (): Grid => {
  const terrain = mkGrid();
  return terrain;
};

export const initTerrain = (terrain: Grid): Grid => {
  const { BLOCK } = TX_SPECS;
  const { txId } = BLOCK;
  forEachGridCell((r, c) =>
    setGridCellOffset(addDrawable(terrain, mkTxDrawable(txId, false)), terrain, BLOCK, r, c)
  );
  return terrain;
};

export const updateTerrain = (terrain: Grid, wr: number, wc: number): Grid => {
  const {
    BLOCK, BLOCK_DARK,
    TOP_SIDE_N, TOP_SIDE_E, TOP_SIDE_S, TOP_SIDE_W,
    TOP_OUT_NW, TOP_OUT_NE, TOP_OUT_SW, TOP_OUT_SE,
    TOP_IN_NW, TOP_IN_NE, TOP_IN_SW, TOP_IN_SE
  } = TX_SPECS;
  const { drawables } = terrain;
  terrain.worldRow = wr;
  terrain.worldCol = wc;
  let di = -1;
  forEachGridCell((gr, gc) => {
    const d = drawables[++di];
    d.enabled = false;
    let txSpec: TxSpec | undefined = undefined;
    const cell = getWorldCell(wr, wc, gr, gc);
    if (cell.ground) txSpec = cell.even ? BLOCK_DARK : BLOCK;
    else {
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
    }
    if (txSpec !== undefined && d.txInfo !== undefined) {
      const { txId } = txSpec;
      if (d.txInfo.textureId === txId) d.enabled = true;
      else setGridCellOffset(updateTxDrawable(d, txId, true), terrain, txSpec, gr, gc);
    }
  });
  return terrain;
};
