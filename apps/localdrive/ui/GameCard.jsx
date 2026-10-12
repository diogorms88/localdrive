import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {View, Image, motion, transitions, Text, useIsFocused, AnimatePresence} from '@ps5-react/core';
import {useLocale, latin, focusEnd} from '../i18n/index.js';
import {formatSize} from '../state/size.js';
import {genreLabel, onCdn, summaryOf} from '../state/catalog.js';
import {useStoreActions, useWishlist} from '../state/store.jsx';
import {colors} from './colors.js';
import {px, canScale} from './scale.js';
import {prefetchWhenSettled} from '../game/art.js';
import {CdnMark} from './CdnAura.jsx';
import {Cover} from './Cover.jsx';
import {CardFocus} from './CardFocus.jsx';
import {Icon} from './Icon.jsx';
import {EASE_OUT} from './ease.js';
import {unlight, lightGame} from './lightBar.js';
import '../assets/Inter-Regular.ttf';

const focusMotion = {type: 'tween', duration: 0.3, ease: EASE_OUT};

const CAPTION = 54;

export const DETAILED_CAPTION = 96;

const press = {scale: 0.95};

const rest = {y: 0};

const LIFT = 6;

const lift = {y: -LIFT};

// A card held in focus this long grows a panel beside its cover: the game's art and screenshots
// play as a slideshow behind its title, genres and description.
const PREVIEW_DELAY_MS = 3000;
const SLIDE_MS = 2500;
const MAX_SLIDES = 6;

// The panel's width as a share of the card's, and how far it tucks under the cover.
const PANEL_SCALE = 2;
const TUCK = 12;

const crossfade = {
  initial: {opacity: 0},
  animate: {opacity: 1},
  exit: {opacity: 0},
  transition: {type: 'tween', duration: 0.6, ease: EASE_OUT}
};

// PlayStation art is served at any width: ask for the panel's, not the 1920 px original.
const sized = (url, width) =>
  url.startsWith('https://image.api.playstation.com/') ? url.replace(/([?&]w=)\d+/, `$1${width}`) : url;

function slidesOf(game, width) {
  const urls = [game.art.hero, ...game.shots.map(shot => shot.url)].filter(Boolean);
  return [...new Set(urls)].slice(0, MAX_SLIDES).map(url => sized(url, width));
}

const grow = {type: 'tween', duration: 0.35, ease: EASE_OUT};

/**
 * A horizontally scrolling row provides `{x, viewport}`: its scroll offset and its on-screen bounds,
 * so a card can tell where it really sits and grow toward the side with room.
 */
export const RailScroll = createContext(null);

// Which way the panel fits: layout rectangles ignore scrolling, so a rail's offset is taken off.
function sideFor(rect, rail, width) {
  if (!rect) return 'right';
  const left = rect.x - (rail?.x ?? 0);
  const right = left + rect.width;
  const panel = px(Math.round(width * PANEL_SCALE)) - TUCK;
  const bounds = rail?.viewport ?? {x: 0, width: screen.width};
  if (right + panel <= bounds.x + bounds.width) return 'right';
  return left - panel >= bounds.x ? 'left' : 'right';
}

let focusedCard = null;

export function useFavoriteAction(fallback = null) {
  const {toggleWish} = useStoreActions();
  return action => {
    const game = action === 'square' && (focusedCard?.game ?? fallback);
    if (!game) return false;
    toggleWish(game.id);
    return true;
  };
}

function WishBadge({id}) {
  const wished = useWishlist().includes(id);
  const added = useRef(0);
  const last = useRef(wished);
  if (wished && !last.current) added.current += 1;
  last.current = wished;
  if (!wished) return null;
  return (
    <View
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14999,
        backgroundColor: '#000000bf'
      }}
    >
      <motion.View
        key={added.current}
        initial={added.current ? {scale: 1.7} : false}
        animate={{scale: 1}}
        transition={transitions.pop}
      >
        <Icon name="heart" size={14} color={colors.fg} fill={colors.fg} />
      </motion.View>
    </View>
  );
}

const boxes = new Map();

function boxOf(width, detailed) {
  const id = detailed ? -width : width;
  if (!boxes.has(id)) {
    const height = Math.round((width * 4) / 3);
    boxes.set(id, {
      height,
      card: {width: px(width)},
      tile: {height: px(height)},
      text: {width: px(width)},
      cover: {width: px(width), height: px(height), borderRadius: px(8)}
    });
  }
  return boxes.get(id);
}

