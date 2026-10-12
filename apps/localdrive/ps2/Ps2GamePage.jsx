import {useEffect, useState} from 'react';
import {View, Text, Image, ScrollView, FocusScope, motion, Linking} from '@ps5-react/core';
import {useT, useLocale, latin} from '../i18n/index.js';
import {genreLabel, formatDate} from '../state/catalog.js';
import {fitBytes, SPAN_MAX} from '../i18n/fit.js';
import {useStoreActions, useWishlist} from '../state/store.jsx';
import {useNavActions} from '../state/nav.jsx';
import {Cover} from '../ui/Cover.jsx';
import {Button} from '../ui/Button.jsx';
import {GameLogo} from '../ui/GameLogo.jsx';
import {WishHeart} from '../ui/WishHeart.jsx';
import {EASE_OUT} from '../ui/ease.js';
import {GameCard} from '../ui/GameCard.jsx';
import {SectionHeader} from '../ui/SectionHeader.jsx';
import {HERO, COVER, LOGO} from '../game/art.js';
import {BackLink} from '../game/BackLink.jsx';
import {MediaGallery} from '../game/MediaGallery.jsx';
import {About} from '../game/About.jsx';
import {ShotViewer} from '../game/ShotViewer.jsx';
import {loadPs2Details, usePs2Catalog} from './source.js';
import '../assets/Inter-Regular.ttf';

// A PS2 game's page uses the same hero layout as PS4/PS5, with web viewing as its primary action.
const column = {hidden: {}, show: {transition: {staggerChildren: 0.06, delayChildren: 0.22}}};

const rise = {
  hidden: {opacity: 0, y: 12},
  show: {opacity: 1, y: 0, transition: {duration: 0.55, ease: EASE_OUT}}
};

const DASH = '—';

function relatedTo(game, games, limit = 6) {
  const shared = other => other.genres.filter(genre => game.genres.includes(genre)).length;
  return games.filter(other => other.id !== game.id && shared(other) > 0)
    .sort((a, b) => shared(b) - shared(a))
    .slice(0, limit);
}

function Backdrop({game}) {
  const [failed, setFailed] = useState([]);
  const uri = [game.art.hero, ...game.shots.map(shot => shot.url), game.art.cover].find(
    url => url && !failed.includes(url)
  );
  return uri ? (
    <Image
      key={uri}
      source={{uri}}
      style={[
        {position: 'absolute', left: 0, top: -96},
        {...HERO, backgroundColor: game.art.tint}
      ]}
      resizeMode="cover"
      onError={() => setFailed(previous => [...previous, uri])}
    />
  ) : null;
}

function Hero({game, onBack, onViewWeb}) {
  const t = useT();
  const {rtl} = useLocale();
  const {toggleWish} = useStoreActions();
  const wished = useWishlist().includes(game.id);
  const developer = fitBytes(game.developer, SPAN_MAX - 3);
  const genres = fitBytes(game.genres.map(genreLabel).join(', '), SPAN_MAX);
  const nextDown = game.shots.length > 0 ? 'game:shots' : 'ps2:view-web';
  return (
    <View
      scrollAnchor
      style={{position: 'relative', overflow: 'hidden', borderBottomWidth: 2, borderColor: '#2a2a2f'}}
    >
      <Backdrop key={game.id} game={game} />
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
              {color: '#000000d9', offset: 0.45},
              {color: '#00000040', offset: 1}
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
              {color: '#000000', offset: 0},
              {color: 'transparent', offset: 0.4},
              {color: '#00000066', offset: 1}
            ]
          }
        }}
      />
      <View style={{paddingHorizontal: 48, paddingTop: 36, paddingBottom: 72}}>
        <BackLink onPress={onBack} />
        <View style={{marginTop: 60, flexDirection: 'row', alignItems: 'flex-end', gap: 60}}>
          <View
            style={{
              width: 288,
              height: 384,
              overflow: 'hidden',
              borderRadius: 12,
              backgroundColor: '#17171a'
            }}
          >
            <Cover game={game} style={COVER} />
          </View>
          <motion.View variants={column} initial="hidden" animate="show" style={{flex: 1}}>
            <motion.View variants={rise} style={{marginBottom: 24}}>
              <GameLogo game={game} width={LOGO.width} height={LOGO.height} />
            </motion.View>
            <motion.View variants={rise} style={{marginTop: 12}}>
              <Text
                style={{
                  width: 960,
                  fontFamily: 'Inter-Regular',
                  fontSize: 23,
                  color: '#a3a3ab',
                  numberOfLines: 1,
                  ellipsizeMode: 'tail'
                }}
              >
                {latin(rtl, developer)}
                {developer && genres ? <Text style={{color: '#8a8a94'}}>{'  ·  '}</Text> : null}
                {genres}
              </Text>
            </motion.View>
            {game.year ? (
              <motion.View variants={rise} style={{marginTop: 24}}>
                <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
                  {t('game.released', {year: String(game.year)})}
                </Text>
              </motion.View>
            ) : null}
            <View style={{marginTop: 42, flexDirection: 'row', alignItems: 'flex-start', gap: 15}}>
              <Button
                variant="primary"
                size="lg"
                label={t('ps2.viewOnWeb')}
                icon="external"
                autoFocus
                focusKey={`ps2:view-web:${game.id}`}
                nextFocusDown={nextDown}
                onPress={onViewWeb}
              />
              <Button
                variant="outline"
                size="lg"
                label={t(wished ? 'game.favorite' : 'game.addToFavorites')}
                onPress={() => toggleWish(game.id)}
                nextFocusDown={nextDown}
                focusKey={`favorite:${game.id}`}
              >
                <WishHeart active={wished} />
              </Button>
            </View>
          </motion.View>
        </View>
      </View>
    </View>
  );
}

