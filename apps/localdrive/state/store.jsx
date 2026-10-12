import {createContext, useContext, useMemo, useRef, useState} from 'react';
import {loadList, saveList} from './saved.js';
import {listedId, NO_FILTERS, toggleValue} from './catalog.js';

const StateContext = createContext(null);

const WishlistContext = createContext([]);

const QueryContext = createContext('');

const QueryActiveContext = createContext(false);

const ActionsContext = createContext(null);

export function StoreProvider({children}) {
  const [wishlist, setWishlist] = useState(() => [
    ...new Set(loadList('wishlist.json', 'wishlist').map(listedId))
  ]);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sort, setSort] = useState('relevance');
  const [query, setQuery] = useState('');
  const [actions] = useState(() => ({
    setFilters,
    setSort,
    setQuery,
    toggleWish: id =>
      setWishlist(list => {
        const next = toggleValue(list, listedId(id));
        saveList('wishlist.json', 'wishlist', next);
        return next;
      }),
    toggleFilter: (key, value) =>
      setFilters(current => ({...current, [key]: toggleValue(current[key], value)})),
    clearFilters: () => {
      setFilters(NO_FILTERS);
      setQuery('');
    }
  }));
  const state = useMemo(() => ({filters, sort}), [filters, sort]);
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>
        <WishlistContext.Provider value={wishlist}>
          <QueryActiveContext.Provider value={query !== ''}>
            <QueryContext.Provider value={query}>{children}</QueryContext.Provider>
          </QueryActiveContext.Provider>
        </WishlistContext.Provider>
      </StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export function StoreFreeze({frozen, children}) {
  const live = {
    state: useContext(StateContext),
    wishlist: useContext(WishlistContext),
    query: useContext(QueryContext)
  };
  const kept = useRef(live);
  if (!frozen) kept.current = live;
  return (
    <StateContext.Provider value={kept.current.state}>
      <WishlistContext.Provider value={kept.current.wishlist}>
        <QueryContext.Provider value={kept.current.query}>{children}</QueryContext.Provider>
      </WishlistContext.Provider>
    </StateContext.Provider>
  );
}

export const useStoreActions = () => useContext(ActionsContext);

export const useStoreState = () => useContext(StateContext);

export const useWishlist = () => useContext(WishlistContext);

export const useQuery = () => useContext(QueryContext);

export const useQueryActive = () => useContext(QueryActiveContext);

export function useStore() {
  const state = useContext(StateContext);
  const wishlist = useContext(WishlistContext);
  const query = useContext(QueryContext);
  const actions = useContext(ActionsContext);
  return useMemo(() => ({...state, wishlist, query, ...actions}), [state, wishlist, query, actions]);
}
