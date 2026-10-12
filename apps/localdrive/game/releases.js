import {DownloadFormats} from '@ps5-react/core';
import {t} from '../i18n/core.js';
import {formatBytes} from '../state/size.js';
import {stillNeeded, MARGIN} from '../state/space.js';
import {driveName} from '../state/downloads.js';

export function spaceNeeded(release, root) {
  if (!release?.sizeBytes) return 0;
  let artifact;
  try {
    artifact = release.parts ? void 0 : DownloadFormats.artifact(release, root);
  } catch {
    artifact = void 0;
  }
  return stillNeeded({release, artifact: artifact, total: release.sizeBytes, written: 0});
}

export const canDownload = game =>
  game.hasDownloads ??
  (game.releases || []).some(release => release.url || release.manifestUrl || release.browserUrl);

export function spaceAdvice(roots, free, storage, need) {
  const other = roots.findIndex((root, i) => i !== storage && free[i] >= need + MARGIN);
  if (other >= 0)
    return t('download.space.otherDrive', {drive: driveName(roots[other]), size: formatBytes(free[other])});
  return t('download.space.free', {
    size: formatBytes(need + MARGIN - free[storage]),
    drive: driveName(roots[storage])
  });
}