function Details({game, focused, box}) {
  const {rtl} = useLocale();
  return (
    <View style={[{height: 144, paddingTop: 15}, box.text]}>
      <Text
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 20,
          color: '#8a8a94',
          numberOfLines: 1,
          ellipsizeMode: 'tail',
          lineHeight: 24
        }}
      >
        {game.genres[0] ? genreLabel(game.genres[0]) : game.platform.toUpperCase()}
      </Text>
      <Text
        focused={focused}
        style={[
          {
            marginTop: 6,
            height: 60,
            paddingRight: 6,
            fontFamily: 'Inter-Regular',
            fontSize: 23,
            fontWeight: 600,
            color: '#f2f2f3e6',
            numberOfLines: 2,
            ellipsizeMode: 'tail',
            lineHeight: 30
          },
          focused ? {color: '#f2f2f3'} : null
        ]}
      >
        {latin(rtl, game.title)}
      </Text>
      <View style={{marginTop: 9, height: 30, flexDirection: 'row', alignItems: 'center', gap: 12}}>
        {game.metacritic != null && (
          <View style={{borderRadius: 3, backgroundColor: '#f2f2f3', paddingHorizontal: 9}}>
            <Text
              style={{
                fontFamily: 'Inter-Regular',
                fontSize: 20,
                fontWeight: 700,
                color: '#000000',
                lineHeight: 24
              }}
            >
              {String(game.metacritic)}
            </Text>
          </View>
        )}
        {game.sizeGb != null && (
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, color: '#a3a3ab'}}>
            {formatSize(game.sizeGb)}
          </Text>
        )}
      </View>
    </View>
  );
}

function useSlide(slides, box) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return void 0;
    const id = setInterval(() => setIndex(i => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [slides]);
  // The next slide decodes while this one shows, so the crossfade never waits on the network.
  useEffect(() => {
    const next = slides[(index + 1) % slides.length];
    if (next && slides.length > 1) Image.prefetch(next, {...box, resizeMode: 'cover'}).catch(() => {});
  }, [index, slides]);
  return index;
}

function Dots({count, index, inset}) {
  if (count < 2) return null;
  return (
    <View style={{position: 'absolute', top: 15, right: inset, flexDirection: 'row', gap: 6}}>
      {Array.from({length: count}, (_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === index ? '#f2f2f3' : '#f2f2f366'
          }}
        />
      ))}
    </View>
  );
}

// The page file is read only once the panel opens, never while focus moves across the grid.
function Panel({game, width, height, side}) {
  const {rtl} = useLocale();
  const panel = px(Math.round(width * PANEL_SCALE));
  // The focused card rises by LIFT: the panel reaches back down to cover its neighbours' bottom edge.
  const tall = px(height) + LIFT;
  const box = {width: panel, height: tall};
  const [slides] = useState(() => slidesOf(game, panel));
  const index = useSlide(slides, box);
  const description = summaryOf(game) || game.summary;
  const from = side === 'right' ? -48 : 48;
  const inner = side === 'right' ? {paddingLeft: TUCK + 18, paddingRight: 18} : {paddingRight: TUCK + 18, paddingLeft: 18};
  return (
    <motion.View
      initial={{opacity: 0, x: from}}
      animate={{opacity: 1, x: 0}}
      exit={{opacity: 0, x: from}}
      transition={grow}
      style={[
        {
          position: 'absolute',
          top: 0,
          width: panel,
          height: tall,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#17171a',
          borderWidth: 2,
          borderColor: '#ffffff26'
        },
        side === 'right' ? {left: px(width) - TUCK} : {right: px(width) - TUCK}
      ]}
    >
      <AnimatePresence>
        {slides.length > 0 && (
          <motion.View key={slides[index]} {...crossfade} style={{position: 'absolute', top: 0, left: 0}}>
            <Image source={{uri: slides[index]}} resizeMode="cover" style={[box, {borderRadius: 12}]} />
          </motion.View>
        )}
      </AnimatePresence>
      <View
        style={[
          {
            position: 'absolute',
            right: 0,
            bottom: 0,
            left: 0,
            top: 0,
            justifyContent: 'flex-end',
            paddingBottom: 18,
            gap: 6,
            backgroundGradient: {
              type: 'linear',
              angle: 180,
              stops: [
                {color: '#0d0d0f00', offset: 0.25},
                {color: '#0d0d0fe6', offset: 0.7},
                {color: '#0d0d0f', offset: 1}
              ]
            }
          },
          inner
        ]}
      >
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 23,
            fontWeight: 600,
            lineHeight: 30,
            color: colors.fg,
            numberOfLines: 1,
            ellipsizeMode: 'tail'
          }}
        >
          {latin(rtl, game.title)}
        </Text>
        {game.genres.length > 0 && (
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 18,
              lineHeight: 24,
              color: colors.muted,
              numberOfLines: 1,
              ellipsizeMode: 'tail'
            }}
          >
            {game.genres.slice(0, 3).map(genreLabel).join(' \xB7 ')}
          </Text>
        )}
        {description ? (
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 20,
              lineHeight: 27,
              color: '#f2f2f3d9',
              numberOfLines: 3,
              ellipsizeMode: 'tail'
            }}
          >
            {latin(rtl, description)}
          </Text>
        ) : null}
      </View>
      <Dots count={slides.length} index={index} inset={side === 'left' ? TUCK + 15 : 15} />
    </motion.View>
  );
}

