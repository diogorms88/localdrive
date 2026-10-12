import {releaseSets} from './release-sets.js';

const KEPT = 6;

export function createReleaseCache(read) {
  const games = new Map();
  return file => {
    if (!/^data\/releases\/[a-z0-9%_-]+\.json$/i.test(file)) throw new Error('Invalid release data path.');
    let releases = games.get(file);
    if (!releases) {
      const parsed = JSON.parse(read(file));
      if (!Array.isArray(parsed)) throw new Error('Invalid release data; rebuild the catalog.');
      releases = releaseSets(parsed);
      if (games.size === KEPT) games.delete(games.keys().next().value);
    }
    games.delete(file);
    games.set(file, releases);
    return releases;
  };
}
