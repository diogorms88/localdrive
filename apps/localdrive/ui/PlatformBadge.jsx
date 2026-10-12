import {View, Svg, Path, G} from '@ps5-react/core';
import {px} from './scale.js';
import {WORDS, CAP} from './psLogotype.js';

const H = 18;

const W = 44;

const SLANT = 5;

const GAP = 2;

const R = 2.5;

const TYPE = 6.5;

const STYLE = {
  ps5: {fill: '#ffffff', ink: '#000000', edge: 'none'},
  ps4: {fill: '#000000b3', ink: '#ffffff', edge: '#ffffff'}
};

function segment(i, count) {
  const left = i === 0 ? null : i * W + GAP / 2,
    right = i === count - 1 ? null : (i + 1) * W - GAP / 2;
  const top =
    right == null
      ? `L${count * W - R} 0A${R} ${R} 0 0 1 ${count * W} ${R}L${count * W} ${H - R}A${R} ${R} 0 0 1 ${count * W - R} ${H}`
      : `L${right + SLANT / 2} 0L${right - SLANT / 2} ${H}`;
  const start = left == null ? `M0 ${R}A${R} ${R} 0 0 1 ${R} 0` : `M${left + SLANT / 2} 0`;
  const end = left == null ? `L${R} ${H}A${R} ${R} 0 0 1 0 ${H - R}Z` : `L${left - SLANT / 2} ${H}Z`;
  return start + top + end;
}

export function PlatformBadge({platforms, style}) {
  const order = [...platforms].sort().reverse();
  const width = order.length * W;
  return (
    <View style={style}>
      <Svg width={px(width)} height={px(H)} viewBox={`0 0 ${width} ${H}`}>
        {order.map((platform, i) => {
          const {fill: fill, ink: ink, edge} = STYLE[platform];
          const word = WORDS[platform],
            scale = TYPE / CAP;
          const x = i * W + (W - (word.right - word.left) * scale) / 2 - word.left * scale;
          return [
            <Path
              key={`${platform}-box`}
              d={segment(i, order.length)}
              fill={fill}
              stroke={edge}
              strokeWidth={1}
            />,
            <G key={`${platform}-text`} translateX={x} translateY={(H - TYPE) / 2} scale={scale}>
              <Path d={word.d} fill={ink} />
            </G>
          ];
        })}
      </Svg>
    </View>
  );
}
