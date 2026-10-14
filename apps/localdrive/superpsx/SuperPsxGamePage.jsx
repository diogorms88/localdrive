import {useEffect, useRef, useState} from 'react';
import {View, Text, Image, ScrollView, FocusScope, Linking, BrowserCapture, Platform} from '@ps5-react/core';
import {useT, useLocale, latin} from '../i18n/index.js';
import {formatDate} from '../state/catalog.js';
import {useNavActions} from '../state/nav.jsx';
import {useWishlist, useStoreActions} from '../state/store.jsx';
import {useFavoriteAction} from '../ui/GameCard.jsx';
import {Cover} from '../ui/Cover.jsx';
import {Button} from '../ui/Button.jsx';
import {GameLogo} from '../ui/GameLogo.jsx';
import {WishHeart} from '../ui/WishHeart.jsx';
import {MediaGallery} from '../game/MediaGallery.jsx';
import {About} from '../game/About.jsx';
import {ShotViewer} from '../game/ShotViewer.jsx';
import {SectionHeader} from '../ui/SectionHeader.jsx';
import {GameCard} from '../ui/GameCard.jsx';
import {COVER, HERO, LOGO} from '../game/art.js';
import {downloadQueue, storageRoots} from '../state/downloads.js';
import {webURL} from '../state/download-sources.js';
import {loadSuperPsxDetails, useSuperPsxCatalog} from './source.js';
import {recordSuperPsxVisit} from './library.js';
import '../assets/Inter-Regular.ttf';

const DASH = '—';

function relatedTo(game, games, limit = 6) {
  const shared = other => other.genres.filter(genre => game.genres.includes(genre)).length;
  return games.filter(other => other.id !== game.id && shared(other) > 0)
    .sort((a, b) => shared(b) - shared(a)).slice(0, limit);
}

function Backdrop({game}) {
  const [failed, setFailed] = useState([]);
  const uri = [game.art.hero, ...game.shots.map(shot => shot.url), game.art.cover,
    ...(game.art.coverFallbacks || [])].find((url, index, all) => url && all.indexOf(url) === index && !failed.includes(url));
  return uri ? <Image key={uri} source={{uri}} style={[{position: 'absolute', left: 0, top: -96}, HERO]}
    resizeMode="cover" onError={() => setFailed(previous => [...previous, uri])} /> : null;
}

function BackToLibrary({onPress}) {
  return <Button variant="ghost" size="md" label="Back to SuperPSX" focusKey="superpsxgame:back" onPress={onPress} />;
}

