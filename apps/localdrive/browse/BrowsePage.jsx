import {memo, useState} from 'react';
import {View, Text, FocusScope, ScrollView} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {StoreFreeze} from '../state/store.jsx';
import {useFolderInstall} from '../state/update.js';
import {colors} from '../ui/colors.js';
import {Icon} from '../ui/Icon.jsx';
import {useFavoriteAction} from '../ui/GameCard.jsx';
import {Logo} from '../ui/Logo.jsx';
import {Catalog} from './Catalog.jsx';
import {ContinueRow} from './ContinueRow.jsx';
import {FilterDrawer} from './FilterDrawer.jsx';
import {FeatureTrio} from './FeatureTrio.jsx';
import {GenreRail} from './GenreRail.jsx';
import {PageHints} from './PageHints.jsx';
import {PopularRail} from './PopularRail.jsx';
import {RecentRow} from './RecentRow.jsx';
import {Spotlight} from './Spotlight.jsx';
import {TopCharts} from './TopCharts.jsx';
import '../assets/Inter-Regular.ttf';
import '../assets/JetBrainsMono-Regular.ttf';

function Footer() {
  const t = useT();
  return (
    <View
      style={{
        marginHorizontal: -48,
        marginTop: 120,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 2,
        borderColor: '#2a2a2f',
        paddingHorizontal: 48,
        paddingVertical: 48
      }}
    >
      <Logo color={colors.muted} />
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
        {t('browse.footer')}
      </Text>
    </View>
  );
}

function FolderInstallNotice() {
  const t = useT();
  if (!useFolderInstall()) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#2a2a2f',
        backgroundColor: '#17171a',
        paddingHorizontal: 30,
        paddingVertical: 18
      }}
    >
      <Icon name="alert" size={18} color={colors.muted} />
      <View style={{flex: 1, gap: 3}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
          {t('browse.folderInstall')}
        </Text>
      </View>
    </View>
  );
}

const Sections = memo(function Sections({onOpenFilters}) {
  const onAction = useFavoriteAction();
  return (
    <FocusScope trap onAction={onAction}>
      <ScrollView style={{flex: 1, gap: 84, paddingHorizontal: 48}}>
        <View scrollAnchor style={{gap: 24, paddingTop: 36}}>
          <FolderInstallNotice />
          <Spotlight />
        </View>
        <PopularRail />
        <FeatureTrio />
        <ContinueRow />
        <RecentRow />
        <TopCharts />
        <GenreRail />
        <Catalog onOpenFilters={onOpenFilters} />
        <Footer />
      </ScrollView>
    </FocusScope>
  );
});

export const BrowsePage = memo(function BrowsePage() {
  const [open, setOpen] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [drawer] = useState(() => ({
    open: () => {
      setOpen(true);
      setFrozen(true);
    },
    close: () => setOpen(false),
    closed: () => setFrozen(false)
  }));
  return (
    <>
      <StoreFreeze frozen={frozen}>
        <Sections onOpenFilters={drawer.open} />
      </StoreFreeze>
      <FilterDrawer open={open} onClose={drawer.close} onClosed={drawer.closed} />
      <PageHints />
    </>
  );
});
