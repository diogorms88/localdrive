import {useEffect, useState} from 'react';
import {downloadQueue} from '../state/downloads.js';
import {createActivity} from './rates.js';

export function subscribe(listener) {
  try {
    return downloadQueue().subscribe(listener);
  } catch {
    return void 0;
  }
}

export const shapeOf = job => `${job.id}|${job.state}|${job.error}|${job.message || ''}|${job.total}`;

export const fractionOf = progress => (progress?.total ? Math.min(1, progress.written / progress.total) : 0);

export function useJobs() {
  const [state, setState] = useState({jobs: [], shape: '', error: ''});
  useEffect(() => {
    let last = '';
    try {
      return downloadQueue().subscribe(jobs => {
        const shape = jobs.map(shapeOf).join('\n');
        if (shape === last) return;
        last = shape;
        setState({jobs, shape, error: ''});
      });
    } catch (failure) {
      setState({jobs: [], shape: '', error: failure.message});
      return void 0;
    }
  }, []);
  return state;
}

export function useProgress(id) {
  const [progress, setProgress] = useState(null);
  useEffect(() => {
    let last = null;
    return subscribe(jobs => {
      const job = jobs.find(item => item.id === id);
      if (
        !job ||
        (last &&
          last.written === job.written &&
          last.total === job.total &&
          last.bytesPerSecond === (job.bytesPerSecond || 0))
      )
        return;
      last = {written: job.written, total: job.total, bytesPerSecond: job.bytesPerSecond || 0};
      setProgress(last);
    });
  }, [id]);
  return progress;
}

export function useActivity() {
  const [activity, setActivity] = useState({
    speed: 0,
    left: 0,
    active: 0,
    connections: 0,
    peak: 0,
    low: 0,
    mean: 0
  });
  useEffect(() => {
    const measure = createActivity();
    let shown = null;
    return subscribe(jobs => {
      const next = measure(jobs, Date.now());
      if (shown && Object.keys(next).every(key => shown[key] === next[key])) return;
      shown = next;
      setActivity(next);
    });
  }, []);
  return activity;
}
