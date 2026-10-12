import {memo, useEffect, useRef, useState} from 'react';
import {Image, AnimatePresence, motion, Text, View} from '@ps5-react/core';
import {useT, useLocale, LATIN_IN_RTL, focusEnd} from '../i18n/index.js';
import {games} from '../data/catalog.js';
import {fromArchive, sortGames, genreLabel, summaryOf} from '../state/catalog.js';
import {useWishlist, useStoreActions} from '../state/store.jsx';
import {logoStyle, GameLogo} from '../ui/GameLogo.jsx';
import {EASE_OUT} from '../ui/ease.js';
import {useNavState, useNavActions} from '../state/nav.jsx';
import {Button} from '../ui/Button.jsx';
import {FIRST_POPULAR} from './PopularRail.jsx';
import {WishHeart} from '../ui/WishHeart.jsx';
import {useSlides} from './useSlides.js';
import {SpotlightList} from './SpotlightList.jsx';
import '../assets/Inter-Regular.ttf';

const NEWEST = 150;

const shuffle = list => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

function selectFeatured() {
  const eligible = games.filter(game => game.art.logo && fromArchive(game));
  const pool = eligible.length >= 5 ? eligible : games.filter(game => game.art.logo);
  const byFame = [...pool].sort((a, b) => b.recommendations - a.recommendations);
  const latest = new Set(sortGames(games, 'newest').slice(0, NEWEST));
  const recent = shuffle(byFame.filter(game => latest.has(game)).slice(0, 10)).slice(0, 2);
  const famous = shuffle(byFame.filter(game => !recent.includes(game)).slice(0, 20)).slice(
    0,
    5 - recent.length
  );
  return shuffle([...famous, ...recent]);
}

const featured = selectFeatured();

const ART = {width: 1410, height: 660};

const LOGO = [320, 112, 48 * 256];

function prefetchSlides() {
  for (const game of featured) {
    if (game.art.hero) Image.prefetch(game.art.hero, ART).catch(() => {});
    if (game.art.logo)
      Image.prefetch(game.art.logo, {...logoStyle(game, ...LOGO), resizeMode: 'contain'}).catch(() => {});
  }
}

function Art({game}) {
  const [shown, setShown] = useState(game);
  useEffect(() => {
    if (shown === game) return void 0;
    const id = setTimeout(() => setShown(game), 20);
    return () => clearTimeout(id);
  }, [game, shown]);
  if (!shown.art.hero) return null;
  return (
    <Image
      source={{uri: shown.art.hero}}
      resizeMode="cover"
      style={[
        {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 18},
        shown.art.tint ? {...ART, backgroundColor: shown.art.tint} : ART
      ]}
    />
  );
}

function Blurb({game}) {
  useT();
  const {rtl} = useLocale();
  const [ready, setReady] = useState(null);
  const current = useRef(game.id);
  current.current = game.id;
  useEffect(() => {
    const id2 = setTimeout(() => setReady(game.id), 800);
    return () => clearTimeout(id2);
  }, [game.id]);
  const id = game.id;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.View
        key={game.id}
        style={{gap: 30}}
        initial={{opacity: 0, y: 12}}
        animate={ready === game.id ? {opacity: 1, y: 0} : {opacity: 0, y: 12}}
        exit={{opacity: 0, y: -6, transition: {type: 'tween', duration: 0.15, ease: 'easeIn'}}}
        transition={{type: 'tween', duration: 0.45, ease: EASE_OUT}}
      >
        <GameLogo
          game={game}
          width={LOGO[0]}
          height={LOGO[1]}
          area={LOGO[2]}
          onReady={() => current.current === id && setReady(id)}
        />
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
          style={[
            {
              width: 552,
              fontFamily: 'Inter-Regular',
              fontSize: 23,
              color: '#f2f2f3d9',
              numberOfLines: 3,
              ellipsizeMode: 'tail',
              lineHeight: 37
            },
            rtl ? LATIN_IN_RTL : void 0
          ]}
        >
          {summaryOf(game)}
        </Text>
      </motion.View>
    </AnimatePresence>
  );
}

function WishButton({id, toList}) {
  const t = useT();
  const {rtl} = useLocale();
  const wishlist = useWishlist();
  const {toggleWish} = useStoreActions();
  const wished = wishlist.includes(id);
  return (
    <Button
      variant="outline"
      size="lg"
      label={wished ? t('browse.favorited') : t('browse.addToFavorites')}
      focusKey="spotlight:wish"
      nextFocusUp="nav:current"
      nextFocusDown={FIRST_POPULAR}
      {...focusEnd(rtl, toList)}
      onPress={() => toggleWish(id)}
    >
      <WishHeart active={wished} />
    </Button>
  );
}

export function Spotlight() {
  return <Carousel shown={useNavState().top.name === 'browse'} />;
}

const Carousel = memo(function Carousel({shown}) {
  const t = useT();
  const {rtl} = useLocale();
  const slides = useSlides(featured.length, shown);
  const {openGame} = useNavActions();
  const game = featured[slides.active];
  useEffect(() => {
    const id = setTimeout(prefetchSlides, 1500);
    return () => clearTimeout(id);
  }, []);
  return (
    <View style={{flexDirection: 'row', gap: 24}}>
      <View
        style={{
          position: 'relative',
          width: 1410,
          height: 660,
          overflow: 'hidden',
          borderRadius: 18,
          backgroundColor: '#212125'
        }}
      >
        <Art game={game} />
        <View
          style={
            rtl
              ? {
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  backgroundGradient: {
                    type: 'linear',
                    to: 'left',
                    stops: [
                      {color: '#000000', offset: 0},
                      {color: '#000000bf', offset: 0.35},
                      {color: 'transparent', offset: 0.75}
                    ]
                  }
                }
              : {
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  backgroundGradient: {
                    type: 'linear',
                    to: 'right',
                    stops: [
                      {color: '#000000', offset: 0},
                      {color: '#000000bf', offset: 0.35},
                      {color: 'transparent', offset: 0.75}
                    ]
                  }
                }
          }
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
          style={
            rtl
              ? {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: 672,
                  justifyContent: 'flex-end',
                  padding: 60
                }
              : {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: 672,
                  justifyContent: 'flex-end',
                  padding: 60
                }
          }
        >
          <Blurb game={game} />
          <View style={{marginTop: 30, flexDirection: 'row', gap: 12}}>
            <Button
              variant="primary"
              size="lg"
              label={t('browse.viewGame')}
              focusKey="spotlight:cta"
              nextFocusUp="nav:current"
              nextFocusDown={FIRST_POPULAR}
              onPress={() => openGame(game.id, 'spotlight:cta')}
            />
            <WishButton id={game.id} toList={`spotlight:${slides.active}`} />
          </View>
        </View>
      </View>
      <SpotlightList games={featured} slides={slides} />
    </View>
  );
});
