import { Mat3 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';

import { Viewport } from './engine';
import { Drawable } from './scene/drawable';
import { getScene } from './scene/scene-mgr';

let viewportWidth  = 0;
let viewportHeight = 0;

const viewportMx = mat3.id();
const vp         = mat3.id();

export const render = (context: CanvasRenderingContext2D): void => {
  context.clearRect(0, 0, viewportWidth, viewportHeight);
  const { entities, camera } = getScene();
  context.save();
  mat3.mulMInto(viewportMx, camera.vp, vp);
  context.transform(vp.r0c0, vp.r1c0, vp.r0c1, vp.r1c1, vp.r0c2, vp.r1c2);
  for (let i = 0; i < entities.length; i++) {
    const { enabled, drawables, m } = entities[i];
    // eslint-disable-next-line no-debugger
    // debugger;
    if (!enabled || drawables.length === 0) continue;
    context.save();
    renderDrawables(context, drawables, m);
    context.restore();
  }
  context.restore();
};

const renderDrawables = (context: CanvasRenderingContext2D, drawables: Drawable[], m: Mat3): void => {
  context.transform(m.r0c0, m.r1c0, m.r0c1, m.r1c1, m.r0c2, m.r1c2);
  let flipped = false;
  for (let i = 0; i < drawables.length; i++) {
    const { enabled, offset, size, txInfo, pathInfo } = drawables[i];
    if (!enabled) continue;
    if (txInfo !== undefined) {
      if (!flipped) {
        context.scale(1, -1); // flip image
        flipped = true;
      }
      context.drawImage(txInfo.image, offset.x, -offset.y, size.x, size.y);
    } else if (pathInfo !== undefined) {
      if (flipped) {
        context.scale(1, -1); // un-flip
        flipped = false;
      }
      context.save();
      context.translate(offset.x, offset.y);
      const { colour: { x: r, y: g, z: b, w: a }, width, capStyle, joinStyle, points } = pathInfo;
      context.strokeStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      context.lineWidth = width;
      context.lineCap = capStyle;
      context.lineJoin = joinStyle;
      context.beginPath();
      const { x, y } = points[0];
      context.moveTo(x, y);
      for (let j = 1; j < points.length; j++) {
        const { x, y } = points[j];
        context.lineTo(x, y);
      }
      context.closePath();
      context.stroke();
      context.restore();
    }
  }
};

export const resize = (viewport: Viewport): void => {
  const { size: { x: width, y: height } } = viewport;
  viewportWidth = width;
  viewportHeight = height;
  const wBy2 = width / 2, hBy2 = height / 2;
  mat3.set(viewportMx,
           wBy2,  0,     wBy2,
           0,    -hBy2,  hBy2,
           0,     0,     1);
};
