import {Svg, Path, View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {colors} from './colors.js';
import {px} from './scale.js';
import '../assets/Inter-Regular.ttf';

const FACES = {
  cross: ['M7 7 17 17', 'M17 7 7 17'],
  circle: ['M18 12a6 6 0 1 1-12 0a6 6 0 1 1 12 0'],
  triangle: ['M12 6 18.5 17H5.5Z'],
  square: ['M6.5 6.5h11v11h-11Z']
};

const CAPS = {l1: ['L1'], r1: ['R1'], l2: ['L2'], r2: ['R2'], l1r1: ['L1', 'R1'], l2r2: ['L2', 'R2']};

function Face({name, size}) {
  return (
    <Svg width={px(size)} height={px(size)} viewBox="0 0 24 24">
      <Path d="M23 12a11 11 0 1 1-22 0a11 11 0 1 1 22 0" fill={colors.surface2} />
      {FACES[name].map(d => (
        <Path
          key={d}
          d={d}
          fill="none"
          stroke={colors.fg}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

function Cap({label, size}) {
  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          backgroundColor: '#212125',
          paddingHorizontal: 9
        },
        {height: px(size)}
      ]}
    >
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, fontWeight: 600, color: '#f2f2f3'}}>
        {label}
      </Text>
    </View>
  );
}

export function ButtonGlyph({button, size = 20}) {
  if (FACES[button]) return <Face name={button} size={size} />;
  return (
    <View style={{flexDirection: 'row', gap: 6}}>
      {CAPS[button].map(cap => (
        <Cap key={cap} label={cap} size={size} />
      ))}
    </View>
  );
}

export function ButtonHints({hints}) {
  const t = useT();
  return (
    <View
      style={{
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 30,
        paddingHorizontal: 48
      }}
    >
      {hints.map(({button, label}) => (
        <View key={button} style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
          <ButtonGlyph button={button} size={16} />
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
            {t(label)}
          </Text>
        </View>
      ))}
    </View>
  );
}
