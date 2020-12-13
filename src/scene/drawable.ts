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
  txSpec: TxSpec;
  image : HTMLImageElement;
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
  isItem: boolean;
}

export const enum CapStyle  { BUTT = 'butt', ROUND = 'round', SQUARE = 'square' }
export const enum JoinStyle { MITER = 'miter', ROUND = 'round', BEVEL = 'bevel' }

export const PX_SCALE = 1 / 100;

const mkTxSpec = (txId: string, xOffset: number, yOffset: number, isItem: boolean): TxSpec => {
  const offset = vec2.mul(vec2.of(xOffset, yOffset), PX_SCALE);
  return { txId, offset, isItem };
};

export const TX_SPECS = {
  FEEDBACK    : mkTxSpec('feedback',                     -75,   54.5, false),

  BLOCK       : mkTxSpec('cliff-brown-block-quarter',    -75,   54.5, false),
  BLOCK_DARK  : mkTxSpec('cliff-brown-block-quart-dark', -75,   54.5, false),

  TOP_SIDE_E  : mkTxSpec('cliff-brown-top-e',            -75,   54.5, false),
  TOP_SIDE_N  : mkTxSpec('cliff-brown-top-n',            -75,   17.5, false),
  TOP_SIDE_S  : mkTxSpec('cliff-brown-top-s',            -35,   53.5, false),
  TOP_SIDE_W  : mkTxSpec('cliff-brown-top-w',            -34,   17.5, false),

  TOP_OUT_NE  : mkTxSpec('cliff-brown-corner-top-ne',    -75,   17.5, false),
  TOP_OUT_NW  : mkTxSpec('cliff-brown-corner-top-nw',    -34,  -35.5, false),
  TOP_OUT_SE  : mkTxSpec('cliff-brown-corner-top-se',    -34,   54.0, false),
  TOP_OUT_SW  : mkTxSpec('cliff-brown-corner-top-sw',     40,   17.5, false),

  TOP_IN_NE   : mkTxSpec('cliff-brown-inner-top-ne',     -75,   54.0, false),
  TOP_IN_NW   : mkTxSpec('cliff-brown-inner-top-nw',     -75,   17.5, false),
  TOP_IN_SE   : mkTxSpec('cliff-brown-inner-top-se',     -75,   54.0, false),
  TOP_IN_SW   : mkTxSpec('cliff-brown-inner-top-sw',     -34,   54.0, false),

  TREE_O_D_W  : mkTxSpec('tree-oak-dark-w',              -37,  105.5, true),
  TREE_O_F_S  : mkTxSpec('tree-oak-fall-s',              -39,  105.0, true),
  TREE_T_D_S  : mkTxSpec('tree-thin-dark-s',             -34,  121.0, true),
  TREE_T_F_W  : mkTxSpec('tree-thin-fall-w',             -35,  120.0, true),
  PLANT_B_D_E : mkTxSpec('plant-bush-detailed-e',        -28,   34.0, true),
  PLANT_B_N   : mkTxSpec('plant-bush-n',                 -22,   29.0, true),
  GRASS_D_W   : mkTxSpec('grass-dense-w',                -31,   30.0, true),
  GRASS_E     : mkTxSpec('grass-e',                      -26,   21.0, true),
  SHROOM_R_G_S: mkTxSpec('mushroom-red-group-s',         -21,   24.0, true),
  SHROOM_B_G_E: mkTxSpec('mushroom-brown-group-e',       -20,   22.0, true),
  LOGS_S_W    : mkTxSpec('logs-stack-w',                 -53,   43.5, true),
  LOG_L_E     : mkTxSpec('log-large-e',                  -47,   37.0, true),
  ROCK_T_2_N  : mkTxSpec('rock-tall-2-n',                -56,   76.0, true),
  ROCK_S_T_2_N: mkTxSpec('rock-small-top-2-w',           -41,   25.0, true),
  TENT_S_O_S  : mkTxSpec('tent-small-open-s',            -63,   53.0, true),

  CH_DIG_NE   : mkTxSpec('char-digger-ne',               -22,   75.0, true),
  CH_DIG_NW   : mkTxSpec('char-digger-nw',               -26,   70.5, true),
  CH_DIG_SE   : mkTxSpec('char-digger-se',               -26,   70.5, true),
  CH_DIG_SW   : mkTxSpec('char-digger-sw',               -22,   75.0, true),
  CH_DIG_E    : mkTxSpec('char-digger-e',                -26,   73.0, true),
  CH_DIG_N    : mkTxSpec('char-digger-n',                -23,   73.0, true),
  CH_DIG_S    : mkTxSpec('char-digger-s',                -23,   73.0, true),
  CH_DIG_W    : mkTxSpec('char-digger-w',                -27,   73.0, true)
};

export const CELL_X_OFFSET = 73 * PX_SCALE; // + 0.02;
export const CELL_Z_OFFSET = 52 * PX_SCALE; // + 0.02;

export const ROW_OFFSET = vec2.of(-CELL_X_OFFSET, -CELL_Z_OFFSET);
export const COL_OFFSET = vec2.of( CELL_X_OFFSET, -CELL_Z_OFFSET);

// TODO: organise/refactor this
const halfDiagonal = Math.SQRT1_2;
const gridScale = vec2.mul(vec2.of(CELL_X_OFFSET, CELL_Z_OFFSET), 1 / halfDiagonal);
const gridRot = mat2.setRot(mat2.id(), Maths.deg2rad(-45));
export const grid2world = mat3.mulM2(mat3.setScaleV(mat3.id(), gridScale), gridRot);
export const world2grid = mat3.invInto(grid2world, mat3.id());

export const mkTxDrawable = (txSpec: TxSpec, enabled: boolean): Drawable => {
  const { txId } = txSpec;
  const image = document.getElementById(`tx-${txId}`) as HTMLImageElement;
  const { width, height } = image;
  const size = vec2.mul(vec2.of(width, height), PX_SCALE);
  const offset = vec2.zero(); // Image origin is top left
  return { enabled, size, offset, txInfo: { txSpec, image } };
};

export const updateTxDrawable = (drawable: Drawable, txSpec: TxSpec, enabled: boolean): Drawable => {
  const { size, offset, txInfo } = drawable;
  if (txInfo !== undefined) {
    drawable.enabled = enabled;
    const { txId } = txInfo.txSpec = txSpec;
    const { width, height } = txInfo.image = document.getElementById(`tx-${txId}`) as HTMLImageElement;
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
