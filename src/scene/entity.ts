import { Mat2, Mat3, Vec2 } from '@spissvinkel/maths';
import * as mat2 from '@spissvinkel/maths/mat2';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { Drawable } from './drawable';
import { Moveable, updateMoveable } from './moveable';

export interface BaseEntity {
  enabled    : boolean;
  position   : Vec2;
  scale      : Vec2;
  orientation: number;
  radius     : number;
  dirty      : boolean;
  m          : Mat3;
  rotM2      : Mat2;
  drawables  : Drawable[];
  moveable?  : Moveable;
}

export const mkBaseEntity = (enabled: boolean): BaseEntity => ({
  enabled,
  position   : vec2.zero(),
  scale      : vec2.one(),
  orientation: 0.0,
  radius     : 0.5,
  dirty      : true,
  m          : mat3.id(),
  rotM2      : mat2.id(),
  drawables  : [ ]
});

export const addDrawable = (entity: BaseEntity, drawable: Drawable): Drawable => {
  entity.drawables.push(drawable);
  return drawable;
};

export interface Entity<E extends Entity<E>> extends BaseEntity {
  updateVelocity?: (entity: E, deltaTimeSeconds: number) => void;
  updatePosition?: (entity: E, deltaTimeSeconds: number) => void;
  clean?         : (entity: E) => void;
}

export type EntityUpdateFn = <E extends Entity<E>>(entity: E, deltaTimeSeconds: number) => void;
export type EntityCleanFn  = <E extends Entity<E>>(entity: E) => void;

export const updateEntity: EntityUpdateFn = (entity, deltaTimeSeconds) => {
  const { moveable, updateVelocity, updatePosition } = entity;
  if (updateVelocity !== undefined) updateVelocity(entity, deltaTimeSeconds);
  if (moveable !== undefined) updateMoveable(moveable, deltaTimeSeconds);
  if (updatePosition !== undefined) updatePosition(entity, deltaTimeSeconds);
};

export const cleanEntity: EntityCleanFn = entity => {
  const { position, scale, orientation, dirty, m, rotM2, clean } = entity;
  if (dirty) {
    mat3.mulM2(mat3.setScaleTrsl(m, scale, position), mat2.setRot(rotM2, orientation));
    if (clean !== undefined) clean(entity);
    entity.dirty = false;
  }
};
