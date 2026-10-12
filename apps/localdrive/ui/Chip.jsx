import {View, Text} from '@ps5-react/core';
import {useLocale} from '../i18n/index.js';
import {colors} from './colors.js';
import {FocusRing} from './FocusRing.jsx';
import {Icon} from './Icon.jsx';
import '../assets/Inter-Regular.ttf';

export function Chip({label, onPress, focusKey}) {
  const {rtl} = useLocale();
  return (
    <View
      focusKey={focusKey}
      onPress={onPress}
      style={[
        {
          height: 60,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          borderRadius: 14999,
          backgroundColor: '#f2f2f3'
        },
        rtl ? {paddingRight: 24, paddingLeft: 18} : {paddingLeft: 24, paddingRight: 18}
      ]}
    >
      <FocusRing round="full" />
      <Text
        style={{fontFamily: 'Inter-Regular', fontSize: 21, fontWeight: 600, color: '#000000', lineHeight: 30}}
      >
        {label}
      </Text>
      <Icon name="x" size={14} color={colors.canvas} />
    </View>
  );
}
