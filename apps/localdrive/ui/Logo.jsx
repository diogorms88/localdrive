import {View, Svg, Path, Text} from '@ps5-react/core';
import {colors} from './colors.js';
import {px} from './scale.js';
import '../assets/Inter-Regular.ttf';

export function Logo({color = colors.fg}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
      <Svg width={px(28)} height={px(28)} viewBox="0 0 32 32">
        <Path d="M26.34 12.24A11 11 0 1 1 19.76 5.66" fill="none" stroke={color} strokeWidth={4.5} />
        <Path d="M28.4 3.6 17.6 18.1a2.9 2.9 0 1 1-3.7-3.7Z" fill={color} />
      </Svg>
      <Text
        style={[{fontFamily: 'Inter-Regular', fontSize: 29, fontWeight: 600, letterSpacing: -0.85}, {color}]}
      >
        localdrive
      </Text>
    </View>
  );
}
