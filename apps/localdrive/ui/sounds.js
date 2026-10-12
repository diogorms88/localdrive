import {useNavigationEvents, Sound} from '@ps5-react/core';
import focus from '../assets/sounds/focus.wav';
import error from '../assets/sounds/error.wav';
import confirm from '../assets/sounds/confirm.wav';
import back from '../assets/sounds/back.wav';
import page from '../assets/sounds/page.wav';
import notify from '../assets/sounds/notify.wav';

const PAGE_PAN = {l1: -0.4, l2: -0.4, r1: 0.4, r2: 0.4};

export function useInterfaceSounds() {
  useNavigationEvents(event => {
    if (event.type === 'move') Sound.play(focus);
    else if (event.type === 'blocked') Sound.play(error);
    else if (event.type === 'press') Sound.play(event.handled ? confirm : error);
    else if (event.handled && event.type === 'back') Sound.play(back);
    else if (event.handled && event.action in PAGE_PAN) Sound.play(page, {pan: PAGE_PAN[event.action]});
    else if (event.handled) Sound.play(confirm);
  });
}

export const playNotify = () => Sound.play(notify);
