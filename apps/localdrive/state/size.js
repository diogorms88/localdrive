import {t, formatNumber} from '../i18n/core.js';

const plain = {maximumFractionDigits: 1, useGrouping: false};

export function formatSize(gb) {
  const mb = Math.round(gb * 1024);
  return mb < 1024
    ? t('units.megabytes', {n: formatNumber(mb, plain)})
    : t('units.gigabytes', {n: formatNumber(gb, plain)});
}

export const formatBytes = bytes => formatSize(bytes / 1024 ** 3);
