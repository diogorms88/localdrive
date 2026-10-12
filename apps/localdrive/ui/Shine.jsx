import {useEffect, useState} from 'react';
import {useIsFocused, View, motion} from '@ps5-react/core';
import {px} from './scale.js';

const CYCLE_MS = 5e3;

const SETTLE_MS = 300;

const sweep = {type: 'tween', duration: 1.6, ease: [0.4, 0, 0.3, 1]};

const band = {
  backgroundGradient: {
    type: 'linear',
    angle: 115,
    stops: [
      {color: '#ffffff00', offset: 0.3},
      {color: '#ffffff11', offset: 0.5},
      {color: '#ffffff00', offset: 0.7}
    ]
  }
};

export function Shine({width, round = 'lg'}) {
  const focused = useIsFocused();
  const [pass, setPass] = useState(0);
  useEffect(() => {
    if (!focused) return void 0;
    let interval;
    const settle = setTimeout(() => {
      setPass(1);
      interval = setInterval(() => setPass(n => n + 1), CYCLE_MS);
    }, SETTLE_MS);
    return () => {
      clearTimeout(settle);
      clearInterval(interval);
      setPass(0);
    };
  }, [focused]);
  if (!focused || pass === 0) return null;
  return (
    <View
      style={
        round === 'xl'
          ? {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', borderRadius: 18}
          : {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', borderRadius: 12}
      }
    >
      <motion.View
        key={pass}
        style={[{position: 'absolute', top: 0, bottom: 0, left: 0}, [{width: px(width)}, band]]}
        initial={{x: -0.7 * width}}
        animate={{x: 0.7 * width}}
        transition={sweep}
      />
    </View>
  );
}
