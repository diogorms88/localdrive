import {useState} from 'react';
import {View, Text, motion} from '@ps5-react/core';
import {colors} from './colors.js';
import {logical, px} from './scale.js';

const BAND = 100;

const SWEEP_S = 2;

const PAUSE_S = 1.6;

const DIM = 'a6';

export function ShimmerText({textStyle, background = colors.canvas, children}) {
  const [width, setWidth] = useState(0);
  const veil = `${background}${DIM}`;
  const pause = ((width + BAND) / SWEEP_S) * PAUSE_S;
  const side = width + BAND + pause;
  return (
    <View style={{position: 'relative', alignSelf: 'flex-start', overflow: 'hidden'}}>
      <Text
        style={[textStyle, {color: colors.fg}]}
        numberOfLines={1}
        onLayout={event => setWidth(Math.ceil(logical(event.layout.width)))}
      >
        {children}
      </Text>
      {width ? (
        <motion.View
          key={width}
          style={{position: 'absolute', top: 0, bottom: 0, left: 0, flexDirection: 'row'}}
          initial={{x: -side - BAND - pause}}
          animate={{x: width - side}}
          transition={{type: 'tween', duration: SWEEP_S + PAUSE_S, ease: 'linear', repeat: Infinity}}
        >
          <View style={{width: px(side), backgroundColor: veil}} />
          <View
            style={{
              width: px(BAND),
              backgroundGradient: {
                type: 'linear',
                angle: 90,
                stops: [
                  {color: veil, offset: 0},
                  {color: `${background}00`, offset: 0.5},
                  {color: veil, offset: 1}
                ]
              }
            }}
          />
          <View style={{width: px(side), backgroundColor: veil}} />
        </motion.View>
      ) : null}
    </View>
  );
}
