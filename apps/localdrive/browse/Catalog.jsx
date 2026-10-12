import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Image, VirtualList, useIsFocused, Text, View, FocusScope} from '@ps5-react/core';
import {fitBytes, SPAN_MAX} from '../i18n/fit.js';
import {useT, useLocale} from '../i18n/index.js';
import {sortGames, filterGames, activeCount} from '../state/catalog.js';
import {useStore} from '../state/store.jsx';
import {px} from '../ui/scale.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {DETAILED_CAPTION, GameCard} from '../ui/GameCard.jsx';
import {useNavActions} from '../state/nav.jsx';
import {ButtonGlyph} from '../ui/ButtonHints.jsx';
import {ActiveFilters} from './ActiveFilters.jsx';
import {EmptyState} from './EmptyState.jsx';
import {SortSelect} from './SortSelect.jsx';
import '../assets/Inter-Regular.ttf';

const STAGGER = 0.03;

const COLUMNS = 6;

const BATCH = COLUMNS * 8;

const CARD_WIDTH = 182;

const CARD_HEIGHT = 243 + DETAILED_CAPTION;

const FIRST = COLUMNS * 3;

const STEP = 3;

const AHEAD = [2, 5];

const SETTLE_MS = 200;

const fetched = new Set();

let settle = null;

const coverBox = {width: px(CARD_WIDTH), height: px(Math.round((CARD_WIDTH * 4) / 3)), resizeMode: 'cover'};

function prefetchBelow(games, index) {
  clearTimeout(settle);
  settle = setTimeout(() => prefetchRows(games, index), SETTLE_MS);
}

function prefetchRows(games, index) {
  const row = Math.floor(index / COLUMNS);
  for (const game of games.slice((row + AHEAD[0]) * COLUMNS, (row + AHEAD[1]) * COLUMNS)) {
    if (!game.art.cover || fetched.has(game.id)) continue;
    fetched.add(game.id);
    Image.prefetch(game.art.cover, coverBox).catch(() => fetched.delete(game.id));
  }
}

const sameGrid = (a, b) =>
  a.signature === b.signature &&
  a.enter === b.enter &&
  a.games.length === b.games.length &&
  a.games.every((game, i) => game === b.games[i]);

const Grid = memo(function Grid({games: games, enter: enter}) {
  const {openGame, push} = useNavActions();
  const [limit, setLimit] = useState(BATCH);
  const [filled, setFilled] = useState(STEP);
  const entering = useRef(enter);
  useEffect(() => {
    if (filled >= FIRST) {
      entering.current = false;
      return void 0;
    }
    const id = setTimeout(() => setFilled(count => count + STEP), 0);
    return () => clearTimeout(id);
  }, [filled]);
  const all = useRef(games);
  all.current = games;
  const renderItem = useCallback(
    ({item: game, index}) => (
      <GameCard
        game={game}
        width={CARD_WIDTH}
        detailed
        rowEnd={index % COLUMNS === COLUMNS - 1}
        enterDelay={entering.current ? index * STAGGER : void 0}
        onFocus={() => prefetchBelow(all.current, index)}
        onPress={() =>
          // Favorites can hold PS2 games, which have their own page.
          game.platform === 'ps2'
            ? push({name: 'ps2game', id: game.id}, `card:${game.id}`)
            : openGame(game.id, `card:${game.id}`)
        }
      />
    ),
    [openGame, push]
  );
  return (
    <VirtualList
      style={{marginTop: 36}}
      data={games.slice(0, filled < FIRST ? filled : limit)}
      numColumns={COLUMNS}
      itemHeight={CARD_HEIGHT}
      rowGap={40}
      columnGap={24}
      initialNumRows={3}
      keyExtractor={game => game.id}
      onEndReached={() => setLimit(count => count + BATCH)}
      renderItem={renderItem}
    />
  );
}, sameGrid);

function FiltersLabel({count}) {
  const t = useT();
  const focused = useIsFocused();
  return (
    <>
      <FocusRing />
      <Text
        focused={focused}
        style={[
          {fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3d9', lineHeight: 30},
          focused ? {color: '#f2f2f3'} : null
        ]}
      >
        {t('filters.title')}
      </Text>
      {count > 0 && (
        <View
          style={{
            height: 30,
            minWidth: 30,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14999,
            backgroundColor: '#f2f2f3',
            paddingHorizontal: 9
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 18,
              fontWeight: 600,
              color: '#000000',
              lineHeight: 24
            }}
          >
            {String(count)}
          </Text>
        </View>
      )}
      <ButtonGlyph button="triangle" size={18} />
    </>
  );
}

export function Catalog({onOpenFilters}) {
  const t = useT();
  const {rtl} = useLocale();
  const store = useStore();
  const {filters, query} = store;
  const results = useMemo(
    () => sortGames(filterGames(store), store.sort),
    [filters, query, store.wishlist, store.sort]
  );
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);
  const signature = JSON.stringify([filters, query, store.sort]);
  const title = query
    ? t('catalog.resultsFor', {query})
    : filters.wishlist
      ? t('catalog.favorites')
      : t('catalog.library');
  const filtersCount = activeCount(filters) - Number(filters.wishlist);
  const onAction = action => {
    if (action !== 'triangle') return false;
    onOpenFilters();
    return true;
  };
  return (
    <FocusScope restoreFocus={false} onAction={onAction}>
      <View scrollAnchor>
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 30,
            fontWeight: 600,
            color: '#f2f2f3',
            lineHeight: 42,
            letterSpacing: -0.75
          }}
        >
          {fitBytes(title, SPAN_MAX)}
          <Text style={{fontWeight: 400, color: '#8a8a94'}}>
            {fitBytes(`  ${t('catalog.gameCount', {count: results.length})}`, SPAN_MAX)}
          </Text>
        </Text>
        <View
          style={{
            zIndex: 10,
            marginTop: 24,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12
          }}
        >
          <View
            focusKey="catalog:filters"
            onPress={onOpenFilters}
            style={_state => [
              {
                height: 60,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderRadius: 14999,
                backgroundColor: '#17171a'
              },
              rtl ? {paddingRight: 24, paddingLeft: 18} : {paddingLeft: 24, paddingRight: 18},
              _state.focused ? {backgroundColor: '#2b2b30'} : null
            ]}
          >
            <FiltersLabel count={filtersCount} />
          </View>
          <SortSelect />
          <ActiveFilters />
        </View>
        {results.length > 0 ? (
          <Grid key={signature} games={results} signature={signature} enter={settled.current} />
        ) : (
          <EmptyState
            query={query}
            onlyWishlist={filters.wishlist && activeCount(filters) === 1}
            onClear={store.clearFilters}
          />
        )}
      </View>
    </FocusScope>
  );
}
