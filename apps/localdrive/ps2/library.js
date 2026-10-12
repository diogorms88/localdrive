import {useEffect, useState} from 'react';
import {savedList} from '../state/saved.js';
import {PS2_GAMES} from './catalog.js';

// CDRomance publishes no popularity, rating or download counts, so "popular" is this hand-picked list
// of well-known PS2 titles, best known first. Each id is the original USA (or only) release in
// catalog.js; an id missing from a regenerated catalog is skipped.
const POPULAR_IDS = [
  'ps2-cdr-grand-theft-auto-san-andreas-usa',
  'ps2-cdr-god-of-war-usa-2',
  'ps2-cdr-shadow-of-the-colossus-usa-2',
  'ps2-cdr-metal-gear-solid-3-snake-eater-usa-2',
  'ps2-cdr-final-fantasy-x-usa',
  'ps2-cdr-kingdom-hearts-ii-usa-2',
  'ps2-cdr-god-of-war-ii-usa-2',
  'ps2-cdr-grand-theft-auto-vice-city-usa',
  'ps2-cdr-resident-evil-4-usa-2',
  'ps2-cdr-silent-hill-2-usa',
  'ps2-cdr-gran-turismo-4-usa-2',
  'ps2-cdr-kingdom-hearts-usa-2',
  'ps2-cdr-shin-megami-tensei-persona-4-usa-2',
  'ps2-cdr-ico-usa',
  'ps2-cdr-metal-gear-solid-2-sons-of-liberty-usa',
  'ps2-cdr-okami-usa',
  'ps2-cdr-final-fantasy-xii-usa',
  'ps2-cdr-grand-theft-auto-iii-usa',
  'ps2-cdr-devil-may-cry-3-dantes-awakening-special-edition-usa-2',
  'ps2-cdr-ratchet-clank-up-your-arsenal-usa',
  'ps2-cdr-jak-ii-usa',
  'ps2-cdr-tekken-5-usa-2',
  'ps2-cdr-dragon-ball-z-budokai-tenkaichi-3-usa-2',
  'ps2-cdr-need-for-speed-most-wanted-v2-00-usa',
  'ps2-cdr-burnout-3-takedown-usa',
  'ps2-cdr-shin-megami-tensei-persona-3-fes-usa-2',
  'ps2-cdr-dragon-quest-viii-usa-2',
  'ps2-cdr-prince-of-persia-the-sands-of-time-usa',
  'ps2-cdr-bully-usa',
  'ps2-cdr-sly-2-band-of-thieves-usa',
  'ps2-cdr-jak-and-daxter-the-precursor-legacy-usa-2',
  'ps2-cdr-ratchet-clank-usa',
  'ps2-cdr-ratchet-clank-going-commando-usa',
  'ps2-cdr-silent-hill-3-usa',
  'ps2-cdr-devil-may-cry-usa-2',
  'ps2-cdr-soul-calibur-ii-usa',
  'ps2-cdr-guitar-hero-ii-usa',
  'ps2-cdr-need-for-speed-underground-2-usa-2',
  'ps2-cdr-spider-man-2-usa',
  'ps2-cdr-the-simpsons-hit-run-usa',
  'ps2-cdr-katamari-damacy-usa',
  'ps2-cdr-beyond-good-evil-usa',
  'ps2-cdr-black-usa',
  'ps2-cdr-jak-3-usa',
  'ps2-cdr-sly-cooper-and-the-thievius-raccoonus-usa',
  'ps2-cdr-metal-gear-solid-3-subsistence-usa',
  'ps2-cdr-gran-turismo-3-a-spec-v1-10-usa',
  'ps2-cdr-tekken-tag-tournament-usa',
  'ps2-cdr-star-wars-battlefront-ii-usa',
  'ps2-cdr-prince-of-persia-warrior-within-usa',
  'ps2-cdr-burnout-revenge-usa',
  'ps2-cdr-mortal-kombat-shaolin-monks-usa-2',
  'ps2-cdr-dragon-ball-z-budokai-3-usa',
  'ps2-cdr-tony-hawks-pro-skater-3-usa',
  'ps2-cdr-crash-bandicoot-the-wrath-of-cortex-usa-2',
  'ps2-cdr-the-warriors-usa',
  'ps2-cdr-twisted-metal-black-usa',
  'ps2-cdr-ssx-3-usa',
  'ps2-cdr-hitman-blood-money-usa',
  'ps2-cdr-max-payne-usa',
  'ps2-cdr-final-fantasy-x-2-usa',
  'ps2-cdr-castlevania-lament-of-innocence-usa-2',
  'ps2-cdr-onimusha-warlords-usa',
  'ps2-cdr-zone-of-the-enders-the-2nd-runner-usa',
  'ps2-cdr-killzone-usa-2',
  'ps2-cdr-lego-star-wars-ii-the-original-trilogy-usa',
  'ps2-cdr-grand-theft-auto-liberty-city-stories-usa',
  'ps2-cdr-grand-theft-auto-vice-city-stories-usa',
  'ps2-cdr-resident-evil-code-veronica-x-2',
  'ps2-cdr-silent-hill-4-the-room-usa',
  'ps2-cdr-fatal-frame-ii-crimson-butterfly-usa',
  'ps2-cdr-soulcalibur-iii-usa-2',
  'ps2-cdr-midnight-club-3-dub-edition-remix-usa',
  'ps2-cdr-def-jam-fight-for-ny-usa',
  'ps2-cdr-wwe-smackdown-here-comes-the-pain-usa-2',
  'ps2-cdr-winning-eleven-pro-evolution-soccer-2007-usa',
  'ps2-cdr-medal-of-honor-frontline-usa',
  'ps2-cdr-call-of-duty-3-usa',
  'ps2-cdr-tom-clancys-splinter-cell-chaos-theory-usa',
  'ps2-cdr-scarface-the-world-is-yours-usa',
  'ps2-cdr-manhunt-usa',
  'ps2-cdr-mercenaries-playground-of-destruction-usa',
  'ps2-cdr-destroy-all-humans-usa',
  'ps2-cdr-psychonauts-usa',
  'ps2-cdr-tomb-raider-legend-usa',
  'ps2-cdr-ace-combat-04-shattered-skies-usa',
  'ps2-cdr-ace-combat-5-the-unsung-war-usa-2',
  'ps2-cdr-street-fighter-anniversary-collection-usa',
  'ps2-cdr-mortal-kombat-armageddon-usa',
  'ps2-cdr-mortal-kombat-deception-europe',
  'ps2-cdr-naruto-ultimate-ninja-3-usa',
  'ps2-cdr-dragon-ball-z-budokai-tenkaichi-2-usa',
  'ps2-cdr-onimusha-2-samurais-destiny-usa',
  'ps2-cdr-ssx-tricky-usa',
  'ps2-cdr-tony-hawks-underground-usa',
  'ps2-cdr-guitar-hero-usa',
  'ps2-cdr-fight-night-round-3-usa',
  'ps2-cdr-spyro-a-heros-tail-usa',
  'ps2-cdr-crash-twinsanity',
  'ps2-cdr-ape-escape-2-usa',
  'ps2-cdr-dark-cloud-2-usa',
  'ps2-cdr-dark-cloud-usa',
  'ps2-cdr-rogue-galaxy-usa',
  'ps2-cdr-star-ocean-till-the-end-of-time-usa',
  'ps2-cdr-xenosaga-episode-i-der-wille-zur-macht-usa',
  'ps2-cdr-disgaea-hour-of-darkness-usa',
  'ps2-cdr-yakuza-usa-2',
  'ps2-cdr-tales-of-the-abyss-usa',
  'ps2-cdr-valkyrie-profile-2-silmeria-usa',
  'ps2-cdr-odin-sphere-usaundub',
  'ps2-cdr-suikoden-v-undub',
  'ps2-cdr-baldurs-gate-dark-alliance-usa',
  'ps2-cdr-champions-of-norrath-usa',
  'ps2-cdr-socom-u-s-navy-seals-usa',
  'ps2-cdr-bloody-roar-3-usa',
  'ps2-cdr-fatal-frame-usa',
  'ps2-cdr-gradius-v-usa'
];

