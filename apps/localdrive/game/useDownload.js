import {useEffect, useRef, useState} from 'react';
import {sameRelease} from '../state/release-sets.js';
import {BUSY} from '../state/download-queue.js';
import {downloadQueue} from '../state/downloads.js';
import {fractionOf} from '../downloads/useQueue.js';

export function useDownload(game, release, root, alternatives) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    setError('');
    try {
      return downloadQueue().subscribe(jobs =>
        setJob(
          jobs.find(
            item =>
              item.gameId === game.id &&
              release &&
              ((item.requestedId ?? item.release.id) === release.id || sameRelease(item.release, release))
          ) || null
        )
      );
    } catch (failure) {
      setError(failure.message);
      return void 0;
    }
  }, [game.id, release?.id]);
  useEffect(() => {
    try {
      if (job?.state === 'downloaded') void downloadQueue().syncInstalls(job.id);
    } catch {}
  }, [job?.id]);
  const advance = () => {
    try {
      setError('');
      const queue = downloadQueue();
      if (!job) {
        if (release) {
          started.current = true;
          queue.enqueue(game, release, root, alternatives);
        }
      } else if (BUSY.includes(job.state) && job.state !== 'pausing' && job.state !== 'installing')
        queue.pause(job.id);
      else if (job.state === 'installer-required') queue.install(job.id);
      else if (job.state === 'paused' || job.state === 'failed') {
        started.current = true;
        queue.resume(job.id);
      } else if (job.state === 'awaiting-browser') queue.openBrowser(job.id);
      else if (job.state === 'downloaded')
        void queue.register(job.id).catch(failure => setError(failure.message));
    } catch (failure) {
      setError(failure.message);
    }
  };
  useEffect(() => {
    if (!started.current || !job) return;
    if (job.state === 'awaiting-browser') {
      started.current = false;
      try {
        downloadQueue().openBrowser(job.id);
      } catch (failure) {
        setError(failure.message);
      }
    } else if (!['queued', 'resolving', 'connecting'].includes(job.state)) started.current = false;
  }, [job?.state]);
  const status = job?.state || (release ? 'idle' : 'unavailable');
  const action = name => {
    try {
      setError('');
      if (job) downloadQueue()[name](job.id);
    } catch (failure) {
      setError(failure.message);
    }
  };
  const deleteFromDisk = () => {
    setError('');
    void downloadQueue()
      .deleteFromDisk(job.id)
      .catch(failure => setError(failure.message));
  };
  return {
    status,
    progress: fractionOf(job),
    advance,
    restart: () => action('restart'),
    remove: () => action('remove'),
    deleteFromDisk,
    job: job,
    error: error || job?.error || ''
  };
}
