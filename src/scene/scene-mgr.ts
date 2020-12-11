import { Camera, mkCamera, resizeCamera } from './camera';
import { DebugState, getDebugState } from '../debug/debug-mgr';
import { Viewport } from '../engine';
import { BaseEntity, cleanEntity, updateEntity } from './entity';
import { Feedback, mkFeedback, initFeedback, updateFeedback } from './feedback';
import { Grid, initGrid, mkGrid, updateGridCells } from './grid';
import { adjustWorldCol, adjustWorldRow, freeWorldChunks, getWorldCell } from '../grid-mgr';
import { initOutlines, mkOutlines, updateOutlines } from '../debug/outlines';
import { initPlayer, mkPlayer, Player } from './player';
import { getDeltaTimeSeconds } from '../time-mgr';
import { CHUNK_COLS, CHUNK_ROWS, ItemType } from '../world-mgr';

export interface Scene {
  entities: BaseEntity[];
  grid    : Grid;
  feedback: Feedback;
  player  : Player;
  outlines: BaseEntity;
  camera  : Camera;
}

const scene: Scene = {
  entities: [ ],
  grid    : mkGrid(),
  feedback: mkFeedback(),
  player  : mkPlayer(),
  outlines: mkOutlines(),
  camera  : mkCamera(),
};

export const getScene = (): Scene => scene;

export const update = (): void => {
  const { entities } = scene;
  const deltaTimeSeconds = getDeltaTimeSeconds();
  updateEntities(entities, deltaTimeSeconds);
  updateMatrices(entities);
};

const updateEntities = (entities: BaseEntity[], deltaTimeSeconds: number): void => {
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (entity.enabled) updateEntity(entity, deltaTimeSeconds);
  }
};

const updateMatrices = (entities: BaseEntity[]): void => {
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (entity.enabled && entity.dirty) cleanEntity(entity);
  }
};

export const resize = (viewport: Viewport): void => {
  const { normSize: { x: normWidth, y: normHeight } } = viewport;
  resizeCamera(scene.camera, normWidth, normHeight);
};

export const init = (): void => {
  initEntities();
  initCamera();
};

const initEntities = (): void => {
  const { grid, feedback, player, outlines } = scene;
  addEntity(initFeedback(feedback));
  addEntity(initPlayer(player));
  addEntity(initGrid(grid));
  addEntity(initOutlines(outlines));
  // TODO: refactor this
  updateFeedback(feedback, worldRow, worldCol, feedbackRow, feedbackCol);
  updateGridCells(grid, worldRow, worldCol);
  updateOutlines(outlines, worldRow, worldCol);
  freeWorldChunks();
};

const initCamera = (): void => addEntity(scene.camera);

export const addEntity = (entity: BaseEntity): void => { scene.entities.push(entity); };

// TODO: organise/refactor this
// eslint-disable-next-line prefer-const
export let worldRow = Math.floor(CHUNK_ROWS / 2), worldCol = Math.floor(CHUNK_COLS / 2);
// eslint-disable-next-line prefer-const
export let feedbackRow = 0, feedbackCol = 0;

/**
 *
 * @param row terrain relative row (0 is middle of terrain)
 * @param col terrain relative column (0 is middle of terrain)
 */
export const gridClick = (gridRow: number, gridCol: number): void => {
  const { grid, feedback, outlines } = getScene();
  const { ground, item } = getWorldCell(worldRow, worldCol, gridRow, gridCol);
  if (!ground || item !== ItemType.EMPTY) return;
  worldRow = adjustWorldRow(worldRow, gridRow);
  worldCol = adjustWorldCol(worldCol, gridCol);
  updateFeedback(feedback, worldRow, worldCol, feedbackRow = 0, feedbackCol = 0);
  updateGridCells(grid, worldRow, worldCol);
  if (getDebugState() !== DebugState.DEBUG_OFF) updateOutlines(outlines, worldRow, worldCol);
  freeWorldChunks();
};
