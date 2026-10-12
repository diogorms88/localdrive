import {memo, useMemo} from 'react';
import {View, motion, useIsFocused, Text} from '@ps5-react/core';
import {useLocale, latin, focusStart, focusEnd} from '../i18n/index.js';
import {Cover} from '../ui/Cover.jsx';
import {FocusFrame} from '../ui/FocusRing.jsx';
import {lightGame, unlight} from '../ui/lightBar.js';
import {Shine} from '../ui/Shine.jsx';
import {SLIDE_MS} from './useSlides.js';
import '../assets/Inter-Regular.ttf';

const TRACK = 240;

const cover = {height: '100%', aspectRatio: 0.75, borderRadius: 9};

function Progress({left, paused}) {
  const {rtl} = useLocale();
  const sign = rtl ? -1 : 1;
  const x = ((-TRACK * left) / SLIDE_MS) * sign;
  return (
    <View
      style={{
        position: 'absolute',
        left: 15,
        right: 15,
        bottom: 9,
        height: 3,
        overflow: 'hidden',
        borderRadius: 14999,
        backgroundColor: '#ffffff1a'
      }}
    >
      <motion.View
        style={{position: 'absolute', top: 0, bottom: 0, left: 0, width: 360, backgroundColor: '#f2f2f3'}}
        initial={{x: -TRACK * sign}}
        animate={{x: paused ? x : 0}}
        transition={
          paused ? {type: 'tween', duration: 0} : {type: 'tween', duration: left / 1e3, ease: 'linear'}
        }
      />
    </View>
  );
}

function Title({title, active: active}) {
  const focused = useIsFocused();
  const {rtl} = useLocale();
  return (
    <Text
      selected={active || focused}
      style={[
        {
          width: 264,
          fontFamily: 'Inter-Regular',
          fontSize: 21,
          color: '#a3a3ab',
          numberOfLines: 2,
          ellipsizeMode: 'tail',
          lineHeight: 30
        },
        active || focused ? {color: '#f2f2f3'} : null
      ]}
    >
      {latin(rtl, title)}
    </Text>
  );
}

const Item = memo(function Item({game, index, active: active, progress, select, hold}) {
  const {rtl} = useLocale();
  return (
    <View
      focusKey={`spotlight:${index}`}
      selected={active}
      nextFocusUp={index === 0 ? 'nav:current' : void 0}
      {...focusStart(rtl, 'spotlight:wish')}
      {...focusEnd(rtl, `spotlight:${index}`)}
      onFocus={() => {
        select(index);
        hold(true);
        lightGame(`spotlight:${index}`, game);
      }}
      onBlur={() => {
        hold(false);
        unlight(`spotlight:${index}`);
      }}
      onPress={() => select(index)}
      style={[
        {
          position: 'relative',
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 21,
          borderRadius: 18,
          padding: 15
        },
        active ? {backgroundColor: '#17171a'} : null
      ]}
    >
      <Shine width={260} round="xl" />
      <FocusFrame round="xl" />
      <Cover game={game} style={cover} label={false} />
      <Title title={game.title} active={active} />
      {progress && <Progress left={progress.left} paused={progress.paused} />}
    </View>
  );
});

export function SpotlightList({games: games, slides}) {
  const {active: active, left, paused, select, hold} = slides;
  const progress = useMemo(() => ({left, paused}), [left, paused]);
  return (
    <View style={{width: 390, gap: 6}}>
      {games.map((game, index) => (
        <Item
          key={game.id}
          game={game}
          index={index}
          active={index === active}
          progress={index === active ? progress : null}
          select={select}
          hold={hold}
        />
      ))}
    </View>
  );
}
