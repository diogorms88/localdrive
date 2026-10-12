import {View, motion} from '@ps5-react/core';

const BLOCK = {backgroundColor: '#212125', borderRadius: 9};

const pulse = {
  initial: {opacity: 1},
  animate: {opacity: 0.5},
  transition: {type: 'tween', duration: 0.9, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse'}
};

export function Skeleton({style, pulse: pulsing = false}) {
  if (!pulsing) return <View style={[BLOCK, style]} />;
  return <motion.View {...pulse} style={[BLOCK, style]} />;
}