const known = new Set(PS2_GAMES.map(game => game.id));

export const POPULAR = POPULAR_IDS.filter(id => known.has(id));

const popularRank = new Map(POPULAR.map((id, index) => [id, index]));

// catalog.js keeps CDRomance's listing order, newest post first.
const listingOrder = new Map(PS2_GAMES.map((game, index) => [game.id, index]));

export const isPopular = game => popularRank.has(game.id);

// CDRomance joins several genres in one entry ("Action, Hack and Slash").
const splitGenres = new Map();

export function genresOf(game) {
  const key = game.genres.join('|');
  if (!splitGenres.has(key))
    splitGenres.set(key, [...new Set(game.genres.flatMap(genre => genre.split(/,\s*/)).filter(Boolean))]);
  return splitGenres.get(key);
}

const MAIN_REGIONS = ['USA', 'Europe', 'Japan'];

export const REGIONS = [...MAIN_REGIONS, 'other'];

export function regionsOf(game) {
  const main = String(game.region || '')
    .split(/,\s*/)
    .filter(region => MAIN_REGIONS.includes(region));
  return main.length ? main : ['other'];
}

// Fan patches, translations, undubs and hacks are listed next to the original discs.
const MODIFIED = /patch|hack|undub|translat|\bmtl\b|\bmod\b|dubbed/i;

