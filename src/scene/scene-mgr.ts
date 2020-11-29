import { Camera, mkCamera, resizeCamera } from './camera';
import { Viewport } from '../engine';
import { BaseEntity, cleanEntity, updateEntity } from './entity';
import { Feedback, mkFeedback, initFeedback, updateFeedback } from './feedback';
import { ItemsChunk, mkItemsChunk, initItemsChunk, updateItemsChunk } from './items';
import { initTerrain, mkTerrain, Terrain, updateTerrain } from './terrain';
import { getDeltaTimeSeconds } from '../time-mgr';
import { initWorld, mkWorld, World, WORLD_COLS, WORLD_ROWS } from '../world-mgr';

export interface Scene {
  entities: BaseEntity[];
  terrain : Terrain;
  feedback: Feedback;
  items   : ItemsChunk;
  camera  : Camera;
  world   : World;
}

const scene: Scene = {
  entities: [ ],
  terrain : mkTerrain(),
  feedback: mkFeedback(),
  items   : mkItemsChunk(),
  camera  : mkCamera(),
  world   : mkWorld()
};

const score = 0;

export const getScene = (): Scene => scene;
export const getScore = (): number => score;

// TODO: organise/refactor this
export const worldRow = Math.floor(WORLD_ROWS / 2), worldCol = Math.floor(WORLD_COLS / 2);
export const feedbackRow = 2, feedbackCol = 8;

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
  initWorld(scene.world);
  initEntities();
  initCamera();
};

const initEntities = (): void => {
  const { terrain, feedback, items, world } = scene;
  addEntity(initTerrain(terrain));
  addEntity(initFeedback(feedback));
  addEntity(initItemsChunk(items));
  updateTerrain(terrain, world, worldRow, worldCol);
  updateFeedback(feedback, worldRow, worldCol, feedbackRow, feedbackCol);
  updateItemsChunk(items, world, worldRow, worldCol);
};

const initCamera = (): void => addEntity(scene.camera);

export const addEntity = (entity: BaseEntity): void => { scene.entities.push(entity); };
