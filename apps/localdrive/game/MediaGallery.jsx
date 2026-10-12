import {useEffect, useState} from 'react';
import {View, Image, Text, FocusScope, motion} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {SHOT, THUMB} from './art.js';
import {FocusFrame} from '../ui/FocusRing.jsx';
import {HINT, useHints} from '../ui/Legend.jsx';
import '../assets/Inter-Regular.ttf';

const HINTS = [{button: 'cross', label: 'hints.view'}, HINT.back, HINT.favorite, HINT.sections];

function MainShot({shots, index}) {
  const t = useT();
  return (
    <View
      style={[{position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#212125'}, SHOT]}
    >
      <Image source={{uri: shots[index].url}} style={[{borderRadius: 18}, SHOT]} resizeMode="cover" />
      <View
        style={{
          position: 'absolute',
          right: 24,
          bottom: 24,
          borderRadius: 14999,
          backgroundColor: '#000000b3',
          paddingHorizontal: 15,
          paddingVertical: 6
        }}
      >
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}}>
          {t('game.shotPosition', {index: index + 1, total: shots.length})}
        </Text>
      </View>
    </View>
  );
}

export function MediaGallery({shots, nextDown, onOpen}) {
  const [index, setIndex] = useState(0);
  const [inside, setInside] = useState(false);
  useHints(inside ? HINTS : null);
  useEffect(() => {
    for (const shot of shots.slice(1)) Image.prefetch(shot.url, SHOT).catch(() => {});
  }, [shots]);
  return (
    <View scrollAnchor style={{width: 1308}}>
      <MainShot shots={shots} index={index} />
      <FocusScope focusKey="game:shots">
        <View style={{marginTop: 18, flexDirection: 'row', gap: 12}}>
          {shots.map((shot, i) => (
            <View
              key={shot.url}
              focusKey={`game:shot:${i}`}
              onPress={() => onOpen(i)}
              onFocus={() => {
                setIndex(i);
                setInside(true);
              }}
              onBlur={() => setInside(false)}
              nextFocusDown={nextDown}
              style={{position: 'relative', width: 192, height: 108}}
            >
              <motion.View
                style={{width: 192, height: 108, overflow: 'hidden', borderRadius: 9}}
                initial={false}
                animate={{opacity: i === index ? 1 : 0.45}}
                transition={{duration: 0.2}}
              >
                <Image
                  source={{uri: shot.thumb}}
                  style={[{borderRadius: 9, backgroundColor: '#212125'}, THUMB]}
                  resizeMode="cover"
                />
              </motion.View>
              <FocusFrame />
            </View>
          ))}
        </View>
      </FocusScope>
    </View>
  );
}
