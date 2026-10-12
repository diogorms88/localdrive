import {t, formatNumber} from '../i18n/core.js';

export const formatSpeed = bytesPerSecond =>
  t('units.speed', {
    n: formatNumber(bytesPerSecond / 1024 ** 2, {minimumFractionDigits: 1, useGrouping: false})
  });

export function formatDuration(seconds) {
  if (seconds < 59.5) return t('time.seconds', {n: Math.max(1, Math.round(seconds))});
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('time.minutes', {n: minutes});
  return t('time.hoursMinutes', {hours: Math.floor(minutes / 60), minutes: minutes % 60});
}

export const formatTimeLeft = seconds => t('downloads.timeLeft', {time: formatDuration(seconds)});
