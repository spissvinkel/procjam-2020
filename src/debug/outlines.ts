import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { addCellOffset, Drawable, grid2world, JoinStyle, mkPathDrawable, PX_SCALE } from '../scene/drawable';
import { addDrawable, Entity, mkBaseEntity } from '../scene/entity';
import { getWorldChunk, getWorldChunkLeft, getWorldChunkTop } from '../grid-mgr';
import { mkMoveable } from '../scene/moveable';
import { getScene } from '../scene/scene-mgr';
import { setHexRGBA } from '../utils';
import { CHUNK_COLS, CHUNK_ROWS, HALF_CHUNK_COLS, HALF_CHUNK_ROWS } from '../world-mgr';

const LINE_WIDTH = 7.0 * PX_SCALE;

const CHUNK_COLOUR  = '#ffff0080';
const MAIN_COLOUR   = '#0044ff80';
const BRIDGE_COLOUR = '#dd00ff80';
const CORNER_COLOUR = '#ff000080';

export type Outlines = Entity<Outlines>;

export const mkOutlines = (): Outlines => {
  const outlines = mkBaseEntity(false) as Outlines;
  return outlines;
};

export const initOutlines = (outlines: Outlines): Outlines => {
  outlines.moveable = mkMoveable(outlines, vec2.zero(), 0.0);
  outlines.updateVelocity = updateVelocity;
  return outlines;
};

const updateVelocity = (outlines: Outlines): void => {
  const { moveable: outlinesMoveable } = outlines;
  const { grid: { moveable: gridMoveable } } = getScene();
  if (outlinesMoveable === undefined || gridMoveable === undefined) return;
  const { velocity: outlinesVelocity } = outlinesMoveable;
  const { velocity: gridVelocity } = gridMoveable;
  vec2.setV(outlinesVelocity, gridVelocity);
};

export const updateOutlines = (outlines: Outlines, worldRow: number, worldCol: number): Outlines => {
  const top = getWorldChunkTop(worldRow);
  const left = getWorldChunkLeft(worldCol);
  const chunk = getWorldChunk(top, left);
  const { mainRect, bridgeRects, cornerRects } = chunk;

  const { drawables } = outlines;
  let d: Drawable;
  let di = 0;

  // Chunk outline
  if (drawables.length === di) d = addOutlinesDrawable(outlines);
  else d = drawables[di];
  updatePathInfo(d, 0, 0, CHUNK_ROWS - 1, CHUNK_COLS - 1, CHUNK_COLOUR);
  const { offset } = d;
  addCellOffset(vec2.setZero(offset), HALF_CHUNK_ROWS + top - worldRow, HALF_CHUNK_COLS + left - worldCol);
  di++;

  // Main rect outline
  if (mainRect !== undefined) {
    const { top: mTop, left: mLeft, btm: mBtm, right: mRight } = mainRect;
    if (drawables.length === di) d = addOutlinesDrawable(outlines);
    else d = drawables[di];
    updatePathInfo(d, mTop, mLeft, mBtm, mRight, MAIN_COLOUR);
    const { offset } = d;
    addCellOffset(vec2.setZero(offset), HALF_CHUNK_ROWS + top - worldRow, HALF_CHUNK_COLS + left - worldCol);
    di++;
  }

  // Bridge rect outlines
  if (bridgeRects !== undefined) {
    for (let i = 0; i < bridgeRects.length; i++) {
      const { top: mTop, left: mLeft, btm: mBtm, right: mRight } = bridgeRects[i];
      if (drawables.length === di) d = addOutlinesDrawable(outlines);
      else d = drawables[di];
      updatePathInfo(d, mTop, mLeft, mBtm, mRight, BRIDGE_COLOUR);
      const { offset } = d;
      addCellOffset(vec2.setZero(offset), HALF_CHUNK_ROWS + top - worldRow, HALF_CHUNK_COLS + left - worldCol);
      di++;
    }
  }

  // Corner rect outlines
  if (cornerRects !== undefined) {
    for (let i = 0; i < cornerRects.length; i++) {
      const { top: mTop, left: mLeft, btm: mBtm, right: mRight } = cornerRects[i];
      if (drawables.length === di) d = addOutlinesDrawable(outlines);
      else d = drawables[di];
      updatePathInfo(d, mTop, mLeft, mBtm, mRight, CORNER_COLOUR);
      const { offset } = d;
      addCellOffset(vec2.setZero(offset), HALF_CHUNK_ROWS + top - worldRow, HALF_CHUNK_COLS + left - worldCol);
      di++;
    }
  }

  while (di < drawables.length) drawables[di++].enabled = false;

  return outlines;
};

const addOutlinesDrawable = (outlines: Outlines): Drawable => {
  const points = [ vec2.zero(), vec2.zero(), vec2.zero(), vec2.zero() ];
  const drawable = addDrawable(outlines, mkPathDrawable(points, false));
  const { pathInfo } = drawable;
  if (pathInfo !== undefined) {
    pathInfo.width = LINE_WIDTH;
    pathInfo.joinStyle = JoinStyle.ROUND;
  }
  return drawable;
};

const updatePathInfo = (
  drawable: Drawable, top: number, left: number, btm: number, right: number, hexColour: string
): void => {
  const { pathInfo } = drawable;
  if (pathInfo !== undefined) {
    const t = HALF_CHUNK_ROWS - top + 0.5, l = left - HALF_CHUNK_COLS - 0.5;
    const b = HALF_CHUNK_ROWS - btm - 0.5, r = right - HALF_CHUNK_COLS + 0.5;
    const { points, colour } = pathInfo;
    mat3.mulV2(grid2world, vec2.set(points[0], l, b), points[0]);
    mat3.mulV2(grid2world, vec2.set(points[1], l, t), points[1]);
    mat3.mulV2(grid2world, vec2.set(points[2], r, t), points[2]);
    mat3.mulV2(grid2world, vec2.set(points[3], r, b), points[3]);
    setHexRGBA(hexColour, colour);
    drawable.enabled = true;
  }
};
