import {useEffect, useMemo, useState} from 'react';
import {FileSystem, Packages} from '@ps5-react/core';
import {getGame} from '../state/catalog.js';
import {COMPLETE} from '../state/download-queue.js';
import {downloadQueue, shadowMountUp} from '../state/downloads.js';
import {scanDrive, deletionTargets} from './scan.js';

function installedTitles() {
  try {
    return new Set(FileSystem.readDir('/user/app').map(entry => entry.name));
  } catch {
    return new Set();
  }
}

function forgetJobs(path) {
  let queue;
  try {
    queue = downloadQueue();
  } catch {
    return;
  }
  for (const job of queue.snapshot()) {
    const owned = [job.artifact?.destination, job.downloadDestination, job.output, ...(job.packages ?? [])];
    if (COMPLETE.includes(job.state) && owned.includes(path)) queue.remove(job.id);
  }
}

export function useFiles(root) {
  const [version, setVersion] = useState(0);
  const rescan = () => setVersion(value => value + 1);
  const files = useMemo(() => {
    const installed = installedTitles();
    return scanDrive(FileSystem, root).map(file => ({
      ...file,
      game: file.titleId ? (getGame(file.titleId) ?? null) : null,
      installed: Boolean(file.titleId && installed.has(file.titleId))
    }));
  }, [root, version]);
  const [installing, setInstalling] = useState(null);
  const [shadowMount, setShadowMount] = useState(true);
  useEffect(() => {
    let live = true;
    void shadowMountUp().then(up => {
      if (live) setShadowMount(up);
    });
    return () => {
      live = false;
    };
  }, [version]);
  const install = file => {
    if (installing && !installing.done && !installing.error) return;
    let task;
    try {
      task = Packages.install({path: file.path, name: file.game?.title ?? file.name});
    } catch (error) {
      setInstalling({path: file.path, fraction: 0, error: error.message});
      return;
    }
    setInstalling({path: file.path, fraction: 0});
    task.subscribe(progress =>
      setInstalling(state =>
        state?.path === file.path
          ? {...state, fraction: progress.total ? progress.written / progress.total : 0}
          : state
      )
    );
    task.done.then(
      () => {
        setInstalling(state => ({...state, fraction: 1, done: true}));
        rescan();
      },
      error => setInstalling(state => ({...state, error: error.message}))
    );
  };
  const remove = file => {
    for (const path of deletionTargets(file)) {
      if (!FileSystem.exists(path)) continue;
      if (file.isDirectory) FileSystem.removeTree(path);
      else FileSystem.remove(path);
    }
    forgetJobs(file.path);
    rescan();
  };
  return {files, installing, install, remove, rescan, shadowMount};
}
