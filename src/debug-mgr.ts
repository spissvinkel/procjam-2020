import { isPaused, resize } from './engine';
import { addListener, Input } from './input-mgr';
import { getLastSysTime, ONE_SECOND } from './time-mgr';
import { hideAll, showAll } from './utils';

type Div = HTMLElement | null;

export const enum DebugState {
  DEBUG_OFF,
  DEBUG_BASIC,
}

const DEBUG_STATES = [
  DebugState.DEBUG_OFF,
  DebugState.DEBUG_BASIC,
];

let debugState = 1;

const fps = { last: 0, count: 0, avg: 0, div: null as Div };
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
    if (fps.div !== null) fps.div.textContent = `${fps.avg}`;
    if (paused.div !== null) paused.div.textContent = isPaused() ? 'paused' : '';
  }
};

export const init = (): void => {
  fps.div = document.getElementById('fps');
  paused.div = document.getElementById('paused');
  addListener(Input.DEBUG, cycleDebug);
  updateHtml();
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
};
