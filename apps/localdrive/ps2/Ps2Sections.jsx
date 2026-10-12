import {memo, useMemo, useState} from 'react';
import {useIsFocused, Text, View, ScrollView, VirtualList, FocusScope} from '@ps5-react/core';
import {useT, useLocale, latin} from '../i18n/index.js';
import {genreLabel} from '../state/catalog.js';
import {useNavActions} from '../state/nav.jsx';
import {GameRail} from '../browse/GameRail.jsx';
import {GenreCard} from '../browse/GenreCard.jsx';
import {ButtonGlyph} from '../ui/ButtonHints.jsx';
import {Chip} from '../ui/Chip.jsx';
import {colors} from '../ui/colors.js';
import {Cover} from '../ui/Cover.jsx';
import {FocusFrame, FocusRing} from '../ui/FocusRing.jsx';
import {GameCard} from '../ui/GameCard.jsx';
import {Icon} from '../ui/Icon.jsx';
import {Menu, MenuItem} from '../ui/Menu.jsx';
import {SectionHeader} from '../ui/SectionHeader.jsx';
import {SideSheet} from '../ui/SideSheet.jsx';
import {loadPs2Details} from './source.js';
import {
  POPULAR,
  PS2_GENRES,
  PS2_SORTS,
  REGIONS,
  EDITIONS,
  NO_PS2_FILTERS,
  genresOf,
  regionsOf,
  editionOf,
  sortPs2,
  filterPs2,
  ps2FilterCount,
  ps2Browse,
  usePs2Browse,
  usePs2Recent
} from './library.js';
import '../assets/Inter-Regular.ttf';

export const LIBRARY_SORT_KEY = 'ps2lib:sort';
export const LIBRARY_FILTERS_KEY = 'ps2lib:filters';

const regionLabel = (t, region) => t(`ps2.region.${region}`);

const sortName = (t, id) => t(`ps2.sort.${id}`);

const shuffled = list => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const byIds = (games, ids) => {
  const index = new Map(games.map(game => [game.id, game]));
  return ids.map(id => index.get(id)).filter(Boolean);
};

// Opens a PS2 game's page; Back returns focus to `from`.
export function useOpenPs2Game() {
  const {push} = useNavActions();
  return (game, from) => push({name: 'ps2game', id: game.id}, from);
}

// Focus the library's sort control after a "see all" changed what it shows.
function useShowLibrary() {
  const {focusLater} = useNavActions();
  return (sort, filters = NO_PS2_FILTERS) => {
    ps2Browse.reset();
    ps2Browse.setSort(sort);
    for (const [key, values] of Object.entries(filters)) for (const value of values) ps2Browse.toggle(key, value);
    focusLater(LIBRARY_SORT_KEY);
  };
}

function CardRail({title, games, prefix, onSeeAll}) {
  const open = useOpenPs2Game();
  return (
    <GameRail title={title} onSeeAll={onSeeAll} seeAllKey={onSeeAll ? `${prefix}:all` : void 0}>
      {games.map((game, index) => {
        const key = `${prefix}:${game.id}`;
        return (
          <GameCard
            key={game.id}
            game={game}
            width={152}
            detailed
            focusKey={key}
            rowEnd={index === games.length - 1}
            onFocus={() => loadPs2Details(game.id)}
            onPress={() => open(game, key)}
          />
        );
      })}
    </GameRail>
  );
}

// Fifteen of the best-known titles, in a new order each time the tab opens.
export function Ps2PopularRail({games}) {
  const t = useT();
  const show = useShowLibrary();
  const [ids] = useState(() => shuffled(POPULAR.slice(0, 40)).slice(0, 15));
  return (
    <CardRail
      title={t('browse.popularNow')}
      games={byIds(games, ids)}
      prefix="ps2pop"
      onSeeAll={() => show('popular')}
    />
  );
}

export function Ps2RecentRail({games}) {
  const t = useT();
  const recent = byIds(games, usePs2Recent());
  if (!recent.length) return null;
  return <CardRail title={t('browse.recentlyViewed')} games={recent} prefix="ps2recent" />;
}

const thumb = {width: 66, height: 87, borderRadius: 9};

