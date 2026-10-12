import {Image} from '@ps5-react/core';
import {px} from '../ui/scale.js';
import {logoStyle} from '../ui/GameLogo.jsx';

export const HERO = {width: 1920, height: 900};

export const COVER = {width: px(192), height: px(256), borderRadius: px(8)};

export const SHOT = {width: 1308, height: 735};

export const THUMB = {width: 192, height: 108};

export const VIEW = {width: 1920, height: 1080};

export const LOGO = {width: 384, height: 120};

const ignore = () => {};

function prefetchGameArt(game) {
  const {art} = game;
  if (art.hero) Image.prefetch(art.hero, HERO).catch(ignore);
  if (art.cover) Image.prefetch(art.cover, COVER).catch(ignore);
  if (art.logo)
    Image.prefetch(art.logo, {...logoStyle(game, LOGO.width, LOGO.height), resizeMode: 'contain'}).catch(
      ignore
    );
  for (const shot of game.shots.slice(0, 1)) Image.prefetch(shot.url, SHOT).catch(ignore);
  for (const shot of game.shots) Image.prefetch(shot.thumb, THUMB).catch(ignore);
}

let settle = null;

export function prefetchWhenSettled(game) {
  clearTimeout(settle);
  settle = setTimeout(() => prefetchGameArt(game), 300);
}
