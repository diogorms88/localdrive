import {useEffect, useState} from 'react';
import {View, Image, Text} from '@ps5-react/core';
import '../assets/Inter-Regular.ttf';

const SKELETON = {backgroundColor: '#212125'};

const tinted = new Map();

const skeleton = tint =>
  tint ? (tinted.get(tint) ?? tinted.set(tint, {backgroundColor: tint}).get(tint)) : SKELETON;

const STALL_MS = 8e3;

const waiting = new Map();

let sweep = null;

function watchStall(onStall) {
  const token = {};
  waiting.set(token, {deadline: Date.now() + STALL_MS, onStall});
  sweep ??
    (sweep = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of waiting)
        if (entry.deadline <= now) {
          waiting.delete(key);
          entry.onStall();
        }
      if (!waiting.size) {
        clearInterval(sweep);
        sweep = null;
      }
    }, 1e3));
  return () => waiting.delete(token);
}

const fill = style => ({
  width: '100%',
  height: '100%',
  borderRadius: Object.assign({}, ...[style].flat(Infinity).filter(Boolean)).borderRadius
});

export function Cover({game, style, label = true}) {
  const [failed, setFailed] = useState([]);
  const [loaded, setLoaded] = useState(null);
  const copies = [game.art.cover, ...(game.art.coverFallbacks || [])].filter(
    url => url && !failed.includes(url)
  );
  const uri = copies[0];
  const last = copies.length < 2;
  useEffect(() => {
    if (!uri || loaded === uri || last) return void 0;
    return watchStall(() => setFailed(previous => [...previous, uri]));
  }, [uri, loaded, last]);
  if (uri) {
    return (
      <View style={loaded === uri ? style : [skeleton(game.art.tint), style]}>
        <Image
          key={uri}
          source={{uri}}
          resizeMode="cover"
          style={fill(style)}
          onLoad={() => setLoaded(uri)}
          onError={() => setFailed(previous => [...previous, uri])}
        />
      </View>
    );
  }
  return (
    <View style={[{overflow: 'hidden'}, style]}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#212125',
          padding: 12
        }}
      >
        {label && (
          <Text
            style={{
              width: '100%',
              textAlign: 'center',
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              color: '#a3a3ab',
              numberOfLines: 3,
              ellipsizeMode: 'tail',
              lineHeight: 30
            }}
          >
            {game.title}
          </Text>
        )}
      </View>
    </View>
  );
}