function Body({game, width, caption, detailed, preview}) {
  const {rtl} = useLocale();
  const focused = useIsFocused();
  const box = boxOf(width, detailed);
  return (
    <>
      <motion.View
        style={[{borderRadius: 12, backgroundColor: '#17171a'}, box.tile]}
        initial={false}
        animate={focused ? lift : rest}
        transition={focusMotion}
      >
        <AnimatePresence>
          {preview && <Panel key={preview} game={game} width={width} height={box.height} side={preview} />}
        </AnimatePresence>
        <Cover game={game} style={box.cover} />
        <WishBadge id={game.id} />
        {onCdn(game) ? <CdnMark /> : null}
        <CardFocus focused={focused} width={width} height={box.height} platforms={game.platforms} />
      </motion.View>
      {caption ??
        (detailed ? (
          <Details game={game} focused={focused} box={box} />
        ) : (
          <>
            <Text
              focused={focused}
              style={[
                [
                  {
                    marginTop: 18,
                    fontFamily: 'Inter-Regular',
                    fontSize: 23,
                    color: '#f2f2f3d9',
                    numberOfLines: 1,
                    ellipsizeMode: 'tail'
                  },
                  focused ? {color: '#f2f2f3'} : null
                ],
                box.text
              ]}
            >
              {latin(rtl, game.title)}
            </Text>
            <Text
              style={[
                {
                  marginTop: 3,
                  fontFamily: 'Inter-Regular',
                  fontSize: 21,
                  color: '#8a8a94',
                  numberOfLines: 1,
                  ellipsizeMode: 'tail'
                },
                box.text
              ]}
            >
              {game.genres.slice(0, 2).map(genreLabel).join(' \xB7 ')}
            </Text>
          </>
        ))}
    </>
  );
}

export function GameCard({
  game,
  onPress,
  width = 150,
  focusKey = `card:${game.id}`,
  rowEnd,
  enterDelay,
  caption,
  detailed,
  onFocus,
  ...rest
}) {
  const {rtl} = useLocale();
  const box = boxOf(width, detailed);
  const scales = canScale(width, box.height + (detailed ? DETAILED_CAPTION : CAPTION));
  const [entering, setEntering] = useState(enterDelay != null);
  const rail = useContext(RailScroll);
  const [preview, setPreview] = useState(null);
  const card = useRef({}).current;
  card.game = game;
  card.key = focusKey;
  useEffect(
    () => () => {
      clearTimeout(card.hold);
      if (focusedCard !== card) return;
      focusedCard = null;
      unlight(card.key);
    },
    []
  );
  const entrance = entering && {
    initial: {opacity: 0},
    animate: {opacity: 1},
    transition: {...focusMotion, duration: 0.4, delay: enterDelay},
    onAnimationComplete: () => setEntering(false)
  };
  return (
    <motion.View
      {...focusEnd(rtl, rowEnd ? focusKey : void 0)}
      {...rest}
      focusKey={focusKey}
      onPress={onPress}
      onLayout={event => {
        card.rect = event.layout;
      }}
      onFocus={() => {
        focusedCard = card;
        clearTimeout(card.hold);
        card.hold = setTimeout(() => setPreview(sideFor(card.rect, rail, width)), PREVIEW_DELAY_MS);
        prefetchWhenSettled(game);
        lightGame(focusKey, game);
        onFocus?.();
      }}
      onBlur={() => {
        clearTimeout(card.hold);
        setPreview(null);
        if (focusedCard === card) focusedCard = null;
        unlight(focusKey);
      }}
      whilePress={scales ? press : void 0}
      transition={focusMotion}
      {...entrance}
      style={preview ? [box.card, {zIndex: 10}] : box.card}
    >
      <Body game={game} width={width} caption={caption} detailed={detailed} preview={preview} />
    </motion.View>
  );
}
