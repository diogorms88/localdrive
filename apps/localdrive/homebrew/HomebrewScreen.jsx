import {useState} from 'react';
import {DownloadFormats, View, Text, Image, ScrollView, motion} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {webURL} from '../state/download-sources.js';
import {downloadQueue, storageRoots} from '../state/downloads.js';
import {useNavActions} from '../state/nav.jsx';
import {colors} from '../ui/colors.js';
import {Button} from '../ui/Button.jsx';
import {FocusRing} from '../ui/FocusRing.jsx';
import {EASE_OUT} from '../ui/ease.js';
import {URLDialog} from '../downloads/URLDialog.jsx';
import {HOMEBREW} from './catalog.js';
import '../assets/Inter-Regular.ttf';

const COVER = {width: 840, height: 280};

const rest = {y: 0};

const lift = {y: -6};

const focusMotion = {type: 'tween', duration: 0.3, ease: EASE_OUT};

// The manual link keeps the existing classifier: known package, image and archive types keep their
// extension, anything else is stored as a .bin file.
function linkRelease(url) {
  const {host, path} = webURL(url);
  let filename = path.split(/[?#]/)[0].split('/').filter(Boolean).pop() || 'download.bin';
  try {
    filename = decodeURIComponent(filename);
  } catch {}
  filename = filename.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 180) || 'download.bin';
  const supported = [...DownloadFormats.images, 'pkg', 'fpkg', ...DownloadFormats.archives];
  const extension = supported.find(kind => filename.toLowerCase().endsWith(`.${kind}`));
  const format = extension || 'binary';
  if (!extension && !/\.(?:bin|binary)$/i.test(filename)) filename += '.bin';
  const id = `local-${Date.now()}`;
  const title =
    filename.replace(
      /\.(?:bin|binary|pkg|fpkg|exfat|ffpkg|ffpfs|ffpfsc|zip|rar|7z|tar(?:\.(?:gz|bz2|xz|zst))?|tgz)$/i,
      ''
    ) || host;
  return {game: {id, title, titleId: id}, release: {id, provider: host, url, filename, format}};
}

function HomebrewCard({item, onOpen}) {
  const t = useT();
  return (
    <motion.View
      onPress={() => onOpen(item)}
      focusKey={`homebrew:${item.id}`}
      autoFocus={item === HOMEBREW[0]}
      whileFocus={lift}
      animate={rest}
      transition={focusMotion}
      style={{width: COVER.width, gap: 18}}
    >
      <View style={[{borderRadius: 12, backgroundColor: '#17171a'}, COVER]}>
        <Image source={item.cover} resizeMode="cover" style={[COVER, {borderRadius: 12}]} />
        <FocusRing radius={12} />
      </View>
      <View style={{gap: 6}}>
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 30,
            fontWeight: 600,
            color: colors.fg,
            lineHeight: 39
          }}
        >
          {item.name}
        </Text>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: colors.muted, lineHeight: 30}}>
          {t(item.description)}
        </Text>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, color: colors.subtle, lineHeight: 27}}>
          {`${item.filename} \xB7 ${item.source}`}
        </Text>
      </View>
    </motion.View>
  );
}

export function HomebrewScreen() {
  const t = useT();
  const nav = useNavActions();
  const [dialog, setDialog] = useState(false);
  const enqueue = ({game, release}) => {
    downloadQueue().enqueue(game, release, storageRoots()[0]);
    nav.push({name: 'downloads'}, 'nav:addGame');
  };
  const open = item => nav.push({name: 'homebrew', id: item.id}, `homebrew:${item.id}`);
  return (
    <View style={{flex: 1}}>
      <ScrollView style={{flex: 1}}>
        <View style={{paddingHorizontal: 96, paddingTop: 48, paddingBottom: 72, gap: 42}}>
          <View style={{gap: 12}}>
            <Text
              style={{
                fontFamily: 'Inter-Regular',
                fontSize: 36,
                fontWeight: 600,
                color: colors.fg,
                lineHeight: 48
              }}
            >
              {t('nav.addGame')}
            </Text>
            <Text
              style={{
                maxWidth: 1200,
                fontFamily: 'Inter-Regular',
                fontSize: 24,
                color: colors.muted,
                lineHeight: 36
              }}
            >
              {t('homebrew.subtitle')}
            </Text>
          </View>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 48}}>
            {HOMEBREW.map(item => (
              <HomebrewCard key={item.id} item={item} onOpen={open} />
            ))}
          </View>
          <View style={{flexDirection: 'row'}}>
            <Button
              variant="secondary"
              size="lg"
              icon="download"
              label={t('homebrew.link')}
              onPress={() => setDialog(true)}
            />
          </View>
        </View>
      </ScrollView>
      {dialog ? (
        <URLDialog
          title={t('homebrew.link')}
          detail={t('homebrew.linkDetail')}
          submit={url => enqueue(linkRelease(url))}
          onClose={() => setDialog(false)}
        />
      ) : null}
    </View>
  );
}
