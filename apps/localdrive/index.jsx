import {useEffect, useState} from 'react';
import {DownloadFormats, View, Text, FocusScope, AppRegistry} from '@ps5-react/core';
import {useT, useLocale, LocaleProvider} from './i18n/index.js';
import {getGame, warmCovers} from './state/catalog.js';
import {StoreFreeze, StoreProvider} from './state/store.jsx';
import {webURL} from './state/download-sources.js';
import {downloadQueue, storageRoots} from './state/downloads.js';
import {colors} from './ui/colors.js';
import {Icon} from './ui/Icon.jsx';
import {useNavActions, useNavState, useIsImmersive, NavProvider} from './state/nav.jsx';
import {Button} from './ui/Button.jsx';
import {Legend} from './ui/Legend.jsx';
import {BrowsePage} from './browse/BrowsePage.jsx';
import {DownloadsScreen} from './downloads/DownloadsScreen.jsx';
import {FilesScreen} from './files/FilesScreen.jsx';
import {URLDialog} from './downloads/URLDialog.jsx';
import {useInterfaceSounds} from './ui/sounds.js';
import {GameScreen} from './game/index.jsx';
import {SearchScreen} from './search/index.jsx';
import {useInterfaceHaptics} from './ui/haptics.js';
import {Header} from './ui/Header.jsx';
import {Splash} from './ui/Splash.jsx';
import {UpdateDialog} from './ui/UpdateDialog.jsx';

// LocalDrive's manual download entry uses the existing download queue and file classifier.
function AddGameScreen() {
  const t = useT();
  const nav = useNavActions();
  const [dialog, setDialog] = useState(false);
  const add = url => {
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
    const game = {id, title, titleId: id};
    const release = {id, provider: host, url, filename, format};
    downloadQueue().enqueue(game, release, storageRoots()[0]);
    nav.push({name: 'downloads'}, 'nav:addGame');
  };
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24, paddingHorizontal: 120}}>
      <Icon name="download" size={42} color={colors.fg} />
      <Text
        style={{fontFamily: 'Inter-Regular', fontSize: 36, fontWeight: 600, color: '#f2f2f3', lineHeight: 48}}
      >
        {t('nav.addGame')}
      </Text>
      <Text
        style={{
          maxWidth: 900,
          fontFamily: 'Inter-Regular',
          fontSize: 24,
          color: '#a3a3ab',
          textAlign: 'center',
          lineHeight: 36
        }}
      >
        Paste a direct game download link. LocalDrive identifies the file type and adds it to the existing
        download queue.
      </Text>
      <Button
        variant="primary"
        size="lg"
        icon="download"
        label="Enter download link"
        autoFocus
        onPress={() => setDialog(true)}
      />
      {dialog ? (
        <URLDialog
          title="Game download link"
          detail="Enter the direct URL to the game file. The existing queue will detect and process the downloaded format."
          submit={add}
          onClose={() => setDialog(false)}
        />
      ) : null}
    </View>
  );
}

function Screen({screen: screen}) {
  const {openGame, pop} = useNavActions();
  const openCard = game => openGame(game.id, `card:${game.id}`);
  if (screen.name === 'game')
    return (
      <GameScreen game={getGame(screen.id)} download={screen.download} onBack={pop} onOpenGame={openCard} />
    );
  if (screen.name === 'downloads') return <DownloadsScreen onBack={pop} onOpenGame={openGame} />;
  if (screen.name === 'files') return <FilesScreen onBack={pop} />;
  if (screen.name === 'add') return <AddGameScreen />;
  return <SearchScreen onBack={pop} onOpenGame={openCard} />;
}

function BrowseLayer({shown}) {
  return (
    <View
      style={
        shown
          ? {position: 'absolute', left: 0, right: 0, top: 96, bottom: 60}
          : {position: 'absolute', left: 0, right: 0, top: 96, bottom: 60, display: 'none'}
      }
    >
      <StoreFreeze frozen={!shown}>
        <FocusScope focusKey="page" autoFocus inert={!shown}>
          <BrowsePage />
        </FocusScope>
      </StoreFreeze>
    </View>
  );
}

const WARM_DELAY_MS = 3e3;

function App() {
  useInterfaceSounds();
  useInterfaceHaptics();
  useEffect(() => {
    const id = setTimeout(warmCovers, WARM_DELAY_MS);
    return () => clearTimeout(id);
  }, []);
  const {top} = useNavState();
  const onBrowse = top.name === 'browse';
  const key = top.name === 'game' ? `game:${top.id}` : top.name;
  const immersive = useIsImmersive();
  const {rtl} = useLocale();
  return (
    // Arabic and Urdu mirror every row and right-align every paragraph from here.
    <View style={[{width: 1920, height: 1080, backgroundColor: '#000000'}, {direction: rtl ? 'rtl' : 'ltr'}]}>
      <Header>
        <BrowseLayer shown={onBrowse} />
        {onBrowse ? null : ( // No background of its own: the root's canvas shows through, so a screen change does not
          // fill the whole screen twice. `screen` lets the header's Down return to where it was left.
          <View
            key={key}
            style={
              immersive
                ? {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}
                : top.name === 'downloads' || top.name === 'files'
                  ? {position: 'absolute', left: 0, right: 0, top: 96, bottom: 0}
                  : {position: 'absolute', left: 0, right: 0, top: 96, bottom: 60}
            }
          >
            <FocusScope focusKey="screen">
              <Screen screen={top} />
            </FocusScope>
          </View>
        )}
        {immersive ? null : <Legend screen={top.name} />}
        <UpdateDialog />
      </Header>
      <Splash />
    </View>
  );
}

AppRegistry.registerComponent('localdrive', () => () => (
  <LocaleProvider>
    <StoreProvider>
      <NavProvider>
        <App />
      </NavProvider>
    </StoreProvider>
  </LocaleProvider>
));
