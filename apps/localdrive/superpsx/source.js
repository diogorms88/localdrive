import {useEffect, useState} from 'react';
import {Http} from '@ps5-react/core';

export const SUPERPSX_FIRST_PAGE = 'https://www.superpsx.com/category/ps5/';
export const SUPERPSX_LAST_PAGE = 40;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const PAGE_CACHE = new Map();
const PAGE_REQUESTS = new Map();
const DETAIL_CACHE = new Map();
const DETAIL_REQUESTS = new Map();
const listeners = new Set();
let catalog = [];

function decode(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
      const hex = code[0].toLowerCase() === 'x';
      const point = parseInt(hex ? code.slice(1) : code, hex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : '';
    });
}

function textOf(html) {
  return decode(String(html || '').replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/[\t\r\n ]+/g, ' ')).trim();
}

function attribute(tag, name) {
  const match = String(tag || '').match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return decode(match ? match[1] ?? match[2] ?? match[3] : '');
}

function absolute(value, base) {
  const url = decode(value).trim();
  if (!url || /^(?:data:|blob:|javascript:)/i.test(url)) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `https://www.superpsx.com${url}`;
  return `${base.slice(0, base.lastIndexOf('/') + 1)}${url}`;
}

function imageCandidates(tag, base) {
  const values = [
    attribute(tag, 'data-lazy-src'),
    attribute(tag, 'data-src'),
    attribute(tag, 'data-original'),
    attribute(tag, 'data-full-url')
  ];
  const sets = ['data-lazy-srcset', 'data-srcset', 'srcset', 'data-bgset']
    .flatMap(name => {
      const value = attribute(tag, name);
      return value ? value.split(',').map(part => {
        const [url, size] = part.trim().split(/\s+/, 2);
        const amount = size ? parseFloat(size) : 0;
        return {url, amount: Number.isFinite(amount) ? amount : 0};
      }) : [];
    })
    .sort((a, b) => b.amount - a.amount)
    .map(item => item.url);
  values.push(...sets, attribute(tag, 'src'));
  return [...new Set(values.map(value => absolute(value, base)).filter(url =>
    /^https?:\/\//i.test(url) && !/(?:placeholder|spacer|transparent|no[-_]?image|default[-_]?cover)/i.test(url)
  ))];
}

function imageFrom(tag, base) {
  return imageCandidates(tag, base)[0] || '';
}

function gameFromListing({title, url, image, coverFallbacks = []}) {
  const path = url.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0].replace(/\/$/, '');
  const slug = path.split('/').pop() || 'game';
  return {
    id: `superpsx-${slug}`,
    title,
    platform: 'ps5',
    platforms: ['ps5'],
    source: 'SuperPSX',
    pageUrl: url,
    releaseDate: '',
    year: null,
    developer: '',
    publisher: '',
    genres: [],
    publishedAt: '',
    about: [],
    shortDescription: '',
    summary: '',
    shots: [],
    art: {
      cover: image || null,
      coverFallbacks: coverFallbacks.filter(candidate => candidate && candidate !== image),
      poster: image || null,
      hero: image || null,
      logo: null,
      tint: '#1c2631'
    }
  };
}

