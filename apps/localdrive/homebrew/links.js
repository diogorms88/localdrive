import {loadList, saveList} from '../state/saved.js';

const SETTINGS = 'settings.json';

// The BIOS links people enter on the console, kept with the other settings in the app's data folder.
export const savedLink = key => loadList(SETTINGS, 'settings').homebrewLinks?.[key] ?? '';

export function saveLink(key, url) {
  const settings = loadList(SETTINGS, 'settings');
  saveList(SETTINGS, 'settings', {...settings, homebrewLinks: {...settings.homebrewLinks, [key]: url}});
}
