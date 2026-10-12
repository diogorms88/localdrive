import {useRef, useState} from 'react';
import {FocusScope, View, Text} from '@ps5-react/core';
import {useT, useLocale, focusEnd} from '../i18n/index.js';
import {getGame, activeCount, genres, NO_FILTERS, genreLabel} from '../state/catalog.js';
import {useWishlist} from '../state/store.jsx';
import {VERSION} from '../version.js';
import {FocusRing} from './FocusRing.jsx';
import {Logo} from './Logo.jsx';
import {useNavActions, useNavState, useIsImmersive} from '../state/nav.jsx';
import {ButtonGlyph} from './ButtonHints.jsx';
import {Menu, MenuItem, MenuDivider} from './Menu.jsx';
import {useSections} from './useSections.js';
import {DownloadToast} from './DownloadToast.jsx';
import {DownloadsBadge} from './DownloadsBadge.jsx';
import {LanguageSheet} from './LanguageSheet.jsx';
import {NavItem} from './NavItem.jsx';
import {useNavLayouts, NavPill} from './NavPill.jsx';
import '../assets/Inter-Regular.ttf';

const BADGE = <DownloadsBadge />;

export function Header({children}) {
  const t = useT();
  const {rtl} = useLocale();
  const {section, filters, sort, on, step, keyOf} = useSections();
  const wishlist = useWishlist();
  const favorites = wishlist.filter(id => getGame(id)).length;
  const nav = useNavActions();
  const {top} = useNavState();
  const [browsing, setBrowsing] = useState(false);
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const immersive = useIsImmersive();
  const [layouts, track] = useNavLayouts();
  const onlyGenre = filters.genre.length === 1 && activeCount(filters) === 1 && filters.genre[0];
  const down = top.name === 'browse' ? 'page' : 'screen';
  const toastAction = useRef(null);
  const onAction = action => {
    if (action === 'r2' && toastAction.current) {
      toastAction.current();
      return true;
    }
    if (action !== 'l1' && action !== 'r1') return false;
    setBrowsing(false);
    if (action === 'r1' && section === 'files') setChoosingLanguage(true);
    else step(action === 'r1');
    return true;
  };
  const onBack = () => {
    if (!nav.pop()) nav.focusLater('spotlight:cta');
    return true;
  };
  return (
    <FocusScope onAction={onAction} onBack={onBack}>
      {children}
      <DownloadToast actionRef={toastAction} />
      {choosingLanguage ? <LanguageSheet onClose={() => setChoosingLanguage(false)} /> : null}
      <View
        style={
          immersive
            ? {position: 'absolute', left: 0, right: 0, top: 0, zIndex: 40, display: 'none'}
            : {position: 'absolute', left: 0, right: 0, top: 0, zIndex: 40}
        }
      >
        <FocusScope focusKey="header" inert={immersive}>
          <View
            onLayout={track('header')}
            style={{
              height: 96,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#000000',
              paddingHorizontal: 48
            }}
          >
            <NavPill section={section} layouts={layouts} />
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24
              }}
            >
              <View style={rtl ? {marginRight: -24} : {marginLeft: -24}}>
                <NavItem
                  focusKey={keyOf('search')}
                  icon="search"
                  label={t('nav.search')}
                  current={section === 'search'}
                  onPress={on.search}
                  onLayout={track('search')}
                  nextFocusDown={down}
                />
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <ButtonGlyph button="l1" />
                <NavItem
                  focusKey={keyOf('discover')}
                  label={t('nav.discover')}
                  current={section === 'discover'}
                  onPress={on.discover}
                  onLayout={track('discover')}
                  nextFocusDown={down}
                />
                <View style={{position: 'relative'}}>
                  <NavItem
                    focusKey={keyOf('catalog')}
                    label={t('nav.browse')}
                    trailing={browsing ? 'chevronUp' : 'chevronDown'}
                    current={section === 'catalog'}
                    onPress={() => setBrowsing(open => !open)}
                    onLayout={track('catalog')}
                    nextFocusDown={down}
                  />
                  <Menu open={browsing} onClose={() => setBrowsing(false)} rows={genres.length + 4}>
                    <MenuItem
                      label={t('nav.allGames')}
                      checked={section === 'catalog' && !filters.genre.length && sort !== 'smallest'}
                      autoFocus={!onlyGenre}
                      onSelect={() => on.show(NO_FILTERS, 'relevance')}
                    />
                    <MenuDivider />
                    {genres.map(genre => (
                      <MenuItem
                        key={genre}
                        label={genreLabel(genre)}
                        checked={onlyGenre === genre}
                        onSelect={() => on.show({...NO_FILTERS, genre: [genre]}, 'relevance')}
                      />
                    ))}
                    <MenuDivider />
                    <MenuItem
                      label={t('nav.fileSize')}
                      checked={section === 'catalog' && !activeCount(filters) && sort === 'smallest'}
                      onSelect={() => on.show(NO_FILTERS, 'smallest')}
                    />
                  </Menu>
                </View>
              </View>
            </View>
            <View
              focusKey="nav:home"
              onPress={on.discover}
              nextFocusDown={down}
              style={{
                marginHorizontal: 36,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderRadius: 6,
                paddingHorizontal: 12
              }}
            >
              <FocusRing />
              <Logo />
              <Text
                style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94'}}
              >{`v${VERSION}`}</Text>
            </View>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24
              }}
            >
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <NavItem
                  focusKey={keyOf('top')}
                  label={t('nav.top')}
                  current={section === 'top'}
                  onPress={on.top}
                  onLayout={track('top')}
                  nextFocusDown={down}
                />
                <NavItem
                  focusKey={keyOf('new')}
                  label={t('nav.new')}
                  current={section === 'new'}
                  onPress={on.new}
                  onLayout={track('new')}
                  nextFocusDown={down}
                />
                <NavItem
                  focusKey={keyOf('add')}
                  label={t('nav.addGame')}
                  current={section === 'add'}
                  onPress={on.add}
                  onLayout={track('add')}
                  nextFocusDown={down}
                />
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <NavItem
                  focusKey={keyOf('favorites')}
                  icon="heart"
                  label={favorites ? String(favorites) : null}
                  current={section === 'favorites'}
                  onPress={on.favorites}
                  onLayout={track('favorites')}
                  nextFocusDown={down}
                  {...focusEnd(rtl, keyOf('downloads'))}
                />
                <NavItem
                  focusKey={keyOf('downloads')}
                  icon="download"
                  current={section === 'downloads'}
                  onPress={on.downloads}
                  onLayout={track('downloads')}
                  nextFocusDown={down}
                >
                  {BADGE}
                </NavItem>
                <NavItem
                  focusKey={keyOf('files')}
                  icon="folder"
                  current={section === 'files'}
                  onPress={on.files}
                  onLayout={track('files')}
                  nextFocusDown={down}
                />
                <NavItem
                  focusKey="nav:language"
                  icon="globe"
                  onPress={() => setChoosingLanguage(true)}
                  nextFocusDown={down}
                  {...focusEnd(rtl, 'nav:language')}
                />
                <ButtonGlyph button="r1" />
              </View>
            </View>
          </View>
        </FocusScope>
      </View>
    </FocusScope>
  );
}
