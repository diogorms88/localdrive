import {View, Text, FocusScope, Image} from '@ps5-react/core';
import {useT, useLocale, LATIN_IN_RTL} from '../i18n/index.js';
import {games} from '../data/catalog.js';
import {formatSize} from '../state/size.js';
import {fromArchive, summaryOf} from '../state/catalog.js';
import {FocusFrame} from '../ui/FocusRing.jsx';
import {lightGame, unlight} from '../ui/lightBar.js';
import {useFavoriteAction} from '../ui/GameCard.jsx';
import {useNavActions} from '../state/nav.jsx';
import '../assets/Inter-Regular.ttf';

const POOL = 24;

function selectTrio() {
  const popular = new Set(
    [...games]
      .sort((a, b) => b.recommendations - a.recommendations)
      .slice(0, 30)
      .map(game => game.id)
  );
  const pool = games
    .filter(game => game.art.hero && game.metacritic && fromArchive(game) && !popular.has(game.id))
    .sort((a, b) => b.metacritic - a.metacritic)
    .slice(5, 5 + POOL);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

const trio = selectTrio();

function Footer({game}) {
  const t = useT();
  return (
    <View
      style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 30}}
    >
      <Text
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 27,
          color: '#f2f2f3',
          textDecorationLine: 'underline',
          lineHeight: 42
        }}
      >
        {t('browse.viewGame')}
      </Text>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
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
            {String(game.metacritic)}
          </Text>
        </View>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
          {game.sizeGb ? `Metacritic \xB7 ${formatSize(game.sizeGb)}` : 'Metacritic'}
        </Text>
      </View>
    </View>
  );
}

function TrioCard({game}) {
  const {rtl} = useLocale();
  const {openGame} = useNavActions();
  const onAction = useFavoriteAction(game);
  return (
    <FocusScope onAction={onAction}>
      <View
        focusKey={`trio:${game.id}`}
        onPress={() => openGame(game.id, `trio:${game.id}`)}
        onFocus={() => lightGame(`trio:${game.id}`, game)}
        onBlur={() => unlight(`trio:${game.id}`)}
        style={_state => [
          {position: 'relative', margin: -12, width: 600, borderRadius: 24, padding: 12},
          _state.focused ? {backgroundColor: '#17171a'} : null
        ]}
      >
        <FocusFrame round="2xl" />
        <Image
          source={{uri: game.art.hero}}
          resizeMode="cover"
          style={{width: 576, height: 324, borderRadius: 12, backgroundColor: '#212125'}}
        />
        <View style={{paddingHorizontal: 6, paddingBottom: 6, paddingTop: 30}}>
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 30,
              fontWeight: 600,
              color: '#f2f2f3',
              numberOfLines: 1,
              ellipsizeMode: 'tail',
              lineHeight: 42
            }}
          >
            {game.title}
          </Text>
          <Text
            style={[
              {
                marginTop: 12,
                height: 108,
                fontFamily: 'Inter-Regular',
                fontSize: 24,
                color: '#a3a3ab',
                numberOfLines: 3,
                ellipsizeMode: 'tail',
                lineHeight: 36
              },
              rtl ? LATIN_IN_RTL : void 0
            ]}
          >
            {summaryOf(game)}
          </Text>
          <Footer game={game} />
        </View>
      </View>
    </FocusScope>
  );
}

export function FeatureTrio() {
  return (
    <View scrollAnchor style={{flexDirection: 'row', gap: 48}}>
      {trio.map(game => (
        <TrioCard key={game.id} game={game} />
      ))}
    </View>
  );
}
