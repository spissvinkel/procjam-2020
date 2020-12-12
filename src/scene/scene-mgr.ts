import { Camera, mkCamera, resizeCamera } from './camera';
import { Viewport } from '../engine';
import { BaseEntity, cleanEntity, updateEntity } from './entity';
import { Feedback, mkFeedback, initFeedback, updateFeedback } from './feedback';
import { Grid, initGrid, mkGrid, updateGridCells } from './grid';
import { freeWorldChunks, getWorldChunk } from '../grid-mgr';
import { findPath, getPath, searchGraph } from '../nav-mgr';
import { initOutlines, mkOutlines, Outlines, updateOutlines } from '../debug/outlines';
import { initPlayer, mkPlayer, Player } from './player';
import { getDeltaTimeSeconds } from '../time-mgr';

export interface Scene {
  entities: BaseEntity[];
  grid    : Grid;
  feedback: Feedback;
  player  : Player;
  outlines: Outlines;
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
  // TODO: refactor this, probably
  const { cRow, cCol } = getWorldChunk(0, 0);
  updateFeedback(feedback, cRow, cCol, 0, 0);
  updateGridCells(grid, cRow, cCol);
  updateOutlines(outlines, cRow, cCol);
  freeWorldChunks();
};

const initCamera = (): void => addEntity(scene.camera);

export const addEntity = (entity: BaseEntity): void => { scene.entities.push(entity); };

// TODO: refactor this
export const gridClick = (gridRow: number, gridCol: number): void => {
  const { grid, feedback, player } = getScene();
  const { worldRow, worldCol } = grid;
  const { gridRow: playerRow, gridCol: playerCol } = player;
  updateFeedback(feedback, worldRow, worldCol, gridRow, gridCol);
  findPath(gridRow, gridCol, playerRow, playerCol);
  console.log(`path length: ${getPath().numElements}`);

  // const { ground, item } = getWorldCell(worldRow, worldCol, gridRow, gridCol);
  // if (!ground || item !== ItemType.EMPTY) return;
  // const newRow = adjustWorldRow(worldRow, gridRow);
  // const newCol = adjustWorldCol(worldCol, gridCol);
  // updateFeedback(feedback, newRow, newCol, 0, 0);
  // updateGridCells(grid, newRow, newCol);
  // if (getDebugState() !== DebugState.DEBUG_OFF) updateOutlines(outlines, newRow, newCol);
  // freeWorldChunks();
};
