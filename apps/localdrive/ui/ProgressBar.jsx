import {View, motion} from '@ps5-react/core';
import {useLocale} from '../i18n/index.js';
import {px} from './scale.js';

export const glide = {type: 'tween', duration: 0.05, ease: 'linear'};

export function ProgressBar({fraction, width, active: active}) {
  const {rtl} = useLocale();
  return (
    <View
      style={[
        {height: 6, overflow: 'hidden', borderRadius: 14999, backgroundColor: '#212125'},
        {width: px(width)}
      ]}
    >
      <motion.View
        style={
          active
            ? {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#f2f2f3'}
            : {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#8a8a94'}
        }
        initial={false}
        animate={{x: (rtl ? 1 : -1) * (1 - fraction) * width}}
        transition={glide}
      />
    </View>
  );
}
