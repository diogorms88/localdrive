import {t} from '../i18n/core.js';
import {explainError} from './errors.js';
import {COMPLETE} from '../state/download-queue.js';

export function alertsBetween(previous, jobs) {
  const before = new Map(previous.map(job => [job.id, job.state]));
  const alerts = [];
  for (const job of jobs) {
    const was = before.get(job.id);
    if (was === void 0 || was === job.state) continue;
    if (COMPLETE.includes(job.state) && !COMPLETE.includes(was)) {
      alerts.push({
        kind: 'complete',
        title: job.title,
        gameId: job.gameId,
        message: t('downloads.notice.complete')
      });
    } else if (job.state === 'failed') {
      alerts.push({
        kind: 'failed',
        title: job.title,
        gameId: job.gameId,
        message: explainError(job.error).title
      });
    }
  }
  return alerts;
}
