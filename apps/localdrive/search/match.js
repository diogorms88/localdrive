import {games} from '../data/catalog.js';
import {PS2_GAMES} from '../ps2/catalog.js';

const fold = text =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const searchableGames = [...games, ...PS2_GAMES];
const haystacks = searchableGames.map(game => fold(`${game.title} ${game.developer} ${game.publisher} ${game.shortDescription}`));

export function searchGames(query) {
  const needle = fold(query.trim());
  return needle ? searchableGames.filter((_, i) => haystacks[i].includes(needle)) : games;
}
