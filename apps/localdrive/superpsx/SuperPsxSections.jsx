import {useMemo, useState} from 'react';
import {Text, View, ScrollView, VirtualList} from '@ps5-react/core';
import {useT, useLocale, latin} from '../i18n/index.js';
import {genreLabel} from '../state/catalog.js';
import {useNavActions} from '../state/nav.jsx';
import {GameRail} from '../browse/GameRail.jsx';
import {GenreCard} from '../browse/GenreCard.jsx';
import {Button} from '../ui/Button.jsx';
import {Chip} from '../ui/Chip.jsx';
import {GameCard} from '../ui/GameCard.jsx';
import {Cover} from '../ui/Cover.jsx';
import {FocusFrame} from '../ui/FocusRing.jsx';
import {Menu, MenuItem} from '../ui/Menu.jsx';
import {SectionHeader} from '../ui/SectionHeader.jsx';
import {superPsxBrowse, useSuperPsxBrowse, useSuperPsxRecent} from './library.js';
import '../assets/Inter-Regular.ttf';

const SORTS = [
  {id: 'popular', key: 'ps2.sort.popular'},
  {id: 'recent', key: 'ps2.sort.recent'},
  {id: 'title', key: 'ps2.sort.title'},
  {id: 'titleDesc', key: 'ps2.sort.titleDesc'}
];
const COLUMNS = 6;
const byRecent = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.title.localeCompare(b.title);
const titleSort = (a, b) => a.title.localeCompare(b.title);
const randomSubset = games => {
  const copy = [...games];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy.slice(0, 15);
};

function useOpenGame() {
  const {push} = useNavActions();
  return (game, from) => push({name: 'superpsxgame', id: game.id}, from);
}

function CardRail({title, games, prefix}) {
  const open = useOpenGame();
  if (!games.length) return null;
  return <GameRail title={title}>{games.map((game, index) => {
    const key = `${prefix}:${game.id}`;
    return <GameCard key={game.id} game={game} width={152} detailed focusKey={key} rowEnd={index === games.length - 1}
      onPress={() => open(game, key)} />;
  })}</GameRail>;
}

