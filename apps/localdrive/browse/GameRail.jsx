import {useState} from 'react';
import {useIsFocused, Text, View, ScrollView} from '@ps5-react/core';
import {colors} from '../ui/colors.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import {RailScroll} from '../ui/GameCard.jsx';
import '../assets/Inter-Regular.ttf';

function TitleLink({title}) {
  const focused = useIsFocused();
  return (
    <>
      <FocusRing />
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
      <Icon name="chevronRight" size={16} color={focused ? colors.fg : colors.muted} />
    </>
  );
}

const Arrow = ({name}) => (
  <View
    style={{
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14999,
      backgroundColor: '#17171a'
    }}
  >
    <Icon name={name} size={16} color={colors.muted} fixed />
  </View>
);

const LTR = {direction: 'ltr'};

export function GameRail({title, onSeeAll, seeAllKey, children}) {
  // Mutated in place: cards read it when their preview opens, so scrolling re-renders nothing.
  const [scroll] = useState(() => ({x: 0, viewport: null}));
  return (
    <View scrollAnchor>
      <View
        style={{
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {onSeeAll ? (
          <View
            onPress={onSeeAll}
            focusKey={seeAllKey}
            style={{flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 9}}
          >
            <TitleLink title={title} />
          </View>
        ) : (
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
        )}
        <View style={[{flexDirection: 'row', gap: 12}, LTR]}>
          <Arrow name="chevronLeft" />
          <Arrow name="chevronRight" />
        </View>
      </View>
      <View
        style={{marginHorizontal: -12, marginVertical: -24}}
        onLayout={event => {
          scroll.viewport = event.layout;
        }}
      >
        <ScrollView
          style={[{flexDirection: 'row', gap: 36, paddingHorizontal: 12, paddingVertical: 24}, LTR]}
          onScrollTarget={({x}) => {
            scroll.x = x;
          }}
        >
          <RailScroll.Provider value={scroll}>{children}</RailScroll.Provider>
        </ScrollView>
      </View>
    </View>
  );
}
