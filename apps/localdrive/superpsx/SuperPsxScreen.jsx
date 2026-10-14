import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, Image, ScrollView, FocusScope, AnimatePresence, motion} from '@ps5-react/core';
import {useT, useLocale} from '../i18n/index.js';
import {summaryOf} from '../state/catalog.js';
import {useNavActions, useNavState} from '../state/nav.jsx';
import {useStoreActions, useWishlist} from '../state/store.jsx';
import {useFavoriteAction} from '../ui/GameCard.jsx';
import {Button} from '../ui/Button.jsx';
import {SpotlightList} from '../browse/SpotlightList.jsx';
import {useSlides} from '../browse/useSlides.js';
import {EASE_OUT} from '../ui/ease.js';
import {loadSuperPsxDetails, loadSuperPsxPage, SUPERPSX_LAST_PAGE, useSuperPsxCatalog} from './source.js';
import {SuperPsxLibrary} from './SuperPsxSections.jsx';
import {WishHeart} from '../ui/WishHeart.jsx';
import '../assets/Inter-Regular.ttf';

const PREFIX = 'superpsxspot';
const ART = {width: 1410, height: 660};
const fade = {type: 'tween', duration: 0.6, ease: EASE_OUT};

function useOpenGame() {
  const {push} = useNavActions();
  return (game, from) => push({name: 'superpsxgame', id: game.id}, from);
}

function SpotlightArt({game}) {
  const [failed, setFailed] = useState([]);
  const uri = [game.art.hero, ...(game.art.coverFallbacks || []), game.art.cover]
    .find((candidate, index, all) => candidate && all.indexOf(candidate) === index && !failed.includes(candidate));
  return (
    <AnimatePresence initial={false}>
      <motion.View
        key={game.id}
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        transition={fade}
        style={[
          {position: 'absolute', top: 0, left: 0, borderRadius: 18}, ART,
          game.art.hero ? null : {backgroundGradient: {type: 'linear', angle: 120, stops: [
            {color: '#0d0d0f', offset: 0}, {color: game.art.tint, offset: 1}
          ]}}
        ]}
      >
        {uri ? <Image source={{uri}} resizeMode="cover" style={[ART, {borderRadius: 18}]}
          onError={() => setFailed(current => [...current, uri])} /> : null}
      </motion.View>
    </AnimatePresence>
  );
}

function SpotlightBlurb({game}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.View key={game.id} style={{gap: 24}} initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}}
        exit={{opacity: 0, y: -6, transition: {type: 'tween', duration: 0.15, ease: 'easeIn'}}}
        transition={{type: 'tween', duration: 0.45, ease: EASE_OUT}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 58, fontWeight: 600, color: '#f2f2f3', lineHeight: 68,
          width: 552, numberOfLines: 2, ellipsizeMode: 'tail'}}>{game.title}</Text>
        {game.genres.length ? <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab'}}>{game.genres.join(' · ')}</Text> : null}
        {summaryOf(game) ? <Text style={{width: 552, fontFamily: 'Inter-Regular', fontSize: 23, color: '#f2f2f3d9',
          numberOfLines: 3, ellipsizeMode: 'tail', lineHeight: 37}}>{summaryOf(game)}</Text> : null}
      </motion.View>
    </AnimatePresence>
  );
}

