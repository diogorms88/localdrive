import {useEffect, useRef, useState} from 'react';
import {freeBytes} from '../state/downloads.js';

const EVERY_MS = 3e3;

export function useFreeSpace(roots, status, watching) {
  const [free, setFree] = useState(() => roots.map(freeBytes));
  const mounted = useRef(false);
  useEffect(() => {
    const read = () =>
      setFree(previous => {
        const next = roots.map(freeBytes);
        return next.every((value, i) => value === previous[i]) ? previous : next;
      });
    if (!mounted.current) mounted.current = true;
    else read();
    if (!watching) return void 0;
    const id = setInterval(read, EVERY_MS);
    return () => clearInterval(id);
  }, [status, watching]);
  return free;
}
