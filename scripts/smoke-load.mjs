const baseUrl = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const totalRequests = Number(process.argv[3] || 210);
const concurrency = Number(process.argv[4] || 35);
const routes = ['/', '/mesa/mesa-1', '/dj/login'];

if (!Number.isInteger(totalRequests) || totalRequests <= 0) {
  throw new Error('totalRequests must be a positive integer');
}
if (!Number.isInteger(concurrency) || concurrency <= 0) {
  throw new Error('concurrency must be a positive integer');
}

const latencies = [];
const failures = [];
let nextRequest = 0;

async function worker() {
  while (true) {
    const requestIndex = nextRequest++;
    if (requestIndex >= totalRequests) return;

    const route = routes[requestIndex % routes.length];
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        headers: { 'user-agent': 'JUMIC-event-readiness-check/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      const body = await response.text();
      const cacheControl = response.headers.get('cache-control') || '';
      const elapsedMs = performance.now() - startedAt;
      latencies.push(elapsedMs);

      if (!response.ok || !body.includes('<div id="root"></div>') || !cacheControl.includes('no-store')) {
        failures.push({
          route,
          status: response.status,
          reason: !cacheControl.includes('no-store') ? 'HTML can be cached across deployments' : 'unexpected response',
        });
      }
    } catch (error) {
      failures.push({ route, reason: error instanceof Error ? error.message : String(error) });
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, () => worker()));

for (const extension of ['js', 'css']) {
  const response = await fetch(`${baseUrl}/assets/index-stale-readiness-check.${extension}`, {
    headers: { 'user-agent': 'JUMIC-event-readiness-check/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const cacheControl = response.headers.get('cache-control') || '';
  const expectedContentType = extension === 'js' ? 'javascript' : 'text/css';

  if (
    !response.ok
    || !contentType.includes(expectedContentType)
    || !cacheControl.includes('no-store')
    || body.length < 100
    || body.includes('<div id="root"></div>')
  ) {
    failures.push({
      route: `/assets/index-stale-readiness-check.${extension}`,
      status: response.status,
      reason: 'stale asset fallback is not safe',
    });
  }
}

latencies.sort((a, b) => a - b);
const percentile = value => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] || 0;
const result = {
  baseUrl,
  totalRequests,
  concurrency,
  succeeded: totalRequests - failures.length,
  failed: failures.length,
  latencyMs: {
    median: Math.round(percentile(0.5)),
    p95: Math.round(percentile(0.95)),
    maximum: Math.round(latencies.at(-1) || 0),
  },
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) {
  console.error(JSON.stringify(failures.slice(0, 10), null, 2));
  process.exitCode = 1;
}
