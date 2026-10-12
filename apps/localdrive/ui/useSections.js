import {useRef, useState} from 'react';
import {activeCount, NO_FILTERS} from '../state/catalog.js';
import {useStoreActions, useStoreState, useQueryActive} from '../state/store.jsx';
import {useNavActions, useNavState} from '../state/nav.jsx';
import {reshufflePs2Featured} from '../ps2/Ps2Screen.jsx';

const KEYS = {
  search: 'nav:search',
  discover: 'nav:discover',
  catalog: 'nav:browse',
  top: 'nav:top',
  new: 'nav:new',
  favorites: 'nav:favorites',
  downloads: 'nav:downloads',
  files: 'nav:files',
  add: 'nav:addGame',
  platform: 'nav:platform'
};

// L1/R1 order, as the header shows them. Browse and Platform are menus: stepping onto one opens it.
const TABS = [
  'search',
  'discover',
  'catalog',
  'platform',
  'top',
  'new',
  'add',
  'favorites',
  'downloads',
  'files'
];

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
  // Only a platform chosen: the Platform tab's own view of the library.
  if (filters.platform.length && activeCount(filters) === filters.platform.length && !query)
    return 'platform';
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
    top.name === 'search'
      ? 'search'
      : top.name === 'game'
        ? null
        : top.name === 'add' || top.name === 'homebrew'
          ? 'add'
          : top.name === 'ps2' || top.name === 'ps2game'
            ? 'platform'
            : underneath;
  const topName = useRef(top.name);
  topName.current = top.name;
  const [on] = useState(() => ({
    show,
    search: () => topName.current !== 'search' && nav.push({name: 'search'}, 'nav:search'),
    discover: () => show(NO_FILTERS, 'relevance', 'spotlight:cta'),
    top: () => show(NO_FILTERS, 'rating'),
    new: () => show(NO_FILTERS, 'newest'),
    add: () => topName.current !== 'add' && nav.push({name: 'add'}, 'nav:addGame'),
    platform: id => show({...NO_FILTERS, platform: [id]}, 'relevance'),
    ps2: () => {
      if (topName.current === 'ps2') return;
      reshufflePs2Featured();
      nav.push({name: 'ps2'}, 'nav:platform');
    },
    favorites: () => show({...NO_FILTERS, wishlist: true}, 'relevance'),
    downloads: () => topName.current !== 'downloads' && nav.push({name: 'downloads'}, 'nav:downloads'),
    files: () => topName.current !== 'files' && nav.push({name: 'files'}, 'nav:files')
  }));
  // `open` is the menu open in the header, if any: stepping goes on from it, not from the section.
  const step = (forward, {open, openMenu}) => {
    const current = open ?? section ?? underneath;
    const next = TABS[TABS.indexOf(current) + (forward ? 1 : -1)];
    if (!next) return;
    if (next === 'catalog' || next === 'platform') {
      openMenu(next);
      return;
    }
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
