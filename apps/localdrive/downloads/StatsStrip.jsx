import {View, Text} from '@ps5-react/core';
import {useLocale, useT} from '../i18n/index.js';
import {colors} from '../ui/colors.js';
import {formatSpeed} from './format.js';
import {useThroughput} from './useThroughput.js';
import {SpeedChart} from './SpeedChart.jsx';
import '../assets/Inter-Regular.ttf';

const CHART = {width: 260, height: 44};

function Stat({label, value, chart, first}) {
  const {rtl} = useLocale();
  return (
    <View
      style={[
        {height: 108, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
        rtl ? {paddingRight: 30, paddingLeft: 24} : {paddingLeft: 30, paddingRight: 24},
        first
          ? null
          : rtl
            ? {borderRightWidth: 2, borderColor: '#2a2a2f'}
            : {borderLeftWidth: 2, borderColor: '#2a2a2f'}
      ]}
    >
      <View style={{gap: 3}}>
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            fontWeight: 600,
            color: '#f2f2f3',
            lineHeight: 30
          }}
        >
          {label}
        </Text>
        <Text
          style={{width: 210, fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}
        >
          {value}
        </Text>
      </View>
      {chart}
    </View>
  );
}

const latest = samples => samples[samples.length - 1] ?? 0;

export function StatsStrip({id}) {
  const t = useT();
  const {network, disk} = useThroughput(id);
  const max = Math.max(...network, ...disk, 1);
  return (
    <View style={{flexDirection: 'row', borderTopWidth: 2, borderColor: '#2a2a2f'}}>
      <Stat
        first
        label={t('downloads.stats.download')}
        value={formatSpeed(latest(network))}
        chart={<SpeedChart samples={network} max={max} color={colors.fg} {...CHART} />}
      />
      <Stat
        label={t('downloads.stats.write')}
        value={formatSpeed(latest(disk))}
        chart={<SpeedChart samples={disk} max={max} color={colors.muted} {...CHART} />}
      />
    </View>
  );
}