function Facts({game}) {
  const t = useT();
  const rows = [
    [t('game.facts.platform'), 'PlayStation 2'],
    [t('ps2.facts.developer'), game.developer || DASH],
    [t('game.facts.publisher'), game.publisher || DASH],
    [t('ps2.facts.region'), game.region || DASH],
    [t('ps2.facts.languages'), game.languages || DASH],
    [t('game.facts.releaseDate'), game.releaseDate ? formatDate(game.releaseDate) : DASH]
  ];
  return (
    <View style={{width: 432}}>
      <Text
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 30,
          fontWeight: 600,
          color: '#f2f2f3',
          lineHeight: 42,
          letterSpacing: -0.75
        }}
      >
        {t('game.details')}
      </Text>
      <View style={{marginTop: 24, borderBottomWidth: 2, borderColor: '#2a2a2f'}}>
        {rows.map(([label, value]) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 24,
              borderTopWidth: 2,
              borderColor: '#2a2a2f',
              paddingVertical: 18
            }}
          >
            <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
              {label}
            </Text>
            <Text
              style={{
                width: 264,
                fontFamily: 'Inter-Regular',
                fontSize: 21,
                color: '#f2f2f3',
                textAlign: 'end',
                numberOfLines: 2,
                ellipsizeMode: 'tail',
                lineHeight: 30
              }}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Related({games, onOpen}) {
  const t = useT();
  return (
    <View scrollAnchor style={{marginTop: 120}}>
      <SectionHeader title={t('game.moreLikeThis')} />
      <View style={{flexDirection: 'row', columnGap: 24}}>
        {games.map(other => (
          <GameCard
            key={other.id}
            game={other}
            width={189}
            focusKey={`ps2-related:${other.id}`}
            onPress={() => onOpen(other)}
          />
        ))}
      </View>
    </View>
  );
}

export function Ps2GamePage({id}) {
  const {pop, focusLater, push} = useNavActions();
  const [viewing, setViewing] = useState(null);
  const games = usePs2Catalog();
  const game = games.find(item => item.id === id);
  useEffect(() => {
    loadPs2Details(id);
  }, [id]);
  if (!game) return null;
  const about = game.about.filter(text => text.trim());
  const related = relatedTo(game, games);
  const back = () => {
    pop();
    return true;
  };
  return (
    <FocusScope trap autoFocus onBack={back}>
      <View style={{position: 'relative', flex: 1}}>
        <ScrollView style={{flex: 1}}>
          <Hero game={game} onBack={pop} onViewWeb={() => Linking.openURL(game.pageUrl)} />
          <View style={{paddingHorizontal: 48, paddingTop: 60, paddingBottom: 96}}>
            <View style={{flexDirection: 'row', gap: 84}}>
              <View style={{width: 1308, gap: 84}}>
                {game.shots.length > 0 ? (
                  <MediaGallery
                    shots={game.shots}
                    nextDown={about.length > 0 ? 'game:about' : void 0}
                    onOpen={setViewing}
                  />
                ) : null}
                {about.length > 0 ? <About paragraphs={about} /> : null}
              </View>
              <Facts game={game} />
            </View>
            {related.length > 0 ? (
              <Related
                games={related}
                onOpen={other => push({name: 'ps2game', id: other.id}, `ps2-related:${other.id}`)}
              />
            ) : null}
          </View>
        </ScrollView>
        {viewing === null ? null : (
          <ShotViewer
            shots={game.shots}
            start={viewing}
            onClose={index => {
              setViewing(null);
              focusLater(`game:shot:${index}`);
            }}
          />
        )}
      </View>
    </FocusScope>
  );
}
