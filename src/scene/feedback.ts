import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { Entity, mkBaseEntity } from './entity';
import { addCellOffset, TxSpec, TX_SPECS } from './drawable';
import { isPathEmpty } from '../nav-mgr';

export interface Feedback extends Entity<Feedback> {
  gridRow : number; // position
  gridCol : number; // position
  offset  : Vec2;
  txSpec  : TxSpec;
  isTarget: boolean;
}

export const mkFeedback = (): Feedback => {
  const feedback = mkBaseEntity(true) as Feedback;
  feedback.gridRow = 0;
  feedback.gridCol = 0;
  feedback.offset = vec2.zero();
  feedback.txSpec = TX_SPECS.FEEDBACK;
  feedback.isTarget = false;
  return feedback;
};

export const initFeedback = (feedback: Feedback): Feedback => {
  feedback.updatePosition = updatePosition;
  return feedback;
};

const updatePosition = (feedback: Feedback): void => {
  feedback.isTarget = !isPathEmpty();
};

export const updateFeedback = (feedback: Feedback, gridRow: number, gridCol: number): Feedback => {
  feedback.gridRow = gridRow;
  feedback.gridCol = gridCol;
  addCellOffset(vec2.setZero(feedback.position), gridRow, gridCol);
  return feedback;
};