export const editionOf = game => (MODIFIED.test(game.title) ? 'modified' : 'original');

export const EDITIONS = ['original', 'modified'];

// Genres with enough games to be worth a filter, largest first.
export const PS2_GENRES = (() => {
  const counts = new Map();
  for (const game of PS2_GAMES)
    for (const genre of genresOf(game)) counts.set(genre, (counts.get(genre) || 0) + 1);
  return [...counts]
    .filter(([, count]) => count >= 10)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
})();

export const PS2_SORTS = [
  {
    id: 'popular',
    compare: (a, b) =>
      (popularRank.get(a.id) ?? Infinity) - (popularRank.get(b.id) ?? Infinity) ||
      listingOrder.get(a.id) - listingOrder.get(b.id)
  },
  {id: 'recent', compare: (a, b) => listingOrder.get(a.id) - listingOrder.get(b.id)},
  {id: 'title', compare: (a, b) => a.title.localeCompare(b.title)},
  {id: 'titleDesc', compare: (a, b) => b.title.localeCompare(a.title)}
];

export const sortPs2 = (games, id) => [...games].sort(PS2_SORTS.find(sort => sort.id === id).compare);

export const NO_PS2_FILTERS = {genre: [], region: [], edition: []};

const FACET_TEST = {
  genre: (game, picked) => picked.every(genre => genresOf(game).includes(genre)),
  region: (game, picked) => picked.some(region => regionsOf(game).includes(region)),
  edition: (game, picked) => picked.includes(editionOf(game))
};

export const filterPs2 = (games, filters) =>
  games.filter(game =>
    Object.entries(filters).every(([key, picked]) => !picked.length || FACET_TEST[key](game, picked))
  );

export const ps2FilterCount = filters => Object.values(filters).reduce((sum, picked) => sum + picked.length, 0);

// The PS2 tab's library filters and sort, kept while a game page is open and reset when the tab is
// opened again from the header.
let browse = {filters: NO_PS2_FILTERS, sort: 'popular'};

const browseListeners = new Set();

function setBrowse(next) {
  browse = next;
  for (const listener of browseListeners) listener(browse);
}

export const ps2Browse = {
  reset: () => setBrowse({filters: NO_PS2_FILTERS, sort: 'popular'}),
  setSort: sort => setBrowse({...browse, sort}),
  clearFilters: () => setBrowse({...browse, filters: NO_PS2_FILTERS}),
  toggle: (key, value) => {
    const picked = browse.filters[key];
    setBrowse({
      ...browse,
      filters: {
        ...browse.filters,
        [key]: picked.includes(value) ? picked.filter(item => item !== value) : [...picked, value]
      }
    });
  }
};

export function usePs2Browse() {
  const [value, setValue] = useState(browse);
  useEffect(() => {
    browseListeners.add(setValue);
    setValue(browse);
    return () => {
      browseListeners.delete(setValue);
    };
  }, []);
  return value;
}

const recent = savedList('ps2-recent.json', 'PS2 recently viewed');

export function recordPs2Visit(id) {
  const ids = recent.get();
  if (ids[0] !== id) recent.set([id, ...ids.filter(other => other !== id)].slice(0, 12));
}

export const usePs2Recent = recent.useList;
