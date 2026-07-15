/**
 * Dev-only API response-time recorder.
 *
 * Captures how long each distinct API endpoint takes to respond, deduped so each
 * endpoint is timed once only (repeat calls with different params are ignored).
 *
 * Wired in from:
 *  - src/utils/apiInterceptor.ts (all axios calls)
 *  - src/app/api/apiSlice.ts (RTK Query / fetchBaseQuery calls)
 *
 * Inspect in the browser console:
 *  - window.printApiTimings()  -> console.table of everything collected
 *  - window.__apiTimings       -> the raw array
 *  - window.resetApiTimings()  -> clear and start a fresh measurement pass
 */

export interface TimingEntry {
  order: number;
  method: string;
  endpoint: string;
  durationMs: number;
  status: number | string;
}

/**
 * Feature flag — disabled by default. Enable only in trusted/local environments by
 * setting `VITE_FEATURE_API_TIMING="true"` in your .env file. When off, every export
 * here is a no-op and nothing is attached to `window`, so request URLs/timings are
 * never exposed in production.
 */
const isTimingEnabled = import.meta.env.VITE_FEATURE_API_TIMING === 'true';

const timings = new Map<string, TimingEntry>();
let counter = 0;

/**
 * Reduce a full request URL to a stable, param-free key so the same logical
 * endpoint maps to a single row regardless of ids/query params.
 */
function normalizeKey(url: string): string {
  if (!url) return '(unknown)';

  let pathname = url;
  try {
    // Resolve relative urls (e.g. "/api/v1/search") against the current origin.
    const parsed = new URL(url, window.location.origin);
    pathname = parsed.pathname;
  } catch {
    // Fall back to stripping the query string manually.
    pathname = url.split('?')[0];
  }

  // Dataplex external calls end in an operation verb, e.g. ".../global:searchEntries"
  // or ".../locations/...:lookupEntry". Keep just the operation.
  const verbMatch = pathname.match(/:([A-Za-z]+)$/);
  if (verbMatch) {
    return `:${verbMatch[1]}`;
  }

  // Collapse the volatile Dataplex prefix but keep the trailing resource,
  // e.g. ".../projects/x/locations/y/.../categories" -> ".../categories".
  const dataplexResourceMatch = pathname.match(/\/(categories|terms|dataAssets|dataProducts)$/);
  if (dataplexResourceMatch) {
    return `/${dataplexResourceMatch[1]}`;
  }

  return pathname;
}

export function recordTiming(
  method: string | undefined,
  url: string | undefined,
  durationMs: number,
  status: number | string,
): void {
  if (!isTimingEnabled) return;

  const normalizedMethod = (method || 'GET').toUpperCase();
  const endpoint = normalizeKey(url || '');
  const key = `${normalizedMethod} ${endpoint}`;

  // Each API is timed once only.
  if (timings.has(key)) return;

  const entry: TimingEntry = {
    order: ++counter,
    method: normalizedMethod,
    endpoint,
    durationMs: Math.round(durationMs),
    status,
  };
  timings.set(key, entry);

  // eslint-disable-next-line no-console
  console.log(`[api-timing] ${normalizedMethod} ${endpoint} — ${entry.durationMs}ms`);
}

function getTimings(): TimingEntry[] {
  return Array.from(timings.values()).sort((a, b) => a.order - b.order);
}

function printApiTimings(): void {
  // eslint-disable-next-line no-console
  console.table(getTimings());
}

function resetApiTimings(): void {
  timings.clear();
  counter = 0;
  // eslint-disable-next-line no-console
  console.log('[api-timing] cleared');
}

if (isTimingEnabled && typeof window !== 'undefined') {
  Object.defineProperty(window, '__apiTimings', {
    configurable: true,
    get: getTimings,
  });
  (window as unknown as Record<string, unknown>).printApiTimings = printApiTimings;
  (window as unknown as Record<string, unknown>).resetApiTimings = resetApiTimings;
}
