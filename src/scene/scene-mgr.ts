import { Camera, mkCamera, resizeCamera } from './camera';
import { Viewport } from '../engine';
import { BaseEntity, cleanEntity, updateEntity } from './entity';
import { Feedback, mkFeedback, initFeedback, updateFeedback } from './feedback';
import { Items, mkItems, initItems, updateItems } from './items';
import { initPlayer, mkPlayer, Player, updatePlayer } from './player';
import { initTerrain, mkTerrain, Terrain, updateTerrain } from './terrain';
import { getDeltaTimeSeconds } from '../time-mgr';
import { addToList, clearList, mkArrayList } from '../utils';
import { Chunk, CHUNK_COLS, CHUNK_ROWS, freeChunk, getChunk, WORLD_COLS, WORLD_ROWS } from '../world-mgr';

export interface Scene {
  entities: BaseEntity[];
  terrain : Terrain;
  feedback: Feedback;
  items   : Items;
  player  : Player;
  camera  : Camera;
}

const scene: Scene = {
  entities: [ ],
  terrain : mkTerrain(),
  feedback: mkFeedback(),
  items   : mkItems(),
  player  : mkPlayer(),
  camera  : mkCamera(),
};

export const getScene = (): Scene => scene;

export interface ChunkKey { top: number, left: number }
const mkChunkKey = (): ChunkKey => ({ top: 0, left: 0 });
let previousChunks = mkArrayList(mkChunkKey);
let currentChunks = mkArrayList(mkChunkKey);

// TODO: organise/refactor this
export let worldRow = Math.floor(CHUNK_ROWS / 2), worldCol = Math.floor(CHUNK_COLS / 2);
export let feedbackRow = worldRow, feedbackCol = worldCol;
export let playerRow = worldRow, playerCol = worldCol;

/**
 *
 * @param row terrain relative row (0 is middle of terrain)
 * @param col terrain relative column (0 is middle of terrain)
 */
export const gridClick = (row: number, col: number): void => {
  // console.log(`[gridClick] row=${row}, col=${col}, worldRow=${worldRow}, worldCol=${worldCol}`);
  const { terrain, feedback, items, player } = scene;
  let wRow = worldRow + row, wCol = worldCol + col;
  if (wRow < 0) wRow += WORLD_ROWS; else if (wRow >= WORLD_ROWS) wRow -= WORLD_ROWS;
  if (wCol < 0) wCol += WORLD_COLS; else if (wCol >= WORLD_COLS) wCol -= WORLD_COLS;
  // const top = Math.floor(wRow / CHUNK_ROWS) * CHUNK_ROWS, left = Math.floor(wCol / CHUNK_COLS) * CHUNK_COLS;
  // const chRow = wRow - top, chCol = wCol - left;
  // const { ground, item } = getChunk(top, left).cells[chRow][chCol];
  // if (!ground || item !== ItemType.EMPTY) return;
  worldRow = wRow;
  worldCol = wCol;
  updateTerrain(terrain, worldRow, worldCol);
  updateFeedback(feedback, worldRow, worldCol, feedbackRow = worldRow, feedbackCol = worldCol);
  updateItems(items, worldRow, worldCol);
  updatePlayer(player, worldRow, worldCol, playerRow = worldRow, playerCol = worldCol);
  freeChunks();
};

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
  const { terrain, feedback, items, player } = scene;
  addEntity(initTerrain(terrain));
  addEntity(initFeedback(feedback));
  addEntity(initItems(items));
  addEntity(initPlayer(player));
  updateTerrain(terrain, worldRow, worldCol);
  updateFeedback(feedback, worldRow, worldCol, feedbackRow, feedbackCol);
  updateItems(items, worldRow, worldCol);
  updatePlayer(player, worldRow, worldCol, playerRow, playerCol);
  freeChunks();
};

const initCamera = (): void => addEntity(scene.camera);

export const addEntity = (entity: BaseEntity): void => { scene.entities.push(entity); };

export const getWorldChunk = (top: number, left: number): Chunk => {
  addChunkKey(top, left);
  return getChunk(top, left);
};

const addChunkKey = (top: number, left: number): void => {
  if (findCurrentChunk(top, left)) return;
  const key = addToList(currentChunks);
  key.top = top;
  key.left = left;
};

const freeChunks = (): void => {
  const { numElements: numPrevElems, elements: prevElems } = previousChunks;
  for (let i = 0; i < numPrevElems; i++) {
    const { top, left } = prevElems[i];
    if (!findCurrentChunk(top, left)) freeChunk(getChunk(top, left));
  }
  clearList(previousChunks);
  const tmp = previousChunks;
  previousChunks = currentChunks;
  currentChunks = tmp;
};

const findCurrentChunk = (top: number, left: number): boolean => {
  const { numElements, elements } = currentChunks;
  for (let i = 0; i < numElements; i++) {
    const { top: t, left: l } = elements[i];
    if (t === top && l === left) return true;
  }
  return false;
};
