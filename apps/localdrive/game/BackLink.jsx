import {useIsFocused, Text, View} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {getGame} from '../state/catalog.js';
import {colors} from '../ui/colors.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import {useNavState} from '../state/nav.jsx';
import '../assets/Inter-Regular.ttf';

function useOrigin() {
  const t = useT();
  const {stack} = useNavState();
  const previous = stack[stack.length - 2];
  return previous.name === 'game' ? getGame(previous.id).title : t(`game.back.${previous.name}`);
}

function Label() {
  const focused = useIsFocused();
  const origin = useOrigin();
  return (
    <>
      <Icon name="chevronLeft" size={16} color={focused ? colors.fg : colors.muted} />
      <Text
        focused={focused}
        style={[
          {
            maxWidth: 720,
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            color: '#a3a3ab',
            numberOfLines: 1,
            ellipsizeMode: 'tail',
            lineHeight: 30
          },
          focused ? {color: '#f2f2f3'} : null
        ]}
      >
        {origin}
      </Text>
    </>
  );
}

export function BackLink({onPress}) {
  return (
    <View
      onPress={onPress}
      nextFocusUp="nav:search"
      style={{
        position: 'relative',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 6
      }}
    >
      <Label />
      <FocusRing />
    </View>
  );
}
