import {useEffect} from 'react';
import {useAnimatedValue, Animated, Easing, motion, View, useIsFocused} from '@ps5-react/core';
import {px} from './scale.js';

const SHINE_MS = 6e3;

const shine = {
  type: 'radial',
  width: px(1.5),
  size: 3,
  stops: [
    {color: '#ffffff00', offset: 0.25},
    {color: '#ffffffc7', offset: 0.5},
    {color: '#ffffff00', offset: 0.75}
  ]
};

const fade = {
  initial: {opacity: 0},
  animate: {opacity: 1},
  exit: {opacity: 0},
  transition: {type: 'tween', duration: 0.3, ease: [0, 0, 0.2, 1]}
};

const breathe = {
  initial: {opacity: 0.4},
  animate: {opacity: 1},
  transition: {type: 'tween', duration: 2.8, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse'}
};

export function ShineBorder({radius}) {
  const angle = useAnimatedValue(0);
  useEffect(() => {
    const run = Animated.loop(
      Animated.timing(angle, {toValue: 360, duration: SHINE_MS, easing: Easing.linear})
    );
    run.start();
    return () => run.stop();
  }, []);
  return (
    <motion.View
      {...fade}
      pointerEvents="none"
      style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}
    >
      <Animated.View
        style={[
          {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0},
          {borderRadius: px(radius), borderGradient: shine, borderGradientAngle: angle}
        ]}
      />
    </motion.View>
  );
}

function Glow({radius}) {
  const ring = (offset, color) => ({
    position: 'absolute',
    left: -px(offset),
    top: -px(offset),
    right: -px(offset),
    bottom: -px(offset),
    borderRadius: px(radius + offset),
    borderWidth: px(3),
    borderColor: color
  });
  return (
    <motion.View {...breathe} style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}>
      <View style={ring(3, '#ffffff59')} />
      <View style={ring(6, '#ffffff21')} />
    </motion.View>
  );
}

const RING_RADIUS = {full: 999, lg: 12, md: 10};

export function FocusRing({round = 'md', halo = false, radius}) {
  const focused = useIsFocused();
  if (!focused) return null;
  if (halo)
    return (
      <View style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}>
        <Glow radius={radius ?? RING_RADIUS[round]} />
      </View>
    );
  return (
    <View style={{position: 'absolute', top: -7, right: -7, bottom: -7, left: -7}}>
      <ShineBorder radius={RING_RADIUS[round]} />
    </View>
  );
}

export function FocusFrame({round = 'lg'}) {
  const focused = useIsFocused();
  if (!focused) return null;
  return <ShineBorder radius={round === '2xl' ? 16 : round === 'xl' ? 12 : 8} />;
}
