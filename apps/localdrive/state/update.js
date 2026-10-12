import {useEffect, useState} from 'react';
import {Platform, FileSystem, Http, Downloads, Archives} from '@ps5-react/core';
import {VERSION} from '../version.js';
import {storageRoots, downloadQueue} from './downloads.js';
import {locateInstall} from './install-location.js';
import {createUpdater} from './updater.js';

const TITLE = 'PPSA99059';

const FEED = 'https://api.github.com/repos/diogorms88/localdrive/releases/latest';

const FEED_OVERRIDES = [];

function location() {
  if (Platform.OS !== 'ps5')
    return {
      installDir: `${FileSystem.dataDir}/homebrew/${TITLE}`,
      workDir: `${FileSystem.dataDir}/localdrive-update`
    };
  return locateInstall({http: Http, fs: FileSystem, title: TITLE, roots: storageRoots});
}

function assetFor({image}) {
  if (Platform.OS !== 'ps5') return 'LocalDrive-desktop.zip';
  return image ? `LocalDrive-${TITLE}.exfat.zip` : `LocalDrive-${TITLE}.zip`;
}

let foundInstall;

const located = new Promise(resolve => {
  foundInstall = resolve;
});

let updater;

async function instance() {
  if (updater) return updater;
  const install = await location();
  foundInstall(install);
  const override = FEED_OVERRIDES.find(path => {
    try {
      return FileSystem.exists(path);
    } catch {
      return false;
    }
  });
  const feed = override ? FileSystem.readFile(override).trim() : FEED;
  return (updater = createUpdater({
    http: Http,
    downloads: Downloads,
    archives: Archives,
    fs: FileSystem,
    version: VERSION,
    feed,
    asset: assetFor(install),
    marker: `${FileSystem.dataDir}/localdrive/pending-image.json`,
    ...install
  }));
}

const CHECK_DELAY_MS = 4e3;

export function useAvailableUpdate() {
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const current = await instance();
        void current.cleanup();
        setUpdate(await current.check());
      } catch (error) {
        console.log(`localdrive: update check failed: ${error.message}`);
      }
    }, CHECK_DELAY_MS);
    return () => clearTimeout(id);
  }, []);
  return update;
}

export async function installUpdate(update, onProgress) {
  try {
    await downloadQueue().yieldArchives?.();
  } catch (error) {
    console.log(`[update] queue not yielded: ${error.message}`);
  }
  return (await instance()).install(update, onProgress);
}

export function useFolderInstall() {
  const [folder, setFolder] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'ps5') located.then(install => setFolder(Boolean(install.installDir)));
  }, []);
  return folder;
}