export function parseSuperPsxPage(html, pageUrl = SUPERPSX_FIRST_PAGE) {
  const source = String(html || '');
  const entries = [];
  const articles = [...source.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map(match => match[1]);
  for (const article of articles) {
    const heading = article.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] || '';
    const headingLink = heading.match(/<a\b[^>]*>/i)?.[0] || '';
    const linkTag = headingLink || [...article.matchAll(/<a\b[^>]*>/gi)].map(match => match[0])
      .find(tag => /\bhref\s*=/i.test(tag)) || '';
    const url = absolute(attribute(linkTag, 'href'), pageUrl);
    const imageTag = article.match(/<img\b[^>]*>/i)?.[0] || '';
    const title = textOf(heading || attribute(linkTag, 'title') || attribute(imageTag, 'alt'));
    // The PenNews theme lazy-loads listing covers as a data-bgset background on the thumbnail link.
    const images = [...article.matchAll(/<(?:img|source)\b[^>]*>|<[a-z]+\b[^>]*\sdata-bgset\s*=[^>]*>/gi)]
      .flatMap(match => imageCandidates(match[0], pageUrl));
    const uniqueImages = [...new Set(images)];
    const image = uniqueImages[0] || '';
    const game = gameFromListing({title, url, image, coverFallbacks: uniqueImages.slice(1)});
    const categoryLinks = [...article.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)];
    game.genres = [...new Set(categoryLinks
      .filter(match => /(?:rel=["'][^"']*category|class=["'][^"']*tag)/i.test(match[0]))
      .map(match => textOf(match[1]))
      .filter(value => value && !/^ps[345]$/i.test(value)))];
    const timeTag = article.match(/<time\b[^>]*>/i)?.[0];
    game.publishedAt = timeTag ? attribute(timeTag, 'datetime').slice(0, 10) : '';
    const description = article.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    game.summary = textOf(description || '');
    game.shortDescription = game.summary;
    if (!title || !url || !/^https:\/\/www\.superpsx\.com\//i.test(url) || /\/category\//i.test(url)) continue;
    if (!entries.some(item => item.pageUrl === url)) entries.push(game);
  }

  // Fallback for WordPress themes that use linked cards without <article> wrappers.
  if (!entries.length) {
    for (const match of source.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)) {
      const url = absolute(match[1] || match[2] || match[3], pageUrl);
      if (!/^https:\/\/www\.superpsx\.com\//i.test(url) || /\/category\//i.test(url)) continue;
      const imageTag = match[4].match(/<img\b[^>]*>/i)?.[0] || '';
      const heading = match[4].match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] || '';
      const title = textOf(heading || attribute(match[0], 'title') || attribute(imageTag, 'alt'));
      const image = imageFrom(imageTag, pageUrl);
      if (title && image && !entries.some(item => item.pageUrl === url)) entries.push(gameFromListing({title, url, image}));
    }
  }
  return entries;
}

function metaContent(source, property) {
  const tags = [...source.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
  const tag = tags.find(item => new RegExp(`(?:property|name)=["']${property}["']`, 'i').test(item));
  return tag ? attribute(tag, 'content') : '';
}

export function parseSuperPsxDetails(html, baseGame) {
  const source = String(html || '');
  const article = source.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || source;
  const contentStart = article.match(/<(?:div|section)\b[^>]*class=["'][^"']*(?:entry-content|post-content|article-content|content-inner)[^"']*["'][^>]*>/i);
  const content = contentStart ? article.slice(contentStart.index + contentStart[0].length) : article;
  const heading = article.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
  const title = textOf(metaContent(source, 'og:title').replace(/\s*[|–-]\s*SuperPSX.*$/i, '') || heading) || baseGame.title;
  const description = textOf(metaContent(source, 'og:description'));
  const about = [...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(match => textOf(match[1]))
    .filter(value => value.length > 35 && !/^disclaimer\b/i.test(value))
    .slice(0, 6);
  const imageTags = [...content.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
  const shots = [];
  for (const tag of imageTags) {
    const url = imageFrom(tag, baseGame.pageUrl);
    if (!url || url === baseGame.art.cover || /download[-_]?button/i.test(url) ||
      /logo|avatar|icon|banner/i.test(attribute(tag, 'alt'))) continue;
    if (!shots.some(shot => shot.url === url)) shots.push({url, thumb: url});
    if (shots.length === 6) break;
  }
  const genres = [...source.matchAll(/<a\b[^>]*rel=["'][^"']*category tag[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => textOf(match[1]))
    .filter(value => value && !/^ps[345]$/i.test(value));
  const dateTag = [...source.matchAll(/<time\b[^>]*>/gi)].map(match => match[0])[0];
  const releaseDate = dateTag ? attribute(dateTag, 'datetime').slice(0, 10) : '';
  const ogImage = absolute(metaContent(source, 'og:image'), baseGame.pageUrl);
  const hero = ogImage || baseGame.art.hero;
  const poster = ogImage || imageTags.map(tag => imageFrom(tag, baseGame.pageUrl)).find(Boolean) || baseGame.art.poster;
  const coverFallbacks = [...new Set([
    ...(baseGame.art.coverFallbacks || []), baseGame.art.cover, ...imageCandidates(imageTags[0] || '', baseGame.pageUrl), hero
  ].filter(url => url && url !== poster))];
  const paragraphs = about.length ? about : description ? [description] : [];
  return {
    ...baseGame,
    title,
    releaseDate,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) || null : null,
    genres: genres.length ? [...new Set(genres)] : baseGame.genres,
    about: paragraphs,
    shortDescription: paragraphs[0] || baseGame.shortDescription,
    summary: paragraphs[0] || baseGame.summary,
    shots,
    art: {...baseGame.art, cover: poster || baseGame.art.cover, coverFallbacks, poster: poster || baseGame.art.poster, hero}
  };
}

function publish(next) {
  catalog = next;
  for (const listener of listeners) listener(catalog);
}

function updateCatalog(additions) {
  const byId = new Map(catalog.map(game => [game.id, game]));
  for (const game of additions) byId.set(game.id, {...byId.get(game.id), ...game});
  const ordered = [...PAGE_CACHE.keys()].sort((a, b) => a - b).flatMap(page => PAGE_CACHE.get(page));
  const ids = new Set(ordered.map(game => game.id));
  publish([...ordered.map(game => byId.get(game.id) || game), ...[...byId.values()].filter(game => !ids.has(game.id))]);
}

export function useSuperPsxCatalog() {
  const [games, setGames] = useState(catalog);
  useEffect(() => {
    const listener = next => setGames(next);
    listeners.add(listener);
    setGames(catalog);
    return () => listeners.delete(listener);
  }, []);
  return games;
}

export function hasSuperPsxGame(id) {
  return catalog.some(game => game.id === id);
}

export function loadSuperPsxPage(page) {
  if (!Number.isInteger(page) || page < 1 || page > SUPERPSX_LAST_PAGE) return Promise.reject(new Error('Invalid SuperPSX page.'));
  if (PAGE_CACHE.has(page)) return Promise.resolve(PAGE_CACHE.get(page));
  if (PAGE_REQUESTS.has(page)) return PAGE_REQUESTS.get(page);
  const url = page === 1 ? SUPERPSX_FIRST_PAGE : `${SUPERPSX_FIRST_PAGE}page/${page}/`;
  const request = (async () => {
    try {
      const response = await Http.request(url, {method: 'GET', maxBytes: MAX_HTML_BYTES});
      if (!response.ok) throw new Error(`SuperPSX returned HTTP ${response.status || 'error'}.`);
      const games = parseSuperPsxPage(await response.text(), url);
      PAGE_CACHE.set(page, games);
      updateCatalog(games);
      return games;
    } finally {
      PAGE_REQUESTS.delete(page);
    }
  })();
  PAGE_REQUESTS.set(page, request);
  return request;
}

export function loadSuperPsxDetails(id) {
  const game = catalog.find(item => item.id === id);
  if (!game || DETAIL_CACHE.has(game.pageUrl)) return Promise.resolve(game);
  if (DETAIL_REQUESTS.has(game.pageUrl)) return DETAIL_REQUESTS.get(game.pageUrl);
  const request = (async () => {
    try {
      const response = await Http.request(game.pageUrl, {method: 'GET', maxBytes: MAX_HTML_BYTES});
      if (!response.ok) throw new Error(`SuperPSX returned HTTP ${response.status || 'error'}.`);
      const detail = parseSuperPsxDetails(await response.text(), game);
      DETAIL_CACHE.set(game.pageUrl, detail);
      updateCatalog([detail]);
      return detail;
    } finally {
      DETAIL_REQUESTS.delete(game.pageUrl);
    }
  })();
  DETAIL_REQUESTS.set(game.pageUrl, request);
  return request;
}
