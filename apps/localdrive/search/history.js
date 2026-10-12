import {savedList} from '../state/saved.js';

const LIMIT = 8;

const searches = savedList('searches.json', 'recent searches');

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export function rememberSearch(query) {
  const term = query.trim();
  const terms = searches.get();
  if (term.length < 2 || same(terms[0] ?? '', term)) return;
  searches.set([term, ...terms.filter(other => !same(other, term))].slice(0, LIMIT));
}

export const forgetSearch = term => searches.set(searches.get().filter(other => other !== term));

export const useSearchHistory = searches.useList;
