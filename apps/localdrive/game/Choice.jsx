import {View, Text} from '@ps5-react/core';
import {colors} from '../ui/colors.js';
import {CdnAura, CdnSpark} from '../ui/CdnAura.jsx';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import '../assets/Inter-Regular.ttf';

export function Choice({focusKey, nextFocusDown, onPress, text, magic = null}) {
  if (magic) {
    return (
      <View
        focusKey={focusKey}
        nextFocusDown={nextFocusDown}
        onPress={onPress ?? void 0}
        style={{
          position: 'relative',
          height: 84,
          width: 408,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          borderRadius: 12,
          paddingHorizontal: 21
        }}
      >
        <CdnAura radius={8} width={272} />
        <FocusRing />
        <CdnSpark size={20} />
        <View style={{flex: 1, gap: 3}}>
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 23,
              fontWeight: 600,
              color: '#f2f2f3',
              numberOfLines: 1,
              ellipsizeMode: 'tail'
            }}
          >
            {magic.name}
          </Text>
          <Text
            style={{
              width: 276,
              fontFamily: 'Inter-Regular',
              fontSize: 20,
              color: '#f2f2f3bf',
              numberOfLines: 1,
              ellipsizeMode: 'tail'
            }}
          >
            {magic.detail}
          </Text>
        </View>
        {onPress ? <Icon name="chevronRight" size={16} color={colors.fg} /> : null}
      </View>
    );
  }
  if (!onPress) {
    return (
      <View style={{paddingVertical: 12}}>
        <Text
          style={{
            width: 408,
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            color: '#8a8a94',
            numberOfLines: 1,
            ellipsizeMode: 'tail',
            lineHeight: 30
          }}
        >
          {text}
        </Text>
      </View>
    );
  }
  return (
    <View
      focusKey={focusKey}
      nextFocusDown={nextFocusDown}
      onPress={onPress}
      style={_state => [
        {
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 9,
          borderWidth: 2,
          borderColor: '#2a2a2f',
          paddingHorizontal: 18,
          paddingVertical: 12
        },
        _state.focused ? {backgroundColor: '#212125'} : null
      ]}
    >
      <FocusRing />
      <Text
        style={{
          width: 339,
          fontFamily: 'Inter-Regular',
          fontSize: 21,
          color: '#a3a3ab',
          numberOfLines: 1,
          ellipsizeMode: 'tail',
          lineHeight: 30
        }}
      >
        {text}
      </Text>
      <Icon name="chevronRight" size={14} color={colors.muted} />
    </View>
  );
}

export function TextAction({focusKey, nextFocusDown, onPress, text}) {
  return (
    <View
      focusKey={focusKey}
      nextFocusDown={nextFocusDown}
      onPress={onPress}
      style={_state => [
        {
          position: 'relative',
          borderRadius: 9,
          borderWidth: 2,
          borderColor: '#2a2a2f',
          paddingHorizontal: 18,
          paddingVertical: 12
        },
        _state.focused ? {backgroundColor: '#212125'} : null
      ]}
    >
      <FocusRing />
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
        {text}
      </Text>
    </View>
  );
}
