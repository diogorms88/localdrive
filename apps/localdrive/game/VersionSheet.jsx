import {useMemo} from 'react';
import {useIsFocused, View, Text} from '@ps5-react/core';
import {t} from '../i18n/core.js';
import {useT, useLocale} from '../i18n/index.js';
import {formatBytes, formatSize} from '../state/size.js';
import {preferredRelease, sourceSections} from './sources.js';
import {colors} from '../ui/colors.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {PlatformBadge} from '../ui/PlatformBadge.jsx';
import {SideSheet} from '../ui/SideSheet.jsx';
import '../assets/Inter-Regular.ttf';

function summary(edition) {
  const releases = edition.releases || [];
  const bytes = releases[preferredRelease(releases)]?.sizeBytes;
  const sources = sourceSections(releases)
    .filter(({group}) => group !== 'dlc' && group !== 'unavailable')
    .reduce((sum, {items}) => sum + items.length, 0);
  return [
    bytes ? formatBytes(bytes) : edition.sizeGb ? formatSize(edition.sizeGb) : null,
    t('versions.sources', {count: sources})
  ];
}

export function VersionFace({edition: edition, here, twin, recommended}) {
  const t = useT();
  const {locale: locale} = useLocale();
  const focused = useIsFocused();
  const facts = useMemo(() => summary(edition), [edition, locale]);
  const detail = [...facts, here ? t('versions.thisPage') : null].filter(Boolean).join(' \xB7 ');
  const name = t('versions.name', {platform: edition.platform.toUpperCase()});
  return (
    <>
      <FocusRing />
      <PlatformBadge platforms={[edition.platform]} />
      <View style={{flex: 1, gap: 3}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#f2f2f3'}}>
          {twin ? [name, edition.region, edition.titleId].filter(Boolean).join(' \xB7 ') : name}
        </Text>
        <Text
          style={[
            {fontFamily: 'Inter-Regular', fontSize: 21, lineHeight: 30},
            {color: focused ? colors.fg : colors.muted}
          ]}
        >
          {t(recommended ? 'versions.recommended' : `versions.note.${edition.platform}`)}
        </Text>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
          {detail}
        </Text>
      </View>
    </>
  );
}

export function VersionSheet({title, editions, current, submit, onClose}) {
  const t = useT();
  return (
    <SideSheet title={t('versions.title')} subtitle={title} onClose={onClose}>
      <View style={{gap: 6, padding: 9}}>
        {editions.map((edition, index) => (
          <View
            key={edition.id}
            autoFocus={index === 0}
            onPress={() => {
              onClose();
              submit(edition);
            }}
            style={_state => [
              {
                position: 'relative',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 24,
                borderRadius: 12,
                paddingHorizontal: 18,
                paddingVertical: 24
              },
              _state.focused ? {backgroundColor: '#212125'} : null
            ]}
          >
            <VersionFace
              edition={edition}
              here={edition.id === current}
              recommended={index === 0 && edition.platform === 'ps5'}
              twin={editions.some(other => other !== edition && other.platform === edition.platform)}
            />
          </View>
        ))}
      </View>
    </SideSheet>
  );
}
