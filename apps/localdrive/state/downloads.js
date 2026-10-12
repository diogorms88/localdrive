import {
  Platform,
  FileSystem,
  Archives,
  Downloads,
  Http,
  DownloadFormats,
  Notifications,
  Power,
  Linking,
  Packages,
  BrowserCapture
} from '@ps5-react/core';
import {t} from '../i18n/core.js';
import {getGame} from './catalog.js';
import {createSourceResolver} from './download-sources.js';
import {createDownloadQueue} from './download-queue.js';
import {createMockDownloadQueue} from './mock-download-queue.js';
import {createShadowMountProbe} from './shadowmount.js';
import {consoleRoots} from './roots.js';

let instance;

const mocked = () =>
  Platform.OS !== 'ps5' &&
  (FileSystem.exists(`${FileSystem.dataDir}/localdrive/mock-downloads`) ||
    FileSystem.exists(`${FileSystem.dataDir}/overdrive/mock-downloads`));

const stateDir = Platform.OS === 'ps5' ? '/data/ps5-react/PPSA99059/localdrive/queue' : void 0;

export const downloadQueue = () =>
  instance ??
  (instance = mocked()
    ? createMockDownloadQueue()
    : createDownloadQueue({
        fs: FileSystem,
        archives: Archives,
        downloads: Downloads,
        http: Http,
        formats: DownloadFormats,
        dataDir: FileSystem.dataDir,
        stateDir,
        platform: Platform.OS,
        notifications: Notifications,
        power: Power,
        linking: Linking,
        sources: createSourceResolver({http: Http}),
        packages: Packages,
        browserCapture: BrowserCapture,
        releasesOf: id => getGame(id)?.releases || []
      }));

export const shadowMountUp =
  Platform.OS === 'ps5' ? createShadowMountProbe({http: Http, now: Date.now}) : async () => true;

export function freeBytes(root) {
  try {
    return FileSystem.diskUsage(root).free;
  } catch {
    return null;
  }
}

export function driveName(root) {
  if (root === '/data') return t('drives.internal');
  const mount = /^\/mnt\/(usb|ext)(\d+)$/.exec(root);
  if (!mount) return t('drives.thisDevice');
  return t(mount[1] === 'usb' ? 'drives.usb' : 'drives.extended', {number: String(Number(mount[2]) + 1)});
}

export function storageRoots() {
  if (Platform.OS !== 'ps5') return [FileSystem.dataDir];
  return consoleRoots(() => FileSystem.mounts());
}
