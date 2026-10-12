import {View, motion, transitions} from '@ps5-react/core';
import {colors} from './colors.js';
import {Icon} from './Icon.jsx';

export function WishHeart({active: active, color = colors.fg}) {
  return (
    <View
      style={{position: 'relative', width: 24, height: 24, alignItems: 'center', justifyContent: 'center'}}
    >
      {active && (
        <motion.View
          key={'burst'}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: 14999,
            borderWidth: 2,
            borderColor: '#f2f2f3'
          }}
          initial={{scale: 0.4, opacity: 0.7}}
          animate={{scale: 2.4, opacity: 0}}
          transition={{type: 'tween', duration: 0.55, ease: 'easeOut'}}
        />
      )}
      <motion.View
        key={String(active)}
        initial={active ? {scale: 1.45} : false}
        animate={{scale: 1}}
        transition={transitions.pop}
      >
        <Icon name="heart" color={color} fill={active ? color : 'none'} />
      </motion.View>
    </View>
  );
}
