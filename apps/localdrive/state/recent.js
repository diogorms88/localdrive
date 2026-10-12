import {savedList} from './saved.js';

const LIMIT = 12;

const recent = savedList('recent.json', 'recently viewed');

export function recordVisit(id) {
  const ids = recent.get();
  if (ids[0] !== id) recent.set([id, ...ids.filter(other => other !== id)].slice(0, LIMIT));
}

export const useRecent = recent.useList;
