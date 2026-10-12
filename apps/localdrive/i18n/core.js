import {SOURCE_LOCALE} from './locales.js';
import {formatNumber, formatPercent, formatDate} from './format.js';
import {fitBytes} from './fit.js';
import {compile, format} from './icu.js';

let load = () => ({});

let bundled = null;

let english = null;

let active = null;

let locale = SOURCE_LOCALE;

let compiled = new Map();

const listeners = new Set();

export function configure(read, source = null) {
  load = read;
  bundled = source;
  english = null;
  active = null;
  compiled = new Map();
}

function messages(code) {
  try {
    return load(code);
  } catch (error) {
    console.log(`i18n: ${code} not loaded: ${error.message}`);
    return {};
  }
}

const source = () => english ?? (english = bundled ?? messages(SOURCE_LOCALE));

function entry(key) {
  if (compiled.has(key)) return compiled.get(key);
  active ?? (active = locale === SOURCE_LOCALE ? source() : messages(locale));
  let found = null;
  for (const [code, catalog] of [
    [locale, active],
    [SOURCE_LOCALE, source()]
  ]) {
    const text = catalog[key];
    if (typeof text !== 'string') continue;
    try {
      found = {code, parts: compile(text)};
      break;
    } catch (error) {
      console.log(`i18n: ${code} ${key}: ${error.message}`);
    }
  }
  compiled.set(key, found);
  return found;
}

export function t(key, params) {
  const found = entry(key);
  return found ? fitBytes(format(found.parts, params, found.code)) : key;
}

export const getLocale = () => locale;

export function setLocale(code) {
  if (code === locale) return;
  locale = code;
  active = null;
  compiled = new Map();
  for (const listener of listeners) listener(code);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const formatNumber2 = (n, options) => formatNumber(locale, n, options);

const formatPercent2 = percent => formatPercent(locale, percent);

const formatDate2 = iso => formatDate(locale, iso);

export {formatNumber2 as formatNumber, formatDate2 as formatDate, formatPercent2 as formatPercent};
