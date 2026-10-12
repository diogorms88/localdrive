import {useState} from 'react';
import {Image, motion, Text, View} from '@ps5-react/core';
import {fitBytes, SPAN_MAX} from '../i18n/fit.js';
import {useT, useLocale, latin} from '../i18n/index.js';
import {genreLabel, listedId} from '../state/catalog.js';
import {useStoreActions, useWishlist} from '../state/store.jsx';
import {canDownload} from './releases.js';
import {GameLogo} from '../ui/GameLogo.jsx';
import {HERO, COVER, LOGO} from './art.js';
import {Cover} from '../ui/Cover.jsx';
import {EASE_OUT} from '../ui/ease.js';
import {Button} from '../ui/Button.jsx';
import {WishHeart} from '../ui/WishHeart.jsx';
import {BackLink} from './BackLink.jsx';
import {DownloadButton} from './DownloadButton.jsx';
import '../assets/Inter-Regular.ttf';

const column = {hidden: {}, show: {transition: {staggerChildren: 0.06, delayChildren: 0.22}}};

const rise = {
  hidden: {opacity: 0, y: 12},
  show: {opacity: 1, y: 0, transition: {duration: 0.55, ease: EASE_OUT}}
};

function Backdrop({game}) {
  const [failed, setFailed] = useState([]);
  const uri = [game.art.hero, ...game.shots.map(shot => shot.url)].find(url => url && !failed.includes(url));
  return uri ? (
    <Image
      key={uri}
      source={{uri}}
      style={[
        {position: 'absolute', left: 0, top: -96, backgroundColor: '#212125'},
        game.art.tint ? {...HERO, backgroundColor: game.art.tint} : HERO
      ]}
      resizeMode="cover"
      onError={() => setFailed(previous => [...previous, uri])}
    />
  ) : null;
}

function Meta({game}) {
  const t = useT();
  const {rtl} = useLocale();
  return (
    <>
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
          {latin(rtl, fitBytes(game.developer, SPAN_MAX - 3))}
          {game.developer && game.genres.length > 0 ? (
            <Text style={{color: '#8a8a94'}}>{'  \xB7  '}</Text>
          ) : null}
          {fitBytes(game.genres.map(genreLabel).join(', '), SPAN_MAX)}
        </Text>
      </motion.View>
      <motion.View
        variants={rise}
        style={{marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 36}}
      >
        {game.metacritic ? (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
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
              {t('game.metacritic')}
            </Text>
          </View>
        ) : null}
        {game.year ? (
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
            {t('game.released', {year: String(game.year)})}
          </Text>
        ) : null}
      </motion.View>
    </>
  );
}

export function GameHero({game, download, onBack, onDownloaded, onRequestDialog}) {
  const t = useT();
  const {rtl} = useLocale();
  const {toggleWish} = useStoreActions();
  const wished = useWishlist().includes(listedId(game.id));
  const nextDown = game.shots.length > 0 ? 'game:shots' : void 0;
  return (
    <View
      scrollAnchor
      style={{position: 'relative', overflow: 'hidden', borderBottomWidth: 2, borderColor: '#2a2a2f'}}
    >
      <Backdrop key={game.id} game={game} />
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
                    {color: '#000000d9', offset: 0.45},
                    {color: '#00000040', offset: 1}
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
                    {color: '#000000d9', offset: 0.45},
                    {color: '#00000040', offset: 1}
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
            <Meta game={game} />
            <View style={{marginTop: 42, flexDirection: 'row', alignItems: 'flex-start', gap: 15}}>
              <DownloadButton
                key={game.id}
                onRequestDialog={onRequestDialog}
                game={game}
                start={download}
                onDownloaded={onDownloaded}
                nextDown={nextDown}
              />
              <Button
                variant="outline"
                size="lg"
                label={t(wished ? 'game.favorite' : 'game.addToFavorites')}
                onPress={() => toggleWish(game.id)}
                nextFocusDown={nextDown}
                autoFocus={!canDownload(game)}
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
