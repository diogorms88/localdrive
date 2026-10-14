import {useEffect, useState} from 'react';
import {savedList} from '../state/saved.js';

const recent = savedList('superpsx-recent.json', 'SuperPSX recently viewed');

export function recordSuperPsxVisit(id) {
  const ids = recent.get();
  if (ids[0] !== id) recent.set([id, ...ids.filter(other => other !== id)].slice(0, 12));
}

export const useSuperPsxRecent = recent.useList;

export const NO_SUPERPSX_FILTERS = {genre: []};
let browse = {filters: NO_SUPERPSX_FILTERS, sort: 'popular'};
const browseListeners = new Set();
const publishBrowse = next => {
  browse = next;
  for (const listener of browseListeners) listener(browse);
};

export const superPsxBrowse = {
  reset: () => publishBrowse({filters: NO_SUPERPSX_FILTERS, sort: 'popular'}),
  setSort: sort => publishBrowse({...browse, sort}),
  toggleGenre: genre => {
    const picked = browse.filters.genre;
    publishBrowse({...browse, filters: {genre: picked.includes(genre) ? picked.filter(item => item !== genre) : [...picked, genre]}});
  },
  clearFilters: () => publishBrowse({...browse, filters: NO_SUPERPSX_FILTERS})
};

export function useSuperPsxBrowse() {
  const [value, setValue] = useState(browse);
  useEffect(() => {
    browseListeners.add(setValue);
    setValue(browse);
    return () => browseListeners.delete(setValue);
  }, []);
  return value;
}
