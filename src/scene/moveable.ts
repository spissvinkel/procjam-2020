import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { BaseEntity } from './entity';

export interface Moveable {
  entity  : BaseEntity;
  velocity: Vec2;
  angular : number;
}

export const mkMoveable = (entity: BaseEntity, velocity: Vec2, angular: number): Moveable => {
  return { entity, velocity, angular };
};

export const updateMoveable = (moveable: Moveable, deltaTimeSeconds: number): void => {
  const { entity, velocity, angular } = moveable;
  const { position } = entity;
  vec2.addMul(position, velocity, deltaTimeSeconds);
  entity.orientation += angular * deltaTimeSeconds;
  entity.dirty = true;
};
