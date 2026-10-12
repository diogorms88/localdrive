const WINDOW_MS = 1e3;

const WARMUP_MS = 3e3;

export function createActivity() {
  let started = 0,
    recent = [],
    peak = 0,
    low = 0,
    total = 0,
    count = 0;
  return (jobs, now) => {
    const moving = jobs.filter(job => job.state === 'downloading' || job.state === 'connecting');
    const sum = pick => moving.reduce((sum, job) => sum + pick(job), 0);
    let speed = 0;
    if (!moving.length) {
      started = 0;
      recent = [];
      peak = 0;
      low = 0;
      total = 0;
      count = 0;
    } else {
      started || (started = now);
      recent = [
        ...recent.filter(sample => now - sample.at < WINDOW_MS),
        {at: now, speed: sum(job => job.bytesPerSecond || 0)}
      ];
      speed = recent.reduce((sum, sample) => sum + sample.speed, 0) / recent.length;
      if (now - started >= WARMUP_MS && speed) {
        peak = Math.max(peak, speed);
        low = low ? Math.min(low, speed) : speed;
        total += speed;
        count += 1;
      }
    }
    return {
      active: moving.length,
      speed,
      connections: sum(job => job.connections || 0),
      left: sum(job => Math.max(0, (job.total || 0) - job.written)),
      peak,
      low,
      mean: count ? total / count : 0
    };
  };
}

export function createThroughput() {
  let last = null;
  return (job, now) => {
    if (last && now - last.at < 1e3) return null;
    const received = job.received ?? job.written ?? 0,
      written = job.written || 0;
    const baseline = !last || !last.received || received < last.received || written < last.written;
    const previous = last;
    last = {at: now, received, written};
    if (baseline) return null;
    const elapsed = now - previous.at;
    return {
      network: ((received - previous.received) * 1e3) / elapsed,
      disk: ((written - previous.written) * 1e3) / elapsed
    };
  };
}
