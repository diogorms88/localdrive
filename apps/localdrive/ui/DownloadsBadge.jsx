import {useEffect, useState} from 'react';
import {useIsFocused, Text, View} from '@ps5-react/core';
import {BUSY} from '../state/download-queue.js';
import {downloadQueue} from '../state/downloads.js';
import {colors} from './colors.js';
import '../assets/Inter-Regular.ttf';

const IDLE = {count: 0, percent: null};

function summary(jobs) {
  const busy = jobs.filter(job => BUSY.includes(job.state));
  if (!busy.length) return IDLE;
  const sized = busy.filter(job => job.total > 0);
  const total = sized.reduce((sum, job) => sum + job.total, 0);
  const written = sized.reduce((sum, job) => sum + Math.min(job.written, job.total), 0);
  return {count: busy.length, percent: total ? Math.floor((written / total) * 100) : null};
}

export function DownloadsBadge() {
  const [state, setState] = useState(IDLE);
  const focused = useIsFocused();
  useEffect(() => {
    let last = IDLE;
    try {
      return downloadQueue().subscribe(jobs => {
        const next = summary(jobs);
        if (last.count === next.count && last.percent === next.percent) return;
        last = next;
        setState(next);
      });
    } catch (error) {
      console.log(`[downloads] queue unavailable: ${error.message}`);
      return void 0;
    }
  }, []);
  if (!state.count) return null;
  return (
    <>
      <Text style={[{fontFamily: 'Inter-Regular', fontSize: 23}, {color: focused ? colors.fg : '#f2f2f3a6'}]}>
        {String(state.count)}
      </Text>
      {state.percent === null ? null : (
        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 6,
            height: 5,
            overflow: 'hidden',
            borderRadius: 14999,
            backgroundColor: '#ffffff33'
          }}
        >
          <View style={[{height: '100%', backgroundColor: '#f2f2f3'}, {width: `${state.percent}%`}]} />
        </View>
      )}
    </>
  );
}
