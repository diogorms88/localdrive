import {Controller, useNavigationEvents} from '@ps5-react/core';

const TICK = [0.09, 35];

const PRESS = [0.15, 30];

const BACK = [0.11, 20];

const PAGE = [0.18, 35];

const EDGE = [0.18, 25];

const NOTICE = [0.25, 140];

const PAGE_ACTIONS = new Set(['l1', 'r1', 'l2', 'r2']);

const EDGE_GAP_MS = 70;

const pulse = ([strength, ms]) => Controller.vibrate(strength, ms);

export function useInterfaceHaptics() {
  useNavigationEvents(event => {
    if (event.type === 'move') pulse(TICK);
    else if (event.type === 'blocked') {
      pulse(EDGE);
      setTimeout(() => pulse(EDGE), EDGE_GAP_MS);
    } else if (event.type === 'press') pulse(event.handled ? PRESS : EDGE);
    else if (event.handled && event.type === 'back') pulse(BACK);
    else if (event.handled && PAGE_ACTIONS.has(event.action)) pulse(PAGE);
    else if (event.handled) pulse(PRESS);
  });
}

export const pulseNotice = () => pulse(NOTICE);
