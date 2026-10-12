import {memo, useEffect, useState} from 'react';
import {View} from '@ps5-react/core';
import {ButtonHints} from './ButtonHints.jsx';

export const HINT = {
  select: {button: 'cross', label: 'hints.select'},
  back: {button: 'circle', label: 'hints.back'},
  top: {button: 'circle', label: 'hints.top'},
  clear: {button: 'l2', label: 'hints.clear'},
  favorite: {button: 'square', label: 'hints.favorite'},
  sections: {button: 'l1r1', label: 'hints.sections'},
  close: {button: 'circle', label: 'hints.close'}
};

const HINTS = {
  browse: [HINT.select, HINT.top, HINT.sections],
  game: [HINT.select, HINT.back, HINT.favorite, HINT.sections],
  search: [HINT.select, HINT.favorite, HINT.clear, HINT.back, HINT.sections]
};

const registered = [];

const listeners = new Set();

const notify = () => listeners.forEach(listener => listener(registered.at(-1)?.hints ?? null));

export function useHints(hints) {
  useEffect(() => {
    if (!hints) return void 0;
    const entry = {hints};
    registered.push(entry);
    notify();
    return () => {
      registered.splice(registered.indexOf(entry), 1);
      notify();
    };
  }, [hints]);
}

const Hints = memo(ButtonHints);

export function Legend({screen: screen}) {
  const [hints, setHints] = useState(() => registered.at(-1)?.hints ?? null);
  useEffect(() => {
    listeners.add(setHints);
    setHints(registered.at(-1)?.hints ?? null);
    return () => listeners.delete(setHints);
  }, []);
  if (!HINTS[screen]) return null;
  return (
    <View style={{position: 'absolute', left: 0, right: 0, bottom: 0}}>
      <Hints hints={hints ?? HINTS[screen]} />
    </View>
  );
}
