import {useState} from 'react';
import {useIsFocused, View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {describeSource, isLocalDriveCdn, preferredRelease, sourceSections} from './sources.js';
import {colors} from '../ui/colors.js';
import {CdnAura, CdnSpark} from '../ui/CdnAura.jsx';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import {SideSheet} from '../ui/SideSheet.jsx';
import {VersionFace} from './VersionSheet.jsx';
import '../assets/Inter-Regular.ttf';

const SECTION = {
  direct: {title: 'sources.section.direct', icon: 'download'},
  page: {title: 'sources.section.page', icon: 'download', note: 'sources.section.pageNote'},
  browser: {title: 'sources.section.browser', icon: 'external'},
  dlc: {title: 'sources.section.dlc', icon: 'download', note: 'sources.section.dlcNote'}
};

function RowFace({icon, name, detail: detail, size, recommended, current, cdn}) {
  const t = useT();
  const focused = useIsFocused();
  const ink = focused ? colors.fg : colors.muted;
  return (
    <>
      {cdn ? <CdnAura radius={8} width={492} /> : null}
      <FocusRing />
      {cdn ? <CdnSpark size={18} /> : <Icon name={icon} size={18} color={ink} />}
      <View style={{flex: 1, gap: 3}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#f2f2f3'}}>
            {name}
          </Text>
          {recommended ? (
            <View
              style={{borderRadius: 3, backgroundColor: '#f2f2f3', paddingHorizontal: 9, paddingVertical: 2}}
            >
              <Text
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#000000',
                  lineHeight: 24
                }}
              >
                {t('sources.recommended')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[
            {
              width: 450,
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              numberOfLines: 2,
              ellipsizeMode: 'tail',
              lineHeight: 30
            },
            {color: ink}
          ]}
        >
          {detail || t('sources.noDetails')}
        </Text>
      </View>
      <Text
        style={[
          {width: 108, fontFamily: 'Inter-Regular', fontSize: 21, textAlign: 'end', lineHeight: 30},
          {color: ink}
        ]}
      >
        {size ?? ''}
      </Text>
      <View style={{width: 27, alignItems: 'flex-end'}}>
        {current ? <Icon name="check" size={18} color={colors.fg} /> : null}
      </View>
    </>
  );
}

function Section({group, items, selected, recommended, revealed, onPick}) {
  const t = useT();
  const {title, icon, note} = SECTION[group];
  return (
    <View style={{gap: 6}}>
      <View style={{marginBottom: 6, gap: 3, paddingHorizontal: 18}}>
        <Text
          style={{fontFamily: 'Inter-Regular', fontSize: 20, fontWeight: 600, color: '#8a8a94'}}
        >{`${t(title)} \xB7 ${items.length}`}</Text>
        {note ? (
          <Text
            style={{
              width: 660,
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              color: '#8a8a94',
              numberOfLines: 2,
              ellipsizeMode: 'tail',
              lineHeight: 30
            }}
          >
            {t(note)}
          </Text>
        ) : null}
      </View>
      {items.map(({release, index}, row) => {
        const {name, detail: detail, size} = describeSource(release);
        return (
          <View
            key={release.id}
            autoFocus={index === selected || (revealed && row === 0)}
            onPress={() => onPick(index)}
            style={_state => [
              {
                position: 'relative',
                minHeight: 84,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
                borderRadius: 12,
                paddingHorizontal: 18,
                paddingVertical: 12
              },
              _state.focused ? {backgroundColor: '#212125'} : null
            ]}
          >
            <RowFace
              icon={icon}
              name={name}
              detail={detail}
              size={size}
              cdn={isLocalDriveCdn(release.provider)}
              recommended={index === recommended && group !== 'browser'}
              current={index === selected}
            />
          </View>
        );
      })}
    </View>
  );
}

function RevealFace({count}) {
  const t = useT();
  const focused = useIsFocused();
  const ink = focused ? colors.fg : colors.muted;
  return (
    <>
      <FocusRing />
      <Icon name="external" size={18} color={ink} />
      <View style={{flex: 1, gap: 3}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#f2f2f3'}}>
          {t('sources.showBrowser', {count})}
        </Text>
        <Text
          style={[
            {
              width: 570,
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              numberOfLines: 2,
              ellipsizeMode: 'tail',
              lineHeight: 30
            },
            {color: ink}
          ]}
        >
          {t('sources.browserNote')}
        </Text>
      </View>
      <Icon name="chevronDown" size={18} color={ink} />
    </>
  );
}

function Versions({editions, current, onEdition}) {
  const t = useT();
  return (
    <View style={{gap: 6}}>
      <Text
        style={{
          marginBottom: 6,
          paddingHorizontal: 18,
          fontFamily: 'Inter-Regular',
          fontSize: 20,
          fontWeight: 600,
          color: '#8a8a94'
        }}
      >{`${t('sources.section.versions')} \xB7 ${editions.length}`}</Text>
      {editions.map((edition, index) => (
        <View
          key={edition.id}
          onPress={() => onEdition(edition)}
          style={_state => [
            {
              position: 'relative',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 24,
              borderRadius: 12,
              paddingHorizontal: 18,
              paddingVertical: 18
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
  );
}

export function SourcePicker({
  title,
  releases,
  selected,
  submit,
  editions = [],
  current,
  onEdition,
  onClose
}) {
  const recommended = preferredRelease(releases);
  const sections = sourceSections(releases);
  const count = group => sections.find(section => section.group === group)?.items.length ?? 0;
  const [browser, setBrowser] = useState(
    () => (!count('direct') && !count('page')) || describeSource(releases[selected]).group === 'browser'
  );
  const [revealed, setRevealed] = useState(false);
  const pick = index => {
    submit(index);
    onClose();
  };
  const t = useT();
  return (
    <SideSheet title={t('sources.title')} subtitle={title} onClose={onClose}>
      <View style={{gap: 42, padding: 9, paddingBottom: 48}}>
        {editions.length > 1 ? (
          <Versions
            editions={editions}
            current={current}
            onEdition={edition => {
              onClose();
              if (edition.id !== current) onEdition(edition.id);
            }}
          />
        ) : null}
        {sections
          .filter(({group}) => group === 'direct' || group === 'page' || (browser && group === 'browser'))
          .map(({group, items}) => (
            <Section
              key={group}
              group={group}
              items={items}
              selected={selected}
              recommended={recommended}
              revealed={revealed && group === 'browser'}
              onPick={pick}
            />
          ))}
        {!browser && count('browser') ? (
          <View
            onPress={() => {
              setBrowser(true);
              setRevealed(true);
            }}
            style={_state => [
              {
                position: 'relative',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
                borderRadius: 12,
                paddingHorizontal: 18,
                paddingVertical: 18
              },
              _state.focused ? {backgroundColor: '#212125'} : null
            ]}
          >
            <RevealFace count={count('browser')} />
          </View>
        ) : null}
        {count('dlc') ? (
          <Section
            group="dlc"
            items={sections.find(({group}) => group === 'dlc').items}
            selected={selected}
            recommended={-1}
            revealed={false}
            onPick={pick}
          />
        ) : null}
      </View>
    </SideSheet>
  );
}
