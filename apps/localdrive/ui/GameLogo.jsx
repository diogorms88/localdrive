import {useLayoutEffect, useState} from 'react';
import {Text, Image} from '@ps5-react/core';
import {colors} from './colors.js';
import {px} from './scale.js';
import {Skeleton} from './Skeleton.jsx';
import '../assets/Inter-Regular.ttf';

function logoBox({logoAspect}, width, height, area) {
  if (!logoAspect) return {width, height};
  let h = Math.min(height, Math.sqrt(area / logoAspect));
  let w = h * logoAspect;
  if (w > width) {
    w = width;
    h = w / logoAspect;
  }
  return {width: w, height: h};
}

export function logoStyle(game, width, height, area = width * height * 0.6) {
  const box = logoBox(game.art, width, height, area);
  return {width: px(box.width), height: px(box.height)};
}

function Title({game, width}) {
  return (
    <Text
      style={[
        {
          fontFamily: 'Inter-Regular',
          fontSize: 54,
          fontWeight: 600,
          color: '#f2f2f3',
          numberOfLines: 2,
          ellipsizeMode: 'tail',
          lineHeight: 60,
          letterSpacing: -1.35
        },
        {width: px(width)}
      ]}
    >
      {game.title}
    </Text>
  );
}

export function GameLogo({game, width, height, area = width * height * 0.6, onReady}) {
  const {logo} = game.art;
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(null);
  useLayoutEffect(() => {
    if (!logo) onReady?.();
  }, [logo]);
  if (!logo || failed === logo) return <Title game={game} width={width} />;
  const box = logoStyle(game, width, height, area);
  return (
    <>
      {loaded !== logo && <Skeleton pulse style={box} />}
      <Image
        source={{uri: logo}}
        resizeMode="contain"
        tintColor={game.art.logoDark ? colors.fg : void 0}
        style={loaded === logo ? box : {...box, display: 'none'}}
        onLoad={() => {
          setLoaded(logo);
          onReady?.();
        }}
        onError={() => {
          setFailed(logo);
          onReady?.();
        }}
      />
    </>
  );
}
