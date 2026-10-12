import {useEffect, useRef} from 'react';
import {downloadQueue} from '../state/downloads.js';
import {alertsBetween} from './alerts.js';

export function useDownloadAlerts(onAlert) {
  const current = useRef(onAlert);
  current.current = onAlert;
  useEffect(() => {
    let previous = null;
    try {
      return downloadQueue().subscribe(jobs => {
        if (previous) for (const alert of alertsBetween(previous, jobs)) current.current(alert);
        previous = jobs;
      });
    } catch {
      return void 0;
    }
  }, []);
}
