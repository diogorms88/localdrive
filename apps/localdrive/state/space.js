import {formatBytes} from './size.js';

export const MARGIN = 16 * 1024 ** 2;

const extracts = job => Boolean(job.release?.parts) || job.artifact?.nextAction === 'extraction-required';

export function stillNeeded(job) {
  if (job.state === 'installing') return 0;
  const factor = extracts(job) && job.state !== 'extracting' ? 2 : 1;
  return Math.max(0, (job.total ?? job.release?.sizeBytes ?? 0) * factor - job.written);
}

const SHOWN = 3;

export function spaceShortfall(root, need, free, pending) {
  const holders = pending
    .map(job => ({title: job.title, bytes: stillNeeded(job)}))
    .filter(job => job.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes);
  const reserved = holders.reduce((sum, job) => sum + job.bytes, 0);
  const left = Math.max(0, free - reserved);
  if (left >= need + MARGIN) return '';
  const message = `Not enough space on ${root}: needs ${formatBytes(need)}, ${formatBytes(left)} free`;
  if (!reserved) return message;
  const named = holders.slice(0, SHOWN).map(job => `${job.title} (${formatBytes(job.bytes)})`);
  if (holders.length > SHOWN) named.push(`+${holders.length - SHOWN}`);
  return `${message} after queued downloads: ${named.join(', ')}`;
}
