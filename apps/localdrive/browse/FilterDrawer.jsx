import {memo, useRef, useState} from 'react';
import {useIsFocused, Text, View, FocusScope, ScrollView, AnimatePresence} from '@ps5-react/core';
import {formatNumber} from '../i18n/core.js';
import {useT} from '../i18n/index.js';
import {facetCounts, facetTitle, optionLabel, activeCount, filterGames, FACETS} from '../state/catalog.js';
import {useStore} from '../state/store.jsx';
import {CdnAura, CdnSpark} from '../ui/CdnAura.jsx';
import {FocusRing} from '../ui/FocusRing.jsx';
import {PlatformBadge} from '../ui/PlatformBadge.jsx';
import {EASE_OUT} from '../ui/ease.js';
import {useNavActions} from '../state/nav.jsx';
import {Button} from '../ui/Button.jsx';
import {useHints} from '../ui/Legend.jsx';
import {SheetPanel} from '../ui/SideSheet.jsx';
import '../assets/Inter-Regular.ttf';

const WIDTH = 480;

const slide = {type: 'tween', duration: 0.24, ease: EASE_OUT};

const TILE_LIMIT = 3;

const PILL_LIMIT = 12;

function TileFace({facet, value, label, count, active: active}) {
  const t = useT();
  const focused = useIsFocused();
  return (
    <>
      <FocusRing />
      {facet === 'platform' ? (
        <PlatformBadge platforms={[value]} />
      ) : (
        <Text
          style={
            active
              ? {fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#000000'}
              : {fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#f2f2f3'}
          }
        >
          {label}
        </Text>
      )}
      <Text
        style={
          active
            ? {fontFamily: 'Inter-Regular', fontSize: 21, color: '#000000b3', lineHeight: 30}
            : count === 0
              ? {fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a9499', lineHeight: 30}
              : focused
                ? {fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}
                : {fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}
        }
      >
        {t('catalog.gameCount', {count})}
      </Text>
    </>
  );
}

const reachable = ({count, active: active}) => count > 0 || active;

function Tile({focusKey, autoFocus, ...props}) {
  const {active: active, onPress} = props;
  return (
    <View
      focusKey={focusKey}
      autoFocus={autoFocus}
      focusable={reachable(props)}
      onPress={onPress}
      style={_state =>
        active
          ? {
              height: 108,
              flex: 1,
              justifyContent: 'center',
              gap: 9,
              borderRadius: 12,
              backgroundColor: '#f2f2f3',
              paddingHorizontal: 24
            }
          : [
              {
                height: 108,
                flex: 1,
                justifyContent: 'center',
                gap: 9,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#2a2a2f',
                paddingHorizontal: 24
              },
              _state.focused ? {backgroundColor: '#212125'} : null
            ]
      }
    >
      <TileFace {...props} />
    </View>
  );
}

function PillFace({label, count, active: active}) {
  const focused = useIsFocused();
  const empty = count === 0 && !active;
  return (
    <>
      <FocusRing round="full" />
      <Text
        style={
          active
            ? {fontFamily: 'Inter-Regular', fontSize: 21, fontWeight: 600, color: '#000000', lineHeight: 30}
            : empty
              ? {fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a9499', lineHeight: 30}
              : focused
                ? {fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}
                : {fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3d9', lineHeight: 30}
        }
      >
        {label}
      </Text>
      <Text
        style={
          active
            ? {fontFamily: 'Inter-Regular', fontSize: 20, color: '#00000099'}
            : {fontFamily: 'Inter-Regular', fontSize: 20, color: '#8a8a94'}
        }
      >
        {formatNumber(count)}
      </Text>
    </>
  );
}

function Pill({label, count, active: active, onPress, focusKey, autoFocus, value}) {
  const cdn = value === 'overdrive cdn' && !active;
  return (
    <View
      focusKey={focusKey}
      autoFocus={autoFocus}
      focusable={reachable({count, active: active})}
      onPress={onPress}
      style={_state =>
        active
          ? {
              height: 60,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderRadius: 14999,
              backgroundColor: '#f2f2f3',
              paddingHorizontal: 24
            }
          : cdn
            ? {
                position: 'relative',
                height: 60,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderRadius: 14999,
                backgroundColor: '#17171a',
                paddingHorizontal: 24
              }
            : [
                {
                  height: 60,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 14999,
                  backgroundColor: '#17171a',
                  paddingHorizontal: 24
                },
                _state.focused ? {backgroundColor: '#2b2b30'} : null
              ]
      }
    >
      {cdn ? <CdnAura radius={20} width={170} /> : null}
      {cdn ? <CdnSpark size={14} /> : null}
      <PillFace label={label} count={count} active={active} />
    </View>
  );
}

function More({count, onPress}) {
  const t = useT();
  const focused = useIsFocused();
  return (
    <View
      onPress={onPress}
      style={_state => [
        {
          height: 60,
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 14999,
          borderWidth: 2,
          borderColor: '#2a2a2f',
          paddingHorizontal: 24
        },
        _state.focused ? {backgroundColor: '#2b2b30'} : null
      ]}
    >
      <FocusRing round="full" />
      <Text
        style={
          focused
            ? {fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}
            : {fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}
        }
      >
        {t('filters.more', {count})}
      </Text>
    </View>
  );
}

function ClearFacet({onPress}) {
  const t = useT();
  const focused = useIsFocused();
  return (
    <View onPress={onPress} style={{borderRadius: 6, paddingHorizontal: 6}}>
      <FocusRing />
      <Text
        style={
          focused
            ? {fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}
            : {fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}
        }
      >
        {t('filters.clearFacet')}
      </Text>
    </View>
  );
}

function Facet({facet, store, autoFocus}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const {focusLater} = useNavActions();
  const counts = facetCounts(store, facet);
  const picked = store.filters[facet.key];
  const tiles = facet.options.length <= TILE_LIMIT;
  const folded = !tiles && !expanded && facet.options.length > PILL_LIMIT;
  const shown = folded
    ? facet.options.filter((option, index) => index < PILL_LIMIT || picked.includes(option.value))
    : facet.options;
  return (
    <View style={{gap: 18, borderBottomWidth: 2, borderColor: '#2a2a2f', paddingVertical: 30}}>
      <View style={{height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 20,
            fontWeight: 600,
            color: '#a3a3ab',
            letterSpacing: 1.6
          }}
        >
          {facetTitle(facet.key).toUpperCase()}
        </Text>
        {picked.length > 0 && (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 18}}>
            <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}}>
              {t('filters.selected', {count: picked.length})}
            </Text>
            <ClearFacet
              onPress={() => {
                store.setFilters({...store.filters, [facet.key]: []});
                focusLater(`filters:${facet.key}`);
              }}
            />
          </View>
        )}
      </View>
      <View
        style={tiles ? {flexDirection: 'row', gap: 18} : {flexDirection: 'row', flexWrap: 'wrap', gap: 12}}
      >
        {shown.map((option, index) => {
          const {value} = option;
          const props = {
            facet: facet.key,
            value,
            label: optionLabel(option),
            count: counts[value],
            active: picked.includes(value),
            onPress: () => store.toggleFilter(facet.key, value),
            focusKey: index === 0 ? `filters:${facet.key}` : `filters:${facet.key}:${value}`,
            autoFocus: index === 0 && autoFocus
          };
          return tiles ? <Tile key={value} {...props} /> : <Pill key={value} value={value} {...props} />;
        })}
        {folded && (
          <More
            count={facet.options.length - shown.length}
            onPress={() => {
              setExpanded(true);
              focusLater(`filters:${facet.key}:${facet.options[PILL_LIMIT].value}`);
            }}
          />
        )}
      </View>
    </View>
  );
}

const HINTS = [
  {button: 'cross', label: 'hints.toggle'},
  {button: 'circle', label: 'hints.close'}
];

function Panel({onClose}) {
  useHints(HINTS);
  const t = useT();
  const store = useStore();
  const {filters, clearFilters} = store;
  const {focusLater} = useNavActions();
  const count = activeCount(filters);
  const total = filterGames(store).length;
  const opened = useRef(JSON.stringify(filters));
  const close = () => {
    if (JSON.stringify(filters) !== opened.current) focusLater('catalog:filters');
    onClose();
    return true;
  };
  return (
    // A modal: the shoulder buttons would switch the header's section under it, so every action stops here.
    <FocusScope trap onBack={close} onAction={action => action !== 'triangle' || close()}>
      <View
        style={{
          height: 96,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          borderBottomWidth: 2,
          borderColor: '#2a2a2f'
        }}
      >
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
          {t('filters.title')}
        </Text>
        {count > 0 && (
          <View
            style={{
              height: 36,
              minWidth: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14999,
              backgroundColor: '#f2f2f3',
              paddingHorizontal: 12
            }}
          >
            <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, fontWeight: 600, color: '#000000'}}>
              {String(count)}
            </Text>
          </View>
        )}
        <View style={{flex: 1}} />
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
          {t('catalog.gameCount', {count: total})}
        </Text>
      </View>
      <ScrollView style={{marginHorizontal: -24, flex: 1, paddingHorizontal: 24}}>
        {FACETS.map((facet, index) => (
          <Facet key={facet.key} facet={facet} store={store} autoFocus={index === 0} />
        ))}
        <View style={{flexDirection: 'row', gap: 18, paddingBottom: 36, paddingTop: 30}}>
          {count > 0 && (
            <Button
              variant="secondary"
              size="lg"
              label={t('filters.clearAll')}
              onPress={() => {
                clearFilters();
                focusLater(`filters:${FACETS[0].key}`);
              }}
            />
          )}
          <Button
            variant="primary"
            size="lg"
            style={{flex: 1}}
            label={t('filters.show', {count: total})}
            onPress={close}
          />
        </View>
      </ScrollView>
    </FocusScope>
  );
}

export const FilterDrawer = memo(function FilterDrawer({open, onClose, onClosed}) {
  return (
    <AnimatePresence onExitComplete={onClosed}>
      {open && (
        <View key={'drawer'} style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 30}}>
          <SheetPanel
            style={{width: 720, paddingHorizontal: 36}}
            initial={{x: WIDTH}}
            animate={{x: 0}}
            exit={{x: WIDTH, transition: {...slide, duration: 0.16}}}
            transition={slide}
          >
            <Panel onClose={onClose} />
          </SheetPanel>
        </View>
      )}
    </AnimatePresence>
  );
});
