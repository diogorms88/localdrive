import {useEffect, useState} from 'react';
import {View, motion, AnimatePresence} from '@ps5-react/core';
import {px} from './scale.js';
import {ShineBorder} from './FocusRing.jsx';
import {PlatformBadge} from './PlatformBadge.jsx';

const SIZE = 2.6;

const band = {
  backgroundGradient: {
    type: 'linear',
    angle: 330,
    stops: [
      {color: '#ffffff00', offset: 0.6},
      {color: '#ffffff38', offset: 0.7},
      {color: '#ffffff00', offset: 1}
    ]
  }
};

const cross = {type: 'tween', duration: 0.75, ease: [0.25, 0.1, 0.25, 1]};

const SETTLE_MS = 300;

const fade = {
  initial: {opacity: 0},
  animate: {opacity: 1},
  exit: {opacity: 0},
  transition: {type: 'tween', duration: 0.3, ease: [0, 0, 0.2, 1]}
};

function Glare({width, height}) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const settle = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(settle);
  }, []);
  if (!settled) return null;
  const travel = SIZE - 1;
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: 'hidden',
        borderRadius: 12
      }}
    >
      <motion.View
        style={[
          {position: 'absolute', left: 0, top: 0},
          [{width: px(width * SIZE), height: px(height * SIZE)}, band]
        ]}
        initial={{x: travel * width, y: travel * height}}
        animate={{x: -travel * width, y: -travel * height}}
        transition={cross}
      />
    </View>
  );
}

export function CardFocus({focused, width, height, platforms}) {
  return (
    <>
      <AnimatePresence>
        {focused && platforms?.length > 0 && (
          <motion.View key={'tag'} {...fade} style={{position: 'absolute', bottom: 12, left: 12}}>
            <PlatformBadge platforms={platforms} />
          </motion.View>
        )}
      </AnimatePresence>
      {focused && <Glare width={width} height={height} />}
      <AnimatePresence>{focused && <ShineBorder key={'shine'} radius={8} />}</AnimatePresence>
    </>
  );
}
