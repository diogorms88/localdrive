import {useEffect, useState} from 'react';
import {shadowMountUp} from '../state/downloads.js';

export function useShadowMount(needed) {
  const [up, setUp] = useState(true);
  useEffect(() => {
    if (!needed) return void 0;
    let live = true;
    void shadowMountUp().then(value => {
      if (live) setUp(value);
    });
    return () => {
      live = false;
    };
  }, [needed]);
  return up;
}
