import { Vec3, Vec4 } from '@spissvinkel/maths';


// ----- HTML -----

export type ElementIterator<E extends Element> = (fn: (e: E) => void) => (es: HTMLCollectionOf<E>) => void;

export const forEachElement: ElementIterator<Element> = fn => es => { for (let i = 0; i < es.length; i++) fn(es[i]); };

export const hide = <E extends Element> (e: E): void => e.classList.add('hidden');
export const show = <E extends Element> (e: E): void => e.classList.remove('hidden');

export const hideAll = forEachElement(hide);
export const showAll = forEachElement(show);


// ----- Colours -----

export const ONE_BY_255 = 1.0 / 255;

export const setHexRGB = <V extends Vec3 | Vec4> (hex: string, colour: V): V => {
  const re = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
  const result = re.exec(hex);
  if (result !== null) {
    colour.x = parseInt(result[1], 16) * ONE_BY_255;
    colour.y = parseInt(result[2], 16) * ONE_BY_255;
    colour.z = parseInt(result[3], 16) * ONE_BY_255;
  }
  return colour;
};

export const setHexRGBA = (hex: string, colour: Vec4): Vec4 => {
  const re = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
  const result = re.exec(hex);
  if (result !== null) {
    colour.x = parseInt(result[1], 16) * ONE_BY_255;
    colour.y = parseInt(result[2], 16) * ONE_BY_255;
    colour.z = parseInt(result[3], 16) * ONE_BY_255;
    colour.w = parseInt(result[4], 16) * ONE_BY_255;
  }
  return colour;
};


// ----- Collections -----

export type ElemGen<E> = () => E;

// ----- ArrayList -----

export interface ArrayList<E> {
  mkElement? : ElemGen<E>;
  elements   : E[];
  numElements: number;
}

export const mkArrayList = <E> (mkElement?: ElemGen<E>): ArrayList<E> => ({ mkElement, elements: [], numElements: 0 });

export const clearList = <E> (arrayList: ArrayList<E>): ArrayList<E> => {
  arrayList.numElements = 0;
  return arrayList;
};

export const isEmptyList = <E> (arrayList: ArrayList<E>): boolean => arrayList.numElements === 0;
export const listSize    = <E> (arrayList: ArrayList<E>): number => arrayList.numElements;

export const addToList = <E> (arrayList: ArrayList<E>, element?: E): E => {
  const { mkElement, elements, numElements } = arrayList;
  if (element !== undefined) {
    elements[arrayList.numElements++] = element;
    return element;
  }
  if (numElements !== elements.length) return elements[arrayList.numElements++];
  if (mkElement === undefined) throw 'No mkElement function';
  const newElement = mkElement();
  elements[arrayList.numElements++] = newElement;
  return newElement;
};

// ----- Stack -----

export interface Stack<E> {
  elements   : Array<E | undefined>;
  numElements: number;
}

export const mkStack = <E> (): Stack<E> => ({ elements: [ ], numElements: 0 });

export const isEmptyStack = <E> (stack: Stack<E>): boolean => stack.numElements === 0;
export const stackSize    = <E> (stack: Stack<E>): number => stack.numElements;

export const push = <E> (stack: Stack<E>, element: E): Stack<E> => {
  stack.elements[stack.numElements] = element;
  stack.numElements++;
  return stack;
};

export const pop = <E> (stack: Stack<E>): E | undefined => {
  if (stack.numElements === 0) return undefined;
  const element = stack.elements[--stack.numElements];
  stack.elements[stack.numElements] = undefined;
  return element;
};
