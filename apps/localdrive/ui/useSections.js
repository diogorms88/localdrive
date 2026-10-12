import {useRef, useState} from 'react';
import {activeCount, NO_FILTERS} from '../state/catalog.js';
import {useStoreActions, useStoreState, useQueryActive} from '../state/store.jsx';
import {useNavActions, useNavState} from '../state/nav.jsx';

const KEYS = {
  search: 'nav:search',
  discover: 'nav:discover',
  catalog: 'nav:browse',
  top: 'nav:top',
  new: 'nav:new',
  favorites: 'nav:favorites',
  downloads: 'nav:downloads',
  files: 'nav:files',
  add: 'nav:addGame'
};

const TABS = ['search', 'discover', 'top', 'new', 'add', 'favorites', 'downloads', 'files'];

export function useShowLibrary() {
  const store = useStoreActions();
  const nav = useNavActions();
  const [show] = useState(() => (filters, sort, target = 'catalog:sort') => {
    store.setFilters(filters);
    store.setQuery('');
    store.setSort(sort);
    nav.home(target);
  });
  return show;
}

function sectionOf({filters, sort}, query) {
  if (filters.wishlist) return 'favorites';
  if (sort === 'rating') return 'top';
  if (sort === 'newest') return 'new';
  if (sort === 'smallest') return 'catalog';
  if (activeCount(filters) > 0 || query) return 'catalog';
  return 'discover';
}

export function useSections() {
  const store = {...useStoreState(), ...useStoreActions()};
  const queryActive = useQueryActive();
  const nav = useNavActions();
  const {top} = useNavState();
  const show = useShowLibrary();
  const underneath =
    top.name === 'downloads' || top.name === 'files' ? top.name : sectionOf(store, queryActive);
  const section =
    top.name === 'search' ? 'search' : top.name === 'game' ? null : top.name === 'add' || top.name === 'homebrew' ? 'add' : underneath;
  const topName = useRef(top.name);
  topName.current = top.name;
  const [on] = useState(() => ({
    show,
    search: () => topName.current !== 'search' && nav.push({name: 'search'}, 'nav:search'),
    discover: () => show(NO_FILTERS, 'relevance', 'spotlight:cta'),
    top: () => show(NO_FILTERS, 'rating'),
    new: () => show(NO_FILTERS, 'newest'),
    add: () => topName.current !== 'add' && nav.push({name: 'add'}, 'nav:addGame'),
    favorites: () => show({...NO_FILTERS, wishlist: true}, 'relevance'),
    downloads: () => topName.current !== 'downloads' && nav.push({name: 'downloads'}, 'nav:downloads'),
    files: () => topName.current !== 'files' && nav.push({name: 'files'}, 'nav:files')
  }));
  const step = forward => {
    const current = top.name === 'search' || top.name === 'add' ? top.name : underneath;
    const at = current === 'catalog' ? 1.5 : TABS.indexOf(current);
    const next = TABS[forward ? Math.floor(at) + 1 : Math.ceil(at) - 1];
    if (!next) return;
    if (next === 'downloads' || next === 'files') {
      store.setQuery('');
      nav.home();
    }
    on[next]();
  };
  return {
    section,
    filters: store.filters,
    sort: store.sort,
    on,
    step,
    // The page's top elements go up to `nav:current`, the current section's item, like a PS5 tab
    // row; the scope's own memory would be stale after L1/R1 or a closed menu.
    keyOf: name => (name === section ? 'nav:current' : KEYS[name])
  };
}
