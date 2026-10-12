import {Text, View} from '@ps5-react/core';
import {useT, useLocale, latin} from '../i18n/index.js';
import {games} from '../data/catalog.js';
import {showcase, sortGames, formatCount, formatDate, NO_FILTERS, sortLabel} from '../state/catalog.js';
import {useStoreActions} from '../state/store.jsx';
import {prefetchWhenSettled} from '../game/art.js';
import {Cover} from '../ui/Cover.jsx';
import {FocusFrame} from '../ui/FocusRing.jsx';
import {lightGame, unlight} from '../ui/lightBar.js';
import {useNavActions} from '../state/nav.jsx';
import {SectionHeader} from '../ui/SectionHeader.jsx';
import '../assets/Inter-Regular.ttf';

const CHARTS = ['relevance', 'newest', 'rating'].map(id => ({id, games: showcase(sortGames(games, id), 5)}));

const DETAIL = {
  relevance: (t, game) => t('browse.reviews', {count: formatCount(game.recommendations)}),
  newest: (t, game) => formatDate(game.releaseDate)
};

const thumb = {width: 66, height: 87, borderRadius: 9};

function Detail({chart, game}) {
  const t = useT();
  if (chart !== 'rating')
    return (
      <Text style={{marginTop: 6, fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab'}}>
        {DETAIL[chart](t, game)}
      </Text>
    );
  return (
    <View style={{marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 9}}>
      <View style={{borderRadius: 3, backgroundColor: '#f2f2f3', paddingHorizontal: 9}}>
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            fontWeight: 700,
            color: '#000000',
            lineHeight: 30
          }}
        >
          {String(game.metacritic ?? '\u2014')}
        </Text>
      </View>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab'}}>Metacritic</Text>
    </View>
  );
}

function Row({rank, game, chart}) {
  const {rtl} = useLocale();
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
        <Detail chart={chart} game={game} />
      </View>
    </>
  );
}

export function TopCharts() {
  useT();
  const {openGame, focusLater} = useNavActions();
  const {setFilters, setQuery, setSort} = useStoreActions();
  const seeAll = id => {
    setFilters(NO_FILTERS);
    setQuery('');
    setSort(id);
    focusLater('catalog:sort');
  };
  return (
    <View scrollAnchor style={{flexDirection: 'row', gap: 48}}>
      {CHARTS.map(chart => (
        <View key={chart.id} style={{flex: 1}}>
          <SectionHeader title={sortLabel(chart.id)} onSeeAll={() => seeAll(chart.id)} />
          {chart.games.map((game, index) => {
            const key = `chart:${chart.id}:${game.id}`;
            return (
              <View
                key={game.id}
                focusKey={key}
                onPress={() => openGame(game.id, key)}
                onFocus={() => {
                  prefetchWhenSettled(game);
                  lightGame(key, game);
                }}
                onBlur={() => unlight(key)}
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
                <Row rank={index + 1} game={game} chart={chart.id} />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
