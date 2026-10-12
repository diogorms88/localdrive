import {useEffect} from 'react';
import {View, FocusScope, AppRegistry} from '@ps5-react/core';
import {useLocale, LocaleProvider} from './i18n/index.js';
import {getGame, warmCovers} from './state/catalog.js';
import {StoreFreeze, StoreProvider} from './state/store.jsx';
import {useNavActions, useNavState, useIsImmersive, NavProvider} from './state/nav.jsx';
import {Legend} from './ui/Legend.jsx';
import {BrowsePage} from './browse/BrowsePage.jsx';
import {DownloadsScreen} from './downloads/DownloadsScreen.jsx';
import {FilesScreen} from './files/FilesScreen.jsx';
import {useInterfaceSounds} from './ui/sounds.js';
import {GameScreen} from './game/index.jsx';
import {SearchScreen} from './search/index.jsx';
import {HomebrewScreen} from './homebrew/HomebrewScreen.jsx';
import {useInterfaceHaptics} from './ui/haptics.js';
import {Header} from './ui/Header.jsx';
import {Splash} from './ui/Splash.jsx';
import {UpdateDialog} from './ui/UpdateDialog.jsx';

function Screen({screen: screen}) {
  const {openGame, pop} = useNavActions();
  const openCard = game => openGame(game.id, `card:${game.id}`);
  if (screen.name === 'game')
    return (
      <GameScreen game={getGame(screen.id)} download={screen.download} onBack={pop} onOpenGame={openCard} />
    );
  if (screen.name === 'downloads') return <DownloadsScreen onBack={pop} onOpenGame={openGame} />;
  if (screen.name === 'files') return <FilesScreen onBack={pop} />;
  if (screen.name === 'add') return <HomebrewScreen />;
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