function Spotlight({games}) {
  const t = useT();
  const {rtl} = useLocale();
  const shown = useNavState().top.name === 'superpsx';
  const slides = useSlides(Math.max(1, games.length), shown);
  const game = games[slides.active];
  const open = useOpenGame();
  const wished = useWishlist().includes(game?.id);
  const {toggleWish} = useStoreActions();
  useEffect(() => {
    if (game) loadSuperPsxDetails(game.id).catch(() => {});
  }, [game?.id]);
  if (!game) return null;
  const side = rtl ? {right: 0} : {left: 0};
  return (
    <View style={{flexDirection: 'row', gap: 24}}>
      <View style={[{position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#212125'}, ART]}>
        <SpotlightArt game={game} />
        <View style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          backgroundGradient: {type: 'linear', to: rtl ? 'left' : 'right', stops: [
            {color: '#000000', offset: 0}, {color: '#000000bf', offset: 0.35}, {color: 'transparent', offset: 0.75}
          ]}}} />
        <View style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          backgroundGradient: {type: 'linear', to: 'top', stops: [{color: '#000000b3', offset: 0}, {color: 'transparent', offset: 0.5}]}}} />
        <View style={[{position: 'absolute', top: 0, bottom: 0, width: 672, justifyContent: 'flex-end', padding: 60}, side]}>
          <SpotlightBlurb game={game} />
          <View style={{marginTop: 28, flexDirection: 'row', gap: 12}}>
            <Button variant="primary" size="lg" label={t('browse.viewGame')} focusKey={`${PREFIX}:cta`}
              nextFocusUp="nav:current" onPress={() => open(game, `${PREFIX}:cta`)} />
            <Button variant="outline" size="lg" label={t(wished ? 'game.favorite' : 'browse.addToFavorites')}
              focusKey={`${PREFIX}:wish`} nextFocusUp="nav:current" onPress={() => toggleWish(game.id)}>
              <WishHeart active={wished} />
            </Button>
          </View>
        </View>
      </View>
      <SpotlightList games={games} slides={slides} prefix={PREFIX} />
    </View>
  );
}

export function SuperPsxScreen() {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const nextPage = useRef(1);
  const requestInFlight = useRef(false);
  const catalog = useSuperPsxCatalog();
  const onAction = useFavoriteAction();
  const loadNext = useCallback(async (force = false) => {
    if (requestInFlight.current || nextPage.current > SUPERPSX_LAST_PAGE || (loadError && !force)) return;
    const requestedPage = nextPage.current;
    requestInFlight.current = true;
    setLoadingMore(true);
    setLoadError(false);
    if (requestedPage === 1 && entries.length === 0) setStatus('loading');
    try {
      const items = await loadSuperPsxPage(requestedPage);
      setEntries(current => {
        const seen = new Set(current.map(game => game.id));
        return [...current, ...items.filter(game => !seen.has(game.id))];
      });
      nextPage.current = items.length ? requestedPage + 1 : SUPERPSX_LAST_PAGE + 1;
      setStatus(current => current === 'error' || current === 'loading' ? (items.length ? 'ready' : 'empty') : current);
    } catch (_) {
      setLoadError(true);
      if (requestedPage === 1 && entries.length === 0) setStatus('error');
    } finally {
      requestInFlight.current = false;
      setLoadingMore(false);
    }
  }, [entries.length, loadError]);
  useEffect(() => {
    void loadNext();
  }, []);
  const pageGames = useMemo(() => entries.map(game => catalog.find(item => item.id === game.id) || game), [entries, catalog]);
  const featured = pageGames.slice(0, 5);
  const retry = () => void loadNext(true);
  return (
    <FocusScope trap onAction={onAction}>
      <ScrollView style={{flex: 1, gap: 72, paddingHorizontal: 48}}>
        {featured.length ? <View scrollAnchor style={{gap: 24, paddingTop: 36}}><Spotlight games={featured} /></View> : null}
        <View scrollAnchor style={{paddingBottom: 48}}>
          {status === 'loading' ? <Text style={{marginTop: 36, fontFamily: 'Inter-Regular', fontSize: 23, color: '#a3a3ab'}}>Loading SuperPSX…</Text> : null}
          {status === 'error' ? <Text style={{marginTop: 36, fontFamily: 'Inter-Regular', fontSize: 23, color: '#f2f2f3'}}>Could not load this SuperPSX page.</Text> : null}
          {status === 'empty' ? <Text style={{marginTop: 36, fontFamily: 'Inter-Regular', fontSize: 23, color: '#a3a3ab'}}>No PS5 games were found on this page.</Text> : null}
          {status === 'error' ? <View style={{marginTop: 16}}><Button variant="outline" size="md" label="Retry" focusKey="superpsx:retry" onPress={retry} /></View> : null}
          {status === 'ready' ? <SuperPsxLibrary games={pageGames} catalog={catalog} onLoadMore={loadNext}
            loadingMore={loadingMore} loadError={loadError} retry={retry} hasMore={nextPage.current <= SUPERPSX_LAST_PAGE} /> : null}
        </View>
      </ScrollView>
    </FocusScope>
  );
}
