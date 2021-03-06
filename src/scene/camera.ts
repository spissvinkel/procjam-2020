import { Mat3/*, Vec2*/ } from '@spissvinkel/maths';
import * as Maths from '@spissvinkel/maths/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { Entity, mkBaseEntity } from './entity';
import { /*getMouseDelta,*/ getMouseWheel } from '../input-mgr';
// import { getScene } from './scene-mgr';

export interface Camera extends Entity<Camera> {
  projection: Mat3;
  vp        : Mat3;
  invM      : Mat3;
}

const DEFAULT_ZOOM = 16.5; //21.0; // meters
const MIN_ZOOM     = 10.0; // meters
const MAX_ZOOM     = 75.0; // meters

const ZOOM_FACTOR  = 0.2;

let zoom = DEFAULT_ZOOM;

export const mkCamera = (): Camera => {
  const camera = mkBaseEntity(true) as Camera;
  vec2.set(camera.scale, zoom, zoom);
  camera.projection = mat3.id();
  camera.vp = mat3.id();
  camera.invM = mat3.id();
  camera.updatePosition = updatePosition;
  camera.clean = clean;
  return camera;
};

const updatePosition = (camera: Camera) => {
  const zoomDelta = getMouseWheel();
  if (zoomDelta !== 0.0) {
    zoom = Maths.clamp(zoom + zoomDelta * ZOOM_FACTOR * zoom, MIN_ZOOM, MAX_ZOOM);
    vec2.set(camera.scale, zoom, zoom);
    camera.dirty = true;
  }
};

const clean = ({ m, projection, vp, invM }: Camera) => {
  mat3.invInto(m, invM);
  mat3.mulMInto(projection, invM, vp);
};

export const resizeCamera = (camera: Camera, width: number, height: number): void => {
  mat3.set(camera.projection,
           2 / width,  0.0,         0.0,
           0.0,        2 / height,  0.0,
           0.0,        0.0,         1.0);
  camera.dirty = true;
};