function ChartRow({rank, game, focusKey}) {
  const {rtl} = useLocale();
  return <>
    <FocusFrame />
    <Text style={{width: 22, fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>{String(rank)}</Text>
    <Cover game={game} style={{width: 66, height: 87, borderRadius: 9}} label={false} />
    <View style={{flex: 1}}>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', numberOfLines: 1, ellipsizeMode: 'tail'}}>{latin(rtl, game.title)}</Text>
      <Text style={{marginTop: 6, fontFamily: 'Inter-Regular', fontSize: 18, color: '#a3a3ab', numberOfLines: 1, ellipsizeMode: 'tail'}}>{game.genres.slice(0, 2).map(genreLabel).join(', ')}</Text>
    </View>
  </>;
}

function ChartList({title, games, prefix}) {
  const open = useOpenGame();
  if (!games.length) return null;
  return <View style={{flex: 1}}>
    <SectionHeader title={title} />
    {games.slice(0, 5).map((game, index) => {
      const key = `${prefix}:${game.id}`;
      return <View key={game.id} focusKey={key} onPress={() => open(game, key)} style={state => [
        {position: 'relative', marginHorizontal: -12, flexDirection: 'row', alignItems: 'center', gap: 18, borderRadius: 12, padding: 12},
        state.focused ? {backgroundColor: '#17171a'} : null
      ]}><ChartRow rank={index + 1} game={game} focusKey={key} /></View>;
    })}
  </View>;
}

function GenreRail({games}) {
  const t = useT();
  const {filters} = useSuperPsxBrowse();
  const counts = useMemo(() => {
    const result = new Map();
    for (const game of games) for (const genre of game.genres) result.set(genre, (result.get(genre) || 0) + 1);
    return [...result].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [games]);
  const gamesByGenre = genre => games.filter(game => game.genres.includes(genre)).slice(0, 3);
  if (!counts.length) return null;
  return <View scrollAnchor>
    <SectionHeader title={t('browse.popularGenres')} />
    <View style={{position: 'relative', marginHorizontal: -9, marginVertical: -30}}>
      <ScrollView style={{flexDirection: 'row', gap: 18, paddingHorizontal: 9, paddingVertical: 30, direction: 'ltr'}}>
        {counts.map(([genre, count]) => <GenreCard key={genre} focusKey={`superpsx:genre:${genre}`} genre={genre} count={count}
          covers={gamesByGenre(genre)} active={filters.genre.includes(genre)} onToggle={superPsxBrowse.toggleGenre} />)}
      </ScrollView>
    </View>
  </View>;
}

function SortControl({sort}) {
  const t = useT();
  const {rtl} = useLocale();
  const [open, setOpen] = useState(false);
  const selected = SORTS.find(item => item.id === sort) || SORTS[0];
  return <View style={{position: 'relative', zIndex: 10}}>
    <Button variant="secondary" size="md" label={`${t('sort.label')}  ${t(selected.key)}`} focusKey="superpsx:sort" onPress={() => setOpen(value => !value)} />
    <Menu open={open} onClose={() => setOpen(false)} align={rtl ? 'right' : 'left'} rows={SORTS.length}>
      {SORTS.map(item => <MenuItem key={item.id} label={t(item.key)} checked={sort === item.id} onSelect={() => superPsxBrowse.setSort(item.id)} />)}
    </Menu>
  </View>;
}

function Grid({games, onLoadMore}) {
  const open = useOpenGame();
  return <VirtualList style={{marginTop: 36}} data={games} numColumns={COLUMNS} itemHeight={339} rowGap={40} columnGap={24}
    initialNumRows={3} keyExtractor={game => game.id} onEndReached={onLoadMore} renderItem={({item: game, index}) => {
      const key = `superpsx:${game.id}`;
      return <GameCard game={game} width={182} detailed rowEnd={index % COLUMNS === COLUMNS - 1 || index === games.length - 1}
        focusKey={key} onPress={() => open(game, key)} />;
    }} />;
}

export function SuperPsxLibrary({games, catalog = games, onLoadMore, loadingMore, loadError, retry, hasMore}) {
  const t = useT();
  const {rtl} = useLocale();
  const {filters, sort} = useSuperPsxBrowse();
  const genres = [...new Set(games.flatMap(game => game.genres))].sort();
  const results = useMemo(() => {
    let pool = games.filter(game => !filters.genre.length || filters.genre.every(genre => game.genres.includes(genre)));
    if (sort === 'recent') pool = [...pool].sort(byRecent);
    else if (sort === 'title') pool = [...pool].sort(titleSort);
    else if (sort === 'titleDesc') pool = [...pool].sort((a, b) => titleSort(b, a));
    return pool;
  }, [games, filters, sort]);
  const popular = useMemo(() => randomSubset(games), [games]);
  const recentIds = useSuperPsxRecent();
  const recent = recentIds.map(id => catalog.find(game => game.id === id)).filter(Boolean);
  const newest = useMemo(() => [...games].sort(byRecent).slice(0, 5), [games]);
  const clearGenre = genre => superPsxBrowse.toggleGenre(genre);
  return <>
    {games.length ? <CardRail title={t('browse.popularNow')} games={popular} prefix="superpsx:popular" /> : null}
    <CardRail title={t('browse.recentlyViewed')} games={recent} prefix="superpsx:recent" />
    {games.length ? <View scrollAnchor style={{flexDirection: 'row', gap: 48}}>
      <ChartList title={t('ps2.chart.popular')} games={games.slice(0, 5)} prefix="superpsx:chart:popular" />
      <ChartList title={t('ps2.chart.recent')} games={newest} prefix="superpsx:chart:recent" />
      <ChartList title={t('superpsx.chart.featured')} games={popular.slice(0, 5)} prefix="superpsx:chart:featured" />
    </View> : null}
    <GenreRail games={games} />
    <View scrollAnchor>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 30, fontWeight: 600, color: '#f2f2f3', lineHeight: 42}}>
        {t('catalog.library')}<Text style={{fontWeight: 400, color: '#8a8a94'}}>{`  ${t('catalog.gameCount', {count: results.length})}`}</Text>
      </Text>
      <View style={{marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12}}>
        <SortControl sort={sort} />
        {filters.genre.map(genre => <Chip key={genre} focusKey={`superpsx:chip:${genre}`} label={genreLabel(genre)} onPress={() => clearGenre(genre)} />)}
        {filters.genre.length > 1 ? <Button variant="ghost" size="md" label={t('filters.clearAll')} focusKey="superpsx:clear" onPress={superPsxBrowse.clearFilters} /> : null}
      </View>
      {genres.length ? <Text style={{marginTop: 18, fontFamily: 'Inter-Regular', fontSize: 18, color: '#8a8a94'}}>{genres.slice(0, 8).map(genreLabel).join('  ·  ')}</Text> : null}
      {results.length ? <Grid key={`${sort}:${filters.genre.join(',')}`} games={results} onLoadMore={onLoadMore} /> : <Text style={{marginTop: 36, fontFamily: 'Inter-Regular', fontSize: 23, color: '#a3a3ab'}}>{t('catalog.empty.filtersTitle')}</Text>}
      {loadingMore ? <Text style={{marginTop: 32, fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab'}}>Loading more games…</Text> : null}
      {loadError ? <View style={{marginTop: 24}}><Button variant="outline" size="md" label="Retry loading games" focusKey="superpsx:retry-more" onPress={retry} /></View> : null}
      {!loadingMore && !loadError && hasMore ? <Text style={{marginTop: 18, fontFamily: 'Inter-Regular', fontSize: 18, color: '#8a8a94'}}>Scroll down to load more</Text> : null}
    </View>
  </>;
}
