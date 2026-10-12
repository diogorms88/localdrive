const TTL_MS = 3e4;

export function createShadowMountProbe({http, now}) {
  let checkedAt = -Infinity;
  let answer;
  return () => {
    if (now() - checkedAt < TTL_MS) return answer;
    checkedAt = now();
    answer = http
      .request('http://127.0.0.1:10101/api/v1/version', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: '{}',
        maxBytes: 64 * 1024
      })
      .then(
        () => true,
        () => {
          checkedAt = -Infinity;
          return false;
        }
      );
    return answer;
  };
}
