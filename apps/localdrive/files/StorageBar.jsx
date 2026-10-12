import {View, Text, motion} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {formatBytes} from '../state/size.js';
import {px} from '../ui/scale.js';
import {EASE_OUT} from '../ui/ease.js';
import {KINDS} from './scan.js';
import '../assets/Inter-Regular.ttf';

const SHADE = {
  packages: '#d9d9de',
  images: '#a3a3ab',
  archives: '#76767f',
  extracted: '#5a5a62',
  other: '#46464d'
};

const OTHER_DATA = '#2b2b30';

const lift = {type: 'tween', duration: 0.18, ease: EASE_OUT};

function Swatch({color, label, size}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
      <View style={[{height: 12, width: 12, borderRadius: 14999}, {backgroundColor: color}]} />
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, color: '#a3a3ab'}}>{label}</Text>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, color: '#8a8a94'}}>{size}</Text>
    </View>
  );
}

export function StorageBar({usage, sums, focus: focus, width}) {
  const t = useT();
  if (!usage?.total) return null;
  const share = bytes => Math.round((bytes / usage.total) * width);
  const kinds = KINDS.filter(kind => sums[kind.key].size > 0);
  const others = Math.max(0, usage.total - usage.free - sums.all.size);
  return (
    <View style={{gap: 18}}>
      <View
        style={[
          {
            height: 12,
            flexDirection: 'row',
            overflow: 'hidden',
            borderRadius: 14999,
            backgroundColor: '#17171a'
          },
          {width: px(width)}
        ]}
      >
        {kinds.map(kind => (
          <motion.View
            key={kind.key}
            initial={false}
            transition={lift}
            animate={{opacity: !focus || focus === kind.key ? 1 : 0.55}}
            style={[
              {height: 12},
              {
                width: px(Math.max(3, share(sums[kind.key].size))),
                backgroundColor: focus === kind.key ? '#ffffff' : SHADE[kind.key]
              }
            ]}
          />
        ))}
        <View style={[{height: 12}, {width: px(share(others)), backgroundColor: OTHER_DATA}]} />
      </View>
      <View style={[{flexDirection: 'row', flexWrap: 'wrap', columnGap: 30, rowGap: 6}, {width: px(width)}]}>
        {kinds.map(kind => (
          <Swatch
            key={kind.key}
            color={focus === kind.key ? '#ffffff' : SHADE[kind.key]}
            label={t(`files.kind.${kind.key}`)}
            size={formatBytes(sums[kind.key].size)}
          />
        ))}
        <Swatch color={OTHER_DATA} label={t('files.otherData')} size={formatBytes(others)} />
      </View>
    </View>
  );
}
