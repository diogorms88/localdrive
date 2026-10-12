import {useIsFocused, Text, FocusScope, View, ScrollView} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {games} from '../data/catalog.js';
import {genreLabel, NO_FILTERS} from '../state/catalog.js';
import {colors} from '../ui/colors.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import {GameCard} from '../ui/GameCard.jsx';
import {useNavActions} from '../state/nav.jsx';
import {HINT, useHints} from '../ui/Legend.jsx';
import {useSearchHistory, forgetSearch} from './history.js';
import {useShowLibrary} from '../ui/useSections.js';
import '../assets/Inter-Regular.ttf';

export const CARD_WIDTH = 182;

export const COLUMNS = 4;

const POPULAR = [...games].sort((a, b) => b.recommendations - a.recommendations).slice(0, 2 * COLUMNS);

const GENRES = Object.entries(
  games
    .flatMap(game => game.genres)
    .reduce((counts, genre) => ({...counts, [genre]: (counts[genre] ?? 0) + 1}), {})
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([genre]) => genre);

const RECENT_HINTS = [
  {button: 'cross', label: 'hints.search'},
  {button: 'square', label: 'hints.remove'},
  HINT.clear,
  HINT.back
];

function PillFace({label, icon, hints}) {
  const focused = useIsFocused();
  useHints(focused ? hints : null);
  return (
    <>
      <FocusRing round="full" />
      <Icon name={icon} size={18} color={focused ? colors.fg : colors.muted} />
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 24, color: '#f2f2f3', lineHeight: 36}}>
        {label}
      </Text>
    </>
  );
}

function Pill({label, icon, hints, onPress, onAction}) {
  return (
    <FocusScope onAction={onAction}>
      <View
        onPress={onPress}
        style={_state => [
          {
            height: 72,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 14999,
            backgroundColor: '#17171a',
            paddingHorizontal: 30
          },
          _state.focused ? {backgroundColor: '#212125'} : null
        ]}
      >
        <PillFace label={label} icon={icon} hints={hints} />
      </View>
    </FocusScope>
  );
}

const Title = ({children}) => (
  <Text
    style={{
      marginBottom: 24,
      fontFamily: 'Inter-Regular',
      fontSize: 30,
      fontWeight: 600,
      color: '#f2f2f3',
      lineHeight: 42,
      letterSpacing: -0.75
    }}
  >
    {children}
  </Text>
);

export function Suggestions({onSearch, onOpenGame}) {
  const t = useT();
  const recent = useSearchHistory();
  const {focusLater} = useNavActions();
  return (
    <ScrollView style={{flex: 1, paddingHorizontal: 12}}>
      {recent.length > 0 ? (
        <View style={{marginBottom: 60}}>
          <Title>{t('search.recent')}</Title>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 18}}>
            {recent.map(term => (
              <Pill
                key={term}
                label={term}
                icon="search"
                hints={RECENT_HINTS}
                onPress={() => onSearch(term)}
                onAction={action => {
                  if (action !== 'square') return false;
                  forgetSearch(term);
                  focusLater('search-results');
                  return true;
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
      <Title>{t('search.popular')}</Title>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 24, paddingBottom: 48}}>
        {POPULAR.map((game, index) => (
          <GameCard
            key={game.id}
            game={game}
            width={CARD_WIDTH}
            onPress={() => onOpenGame(game)}
            rowEnd={index % COLUMNS === COLUMNS - 1}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export function NoResults({query}) {
  const t = useT();
  const showLibrary = useShowLibrary();
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingBottom: 144}}>
      <Icon name="searchX" size={32} color={colors.subtle} />
      <Text
        style={{
          width: 900,
          fontFamily: 'Inter-Regular',
          fontSize: 27,
          fontWeight: 600,
          color: '#f2f2f3',
          textAlign: 'center',
          numberOfLines: 1,
          ellipsizeMode: 'tail',
          lineHeight: 42
        }}
      >
        {t('search.noMatch', {query})}
      </Text>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 24, color: '#a3a3ab', lineHeight: 36}}>
        {t('search.tryGenre')}
      </Text>
      <View
        style={{
          marginTop: 24,
          width: 960,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 18
        }}
      >
        {GENRES.map(genre => (
          <Pill
            key={genre}
            label={genreLabel(genre)}
            icon="chevronRight"
            onPress={() => showLibrary({...NO_FILTERS, genre: [genre]}, 'relevance')}
          />
        ))}
      </View>
    </View>
  );
}
