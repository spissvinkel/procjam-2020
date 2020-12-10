import { Camera, mkCamera, resizeCamera } from './camera';
import { DebugState, getDebugState } from '../debug/debug-mgr';
import { Viewport } from '../engine';
import { BaseEntity, cleanEntity, updateEntity } from './entity';
import { Feedback, mkFeedback, initFeedback, updateFeedback } from './feedback';
import { Grid } from './grid';
import { adjustWorldCol, adjustWorldRow, freeWorldChunks, getWorldCell } from './grid-mgr';
import { mkItems, initItems, updateItems } from './items';
import { initOutlines, mkOutlines, updateOutlines } from '../debug/outlines';
import { initPlayer, mkPlayer, Player, updatePlayer } from './player';
import { initTerrain, mkTerrain, updateTerrain } from './terrain';
import { getDeltaTimeSeconds } from '../time-mgr';
import { CHUNK_COLS, CHUNK_ROWS, ItemType } from '../world-mgr';

export interface Scene {
  entities: BaseEntity[];
  terrain : Grid;
  feedback: Feedback;
  items   : Grid;
  player  : Player;
  outlines: BaseEntity;
  camera  : Camera;
}

const scene: Scene = {
  entities: [ ],
  terrain : mkTerrain(),
  feedback: mkFeedback(),
  items   : mkItems(),
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
  const { terrain, feedback, items, player, outlines } = scene;
  addEntity(initTerrain(terrain));
  addEntity(initFeedback(feedback));
  addEntity(initOutlines(outlines));
  addEntity(initItems(items));
  addEntity(initPlayer(player));
  // TODO: refactor this
  updateTerrain(terrain, worldRow, worldCol);
  updateFeedback(feedback, worldRow, worldCol, feedbackRow, feedbackCol);
  updateOutlines(outlines, worldRow, worldCol);
  updateItems(items, worldRow, worldCol);
  updatePlayer(player, worldRow, worldCol, playerRow, playerCol);
  freeWorldChunks();
};

const initCamera = (): void => addEntity(scene.camera);

export const addEntity = (entity: BaseEntity): void => { scene.entities.push(entity); };

// TODO: organise/refactor this
// eslint-disable-next-line prefer-const
export let worldRow = Math.floor(CHUNK_ROWS / 2), worldCol = Math.floor(CHUNK_COLS / 2);
// eslint-disable-next-line prefer-const
export let feedbackRow = worldRow, feedbackCol = worldCol;
// eslint-disable-next-line prefer-const
export let playerRow = worldRow, playerCol = worldCol;

/**
 *
 * @param row terrain relative row (0 is middle of terrain)
 * @param col terrain relative column (0 is middle of terrain)
 */
export const gridClick = (gridRow: number, gridCol: number): void => {
  const { terrain, feedback, items, player, outlines } = getScene();
  const { ground, item } = getWorldCell(worldRow, worldCol, gridRow, gridCol);
  if (!ground || item !== ItemType.EMPTY) return;
  worldRow = adjustWorldRow(worldRow, gridRow);
  worldCol = adjustWorldCol(worldCol, gridCol);
  updateTerrain(terrain, worldRow, worldCol);
  updateFeedback(feedback, worldRow, worldCol, feedbackRow = worldRow, feedbackCol = worldCol);
  if (getDebugState() !== DebugState.DEBUG_OFF) updateOutlines(outlines, worldRow, worldCol);
  updateItems(items, worldRow, worldCol);
  updatePlayer(player, worldRow, worldCol, playerRow = worldRow, playerCol = worldCol);
  freeWorldChunks();
};
