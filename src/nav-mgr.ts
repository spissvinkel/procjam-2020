import { Vec2 } from '@spissvinkel/maths';
import * as mat3 from '@spissvinkel/maths/mat3';
import * as vec2 from '@spissvinkel/maths/vec2';
import { getWorldCell } from './grid-mgr';
import { grid2world } from './scene/drawable';

import { getScene } from './scene/scene-mgr';
import { addToList, ArrayList, clearList, isEmptyList, listSize, mkArrayList } from './utils';
import { Cell, ItemType } from './world-mgr';

export const enum Direction { N, NE, E, SE, S, SW, W, NW }

export type Neighbours = [ Node?, Node?, Node?, Node?, Node?, Node?, Node?, Node? ]

export interface Node {
  row  : number;
  col  : number;
  pos  : Vec2;
  cost : number;
  nodes: Neighbours;
}

interface Offset { rowOffset: number, colOffset: number }

export interface Step {
  rowOffset: number;
  colOffset: number;
  posOffset: Vec2;
  direction: Direction;
}

const NUM_DIRS = 8, HALF_DIRS = NUM_DIRS / 2;

const COSTS = [ 1.0, 1.1, 1.0, 1.1, 1.0, 1.1, 1.0, 1.1 ];

const OFFSETS: Offset[] = [
  { rowOffset: -1,  colOffset:  0 },
  { rowOffset: -1,  colOffset:  1 },
  { rowOffset:  0,  colOffset:  1 },
  { rowOffset:  1,  colOffset:  1 },
  { rowOffset:  1,  colOffset:  0 },
  { rowOffset:  1,  colOffset: -1 },
  { rowOffset:  0,  colOffset: -1 },
  { rowOffset: -1,  colOffset: -1 }
];

const DIRECTIONS = [
  Direction.N, Direction.NE, Direction.E, Direction.SE, Direction.S, Direction.SW, Direction.W, Direction.NW
];

const mkNode = (): Node => ({ row: 0, col: 0, pos: vec2.zero(), cost: 0, nodes: [ ] });

const nodePool = mkArrayList(mkNode);
const openList = mkArrayList<Node>();
const closedList = mkArrayList<Node>();

const mkStep = (): Step => ({ rowOffset: 0, colOffset: 0, posOffset: vec2.zero(), direction: Direction.SE });

const path = mkArrayList(mkStep);

const cellPos = vec2.zero();

export const getDirection = (rowOffset: number, colOffset: number): Direction => {
  for (let i = 0; i < NUM_DIRS; i++) {
    const { rowOffset: ro, colOffset: co } = OFFSETS[i];
    if (ro === rowOffset && co === colOffset) return DIRECTIONS[i];
  }
  return Direction.SE;
};

export const findPath = (startRow: number, startCol: number, endRow: number, endCol: number): void => {
  clearPath();
  let currentNode = searchGraph(startRow, startCol, endRow, endCol);
  let { row, col } = currentNode;
  if (!(row === endRow && col === endCol)) return;
  while (!(row === startRow && col === startCol)) {
    const { nodes } = currentNode;
    let firstIx = 0;
    let nextNode;
    while (firstIx < nodes.length && (nextNode = nodes[firstIx]) === undefined) firstIx++;
    if (nextNode === undefined) break;
    let nextCost = nextNode.cost;
    for (let i = firstIx + 1; i < nodes.length; i++) {
      const node = nodes[i];
      if (node === undefined) continue;
      const { cost } = node;
      if (cost < nextCost) {
        nextCost = cost;
        nextNode = node;
      }
    }
    const step = addToList(path);
    step.rowOffset = nextNode.row - currentNode.row;
    step.colOffset = nextNode.col - currentNode.col;
    vec2.subVInto(nextNode.pos, currentNode.pos, step.posOffset);
    step.direction = getDirection(step.rowOffset, step.colOffset);
    currentNode = nextNode;
    row = currentNode.row;
    col = currentNode.col;
  }
};

export const getPath = (): ArrayList<Step> => path;
export const getStep = (index: number): Step | undefined => {
  return index >= path.numElements ? undefined : path.elements[index];
};
export const getLastStep = (): Step | undefined => {
  return path.numElements === 0 ? undefined : path.elements[path.numElements - 1];
};
export const isLastStep = (index: number): boolean => index >= path.numElements - 1;
export const isPathEmpty = (): boolean => isEmptyList(path);
export const clearPath = (): void => { clearList(path); };

