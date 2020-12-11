import { Vec2 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';

import { world2grid } from './scene/drawable';
import { Viewport } from './engine';
import { getScene, gridClick } from './scene/scene-mgr';

export const enum Input {
  DEBUG = '|',
  PAUSE = 'tab',

  P1_UP    = 'w',
  P1_LEFT  = 'a',
  P1_DOWN  = 's',
  P1_RIGHT = 'd',
  P1_DEBUG = 'space',
}

export type Callback = () => void

export const touchInput   = false; // window.ontouchstart !== undefined;
export const gamepadInput = navigator.getGamepads !== undefined;

export const addListener = (key: Input, callback: Callback): void => {
  let listeners = listenersByKey[key];
  if (listeners === undefined) listeners = listenersByKey[key] = [ ];
  listeners.push(callback);
};

export const removeListener = (key: Input, callback: Callback): void => {
  const listeners = listenersByKey[key];
  if (listeners !== undefined) {
    const i = listeners.findIndex(cb => cb === callback);
    if (i > -1) listeners.splice(i, 1);
    if (listeners.length === 0) delete listenersByKey[key];
  }
};

export const addPolledKeys = (...keys: Input[]): void => {
  keys.forEach(key => { if (!(key in polledKeys)) polledKeys[key] = false; });
};

export const poll = (key: Input): boolean => key in polledKeys ? polledKeys[key] : false;

export const update = (): void => {
  if (!touchInput) updateMouseInput();
  if (gamepadInput) pollGamepad();
};

export const resize = (viewport: Viewport): void => {
  if (touchInput) resizeTouchInput();
  else resizeMouseInput(viewport);
};

export const init = (): void => {
  initKbdInput();
  if (touchInput) initTouchInput();
  else initMouseInput();
  if (gamepadInput) initGamepadInput();
};


// ---------------------------------------------------------------------------------------------------------------------

const listenersByKey: { [ key: string ]: Callback[]; } = { };

const polledKeys: { [ key: string ]: boolean; } = { };

const keyDown = (event: Event | null, key: string | null): void => {
  if (key === null) return;
  if (key in polledKeys) polledKeys[key] = true;
  if (key in listenersByKey) {
    const listeners = listenersByKey[key], n = listeners.length;
    for (let i = 0; i < n; i++) listeners[i]();
    if (event !== null) {
      event.stopPropagation();
      event.preventDefault();
    }
  }
};

const keyUp = (event: Event | null, key: string | null): void => {
  if (key !== null && key in polledKeys) polledKeys[key] = false;
};


// ----- Keys ----------------------------------------------------------------------------------------------------------

const KEY_ALIASES: { [ alias: string ]: string; } = {
  'escape'    : 'esc',
  'delete'    : 'del',
  'return'    : 'enter',
  'control'   : 'ctrl',
  'spacebar'  : 'space',
  ' '         : 'space',
  'insert'    : 'ins',
  'arrowleft' : 'left',
  'arrowright': 'right',
  'arrowup'   : 'up',
  'arrowdown' : 'down'
};

const KEY_CODES: { [ code: number ]: string; } = {
  8 : 'Backspace', 9 : 'Tab', 13: 'Enter', 16: 'Shift',  17: 'Ctrl',     18: 'Alt', 19: 'Pause',
  20: 'CapsLock',  27: 'Esc', 32: 'Space', 33: 'PageUp', 34: 'PageDown', 35: 'End', 36: 'Home',
  37: 'Left',      38: 'Up',  39: 'Right', 40: 'Down',   45: 'Ins',      46: 'Del',

  48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9',

  65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J',
  75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T',
  85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',

  220: '|',

  112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4',  116: 'F5',  117: 'F6',
  118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12'
};

type KbdEvent = KeyboardEvent & { keyIdentifier?: string }

const getKey = (event: KbdEvent): string | null => {
  let modifiers = '', key = null as string | null;
  if (event.key !== undefined) key = event.key;
  else if (event.keyIdentifier !== undefined && event.keyIdentifier.substring(0, 2) !== 'U+') key = event.keyIdentifier;
  else if (event.keyCode in KEY_CODES) key = KEY_CODES[event.keyCode];
  if (key === null) return null;
  key = key.toLowerCase();
  if (key in KEY_ALIASES) key = KEY_ALIASES[key];
  if (event.altKey   && key !== 'alt')   modifiers += 'alt-';
  if (event.ctrlKey  && key !== 'ctrl')  modifiers += 'ctrl-';
  if (event.metaKey  && key !== 'meta')  modifiers += 'meta-';
  if (event.shiftKey && key !== 'shift') modifiers += 'shift-';
  return modifiers + key;
};

const onKeyDown = (event: KbdEvent): void => keyDown(event, getKey(event));
const onKeyUp   = (event: KbdEvent): void => keyUp(event, getKey(event));

const initKbdInput = (): void => {
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
};


// ----- Mouse ---------------------------------------------------------------------------------------------------------

const viewportMx = mat3.id();

const mouseStateNormalised = {
  down    : false,
  position: vec2.zero(),
  deltaPos: vec2.zero(),
  tmpPos  : vec2.zero(),
  wheel   : 0.0
};

const mouseStatePixels = {
  down    : false,
  position: vec2.zero(),
  downPos : vec2.zero(),
  upPos   : vec2.zero(),
  wheel   : 0.0
};

const worldPos = vec2.zero();
const gridPos = vec2.zero();

const onMouseDown = (event: MouseEvent): void => {
  vec2.set(mouseStatePixels.downPos, event.pageX, event.pageY);
  mouseStatePixels.down = true;
};

const onMouseMove = (event: MouseEvent): void => {
  vec2.set(mouseStatePixels.position, event.pageX, event.pageY);
};

const onMouseUp = (event: MouseEvent): void => {
  vec2.set(mouseStatePixels.upPos, event.pageX, event.pageY);
  mouseStatePixels.down = false;
};

const onWheel = (event: WheelEvent): void => {
  mouseStatePixels.wheel += event.deltaY;
};

const updateMouseInput = (): void => {
  const { down: currentlyDown, position: pxPos, upPos, downPos, wheel: pxWheel } = mouseStatePixels;
  const { down: registeredDown, position: normPos, deltaPos, tmpPos } = mouseStateNormalised;

  const wasDown = registeredDown;

  if (registeredDown) {
    mat3.mulV2(viewportMx, currentlyDown ? pxPos : upPos, tmpPos);
  } else if (currentlyDown) {
    mat3.mulV2(viewportMx, downPos, normPos);
    mat3.mulV2(viewportMx, pxPos, tmpPos);
  }
  if (registeredDown || currentlyDown) {
    vec2.subVInto(tmpPos, normPos, deltaPos);
    vec2.setV(normPos, tmpPos);
    mouseStateNormalised.down = currentlyDown;
  } else {
    vec2.setZero(deltaPos);
  }
  mouseStateNormalised.wheel = pxWheel * 0.1;
  mouseStatePixels.wheel = 0.0;

  // TODO: organise/refactor this
  if (wasDown && !currentlyDown) {
    const { camera: { m } } = getScene();
    mat3.mulV2(m, normPos, worldPos);
    mat3.mulV2(world2grid, worldPos, gridPos);
    const row = Math.floor(-gridPos.y + 0.5);
    const col = Math.floor(gridPos.x + 0.5);
    gridClick(row, col);
  }
};

export const getMouseDelta = (): Vec2 => mouseStateNormalised.deltaPos;
export const getMouseWheel = (): number => mouseStateNormalised.wheel;

const resizeMouseInput = (viewport: Viewport): void => {
  const { pxSize, normSize: { x: normWidth, y: normHeight }, offset: { x: left, y: top } } = viewport;
  mat3.set(viewportMx,
           pxSize,   0,       -pxSize * left - normWidth * 0.5,
           0,       -pxSize,   pxSize * top  + normHeight * 0.5,
           0,        0,        1);
};

const initMouseInput = (): void => {
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('wheel', onWheel);
};


// ----- Touch ---------------------------------------------------------------------------------------------------------

type TouchBtn = { div: HTMLElement, key: Input, top: number, right: number, bottom: number, left: number };

const touchBtns: TouchBtn[] = [ ];

// const touchMap: { [ id: number ]: number; } = { };

// const addTouchBtn = (id: string, key: Input): TouchBtn | null => {
//   const div = document.getElementById(id);
//   if (div === null) return null;
//   const btn: TouchBtn = { div, key, top: 0, right: 0, bottom: 0, left: 0 };
//   if (btn.div.parentElement !== null) btn.div.parentElement.classList.remove('off');
//   resizeTouchBtn(btn);
//   touchBtns.push(btn);
//   return btn;
// };

const resizeTouchBtn = (btn: TouchBtn): void => {
  btn.top = btn.div.offsetTop;
  btn.left = btn.div.offsetLeft;
  let parent = btn.div;
  while ((parent = <HTMLElement>parent.offsetParent) !== null) {
    btn.top += parent.offsetTop;
    btn.left += parent.offsetLeft;
  }
  btn.bottom = btn.top + btn.div.offsetHeight;
  btn.right = btn.left + btn.div.offsetWidth;
};

// const insideTouchBtn = (btn: TouchBtn, x: number, y: number): boolean => {
//   return x >= btn.left && x < btn.right && y >= btn.top && y < btn.bottom;
// };

// const onTouchEvent = (event: TouchEvent): void => {
//   let isStart = false, isMove = false, isEnd = false;
//   switch (event.type) {
//     case 'touchstart' : { isStart = true;  break; }
//     case 'touchmove'  : { isMove  = true;  break; }
//     case 'touchend'   : { isEnd   = true;  break; }
//     case 'touchcancel': { isEnd   = true;  break; }
//     default: return;
//   }
//   const touches = event.changedTouches, n = touches.length, m = touchBtns.length;
//   let touch: Touch, id: number, x: number, y: number, btn: TouchBtn, current: TouchBtn | undefined = undefined;
//   for (let i = 0; i < n; i++) {
//     touch = touches[i];
//     id = touch.identifier;
//     x = touch.pageX;
//     y = touch.pageY;
//     if (isMove || isEnd) {
//       current = touchBtns[touchMap[id]];
//       if (current !== undefined && (isEnd || !insideTouchBtn(current, x, y))) {
//         keyUp(event, current.key);
//         delete touchMap[id];
//       }
//     }
//     if (isStart || isMove) {
//       for (let j = 0; j < m; j++) {
//         btn = touchBtns[j];
//         if ((isStart || btn !== current) && insideTouchBtn(btn, x, y)) {
//           touchMap[id] = j;
//           keyDown(event, btn.key);
//           break;
//         }
//       }
//     }
//   }
// };

const resizeTouchInput = (): void => touchBtns.forEach(resizeTouchBtn);

const initTouchInput = (): void => {
  // const overlay = document.getElementById('overlay');
  // if (overlay !== null) {
  //   overlay.addEventListener('touchstart',  onTouchEvent, false);
  //   overlay.addEventListener('touchmove',   onTouchEvent, false);
  //   overlay.addEventListener('touchend',    onTouchEvent, false);
  //   overlay.addEventListener('touchcancel', onTouchEvent, false);
  //   addTouchBtn('btn-left',  Input.P1_LEFT);
  //   addTouchBtn('btn-right', Input.P1_RIGHT);
  //   addTouchBtn('btn-jump',  Input.P1_JUMP);
  // }
};


// ----- GamePad -------------------------------------------------------------------------------------------------------

const enum GamePadType {
  STANDARD  = 'standard gamepad',
  XINPUT    = 'xinput',
  RUMBLEPAD = 'rumblepad',
  UNKNOWN   = '<unknown>'
}

type GamePadBtn   = { axis: false, index: number, pressed: boolean, key: Input };
type GamePadAxis  = { axis: true, index: number, negative: boolean, threshold: number, value: number, key: Input };
type GamePadInput = GamePadBtn | GamePadAxis;

const AXIS_MIN_VAL = 0.075;

const gamepadInputs: { [ type: string ]: GamePadInput[]; } = { };

const getGamepadType = (pad: Gamepad): GamePadType => {
  const padId = pad.id.toLowerCase();
  return (padId.indexOf(GamePadType.XINPUT) > -1 || padId.indexOf(GamePadType.STANDARD)) > -1 ? GamePadType.XINPUT
      : (padId.indexOf(GamePadType.RUMBLEPAD) > -1 ? GamePadType.XINPUT //.RUMBLEPAD
      : GamePadType.UNKNOWN);
};

const addGamepadBtn = (type: GamePadType, index: number, key: Input): GamePadBtn => {
  const btn: GamePadBtn = { axis: false, index, pressed: false, key };
  let btns = gamepadInputs[type];
  if (btns === undefined) btns = gamepadInputs[type] = [ ];
  btns.push(btn);
  return btn;
};

const addGamepadAxis = (
    type: GamePadType,
    index: number,
    negative: boolean,
    threshold: number,
    key: Input
): GamePadAxis => {
  const btn: GamePadAxis = { axis: true, index, negative, threshold, value: 0.0, key };
  let btns = gamepadInputs[type];
  if (btns === undefined) btns = gamepadInputs[type] = [ ];
  btns.push(btn);
  return btn;
};

const pollGamepad = (): void => {
  const pads = navigator.getGamepads(), n = pads.length;
  let connectedPad: Gamepad | null = null;
  for (let i = 0; i < n; i++) {
    const pad = pads[i];
    if (pad !== null && pad.connected) {
      connectedPad = pad;
      break;
    }
  }
  if (connectedPad === null) return;
  const btns = gamepadInputs[getGamepadType(connectedPad)];
  if (btns === undefined) return;
  const m = btns.length;
  let btn: GamePadInput, pressed: boolean, value: number;
  for (let j = 0; j < m; j++) {
    btn = btns[j];
    if (btn.axis) {
      value = connectedPad.axes[btn.index];
      if (   ( btn.negative && btn.value < 0.0 && value > btn.threshold)
          || (!btn.negative && btn.value > 0.0 && value < btn.threshold)) {
        btn.value = 0.0;
        keyUp(null, btn.key);
      } else if (   ( btn.negative && btn.value > btn.threshold && value <= btn.threshold)
                  || (!btn.negative && btn.value < btn.threshold && value >= btn.threshold)) {
        btn.value = value;
        keyDown(null, btn.key);
      }
    } else {
      pressed = connectedPad.buttons[btn.index].pressed;
      if (pressed !== btn.pressed) {
        btn.pressed = pressed;
        if (pressed) keyDown(null, btn.key);
        else keyUp(null, btn.key);
      }
    }
  }
};

const initGamepadInput = (): void => {
  addGamepadBtn(GamePadType.XINPUT,  8, Input.DEBUG);
  // addGamepadBtn(GamePadType.XINPUT,  9, Input.PAUSE);
  addGamepadBtn(GamePadType.XINPUT, 12, Input.P1_UP);
  addGamepadBtn(GamePadType.XINPUT, 13, Input.P1_DOWN);
  addGamepadBtn(GamePadType.XINPUT, 14, Input.P1_LEFT);
  addGamepadBtn(GamePadType.XINPUT, 15, Input.P1_RIGHT);
  addGamepadAxis(GamePadType.XINPUT, 0, true, -AXIS_MIN_VAL, Input.P1_LEFT);
  addGamepadAxis(GamePadType.XINPUT, 0, false, AXIS_MIN_VAL, Input.P1_RIGHT);
  addGamepadAxis(GamePadType.XINPUT, 1, true, -AXIS_MIN_VAL, Input.P1_UP);
  addGamepadAxis(GamePadType.XINPUT, 1, false, AXIS_MIN_VAL, Input.P1_DOWN);

  // TODO: deprecated
  // addGamepadBtn(GamePadType.RUMBLEPAD,  0, Input.P1_JUMP);
  // addGamepadBtn(GamePadType.RUMBLEPAD,  1, Input.P1_FIRE);
  // addGamepadBtn(GamePadType.RUMBLEPAD,  2, Input.P1_THRUSTER);
  // addGamepadBtn(GamePadType.RUMBLEPAD,  3, Input.P1_BOMB);
  // addGamepadBtn(GamePadType.RUMBLEPAD,  8, Input.DEBUG);
  // addGamepadBtn(GamePadType.RUMBLEPAD,  9, Input.PAUSE);
  // addGamepadAxis(GamePadType.RUMBLEPAD, 0, true, -AXIS_MIN_VAL, Input.P1_LEFT);
  // addGamepadAxis(GamePadType.RUMBLEPAD, 0, false, AXIS_MIN_VAL, Input.P1_RIGHT);
};
