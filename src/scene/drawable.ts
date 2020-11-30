import { Vec2, Vec4 } from '@spissvinkel/maths';
import * as Maths from '@spissvinkel/maths/maths';
import * as mat2 from '@spissvinkel/maths/mat2';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';
import * as vec4 from '@spissvinkel/maths/vec4';

export interface Drawable {
  enabled  : boolean;
  size     : Vec2;
  offset   : Vec2; // offset from entity position (for images: offset of top left corner)
  txInfo?  : TxInfo;
  pathInfo?: PathInfo;
}

export interface TxInfo {
  textureId: string;
  image    : HTMLImageElement;
}

export interface PathInfo {
  colour   : Vec4;
  width    : number;
  capStyle : CapStyle;
  joinStyle: JoinStyle;
  points   : Vec2[];
}

export interface TxSpec {
  txId  : string;
  offset: Vec2;
}

export const enum CapStyle  { BUTT = 'butt', ROUND = 'round', SQUARE = 'square' }
export const enum JoinStyle { MITER = 'miter', ROUND = 'round', BEVEL = 'bevel' }

export const PX_SCALE = 1 / 100;

const mkTxSpec = (txId: string, xOffset: number, yOffset: number): TxSpec => {
  const offset = vec2.mul(vec2.of(xOffset, yOffset), PX_SCALE);
  return { txId, offset };
};

export const TX_SPECS = {
  BLOCK     : mkTxSpec('cliff-brown-block-quarter', -75,   54.5),
  TOP_E     : mkTxSpec('cliff-brown-top-e',         -75,   54.5),
  TOP_N     : mkTxSpec('cliff-brown-top-n',         -75,   17.5),
  TOP_S     : mkTxSpec('cliff-brown-top-s',         -35,   53.5),
  TOP_W     : mkTxSpec('cliff-brown-top-w',         -34,   17.5),
  TOP_NE    : mkTxSpec('cliff-brown-corner-top-ne', -75,   17.5),
  TOP_NW    : mkTxSpec('cliff-brown-corner-top-nw', -34,  -35.5),
  TOP_SE    : mkTxSpec('cliff-brown-corner-top-se', -34,   54.0),
  TOP_SW    : mkTxSpec('cliff-brown-corner-top-sw',  40,   17.5),
  TREE_O_D_W: mkTxSpec('tree-oak-dark-w',           -37,  105.5),
  LOGS_S_W  : mkTxSpec('logs-stack-w',              -53,   43.5),
  CH_DIG_NE : mkTxSpec('char-digger-ne',            -22,   75.0),
  CH_DIG_NW : mkTxSpec('char-digger-nw',            -26,   70.5),
  CH_DIG_SE : mkTxSpec('char-digger-se',            -26,   70.5),
  CH_DIG_SW : mkTxSpec('char-digger-sw',            -22,   75.0),
  CH_DIG_E  : mkTxSpec('char-digger-e',             -26,   73.0),
  CH_DIG_N  : mkTxSpec('char-digger-n',             -23,   73.0),
  CH_DIG_S  : mkTxSpec('char-digger-s',             -23,   73.0),
  CH_DIG_W  : mkTxSpec('char-digger-w',             -27,   73.0)
};

export const CELL_X_OFFSET = 73 * PX_SCALE + 0.02;
export const CELL_Z_OFFSET = 52 * PX_SCALE + 0.02;

export const ROW_OFFSET = vec2.of(-CELL_X_OFFSET, -CELL_Z_OFFSET);
export const COL_OFFSET = vec2.of( CELL_X_OFFSET, -CELL_Z_OFFSET);

// TODO: organise/refactor this
const halfDiagonal = Math.SQRT1_2;
const gridScale = vec2.mul(vec2.of(CELL_X_OFFSET, CELL_Z_OFFSET), 1 / halfDiagonal);
const gridRot = mat2.setRot(mat2.id(), Maths.deg2rad(-45));
export const grid2world = mat3.mulM2(mat3.setScaleV(mat3.id(), gridScale), gridRot);
export const world2grid = mat3.invInto(grid2world, mat3.id());

export const mkTxDrawable = (textureId: string, enabled: boolean): Drawable => {
  const image = document.getElementById(`tx-${textureId}`) as HTMLImageElement;
  const { width, height } = image;
  const size = vec2.mul(vec2.of(width, height), PX_SCALE);
  const offset = vec2.zero(); // Image origin is top left
  return { enabled, size, offset, txInfo: { textureId, image } };
};

export const updateTxDrawable = (drawable: Drawable, textureId: string, enabled: boolean): Drawable => {
  const { size, offset, txInfo } = drawable;
  if (txInfo !== undefined) {
    drawable.enabled = enabled;
    txInfo.textureId = textureId;
    const { width, height } = txInfo.image = document.getElementById(`tx-${textureId}`) as HTMLImageElement;
    vec2.mul(vec2.set(size, width, height), PX_SCALE);
    vec2.setZero(offset); // Image origin is top left
  }
  return drawable;
};

export const mkPathDrawable = (points: Vec2[], enabled: boolean): Drawable => {
  const size = vec2.one(); // TODO: maybe calculate from points
  const offset = vec2.zero();
  const colour = vec4.unitW();
  const width = PX_SCALE;
  const capStyle = CapStyle.BUTT;
  const joinStyle = JoinStyle.MITER;
  return { enabled, size, offset, pathInfo: { colour, width, capStyle, joinStyle, points } };
};

export const addCellOffset = (offset: Vec2, row: number, column: number): Vec2 => {
  return vec2.addMul(vec2.addMul(offset, ROW_OFFSET, row), COL_OFFSET, column);
};
