import {useEffect, useState} from 'react';
import {useFocus, Image, FocusScope, View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {VIEW, THUMB} from './art.js';
import {FocusFrame} from '../ui/FocusRing.jsx';
import {useImmersive} from '../state/nav.jsx';
import {ButtonHints} from '../ui/ButtonHints.jsx';
import '../assets/Inter-Regular.ttf';

const HINTS = [
  {button: 'l1r1', label: 'hints.previousNext'},
  {button: 'circle', label: 'hints.close'}
];

const stripKey = i => `shot-view:${i}`;

export function ShotViewer({shots, start, onClose}) {
  const t = useT();
  const [index, setIndex] = useState(start);
  const {focus: focus} = useFocus();
  const step = delta => focus(stripKey((index + delta + shots.length) % shots.length));
  useImmersive(true);
  useEffect(() => {
    for (const delta of [-1, 1])
      Image.prefetch(shots[(index + delta + shots.length) % shots.length].url, VIEW).catch(() => {});
  }, [index]);
  const onAction = action => {
    if (action === 'l1') step(-1);
    else if (action === 'r1') step(1);
    else return false;
    return true;
  };
  return (
    <FocusScope
      trap
      autoFocus
      onBack={() => {
        onClose(index);
        return true;
      }}
      onAction={onAction}
    >
      <View style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000000'}}>
        <Image source={{uri: shots[index].url}} style={VIEW} resizeMode="contain" />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 288,
            backgroundGradient: {
              type: 'linear',
              to: 'top',
              stops: [
                {color: '#000000', offset: 0},
                {color: '#00000000', offset: 1}
              ]
            }
          }}
        />
        <View style={{position: 'absolute', left: 0, right: 0, bottom: 0}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12}}>
            <Text
              style={{
                marginRight: 18,
                width: 96,
                textAlign: 'end',
                fontFamily: 'Inter-Regular',
                fontSize: 21,
                color: '#f2f2f3',
                lineHeight: 30
              }}
            >
              {t('game.shotPosition', {index: index + 1, total: shots.length})}
            </Text>
            {shots.map((shot, i) => (
              <View
                key={shot.url}
                focusKey={stripKey(i)}
                autoFocus={i === start}
                onFocus={() => setIndex(i)}
                onPress={() => onClose(i)}
                style={{position: 'relative', width: 192, height: 108}}
              >
                <Image
                  source={{uri: shot.thumb}}
                  style={[{borderRadius: 9, backgroundColor: '#212125'}, THUMB]}
                  resizeMode="cover"
                />
                <FocusFrame />
              </View>
            ))}
          </View>
          <View style={{marginTop: 24}}>
            <ButtonHints hints={HINTS} />
          </View>
        </View>
      </View>
    </FocusScope>
  );
}
