import {useEffect, useRef, useState} from 'react';

export const SLIDE_MS = 7e3;

export function useSlides(count, enabled) {
  const [active, setActive] = useState(0);
  const [left, setLeft] = useState(SLIDE_MS);
  const [paused, setPaused] = useState(false);
  const startedAt = useRef(0);
  const running = useRef(false);
  const held = useRef(false);
  const ranFor = useRef(0);
  const current = useRef(active);
  current.current = active;
  useEffect(() => {
    if (paused || !enabled) return void 0;
    startedAt.current = Date.now();
    running.current = true;
    const id = setTimeout(() => {
      setActive(index => (index + 1) % count);
      setLeft(SLIDE_MS);
    }, left);
    return () => {
      running.current = false;
      ranFor.current = Date.now() - startedAt.current;
      clearTimeout(id);
    };
  }, [active, left, paused, enabled]);
  useEffect(() => {
    if (!enabled && !held.current) setLeft(ms => Math.max(0, ms - ranFor.current));
  }, [enabled]);
  const [select] = useState(() => index => {
    if (index === current.current) return;
    startedAt.current = Date.now();
    setActive(index);
    setLeft(SLIDE_MS);
  });
  const [hold] = useState(() => on => {
    if (held.current === on) return;
    held.current = on;
    if (on && running.current) {
      const elapsed = Date.now() - startedAt.current;
      setLeft(ms => Math.max(0, ms - elapsed));
    }
    setPaused(on);
  });
  return {active: active, left, paused: paused || !enabled, select, hold};
}
