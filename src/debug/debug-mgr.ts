import { isPaused, resize } from '../engine';
import { addListener, Input } from '../input-mgr';
import { getPath } from '../nav-mgr';
import { getScene } from '../scene/scene-mgr';
import { getLastSysTime, ONE_SECOND } from '../time-mgr';
import { hideAll, showAll } from '../utils';
import { getChunkPoolSize, getNumChunks } from '../world-mgr';

type Div = HTMLElement | null;

export const enum DebugState {
  DEBUG_OFF,
  DEBUG_BASIC,
}

const DEBUG_STATES = [
  DebugState.DEBUG_OFF,
  DebugState.DEBUG_BASIC,
];

let debugState = 0;

const fps = { last: 0, count: 0, avg: 0, div: null as Div };
const chunks = { chunksDiv: null as Div, poolDiv: null as Div };
const wpos = { wRowDiv: null as Div, wColDiv: null as Div };
const path = { ixDiv: null as Div, lenDiv: null as Div };
const paused = { div: null as Div };

export const getDebugState = (): DebugState => DEBUG_STATES[debugState];

export const update = (): void => {
  const lastSysTime = getLastSysTime();
  if (lastSysTime - fps.last >= ONE_SECOND) {
    fps.avg = fps.count;
    fps.count = -1;
    fps.last = lastSysTime;
  }
  fps.count++;
  if (getDebugState() !== DebugState.DEBUG_OFF) {
    const { grid: { worldRow, worldCol }} = getScene();
    if (fps.div !== null) fps.div.textContent = `${fps.avg}`;
    if (chunks.chunksDiv !== null) chunks.chunksDiv.textContent = `${getNumChunks()}`;
    if (chunks.poolDiv !== null) chunks.poolDiv.textContent = `${getChunkPoolSize()}`;
    if (wpos.wRowDiv !== null) wpos.wRowDiv.textContent = `${worldRow}`;
    if (wpos.wColDiv !== null) wpos.wColDiv.textContent = `${worldCol}`;
    if (path.ixDiv !== null) path.ixDiv.textContent = `${getScene().player.stepIx}`;
    if (path.lenDiv !== null) path.lenDiv.textContent = `${getPath().numElements}`;
    if (paused.div !== null) paused.div.textContent = isPaused() ? 'paused' : '';
  }
};

export const init = (): void => {
  fps.div = document.getElementById('fps');
  chunks.chunksDiv = document.getElementById('chunks');
  chunks.poolDiv = document.getElementById('pool');
  wpos.wRowDiv = document.getElementById('wrow');
  wpos.wColDiv = document.getElementById('wcol');
  path.ixDiv = document.getElementById('stepix');
  path.lenDiv = document.getElementById('pathlen');
  paused.div = document.getElementById('paused');
  addListener(Input.DEBUG, cycleDebug);
  updateHtml();
  getScene().outlines.enabled = (debugState !== DebugState.DEBUG_OFF);
};

const updateHtml = (): void => {
  const debugElements = document.getElementsByClassName('debug');
  if (getDebugState() === DebugState.DEBUG_OFF) hideAll(debugElements);
  else showAll(debugElements);
  resize();
};

const cycleDebug = (): void => {
  debugState = (debugState + 1) % DEBUG_STATES.length;
  updateHtml();
  getScene().outlines.enabled = (debugState !== DebugState.DEBUG_OFF);
};
