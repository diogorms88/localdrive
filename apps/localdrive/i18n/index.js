import {createContext, createElement, useContext, useEffect, useState} from 'react';
import {FileSystem, DeviceInfo, Fonts} from '@ps5-react/core';
import {loadList, saveList} from '../state/saved.js';
import {matchLocale, SOURCE_LOCALE, isRTL} from './locales.js';
import {configure, setLocale, getLocale, subscribe, t} from './core.js';
import en from './locales/en.json';

configure(code => JSON.parse(FileSystem.readFile(`${FileSystem.appDir}/i18n/locales/${code}.json`)), en);

const SETTINGS = 'settings.json';

const systemLanguage = () => {
  try {
    return DeviceInfo.get().language;
  } catch {
    return null;
  }
};

export const systemLocale = () => matchLocale(systemLanguage()) ?? SOURCE_LOCALE;

let choice = loadList(SETTINGS, 'settings').language ?? null;

function applyLocale() {
  setLocale(choice ?? systemLocale());
  Fonts.setLanguage(choice ?? systemLanguage() ?? getLocale());
}

applyLocale();

export const languageChoice = () => choice;

export function chooseLanguage(code) {
  choice = code;
  const {language, ...settings} = loadList(SETTINGS, 'settings');
  saveList(SETTINGS, 'settings', code ? {...settings, language: code} : settings);
  applyLocale();
}

const LocaleContext = createContext(getLocale());

export function LocaleProvider({children}) {
  const [locale, setActive] = useState(getLocale);
  useEffect(() => subscribe(setActive), []);
  return createElement(LocaleContext.Provider, {value: locale}, children);
}

export function useT() {
  useContext(LocaleContext);
  return t;
}

export function useLocale() {
  const locale = useContext(LocaleContext);
  return {locale: locale, rtl: isRTL(locale)};
}

export const LATIN_IN_RTL = {writingDirection: 'ltr', textAlign: 'right'};

export const latin = (rtl, text) => (rtl && text ? `${text}\u200E` : text);

export const focusEnd = (rtl, key) => ({[rtl ? 'nextFocusLeft' : 'nextFocusRight']: key});

export const focusStart = (rtl, key) => ({[rtl ? 'nextFocusRight' : 'nextFocusLeft']: key});