export const searchGraph = (startRow: number, startCol: number, endRow: number, endCol: number): Node => {
  clearList(nodePool);
  emptyList(openList);
  emptyList(closedList);
  clearList(path);
  const { grid: { worldRow, worldCol, extent: { min, max } } } = getScene();
  const startNode = addToList(nodePool);
  startNode.row = startRow;
  startNode.col = startCol;
  startNode.cost = 0;
  emptyNeighbours(startNode.nodes);
  if (!hasCell(min, max, worldRow, worldCol, startRow, startCol)) {
    vec2.setZero(startNode.pos);
    return startNode;
  }
  vec2.setV(startNode.pos, cellPos);
  addToList(openList, startNode);
  let node: Node = startNode;
  while (listSize(openList) > 0) {
    node = cheapestNode(openList);
    const { row, col, cost } = node;
    if (row === endRow && col === endCol) break;
    for (let i = 0; i < NUM_DIRS; i++) {
      const { rowOffset, colOffset } = OFFSETS[i];
      const nextRow = row + rowOffset, nextCol = col + colOffset;
      if (hasNode(closedList, nextRow, nextCol)) continue;
      const nextCost = cost + COSTS[i];
      let nextNode = findNode(openList, nextRow, nextCol);
      if (nextNode === undefined) {
        if (!hasCell(min, max, worldRow, worldCol, nextRow, nextCol)) continue;
        nextNode = addToList(nodePool);
        nextNode.row = nextRow;
        nextNode.col = nextCol;
        vec2.setV(nextNode.pos, cellPos);
        nextNode.cost = Number.MAX_SAFE_INTEGER;
        emptyNeighbours(nextNode.nodes);
        addToList(openList, nextNode);
      }
      if (nextNode.cost <= nextCost) continue;
      nextNode.cost = nextCost;
      nextNode.nodes[(i + HALF_DIRS) % NUM_DIRS] = node;
      node.nodes[i] = nextNode;
    }
    removeNode(openList, node);
    addToList(closedList, node);
  }
  return node;
};

const findCell = (min: Vec2, max: Vec2, worldRow: number, worldCol: number, gridRow: number, gridCol: number): Cell | undefined => {
  vec2.set(cellPos, gridCol, -gridRow);
  mat3.mulV2(grid2world, cellPos, cellPos);
  const { x, y } = cellPos;
  if (x < min.x || x > max.x || y < min.y || y > max.y) return undefined;
  const cell = getWorldCell(worldRow, worldCol, gridRow, gridCol);
  const { ground, item } = cell;
  if (!(ground && item === ItemType.EMPTY)) return undefined;
  return cell;
};

const hasCell = (min: Vec2, max: Vec2, worldRow: number, worldCol: number, gridRow: number, gridCol: number): boolean => {
  return findCell(min, max, worldRow, worldCol, gridRow, gridCol) !== undefined;
};

const findNode = (list: ArrayList<Node>, gridRow: number, gridCol: number): Node | undefined => {
  const { elements, numElements } = list;
  for (let i = 0; i < numElements; i++) {
    const node = elements[i];
    const { row: r, col: c } = node;
    if (r === gridRow && c === gridCol) return node;
  }
  return undefined;
};

const hasNode = (list: ArrayList<Node>, gridRow: number, gridCol: number): boolean => {
  return findNode(list, gridRow, gridCol) !== undefined;
};

const cheapestNode = (list: ArrayList<Node>): Node => {
  const { elements, numElements } = list;
  if (numElements === 0) throw 'list is empty';
  let cheapest = elements[0];
  for (let i = 1; i < numElements; i++) {
    const node = elements[i];
    if (node.cost < cheapest.cost) cheapest = node;
  }
  return cheapest;
};

/**
 * Assumes node is known to be in the list
 *
 * @param list
 * @param node
 */
const removeNode = (list: ArrayList<Node | undefined>, node: Node): void => {
  list.numElements--;
  const { elements, numElements } = list;
  const last = elements[numElements];
  if (last === node) {
    elements[numElements] = undefined;
    return;
  }
  for (let i = 0; i < numElements; i++) {
    if (elements[i] === node) {
      elements[i] = last;
      elements[numElements] = undefined;
      break;
    }
  }
};

const emptyList = (list: ArrayList<Node | undefined>): void => {
  const { elements, numElements } = list;
  for (let i = 0; i < numElements; i++) elements[i] = undefined;
  list.numElements = 0;
};

const emptyNeighbours = (neighbours: Neighbours): void => {
  for (let i = 0; i < NUM_DIRS; i++) neighbours[i] = undefined;
};
