import {Image, Controller} from '@ps5-react/core';

const NEUTRAL = '#ffffff';

const colors = new Map();

let owner = null;

let resetting = null;

const RESET_DELAY_MS = 250;

const LIGHT_DELAY_MS = 150;

let lighting = null;

const colorOf = uri => {
  if (!colors.has(uri))
    colors.set(
      uri,
      Image.getColor(uri).catch(() => null)
    );
  return colors.get(uri);
};

export function lightGame(key, game) {
  owner = key;
  clearTimeout(resetting);
  clearTimeout(lighting);
  if (!game.art.cover) {
    Controller.setLightBar(NEUTRAL);
    return;
  }
  lighting = setTimeout(
    () =>
      void colorOf(game.art.cover).then(color => {
        if (owner !== key) return;
        Controller.setLightBar(color ?? NEUTRAL);
      }),
    LIGHT_DELAY_MS
  );
}

export function unlight(key) {
  if (owner !== key) return;
  owner = null;
  clearTimeout(resetting);
  resetting = setTimeout(() => {
    if (owner === null) Controller.resetLightBar();
  }, RESET_DELAY_MS);
}
