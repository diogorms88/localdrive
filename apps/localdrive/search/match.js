import {games} from '../data/catalog.js';

const fold = text =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const haystacks = games.map(game => fold(`${game.title} ${game.developer} ${game.publisher}`));

export function searchGames(query) {
  const needle = fold(query.trim());
  return needle ? games.filter((_, i) => haystacks[i].includes(needle)) : games;
}
