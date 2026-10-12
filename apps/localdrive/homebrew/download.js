import {FileSystem} from '@ps5-react/core';
import {webURL} from '../state/download-sources.js';
import {downloadQueue, storageRoots} from '../state/downloads.js';
import {payloadDir} from '../state/download-queue.js';
import {BUSY} from '../state/download-queue.js';

const root = () => storageRoots()[0];

export const payloadPath = item => `${payloadDir(root())}/${item.filename}`;

export const biosFolder = item => `${root()}/${item.bios.folder}`;

const fileOf = url => {
  const {path} = webURL(url);
  let name = path.split(/[?#]/)[0].split('/').filter(Boolean).pop() || 'bios.bin';
  try {
    name = decodeURIComponent(name);
  } catch {}
  return name.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 180) || 'bios.bin';
};

const ARCHIVE = /\.(?:zip|rar|7z)$/i;

// Each request gets its own release id, so a finished or removed download can be fetched again.
function enqueue(gameId, title, url, release) {
  const {host} = webURL(url);
  const game = {id: gameId, title, titleId: gameId};
  downloadQueue().enqueue(game, {id: `${Date.now()}`, provider: host, url, ...release}, root());
}

export const homebrewGameId = item => `local-${item.id}`;

export const biosGameId = (item, region) => `local-${item.id}-bios-${region.id}`;

export function downloadHomebrew(item) {
  enqueue(homebrewGameId(item), item.name, item.url, {
    filename: item.filename,
    format: 'binary',
    saveTo: payloadDir(root())
  });
}

// A .zip/.rar/.7z is extracted into the BIOS folder; any other file is saved there as is.
export function downloadBios(item, region, url) {
  const filename = fileOf(url);
  const archive = ARCHIVE.exec(filename)?.[0].slice(1).toLowerCase();
  enqueue(biosGameId(item, region), `${item.name} BIOS ${region.name}`, url, {
    filename,
    format: archive ?? 'binary',
    saveTo: biosFolder(item)
  });
}

export function biosFiles(item) {
  const folder = biosFolder(item);
  try {
    if (!FileSystem.exists(folder)) return null;
    return FileSystem.readDir(folder)
      .filter(entry => !entry.isDirectory && !/\.complete(?:\.tmp)?$/.test(entry.name))
      .map(entry => entry.name);
  } catch {
    return null;
  }
}

// The newest job for a game id, and whether it is still running.
export function latestJob(jobs, gameId) {
  const job = [...jobs].reverse().find(item => item.gameId === gameId);
  return job ? {job, busy: BUSY.includes(job.state)} : null;
}