function ChartRow({rank, game}) {
  const t = useT();
  const {rtl} = useLocale();
  const genre = genresOf(game)[0];
  return (
    <>
      <FocusFrame />
      <Text style={{width: 18, fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
        {String(rank)}
      </Text>
      <Cover game={game} style={thumb} label={false} />
      <View style={{flex: 1}}>
        <Text
          style={{
            width: 444,
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            color: '#f2f2f3',
            numberOfLines: 1,
            ellipsizeMode: 'tail',
            lineHeight: 30
          }}
        >
          {latin(rtl, game.title)}
        </Text>
        <Text
          style={{
            marginTop: 6,
            width: 444,
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            color: '#a3a3ab',
            numberOfLines: 1,
            ellipsizeMode: 'tail'
          }}
        >
          {[regionsOf(game).map(region => regionLabel(t, region)).join(', '), genre && genreLabel(genre)]
            .filter(Boolean)
            .join(' \xB7 ')}
        </Text>
      </View>
    </>
  );
}

// Most popular, recently added and fan-modified editions, five each, like Discover's top charts.
export function Ps2Charts({games}) {
  const t = useT();
  const open = useOpenPs2Game();
  const show = useShowLibrary();
  const charts = useMemo(
    () => [
      {id: 'popular', title: t('ps2.chart.popular'), games: byIds(games, POPULAR.slice(0, 5)), see: () => show('popular')},
      {id: 'recent', title: t('ps2.chart.recent'), games: games.slice(0, 5), see: () => show('recent')},
      {
        id: 'modified',
        title: t('ps2.chart.modified'),
        games: games.filter(game => editionOf(game) === 'modified').slice(0, 5),
        see: () => show('recent', {...NO_PS2_FILTERS, edition: ['modified']})
      }
    ],
    [games, t]
  );
  return (
    <View scrollAnchor style={{flexDirection: 'row', gap: 48}}>
      {charts.map(chart => (
        <View key={chart.id} style={{flex: 1}}>
          <SectionHeader title={chart.title} onSeeAll={chart.see} focusKey={`ps2chart:${chart.id}:all`} />
          {chart.games.map((game, index) => {
            const key = `ps2chart:${chart.id}:${game.id}`;
            return (
              <View
                key={game.id}
                focusKey={key}
                onPress={() => open(game, key)}
                style={_state => [
                  {
                    position: 'relative',
                    marginHorizontal: -12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 21,
                    borderRadius: 12,
                    padding: 12
                  },
                  _state.focused ? {backgroundColor: '#17171a'} : null
                ]}
              >
                <ChartRow rank={index + 1} game={game} />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// The genres with the most games; each card toggles that genre in the library below.
export function Ps2GenreRail({games}) {
  const t = useT();
  const {filters} = usePs2Browse();
  const rail = useMemo(() => {
    const ranked = sortPs2(games, 'popular');
    const used = new Set();
    return PS2_GENRES.slice(0, 14).map(genre => {
      const matches = ranked.filter(game => genresOf(game).includes(genre));
      const covers = [
        ...matches.filter(game => !used.has(game.id)),
        ...matches.filter(game => used.has(game.id))
      ].slice(0, 3);
      covers.forEach(game => used.add(game.id));
      return {genre, count: matches.length, covers};
    });
  }, [games]);
  const [toggle] = useState(() => genre => ps2Browse.toggle('genre', genre));
  return (
    <View scrollAnchor>
      <SectionHeader title={t('browse.popularGenres')} />
      <View style={{position: 'relative', marginHorizontal: -9, marginVertical: -30}}>
        <ScrollView
          style={[
            {flexDirection: 'row', gap: 18, paddingHorizontal: 9, paddingVertical: 30},
            {direction: 'ltr'}
          ]}
        >
          {rail.map(({genre, count, covers}) => (
            <GenreCard
              key={genre}
              focusKey={`ps2genre:${genre}`}
              genre={genre}
              count={count}
              covers={covers}
              active={filters.genre.includes(genre)}
              onToggle={toggle}
            />
          ))}
        </ScrollView>
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 96,
            backgroundGradient: {
              type: 'linear',
              to: 'right',
              stops: [
                {color: 'transparent', offset: 0},
                {color: '#000000', offset: 1}
              ]
            }
          }}
        />
      </View>
    </View>
  );
}

function PillLabel({children, glyph}) {
  const focused = useIsFocused();
  return (
    <>
      <FocusRing round="full" />
      <Text
        style={[
          {fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30},
          focused ? {color: '#f2f2f3'} : null
        ]}
      >
        {children}
      </Text>
      {glyph}
    </>
  );
}

const pill = (rtl, open) => _state => [
  {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14999,
    backgroundColor: '#17171a'
  },
  rtl ? {paddingRight: 24, paddingLeft: 18} : {paddingLeft: 24, paddingRight: 18},
  open || _state.focused ? {backgroundColor: '#2b2b30'} : null
];

function FilterCount({count}) {
  if (!count) return null;
  return (
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
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 18, fontWeight: 600, color: '#000000', lineHeight: 24}}>
        {String(count)}
      </Text>
    </View>
  );
}

function SortControl({sort}) {
  const t = useT();
  const {rtl} = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <View style={{position: 'relative', zIndex: 10}}>
      <View
        focusKey={LIBRARY_SORT_KEY}
        selected={open}
        onPress={() => setOpen(value => !value)}
        style={pill(rtl, open)}
      >
        <PillLabel glyph={<Icon name={open ? 'chevronUp' : 'chevronDown'} color={colors.muted} />}>
          {t('sort.label')}
          <Text style={{color: '#f2f2f3'}}>{`  ${sortName(t, sort)}`}</Text>
        </PillLabel>
      </View>
      <Menu open={open} onClose={() => setOpen(false)} align="left" rows={PS2_SORTS.length}>
        {PS2_SORTS.map(option => (
          <MenuItem
            key={option.id}
            label={sortName(t, option.id)}
            checked={sort === option.id}
            onSelect={() => ps2Browse.setSort(option.id)}
          />
        ))}
      </Menu>
    </View>
  );
}

const filterLabel = (t, key, value) =>
  key === 'genre' ? genreLabel(value) : key === 'region' ? regionLabel(t, value) : t(`ps2.edition.${value}`);

function ActiveChips({filters}) {
  const t = useT();
  const {focusLater} = useNavActions();
  const chips = Object.entries(filters).flatMap(([key, values]) =>
    values.map(value => ({key, value, label: filterLabel(t, key, value)}))
  );
  if (!chips.length) return null;
  return (
    <>
      {chips.map((chip, index) => (
        <Chip
          key={`${chip.key}:${chip.value}`}
          focusKey={`ps2chip:${chip.key}:${chip.value}`}
          label={chip.label}
          onPress={() => {
            const neighbour = chips[index + 1] ?? chips[index - 1];
            ps2Browse.toggle(chip.key, chip.value);
            focusLater(neighbour ? `ps2chip:${neighbour.key}:${neighbour.value}` : LIBRARY_FILTERS_KEY);
          }}
        />
      ))}
      {chips.length > 1 ? (
        <View
          onPress={() => {
            ps2Browse.clearFilters();
            focusLater(LIBRARY_FILTERS_KEY);
          }}
          style={_state => [
            {height: 60, justifyContent: 'center', borderRadius: 14999, paddingHorizontal: 24},
            _state.focused ? {backgroundColor: '#2b2b30'} : null
          ]}
        >
          <PillLabel>{t('filters.clearAll')}</PillLabel>
        </View>
      ) : null}
    </>
  );
}

const COLUMNS = 6;

const Grid = memo(function Grid({games}) {
  const open = useOpenPs2Game();
  return (
    <VirtualList
      style={{marginTop: 36}}
      data={games}
      numColumns={COLUMNS}
      itemHeight={339}
      rowGap={40}
      columnGap={24}
      initialNumRows={3}
      keyExtractor={game => game.id}
      renderItem={({item: game, index}) => (
        <GameCard
          game={game}
          width={182}
          detailed
          rowEnd={index % COLUMNS === COLUMNS - 1 || index === games.length - 1}
          focusKey={`ps2:${game.id}`}
          onFocus={() => loadPs2Details(game.id)}
          onPress={() => open(game, `ps2:${game.id}`)}
        />
      )}
    />
  );
});

function EmptyLibrary() {
  const t = useT();
  const {focusLater} = useNavActions();
  return (
    <View style={{marginTop: 48, alignItems: 'flex-start', gap: 18}}>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 24, color: '#f2f2f3'}}>
        {t('catalog.empty.filtersTitle')}
      </Text>
      <View
        onPress={() => {
          ps2Browse.clearFilters();
          focusLater(LIBRARY_FILTERS_KEY);
        }}
        style={pill(false, false)}
      >
        <PillLabel>{t('filters.clearAll')}</PillLabel>
      </View>
    </View>
  );
}

// "Browse library": every PS2 game, filtered by genre, region and edition and sorted. Triangle opens
// the filters, as on Discover.
export function Ps2Library({games, onOpenFilters}) {
  const t = useT();
  const {rtl} = useLocale();
  const {filters, sort} = usePs2Browse();
  const results = useMemo(() => sortPs2(filterPs2(games, filters), sort), [games, filters, sort]);
  const signature = JSON.stringify([filters, sort]);
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
          {t('catalog.library')}
          <Text style={{fontWeight: 400, color: '#8a8a94'}}>
            {`  ${t('catalog.gameCount', {count: results.length})}`}
          </Text>
        </Text>
        <View
          style={{zIndex: 10, marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12}}
        >
          <View focusKey={LIBRARY_FILTERS_KEY} onPress={onOpenFilters} style={pill(rtl, false)}>
            <PillLabel glyph={<ButtonGlyph button="triangle" size={18} />}>{t('filters.title')}</PillLabel>
            <FilterCount count={ps2FilterCount(filters)} />
          </View>
          <SortControl sort={sort} />
          <ActiveChips filters={filters} />
        </View>
        {results.length ? <Grid key={signature} games={results} /> : <EmptyLibrary />}
      </View>
    </FocusScope>
  );
}

function OptionFace({label, detail, checked}) {
  const focused = useIsFocused();
  return (
    <>
      <FocusRing />
      <View style={{flex: 1, gap: 3}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#f2f2f3'}}>{label}</Text>
        <Text
          style={[{fontFamily: 'Inter-Regular', fontSize: 21, lineHeight: 30}, {color: focused ? colors.fg : colors.muted}]}
        >
          {detail}
        </Text>
      </View>
      {checked ? <Icon name="check" color={colors.fg} /> : <View style={{width: 24, height: 24}} />}
    </>
  );
}

function SheetHeading({children}) {
  return (
    <Text
      style={{
        marginTop: 24,
        paddingHorizontal: 18,
        fontFamily: 'Inter-Regular',
        fontSize: 20,
        fontWeight: 600,
        color: '#8a8a94',
        letterSpacing: 1
      }}
    >
      {children}
    </Text>
  );
}

// The filters side sheet: region, edition and genre, each option with the games it would show.
export function Ps2FilterSheet({games, onClose}) {
  const t = useT();
  const {filters} = usePs2Browse();
  const facets = [
    {key: 'region', title: t('ps2.facts.region'), values: REGIONS, test: (game, value) => regionsOf(game).includes(value)},
    {key: 'edition', title: t('ps2.filter.edition'), values: EDITIONS, test: (game, value) => editionOf(game) === value},
    {key: 'genre', title: t('filters.facet.genre'), values: PS2_GENRES, test: (game, value) => genresOf(game).includes(value)}
  ];
  let first = true;
  return (
    <SideSheet title={t('filters.title')} subtitle={t('ps2.allGames')} onClose={onClose}>
      <View style={{gap: 6, padding: 9, paddingBottom: 48}}>
        {facets.map(facet => {
          // Count each option against the other facets' current choices.
          const pool = filterPs2(games, {...filters, [facet.key]: []});
          return (
            <View key={facet.key} style={{gap: 6}}>
              <SheetHeading>{facet.title}</SheetHeading>
              {facet.values.map(value => {
                const autoFocus = first;
                first = false;
                return (
                  <View
                    key={value}
                    focusKey={`ps2filter:${facet.key}:${value}`}
                    autoFocus={autoFocus}
                    onPress={() => ps2Browse.toggle(facet.key, value)}
                    style={_state => [
                      {
                        position: 'relative',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 24,
                        borderRadius: 12,
                        paddingHorizontal: 18,
                        paddingVertical: 18
                      },
                      _state.focused ? {backgroundColor: '#212125'} : null
                    ]}
                  >
                    <OptionFace
                      label={filterLabel(t, facet.key, value)}
                      detail={t('catalog.gameCount', {count: pool.filter(game => facet.test(game, value)).length})}
                      checked={filters[facet.key].includes(value)}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </SideSheet>
  );
}
