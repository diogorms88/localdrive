import {View, Text, useIsFocused} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {colors} from '../ui/colors.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import '../assets/Inter-Regular.ttf';

export function ProblemNote({title, action}) {
  return (
    <View style={{width: 408, flexDirection: 'row', gap: 15}}>
      <Icon name="alert" size={16} color={colors.fg} />
      <View style={{flex: 1, gap: 3}}>
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            fontWeight: 600,
            color: '#f2f2f3',
            numberOfLines: 2,
            ellipsizeMode: 'tail',
            lineHeight: 30
          }}
        >
          {title}
        </Text>
        {action ? (
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              color: '#a3a3ab',
              numberOfLines: 3,
              ellipsizeMode: 'tail',
              lineHeight: 30
            }}
          >
            {action}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function TriggerFace() {
  const t = useT();
  const focused = useIsFocused();
  return (
    <>
      <FocusRing />
      <Text
        style={
          focused
            ? {fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}
            : {fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}
        }
      >
        {t('download.moreOptions')}
      </Text>
      <Icon name="chevronRight" size={14} color={focused ? colors.fg : colors.muted} />
    </>
  );
}

export function MoreOptions({focusKey, nextFocusDown, onPress}) {
  return (
    <View
      focusKey={focusKey}
      nextFocusDown={nextFocusDown}
      onPress={onPress}
      style={_state => [
        {
          position: 'relative',
          marginHorizontal: -18,
          height: 54,
          width: 444,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 9,
          paddingHorizontal: 18
        },
        _state.focused ? {backgroundColor: '#212125'} : null
      ]}
    >
      <TriggerFace />
    </View>
  );
}
