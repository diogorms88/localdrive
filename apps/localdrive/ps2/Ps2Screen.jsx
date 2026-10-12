import {useState, useEffect} from 'react';
import {View, Text, Image, ScrollView, FocusScope, AnimatePresence, motion} from '@ps5-react/core';
import {useT, useLocale} from '../i18n/index.js';
import {genreLabel, summaryOf} from '../state/catalog.js';
import {useNavState, useNavActions} from '../state/nav.jsx';
import {Button} from '../ui/Button.jsx';
import {useFavoriteAction} from '../ui/GameCard.jsx';
import {WishHeart} from '../ui/WishHeart.jsx';
import {useStoreActions, useWishlist} from '../state/store.jsx';
import {Ps2PopularRail, Ps2RecentRail, Ps2Charts, Ps2GenreRail, Ps2Library, Ps2FilterSheet} from './Ps2Sections.jsx';
import {EASE_OUT} from '../ui/ease.js';
import {SpotlightList} from '../browse/SpotlightList.jsx';
import {useSlides} from '../browse/useSlides.js';
import {loadPs2Details, usePs2Catalog} from './source.js';
import {ps2Browse} from './library.js';
import '../assets/Inter-Regular.ttf';

// The PS2 section uses a virtualized grid so the complete catalog can be browsed smoothly.
const PREFIX = 'ps2spot';

const ART = {width: 1410, height: 660};

const fade = {type: 'tween', duration: 0.6, ease: EASE_OUT};

// Opens a PS2 game's page; Back returns focus to `from`.
function useOpenGame() {
  const {push} = useNavActions();
  return (game, from) => push({name: 'ps2game', id: game.id}, from);
}

// A screenshot as the slide's art; a game without one shows a gradient in its tint.
function Art({game}) {
  return (
    <AnimatePresence initial={false}>
      <motion.View
        key={game.id}
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        transition={fade}
        style={[
          {position: 'absolute', top: 0, left: 0, borderRadius: 18},
          ART,
          game.art.hero
            ? null
            : {
                backgroundGradient: {
                  type: 'linear',
                  angle: 120,
                  stops: [
                    {color: '#0d0d0f', offset: 0},
                    {color: game.art.tint, offset: 1}
                  ]
                }
              }
        ]}
      >
        {game.art.hero ? (
          <Image source={{uri: game.art.hero}} resizeMode="cover" style={[ART, {borderRadius: 18}]} />
        ) : null}
      </motion.View>
    </AnimatePresence>
  );
}

function Blurb({game}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.View
        key={game.id}
        style={{gap: 30}}
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        exit={{opacity: 0, y: -6, transition: {type: 'tween', duration: 0.15, ease: 'easeIn'}}}
        transition={{type: 'tween', duration: 0.45, ease: EASE_OUT}}
      >
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 66,
            fontWeight: 600,
            color: '#f2f2f3',
            lineHeight: 78
          }}
        >
          {game.title}
        </Text>
        <Text
          style={{
            marginBottom: -12,
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            color: '#a3a3ab',
            lineHeight: 30
          }}
        >
          {game.genres.map(genreLabel).join(' \xB7 ')}
        </Text>
        <Text
          style={{
            width: 552,
            fontFamily: 'Inter-Regular',
            fontSize: 23,
            color: '#f2f2f3d9',
            numberOfLines: 3,
            ellipsizeMode: 'tail',
            lineHeight: 37
          }}
        >
          {summaryOf(game)}
        </Text>
      </motion.View>
    </AnimatePresence>
  );
}

function Spotlight({games}) {
  const t = useT();
  const {rtl} = useLocale();
  const shown = useNavState().top.name === 'ps2';
  const slides = useSlides(games.length, shown);
  const open = useOpenGame();
  const game = games[slides.active];
  const {toggleWish} = useStoreActions();
  const wished = useWishlist().includes(game?.id);
  if (!game) return null;
  const side = rtl ? {right: 0} : {left: 0};
  return (
    <View style={{flexDirection: 'row', gap: 24}}>
      <View
        style={[
          {position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#212125'},
          ART
        ]}
      >
        <Art game={game} />
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundGradient: {
              type: 'linear',
              to: rtl ? 'left' : 'right',
              stops: [
                {color: '#000000', offset: 0},
                {color: '#000000bf', offset: 0.35},
                {color: 'transparent', offset: 0.75}
              ]
            }
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundGradient: {
              type: 'linear',
              to: 'top',
              stops: [
                {color: '#000000b3', offset: 0},
                {color: 'transparent', offset: 0.5}
              ]
            }
          }}
        />
        <View
          style={[
            {position: 'absolute', top: 0, bottom: 0, width: 672, justifyContent: 'flex-end', padding: 60},
            side
          ]}
        >
          <Blurb game={game} />
          <View style={{marginTop: 30, flexDirection: 'row', gap: 12}}>
            <Button
              variant="primary"
              size="lg"
              label={t('browse.viewGame')}
              focusKey={`${PREFIX}:cta`}
              nextFocusUp="nav:current"
              onPress={() => open(game, `${PREFIX}:cta`)}
            />
            <Button
              variant="outline"
              size="lg"
              label={t(wished ? 'game.favorite' : 'browse.addToFavorites')}
              focusKey={`${PREFIX}:wish`}
              nextFocusUp="nav:current"
              onPress={() => toggleWish(game.id)}
            >
              <WishHeart active={wished} />
            </Button>
          </View>
        </View>
      </View>
      <SpotlightList games={games} slides={slides} prefix={PREFIX} />
    </View>
  );
}

// Five games drawn from the whole catalog each time the PS2 tab is opened (see `reshufflePs2Featured`),
// kept while the player visits a game page and comes back. The library's filters and sort reset too.
let featuredIds = null;

export function reshufflePs2Featured() {
  featuredIds = null;
  ps2Browse.reset();
}

function pickFeatured(games) {
  const pool = [...games];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5).map(game => game.id);
}

export function Ps2Screen() {
  const games = usePs2Catalog();
  featuredIds ??= pickFeatured(games);
  const featured = featuredIds.map(id => games.find(game => game.id === id)).filter(Boolean);
  const catalogKey = games.map(game => game.id).join('|');
  useEffect(() => {
    for (const game of featured) loadPs2Details(game.id);
  }, [catalogKey]);
  const [filtering, setFiltering] = useState(false);
  const onAction = useFavoriteAction();
  return (
    <>
      <FocusScope trap onAction={onAction}>
        <ScrollView style={{flex: 1, gap: 84, paddingHorizontal: 48}}>
          <View scrollAnchor style={{gap: 24, paddingTop: 36}}>
            <Spotlight games={featured} />
          </View>
          <Ps2PopularRail games={games} />
          <Ps2RecentRail games={games} />
          <Ps2Charts games={games} />
          <Ps2GenreRail games={games} />
          <Ps2Library games={games} onOpenFilters={() => setFiltering(true)} />
          <View style={{height: 48}} />
        </ScrollView>
      </FocusScope>
      {filtering ? <Ps2FilterSheet games={games} onClose={() => setFiltering(false)} /> : null}
    </>
  );
}