function Hero({game, onBack, onViewWeb, onDetectDownload, loading, error, captureState, captureError}) {
  const t = useT();
  const {rtl} = useLocale();
  const {toggleWish} = useStoreActions();
  const wished = useWishlist().includes(game.id);
  const nextDown = game.shots.length > 0 ? 'game:shots' : `superpsxgame:download:${game.id}`;
  return (
    <View scrollAnchor style={{position: 'relative', overflow: 'hidden', borderBottomWidth: 2, borderColor: '#2a2a2f'}}>
      <Backdrop key={game.id} game={game} />
      <View style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
        backgroundGradient: {type: 'linear', to: rtl ? 'left' : 'right', stops: [
          {color: '#000000', offset: 0}, {color: '#000000d9', offset: 0.45}, {color: '#00000040', offset: 1}
        ]}}} />
      <View style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
        backgroundGradient: {type: 'linear', to: 'top', stops: [
          {color: '#000000', offset: 0}, {color: 'transparent', offset: 0.4}, {color: '#00000066', offset: 1}
        ]}}} />
      <View style={{paddingHorizontal: 48, paddingTop: 36, paddingBottom: 72}}>
        <BackToLibrary onPress={onBack} />
        <View style={{marginTop: 60, flexDirection: 'row', alignItems: 'flex-end', gap: 60}}>
          <View style={{width: 288, height: 384, overflow: 'hidden', borderRadius: 12, backgroundColor: '#17171a'}}>
            <Cover game={game.art.poster ? {...game, art: {...game.art, cover: game.art.poster,
              coverFallbacks: [game.art.cover, ...(game.art.coverFallbacks || [])]}} : game} style={COVER} />
          </View>
          <View style={{flex: 1}}>
            <GameLogo game={game} width={LOGO.width} height={LOGO.height} />
            <Text style={{marginTop: 18, width: 960, fontFamily: 'Inter-Regular', fontSize: 23, color: '#a3a3ab',
              numberOfLines: 1, ellipsizeMode: 'tail'}}>
              {latin(rtl, [game.developer, game.genres.join(', ')].filter(Boolean).join('  ·  ') || 'PlayStation 5')}
            </Text>
            {game.year ? <Text style={{marginTop: 24, fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
              {t('game.released', {year: String(game.year)})}
            </Text> : null}
            <View style={{marginTop: 42, flexDirection: 'row', gap: 15}}>
              <Button variant="primary" size="lg" label={captureState === 'capturing' ? t('ps2.captureWaiting') : t('ps2.download')}
                icon={captureState === 'capturing' ? 'external' : 'download'} autoFocus focusKey={`superpsxgame:download:${game.id}`}
                nextFocusDown={nextDown} onPress={Platform.OS === 'ps5' ? onDetectDownload : onViewWeb} />
              <Button variant="outline" size="lg" label={t(wished ? 'game.favorite' : 'game.addToFavorites')}
                focusKey={`favorite:${game.id}`} nextFocusDown={nextDown} onPress={() => toggleWish(game.id)}>
                <WishHeart active={wished} />
              </Button>
            </View>
            {captureState === 'capturing' ? <Text style={{marginTop: 16, fontFamily: 'Inter-Regular', fontSize: 18, color: '#a3a3ab'}}>{t('ps2.captureInstructions')}</Text> : null}
            {captureState === 'queued' ? <Text style={{marginTop: 16, fontFamily: 'Inter-Regular', fontSize: 18, color: '#9ee6ae'}}>{t('ps2.captureQueued')}</Text> : null}
            {captureError ? <Text style={{marginTop: 16, width: 900, fontFamily: 'Inter-Regular', fontSize: 18, color: '#ff9a9a'}}>{captureError}</Text> : null}
            {loading ? <Text style={{marginTop: 16, fontFamily: 'Inter-Regular', fontSize: 18, color: '#a3a3ab'}}>Loading game details…</Text> : null}
            {error ? <Text style={{marginTop: 16, width: 900, fontFamily: 'Inter-Regular', fontSize: 18, color: '#ff9a9a'}}>{error}</Text> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function Facts({game}) {
  const t = useT();
  const rows = [
    [t('game.facts.platform'), 'PlayStation 5'],
    ['Source', 'SuperPSX'],
    [t('game.facts.releaseDate'), game.releaseDate ? formatDate(game.releaseDate) : DASH],
    ['Categories', game.genres.length ? game.genres.join(', ') : DASH]
  ];
  return (
    <View style={{width: 432}}>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 30, fontWeight: 600, color: '#f2f2f3', lineHeight: 42, letterSpacing: -0.75}}>
        {t('game.details')}
      </Text>
      <View style={{marginTop: 24, borderBottomWidth: 2, borderColor: '#2a2a2f'}}>
        {rows.map(([label, value]) => <View key={label} style={{flexDirection: 'row', justifyContent: 'space-between', gap: 24,
          borderTopWidth: 2, borderColor: '#2a2a2f', paddingVertical: 18}}>
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>{label}</Text>
          <Text style={{width: 264, fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', textAlign: 'end',
            numberOfLines: 2, ellipsizeMode: 'tail', lineHeight: 30}}>{value}</Text>
        </View>)}
      </View>
    </View>
  );
}

export function SuperPsxGamePage({id}) {
  const {pop, focusLater, push} = useNavActions();
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [captureState, setCaptureState] = useState('idle');
  const [captureError, setCaptureError] = useState('');
  const captureTask = useRef(null);
  const catalog = useSuperPsxCatalog();
  const game = catalog.find(item => item.id === id);
  const onAction = useFavoriteAction(game);
  useEffect(() => {
    recordSuperPsxVisit(id);
    setLoading(true);
    setError('');
    loadSuperPsxDetails(id)
      .catch(reason => setError(reason?.message || 'Could not load game details.'))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => () => captureTask.current?.cancel(), [id]);
  if (!game) return null;
  const about = game.about.filter(line => line.trim());
  const related = relatedTo(game, catalog);
  const back = () => { pop(); return true; };
  const detectDownload = async () => {
    if (captureTask.current) return;
    setCaptureError('');
    setCaptureState('capturing');
    try {
      const task = BrowserCapture.captureArchive({timeoutSeconds: 180});
      captureTask.current = task;
      if (!Linking.openURL(game.pageUrl)) throw new Error(t('ps2.captureOpenFailed'));
      const {url} = await task.done;
      const format = /\.(zip|rar|7z)(?=$|[?&#])/i.exec(url)?.[1]?.toLowerCase();
      if (!format) throw new Error(t('ps2.captureUnsupportedFile'));
      const {host} = webURL(url);
      const filename = `${game.title.replace(/[^a-z0-9 _.-]/gi, '').trim().slice(0, 120) || game.id}.${format}`;
      downloadQueue().enqueue({...game, platform: 'ps5', titleId: game.id}, {
        id: `web-${Date.now()}`, provider: host, url, filename, format, category: 'game', capturedDownloadUrl: true, connections: 1
      }, storageRoots()[0]);
      setCaptureState('queued');
    } catch (reason) {
      captureTask.current?.cancel();
      setCaptureError(reason?.message || t('ps2.captureFailed'));
      setCaptureState('failed');
    } finally {
      captureTask.current = null;
    }
  };
  return (
    <FocusScope trap autoFocus onBack={back} onAction={onAction}>
      <View style={{position: 'relative', flex: 1}}>
        <ScrollView style={{flex: 1}}>
          <Hero game={game} onBack={pop} onViewWeb={() => Linking.openURL(game.pageUrl)} onDetectDownload={detectDownload}
            loading={loading} error={error} captureState={captureState} captureError={captureError} />
          <View style={{paddingHorizontal: 48, paddingTop: 60, paddingBottom: 96}}>
            <View style={{flexDirection: 'row', gap: 84}}>
              <View style={{width: 1308, gap: 84}}>
                {game.shots.length ? <MediaGallery shots={game.shots} nextDown={about.length ? 'game:about' : void 0} onOpen={setViewing} /> : null}
                {about.length ? <About paragraphs={about} /> : null}
                {related.length ? <View scrollAnchor style={{marginTop: 36}}>
                  <SectionHeader title={t('game.moreLikeThis')} />
                  <View style={{flexDirection: 'row', columnGap: 24}}>{related.map(other => <GameCard key={other.id} game={other} width={189}
                    focusKey={`superpsx-related:${other.id}`} onPress={() => push({name: 'superpsxgame', id: other.id}, `superpsx-related:${other.id}`)} />)}</View>
                </View> : null}
              </View>
              <Facts game={game} />
            </View>
          </View>
        </ScrollView>
        {viewing === null ? null : <ShotViewer shots={game.shots} start={viewing} onClose={index => {
          setViewing(null);
          focusLater(`game:shot:${index}`);
        }} />}
      </View>
    </FocusScope>
  );
}
