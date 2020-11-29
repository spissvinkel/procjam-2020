import { getScore } from './scene/scene-mgr';

type Span = HTMLElement | null;

const elements = { score: null as Span };

export const update = (): void => {
  const { score } = elements;
  if (score !== null) score.innerText = `${getScore()}`;
};

export const init = (): void => {
  elements.score = document.getElementById('score');
};
