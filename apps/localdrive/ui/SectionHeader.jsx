import {useIsFocused, Text, View} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {colors} from './colors.js';
import {FocusRing} from './FocusRing.jsx';
import {Icon} from './Icon.jsx';
import '../assets/Inter-Regular.ttf';

function SeeAll() {
  const t = useT();
  const focused = useIsFocused();
  return (
    <>
      <FocusRing />
      <Text
        focused={focused}
        style={[
          {fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30},
          focused ? {color: '#f2f2f3'} : null
        ]}
      >
        {t('common.seeAll')}
      </Text>
      <Icon name="chevronRight" color={focused ? colors.fg : colors.muted} />
    </>
  );
}

export function SectionHeader({title, onSeeAll, focusKey, nextFocusUp}) {
  return (
    <View
      style={{
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between'
      }}
    >
      <Text
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 30,
          fontWeight: 600,
          color: '#f2f2f3',
          lineHeight: 42,
          letterSpacing: -0.75
        }}
      >
        {title}
      </Text>
      {onSeeAll && (
        <View
          onPress={onSeeAll}
          focusKey={focusKey}
          nextFocusUp={nextFocusUp}
          style={{flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6}}
        >
          <SeeAll />
        </View>
      )}
    </View>
  );
}
