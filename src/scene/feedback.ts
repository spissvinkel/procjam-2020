import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import { Entity, mkBaseEntity } from './entity';
import { addCellOffset, TxSpec, TX_SPECS } from './drawable';

export interface Feedback extends Entity<Feedback> {
  gridRow: number; // position
  gridCol: number; // position
  offset: Vec2;
  txSpec: TxSpec;
}

export const mkFeedback = (): Feedback => {
  const feedback = mkBaseEntity(true) as Feedback;
  feedback.gridRow = 0;
  feedback.gridCol = 0;
  feedback.offset = vec2.zero();
  feedback.txSpec = TX_SPECS.FEEDBACK;
  return feedback;
};

export const initFeedback = (feedback: Feedback): Feedback => {
  return feedback;
};

export const updateFeedback = (
  feedback: Feedback, worldRow: number, worldCol: number, gridRow: number, gridCol: number
): Feedback => {
  feedback.gridRow = gridRow;
  feedback.gridCol = gridCol;
  addCellOffset(vec2.setZero(feedback.position), gridRow - worldRow, gridCol - worldCol);
  return feedback;
};
