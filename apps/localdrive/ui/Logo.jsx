import {View, Image, Text} from '@ps5-react/core';
import icon from '../assets/logo-icon.png';
import {colors} from './colors.js';
import '../assets/Inter-Regular.ttf';

export function Logo({color = colors.fg}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
      {/* The app icon (sce_sys/icon0.png) at header size, baked at its drawn size of 48 px. */}
      <Image source={icon} resizeMode="cover" style={{width: 48, height: 48, borderRadius: 10}} />
      <Text
        style={[{fontFamily: 'Inter-Regular', fontSize: 29, fontWeight: 600, letterSpacing: -0.85}, {color}]}
      >
        LocalDrive
      </Text>
    </View>
  );
}
