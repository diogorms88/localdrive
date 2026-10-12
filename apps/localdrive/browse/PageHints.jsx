import {useFocus} from '@ps5-react/core';
import {useNavState} from '../state/nav.jsx';
import {HINT, useHints} from '../ui/Legend.jsx';

const CATALOG = [
  HINT.select,
  {button: 'triangle', label: 'hints.filters'},
  HINT.favorite,
  HINT.top,
  HINT.sections
];

const CARDS = [HINT.select, HINT.favorite, HINT.top, HINT.sections];

function hintsFor(key) {
  if (/^(card|catalog|chip):/.test(key)) return CATALOG;
  if (/^(popular|recent|continue):/.test(key) && !key.endsWith(':all')) return CARDS;
  return null;
}

export function PageHints() {
  const {focusedKey: focusedKey} = useFocus();
  const shown = useNavState().top.name === 'browse';
  useHints(shown ? hintsFor(focusedKey ?? '') : null);
  return null;
}
