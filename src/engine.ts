import { Vec2 } from '@spissvinkel/maths';
import * as vec2 from '@spissvinkel/maths/vec2';

import * as DebugMgr from './debug/debug-mgr';
import * as InputMgr from './input-mgr';
import * as RenderMgr from './render-mgr';
import * as SceneMgr from './scene/scene-mgr';
import * as TimeMgr from './time-mgr';
import { hide, show } from './utils';

export interface Viewport {
  wrapper : HTMLElement;
  canvas  : HTMLCanvasElement;
  context : CanvasRenderingContext2D;
  size    : Vec2;   // in pixels
  aspect  : number; // width : height ratio
  pxSize  : number; // width, height of pixel
  normSize: Vec2;   // smallest dimension is 1.0
  offset  : Vec2;   // in pixels, wrt window
}

interface RunState {
  paused: boolean;
}

type Div = HTMLElement | null;

let viewport: Viewport;
let runState: RunState;

export const isPaused = (): boolean => runState.paused;

const doNextFrame = (timeMillis: number): void => {
  TimeMgr.updateTime(timeMillis);
  InputMgr.update();
  SceneMgr.update();
  DebugMgr.update();
  RenderMgr.render(viewport.context);
  if (!runState.paused) window.requestAnimationFrame(doNextFrame);
};

const pause = (): void => {
  runState.paused = true;
};

const resume = (): void => {
  window.requestAnimationFrame(resumeCallback);
};

const resumeCallback = (timeMillis: number): void => {
  TimeMgr.updateTime(timeMillis);
  runState.paused = false;
  window.requestAnimationFrame(doNextFrame);
};

const togglePaused = (): void => {
  if (runState.paused) resume();
  else if (DebugMgr.getDebugState() !== DebugMgr.DebugState.DEBUG_OFF) pause();
};

const init = (): void => {
  initViewport();
  initRunState();
  resize();
  SceneMgr.init();
  InputMgr.init();
  DebugMgr.init();
};

const initViewport = (): void => {
  const wrapper = document.getElementById('wrapper') as HTMLElement;
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const context = canvas.getContext('2d');
  if (context === null) throw '2d context unavailable';
  viewport = {
    wrapper,
    canvas,
    context,
    size    : vec2.zero(),
    aspect  : 1.0,
    pxSize  : 1.0,
    normSize: vec2.one(),
    offset  : vec2.zero()
  };
};

const initRunState = (): void => {
  runState = { paused: true };
};

export const resize = (): void => {
  resizeViewport();
  SceneMgr.resize(viewport);
  RenderMgr.resize(viewport);
  InputMgr.resize(viewport);
};

const resizeViewport = (): void => {
  const { wrapper, canvas, size, normSize, offset } = viewport;
  const { clientWidth: width, clientHeight: height, offsetLeft, offsetTop } = wrapper;
  const aspect = width / height;
  const normWidth = aspect <= 1 ? 1.0 : aspect;
  const normHeight = aspect >= 1 ? 1.0 : 1 / aspect;
  vec2.set(size, width, height);
  viewport.aspect = aspect;
  viewport.pxSize = width < height ? 1 / width : 1 / height;
  vec2.set(normSize, normWidth, normHeight);
  vec2.set(offset, offsetLeft, offsetTop);
  let parent: Div = wrapper;
  while ((parent = parent.offsetParent as Div) !== null) {
    const { offsetLeft, offsetTop } = parent;
    offset.x += offsetLeft;
    offset.y += offsetTop;
  }
  canvas.width = width;
  canvas.height = height;
};

export const run = (): void => {
  init();
  window.addEventListener('resize', resize);
  const inputLayer = document.getElementById('input-layer') as HTMLElement;
  const continueHandler = () => {
    inputLayer.removeEventListener('click', continueHandler);
    const loadingUI = document.getElementById('loading-ui') as HTMLElement;
    const gameUI = document.getElementById('game-ui') as HTMLElement;
    hide(loadingUI);
    show(gameUI);
    togglePaused();
    InputMgr.addListener(InputMgr.Input.PAUSE, togglePaused);
  };
  inputLayer.addEventListener('click', continueHandler);
  const statusElem = document.getElementById('loading-status') as HTMLElement;
  statusElem.textContent = 'Click to continue';
};
