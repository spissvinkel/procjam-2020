import { addToList, ArrayList, listSize, mkArrayList } from './utils';

export const enum Direction { N, NE, E, SE, S, SW, W, NW }

const DURECTIONS = [
  Direction.N, Direction.NE, Direction.E, Direction.SE, Direction.S, Direction.SW, Direction.W, Direction.NW
];

const NUM_DIRS = 8, HALF_DIRS = NUM_DIRS / 2;

interface Offset { rowOffset: number, colOffset: number }

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

export type Neighbours = [ Node?, Node?, Node?, Node?, Node?, Node?, Node?, Node? ]

export interface Node {
  row       : number;
  col       : number;
  cost      : number;
  neighbours: Neighbours;
}

const mkNode = (): Node => ({ row: 0, col: 0, cost: 0, neighbours: [ ] });

const nodePool = mkArrayList(mkNode);
const openList = mkArrayList<Node>();
const closedList = mkArrayList<Node>();

export const searchGraph = (startRow: number, startCol: number, endRow: number, endCol: number): Node => {
  const startNode = addToList(nodePool);
  startNode.row = startRow;
  startNode.col = startCol;
  startNode.cost = 0;
  emptyNeighbours(startNode.neighbours);
  emptyList(closedList);
  emptyList(openList);
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
      const nextCost = cost + 1;
      let nextNode = findNode(openList, nextRow, nextCol);
      if (nextNode === undefined) {
        nextNode = addToList(nodePool);
        nextNode.row = nextRow;
        nextNode.col = nextCol;
        emptyNeighbours(nextNode.neighbours);
        addToList(openList, nextNode);
      } else if (nextNode.cost <= nextCost) continue;
      nextNode.cost = nextCost;
      nextNode.neighbours[(i + HALF_DIRS) % NUM_DIRS] = node;
      node.neighbours[i] = nextNode;
    }
    removeNode(openList, node);
    addToList(closedList, node);
  }
  return node;
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

const removeNode = (list: ArrayList<Node | undefined>, node: Node): void => {
  const { elements, numElements } = list;
  const last = elements[numElements];
  if (last === node) {
    elements[--list.numElements] = undefined;
    return;
  }
  for (let i = 0; i < numElements; i++) {
    if (elements[i] === node) {
      elements[i] = last;
      elements[--list.numElements] = undefined;
      break;
    }
  }
};

const emptyList = (list: ArrayList<Node | undefined>): void => {
  const { elements, numElements } = list;
  for (let i = 0; i < numElements; i++) elements[i] = undefined;
};

const emptyNeighbours = (neighbours: Neighbours): void => {
  for (let i = 0; i < NUM_DIRS; i++) neighbours[i] = undefined;
};
