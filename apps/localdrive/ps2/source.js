import {useEffect, useState} from 'react';
import {Http} from '@ps5-react/core';
import {PS2_GAMES} from './catalog.js';

const MAX_HTML_BYTES = 2 * 1024 * 1024;

let catalog = PS2_GAMES;
const listeners = new Set();
const detailRequests = new Map();
const detailsCache = new Map();

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
      const hex = code[0].toLowerCase() === 'x';
      const point = parseInt(hex ? code.slice(1) : code, hex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : '';
    });
}

function textOf(html) {
  return decodeEntities(String(html || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/[\t\r\n ]+/g, ' ')
    .trim();
}

function attribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = String(tag || '').match(pattern);
  return decodeEntities(match ? match[1] ?? match[2] ?? match[3] : '');
}

function applyDetails(game, detail) {
  return {
    ...game,
    title: detail.title || game.title,
    releaseDate: detail.releaseDate || game.releaseDate,
    year: detail.year || game.year,
    developer: detail.developer || game.developer,
    publisher: detail.publisher || game.publisher,
    genres: detail.genres.length ? detail.genres : game.genres,
    about: detail.about.length ? detail.about : game.about,
    region: detail.region || game.region,
    languages: detail.languages || game.languages,
    shortDescription: detail.about[0] || game.shortDescription,
    shots: detail.shots.length ? detail.shots : game.shots,
    art: {
      ...game.art,
      coverFallbacks: game.art.cover ? [game.art.cover] : [],
      cover: detail.cover || game.art.cover,
      hero: detail.shots[0]?.url || game.art.hero
    }
  };
}

function publish(next) {
  catalog = next;
  for (const listener of listeners) listener(catalog);
}

function parseDetail(html) {
  const source = String(html || '');
  const infoMatch = source.match(/<table\b[^>]*class=["'][^"']*\brom-info\b[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
  const info = {};
  const rows = infoMatch ? [...infoMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)] : [];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => textOf(match[1]));
    if (cells.length > 1) info[cells[0].replace(/:$/, '').toLowerCase()] = cells.slice(1).join(' ');
  }

  const imageTags = [...source.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
  const shots = [];
  for (const tag of imageTags) {
    if (!/^screenshot\s*\d+$/i.test(attribute(tag, 'alt'))) continue;
    const url = attribute(tag, 'src') || attribute(tag, 'data-src');
    if (url && !shots.some(shot => shot.url === url)) shots.push({url, thumb: url});
    if (shots.length >= 3) break;
  }

  const descriptionStart = source.search(/class=["'][^"']*\bgame-description\b[^"']*["']/i);
  const descriptionArea = descriptionStart >= 0 ? source.slice(descriptionStart, descriptionStart + 24000) : '';
  const about = [...descriptionArea.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(match => textOf(match[1]))
    .filter(text => text.length > 50 && text !== text.toUpperCase())
    .slice(0, 4);
  const ogImage = source.match(/<meta\b[^>]*property=["']og:image["'][^>]*>/i)?.[0] || '';
  const date = (info['game release'] || '').match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || '';
  const genres = (info.genre || '').split(/[,;|]/).map(item => item.trim()).filter(Boolean);

  return {
    title: info['game name'] || '',
    releaseDate: date,
    year: date ? Number(date.slice(0, 4)) : null,
    developer: info.developer || '',
    publisher: info.publisher || '',
    genres,
    about,
    region: info.region || '',
    languages: info.languages || '',
    shots,
    cover: attribute(ogImage, 'content')
  };
}

export function usePs2Catalog() {
  const [games, setGames] = useState(catalog);
  useEffect(() => {
    const listener = next => setGames(next);
    listeners.add(listener);
    setGames(catalog);
    return () => listeners.delete(listener);
  }, []);
  return games;
}

export function loadPs2Details(id) {
  const game = catalog.find(item => item.id === id);
  if (!game || detailsCache.has(game.pageUrl)) return Promise.resolve();
  if (detailRequests.has(game.pageUrl)) return detailRequests.get(game.pageUrl);
  const request = (async () => {
    try {
      const response = await Http.request(game.pageUrl, {method: 'GET', maxBytes: MAX_HTML_BYTES});
      if (!response.ok) return;
      const detail = parseDetail(await response.text());
      detailsCache.set(game.pageUrl, detail);
      publish(catalog.map(item => item.pageUrl === game.pageUrl ? applyDetails(item, detail) : item));
    } catch (_) {
      // Listing cards remain usable; detail fields can be retried if the page is reopened.
    } finally {
      detailRequests.delete(game.pageUrl);
    }
  })();
  detailRequests.set(game.pageUrl, request);
  return request;
}
