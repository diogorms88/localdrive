export function readJSON(fs, path, fallback, valid = () => true, log = console.log) {
  let text;
  try {
    if (!fs.exists(path)) return fallback;
    text = fs.readFile(path);
  } catch (error) {
    log(`[saved] ${path} not read: ${error.message}`);
    return fallback;
  }
  try {
    const value = JSON.parse(text);
    if (!valid(value)) throw new Error('unexpected contents');
    return value;
  } catch (error) {
    const aside = `${path}.unreadable-${Date.now()}`;
    log(`[saved] ${path} unreadable (${error.message}); kept as ${aside}`);
    try {
      fs.rename(path, aside);
    } catch (failure) {
      log(`[saved] ${path} not moved aside: ${failure.message}`);
    }
    return fallback;
  }
}

export const isStringList = value => Array.isArray(value) && value.every(item => typeof item === 'string');

export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const SAVED_FILES = {
  'settings.json': isRecord,
  'wishlist.json': isStringList,
  'recent.json': isStringList,
  'searches.json': isStringList
};
