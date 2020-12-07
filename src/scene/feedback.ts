import * as vec2 from '@spissvinkel/maths/vec2';
import * as vec4 from '@spissvinkel/maths/vec4';

import { Entity, mkBaseEntity, addDrawable } from './entity';
import { addCellOffset, mkPathDrawable, PX_SCALE, JoinStyle } from './drawable';

export interface Feedback extends Entity<Feedback> {
  worldRow: number; // centre
  worldCol: number; // centre
  row     : number; // position
  col     : number; // position
}

const HALF_WIDTH  = 67.0 * PX_SCALE;
const HALF_HEIGHT = 46.5 * PX_SCALE;
const Y_OFFSET    =  0.5 * PX_SCALE;
const LINE_WIDTH  =  7.0 * PX_SCALE;

export const mkFeedback = (): Feedback => {
  const feedback = mkBaseEntity(true) as Feedback;
  feedback.worldRow = 0;
  feedback.worldCol = 0;
  feedback.row = 0;
  feedback.col = 0;
  const points = [ vec2.of(-HALF_WIDTH, 0), vec2.of(0, -HALF_HEIGHT), vec2.of(HALF_WIDTH, 0), vec2.of(0, HALF_HEIGHT) ];
  const { offset, pathInfo } = addDrawable(feedback, mkPathDrawable(points, true));
  offset.y += Y_OFFSET;
  if (pathInfo !== undefined) {
    vec4.set(pathInfo.colour, 1.0, 1.0, 1.0, 0.75);
    pathInfo.width = LINE_WIDTH;
    pathInfo.joinStyle = JoinStyle.ROUND;
  }
  return feedback;
};

export const initFeedback = (feedback: Feedback): Feedback => {
  return feedback;
};

export const updateFeedback = (feedback: Feedback, worldRow: number, worldCol: number, row: number, col: number): Feedback => {
  feedback.worldRow = worldRow;
  feedback.worldCol = worldCol;
  feedback.row = row;
  feedback.col = col;
  addCellOffset(vec2.setZero(feedback.position), row - worldRow, col - worldCol);
  feedback.dirty = true;
  return feedback;
};
