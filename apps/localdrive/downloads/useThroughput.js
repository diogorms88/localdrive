import {useEffect, useState} from 'react';
import {createThroughput} from './rates.js';
import {subscribe} from './useQueue.js';

export const SAMPLES = 60;

const EMPTY = {network: [], disk: []};

export function useThroughput(id) {
  const [history, setHistory] = useState(EMPTY);
  useEffect(() => {
    const measure = createThroughput();
    return subscribe(jobs => {
      const job = jobs.find(item => item.id === id);
      const sample = job && measure(job, Date.now());
      if (!sample) return;
      setHistory(previous => ({
        network: [...previous.network, sample.network].slice(-SAMPLES),
        disk: [...previous.disk, sample.disk].slice(-SAMPLES)
      }));
    });
  }, [id]);
  return history;
}
