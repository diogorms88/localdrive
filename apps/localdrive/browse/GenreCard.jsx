import {memo} from 'react';
import {useIsFocused, motion, View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {genreLabel} from '../state/catalog.js';
import {colors} from '../ui/colors.js';
import {Cover} from '../ui/Cover.jsx';
import {FocusFrame} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import {EASE_OUT} from '../ui/ease.js';
import {Shine} from '../ui/Shine.jsx';
import '../assets/Inter-Regular.ttf';

const spread = {type: 'tween', duration: 0.3, ease: EASE_OUT};

const cover = {width: 126, height: 168, borderRadius: 12};

const side = {width: 113, height: 151, borderRadius: 12};

const front = {position: 'absolute', left: 87, top: 24, zIndex: 10};

const OPEN = [-12.6, 12.6];

function Fan({covers}) {
  const focused = useIsFocused();
  return covers.slice(1).map((game, index) => (
    <motion.View
      key={game.id}
      style={
        index === 0 ? {position: 'absolute', left: 18, top: 32} : {position: 'absolute', left: 169, top: 32}
      }
      initial={false}
      animate={{x: focused ? OPEN[index] : 0}}
      transition={spread}
    >
      <Cover game={game} style={side} label={false} />
    </motion.View>
  ));
}

export const GenreCard = memo(function GenreCard({genre, count, covers, active: active, onToggle, focusKey}) {
  const t = useT();
  return (
    <motion.View
      focusKey={focusKey ?? `genre:${genre}`}
      onPress={() => onToggle(genre)}
      selected={active}
      whileFocus={{y: -6}}
      transition={spread}
      style={_state => [
        {
          width: 300,
          borderRadius: 18,
          backgroundColor: '#17171a',
          paddingHorizontal: 24,
          paddingBottom: 24,
          paddingTop: 216
        },
        active ? {backgroundColor: '#212125'} : null,
        _state.focused ? {backgroundColor: '#212125'} : null
      ]}
    >
      <Fan covers={covers} />
      {covers[0] && <Cover game={covers[0]} style={[cover, front]} label={false} />}
      {active && (
        <View
          style={{
            position: 'absolute',
            right: 18,
            top: 18,
            zIndex: 20,
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14999,
            backgroundColor: '#f2f2f3'
          }}
        >
          <Icon name="check" size={14} strokeWidth={3} color={colors.canvas} />
        </View>
      )}
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 24, color: '#f2f2f3', lineHeight: 36}}>
        {genreLabel(genre)}
      </Text>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
        {t('catalog.gameCount', {count})}
      </Text>
      <Shine width={200} round="xl" />
      <FocusFrame round="xl" />
    </motion.View>
  );
});
