import {useEffect} from 'react';
import {useAnimatedValue, Animated, Easing, View, motion, Text, Svg, Path} from '@ps5-react/core';
import {px} from './scale.js';
import '../assets/Inter-Regular.ttf';

const SHINE_MS = 6e3;

const DANCE = [
  {color: '#c4b5fd00', offset: 0.22},
  {color: '#c4b5fdcc', offset: 0.38},
  {color: '#ffffffe6', offset: 0.5},
  {color: '#fbcfe8cc', offset: 0.62},
  {color: '#a5f3fc00', offset: 0.78}
];

const ground = {
  backgroundGradient: {
    type: 'linear',
    angle: 115,
    stops: [
      {color: '#c4b5fd17', offset: 0},
      {color: '#a5f3fc0d', offset: 0.55},
      {color: '#fbcfe812', offset: 1}
    ]
  }
};

const band = {
  backgroundGradient: {
    type: 'linear',
    angle: 115,
    stops: [
      {color: '#ffffff00', offset: 0.32},
      {color: '#ffffff14', offset: 0.5},
      {color: '#ffffff00', offset: 0.68}
    ]
  }
};

const crossing = {type: 'tween', duration: 2.2, ease: [0.4, 0, 0.3, 1], repeat: Infinity, repeatDelay: 4.2};

export function CdnAura({radius = 8, width}) {
  const angle = useAnimatedValue(0);
  useEffect(() => {
    const run = Animated.loop(
      Animated.timing(angle, {toValue: 360, duration: SHINE_MS, easing: Easing.linear})
    );
    run.start();
    return () => run.stop();
  }, []);
  return (
    <View pointerEvents="none" style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}>
      <View
        style={[
          {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0},
          [{borderRadius: px(radius)}, ground]
        ]}
      />
      <View
        style={[
          {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden'},
          {borderRadius: px(radius)}
        ]}
      >
        <motion.View
          style={[{position: 'absolute', top: 0, bottom: 0, left: 0}, [{width: px(width)}, band]]}
          initial={{x: -0.8 * width}}
          animate={{x: 0.8 * width}}
          transition={crossing}
        />
      </View>
      <View
        style={[
          {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0},
          {borderRadius: px(radius), borderWidth: px(1), borderColor: '#c4b5fd29'}
        ]}
      />
      <Animated.View
        style={[
          {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0},
          {
            borderRadius: px(radius),
            borderGradientAngle: angle,
            borderGradient: {type: 'radial', width: px(1.5), size: 3, stops: DANCE}
          }
        ]}
      />
    </View>
  );
}

const FOIL = {
  type: 'conic',
  width: px(1.5),
  angle: 210,
  stops: [
    {color: '#c4b5fd', offset: 0},
    {color: '#a5f3fc', offset: 0.3},
    {color: '#ffffff', offset: 0.5},
    {color: '#fbcfe8', offset: 0.75},
    {color: '#c4b5fd', offset: 1}
  ]
};

export function CdnMark({radius = 8}) {
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0},
          {borderRadius: px(radius), borderGradient: FOIL}
        ]}
      />
      <View
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          height: 42,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderRadius: 14999,
          backgroundColor: '#000000bf',
          paddingLeft: 12,
          paddingRight: 15
        }}
      >
        <CdnSpark size={14} />
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 18,
            fontWeight: 600,
            color: '#f2f2f3',
            lineHeight: 24
          }}
        >
          CDN
        </Text>
      </View>
    </>
  );
}

export function CdnSpark({size = 14}) {
  return (
    <Svg width={px(size)} height={px(size)} viewBox="0 0 24 24">
      <Path d="M10 1C10 7 13 10 19 10C13 10 10 13 10 19C10 13 7 10 1 10C7 10 10 7 10 1Z" fill="#a5f3fc" />
      <Path
        d="M19 14C19 17 20 18 23 18C20 18 19 19 19 22C19 19 18 18 15 18C18 18 19 17 19 14Z"
        fill="#f9a8d4"
      />
    </Svg>
  );
}
