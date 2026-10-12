import {useRef, useState} from 'react';
import {motion} from '@ps5-react/core';
import {logical} from './scale.js';

const slide = {
  x: {type: 'spring', stiffness: 520, damping: 42, mass: 1},
  opacity: {type: 'tween', duration: 0.15}
};

export function useNavLayouts() {
  const [layouts, setLayouts] = useState({});
  const handlers = useRef({}).current;
  const track = name =>
    handlers[name] ??
    (handlers[name] = event => {
      const {x, width} = event.layout;
      setLayouts(current =>
        current[name]?.x === x && current[name]?.width === width ? current : {...current, [name]: {x, width}}
      );
    });
  return [layouts, track];
}

export function NavPill({section, layouts}) {
  const last = useRef(null);
  const item = layouts[section];
  if (item && layouts.header) last.current = {x: logical(item.x - layouts.header.x), width: item.width};
  if (!last.current) return null;
  return (
    <motion.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 18,
          height: 60,
          borderRadius: 14999,
          backgroundColor: '#ffffff1f'
        },
        {width: last.current.width}
      ]}
      initial={false}
      animate={{x: last.current.x, opacity: item ? 1 : 0}}
      transition={slide}
    />
  );
}
