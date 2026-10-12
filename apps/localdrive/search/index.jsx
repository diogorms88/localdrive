import {useEffect, useRef, useState} from 'react';
import {View, Text, motion, ScrollView, VirtualList, FocusScope} from '@ps5-react/core';
import {fitBytes, SPAN_MAX} from '../i18n/fit.js';
import {useT, useLocale} from '../i18n/index.js';
import {useQuery, useStoreActions} from '../state/store.jsx';
import {colors} from '../ui/colors.js';
import {Icon} from '../ui/Icon.jsx';
import {GameCard, useFavoriteAction} from '../ui/GameCard.jsx';
import {useNavActions} from '../state/nav.jsx';
import {Keyboard} from './Keyboard.jsx';
import {rememberSearch} from './history.js';
import {searchGames} from './match.js';
import {CARD_WIDTH, NoResults, COLUMNS, Suggestions} from './Suggestions.jsx';
import '../assets/Inter-Regular.ttf';

const CARD_HEIGHT = Math.round((CARD_WIDTH * 4) / 3) + 54;

const SETTLE_MS = 150;

const blink = {duration: 0.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse'};

function QueryField({query}) {
  const t = useT();
  const {rtl} = useLocale();
  return (
    <View
      style={{
        width: 564,
        height: 84,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14999,
        borderWidth: 2,
        borderColor: '#ffffff33',
        backgroundColor: '#ffffff0d',
        paddingHorizontal: 30
      }}
    >
      <Icon name="search" size={20} color={colors.subtle} />
      {query ? (
        <Text
          style={[
            rtl
              ? {marginRight: 18, fontFamily: 'Inter-Regular', fontSize: 27, color: '#f2f2f3', lineHeight: 36}
              : {marginLeft: 18, fontFamily: 'Inter-Regular', fontSize: 27, color: '#f2f2f3', lineHeight: 36},
            {writingDirection: 'ltr'}
          ]}
        >
          {query}
        </Text>
      ) : null}
      <motion.View
        style={[
          {width: 2, height: 30, backgroundColor: '#f2f2f3'},
          query ? (rtl ? {marginRight: 3} : {marginLeft: 3}) : rtl ? {marginRight: 18} : {marginLeft: 18}
        ]}
        initial={{opacity: 1}}
        animate={{opacity: 0}}
        transition={blink}
      />
      {query ? null : (
        <Text
          style={
            rtl
              ? {marginRight: 6, fontFamily: 'Inter-Regular', fontSize: 27, color: '#8a8a94', lineHeight: 36}
              : {marginLeft: 6, fontFamily: 'Inter-Regular', fontSize: 27, color: '#8a8a94', lineHeight: 36}
          }
        >
          {t('search.placeholder')}
        </Text>
      )}
    </View>
  );
}

function useSettled(query) {
  const [settled, setSettled] = useState(query);
  const typed = Math.abs(query.length - settled.length) === 1;
  useEffect(() => {
    const id = setTimeout(() => setSettled(query), typed ? SETTLE_MS : 0);
    return () => clearTimeout(id);
  }, [query]);
  return typed ? settled : query;
}

function Results({query, onOpenGame}) {
  const t = useT();
  const results = searchGames(query);
  if (!results.length) return <NoResults query={query.trim()} />;
  return (
    <>
      <Text
        style={{
          marginBottom: 6,
          paddingHorizontal: 12,
          fontFamily: 'Inter-Regular',
          fontSize: 30,
          fontWeight: 600,
          color: '#f2f2f3',
          lineHeight: 42,
          letterSpacing: -0.75
        }}
      >
        {fitBytes(t('search.resultsFor', {query: query.trim()}), SPAN_MAX)}
        <Text style={{fontWeight: 400, color: '#8a8a94'}}>
          {fitBytes(`  ${t('catalog.gameCount', {count: results.length})}`, SPAN_MAX)}
        </Text>
      </Text>
      <ScrollView key={query} style={{flex: 1}}>
        <VirtualList
          style={{paddingHorizontal: 12, paddingTop: 18, paddingBottom: 48}}
          data={results}
          numColumns={COLUMNS}
          itemHeight={CARD_HEIGHT}
          rowGap={16}
          columnGap={16}
          keyExtractor={game => game.id}
          renderItem={(
            {item: game, index} // Right stops at the row's end instead of falling through to the header.
          ) => (
            <GameCard
              game={game}
              width={CARD_WIDTH}
              onPress={() => onOpenGame(game)}
              rowEnd={index % COLUMNS === COLUMNS - 1 || index === results.length - 1}
            />
          )}
        />
      </ScrollView>
    </>
  );
}

export function SearchScreen({onBack, onOpenGame}) {
  const query = useQuery();
  const settled = useSettled(query);
  const {setQuery} = useStoreActions();
  const favorite = useFavoriteAction();
  const {focusLater} = useNavActions();
  const current = useRef(query);
  current.current = query;
  const [on] = useState(() => ({
    submit: () => {
      rememberSearch(current.current);
      focusLater('search-results');
    },
    search: term => {
      setQuery(term);
      focusLater('search-results');
    },
    openGame: game => {
      rememberSearch(current.current);
      onOpenGame(game);
    }
  }));
  const back = () => {
    setQuery('');
    onBack();
    return true;
  };
  const onAction = action => {
    if (action === 'l2') setQuery('');
    else if (action === 'r2') on.submit();
    else return favorite(action);
    return true;
  };
  return (
    <FocusScope autoFocus onBack={back} onAction={onAction}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          gap: 72,
          backgroundColor: '#000000',
          paddingHorizontal: 48,
          paddingTop: 48
        }}
      >
        <View style={{gap: 36}}>
          <QueryField query={query} />
          <Keyboard onChange={setQuery} onSubmit={on.submit} />
        </View>
        <View style={{flex: 1}}>
          <FocusScope focusKey="search-results">
            {settled.trim() ? (
              <Results query={settled} onOpenGame={on.openGame} />
            ) : (
              <Suggestions onSearch={on.search} onOpenGame={on.openGame} />
            )}
          </FocusScope>
        </View>
      </View>
    </FocusScope>
  );
}
