import {View, Text} from '@ps5-react/core';
import {fitBytes, SPAN_MAX} from '../i18n/fit.js';
import {useT} from '../i18n/index.js';
import {formatBytes} from '../state/size.js';
import {colors} from '../ui/colors.js';
import {useProgress, fractionOf} from './useQueue.js';
import {ProgressBar} from '../ui/ProgressBar.jsx';
import {ShimmerText} from '../ui/ShimmerText.jsx';
import {formatTimeLeft} from './format.js';
import '../assets/Inter-Regular.ttf';

const TRACK = 580;

const LABEL = {fontFamily: 'Inter-Regular', fontSize: 21, lineHeight: 30};

export function RowProgress({id, label, moving, waiting: waiting, complete}) {
  const t = useT();
  const progress = useProgress(id);
  const {written = 0, total = null, bytesPerSecond = 0} = progress ?? {};
  const left = moving && total && bytesPerSecond ? formatTimeLeft((total - written) / bytesPerSecond) : '';
  const size = complete
    ? formatBytes(total || written)
    : total
      ? t('download.status.progress', {done: formatBytes(written), total: formatBytes(total)})
      : written
        ? t('download.soFar', {size: formatBytes(written)})
        : '';
  return (
    <View style={{gap: 12}}>
      <ProgressBar fraction={complete ? 1 : fractionOf(progress)} width={TRACK} active={moving || complete} />
      <View style={{width: 870, flexDirection: 'row', justifyContent: 'space-between'}}>
        {waiting ? (
          <View style={{width: 540}}>
            <ShimmerText textStyle={LABEL} background={colors.surface}>
              {label}
            </ShimmerText>
          </View>
        ) : (
          <Text
            style={{
              width: 540,
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              color: '#f2f2f3',
              numberOfLines: 1,
              ellipsizeMode: 'tail',
              lineHeight: 30
            }}
          >
            {fitBytes(label, SPAN_MAX)}
            <Text style={{color: '#a3a3ab'}}>{left ? fitBytes(`  ${left}`, SPAN_MAX) : ''}</Text>
          </Text>
        )}
        <Text
          style={{
            width: 315,
            textAlign: 'end',
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            color: '#a3a3ab',
            lineHeight: 30
          }}
        >
          {size}
        </Text>
      </View>
    </View>
  );
}
