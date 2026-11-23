import { describe, it, expect, vi, beforeEach } from 'vitest';

const mem = new Map<string, unknown>();
vi.mock('localforage', () => ({
  default: {
    createInstance: () => ({
      getItem: vi.fn(async (k: string) => (mem.has(k) ? mem.get(k) : null)),
      setItem: vi.fn(async (k: string, v: unknown) => { mem.set(k, v); return v; }),
      removeItem: vi.fn(async (k: string) => { mem.delete(k); }),
      clear: vi.fn(async () => { mem.clear(); }),
    }),
  },
}));

import {
  clearDataProductsCache,
  DATA_PRODUCTS_CACHE_MAX_AGE_MS,
  DATA_PRODUCTS_FRESH_MS,
  isDataProductsStale,
  loadDataProductsCache,
  saveDataProductsCache,
} from './dataProductsCache';

const entry = (fetchedAt: number) => ({ items: [{ name: 'projects/p/locations/us/dataProducts/a' }], projectIdentity: {}, fetchedAt });

describe('dataProductsCache', () => {
  beforeEach(() => mem.clear());

  it('round-trips per user (case-insensitive email)', async () => {
    const now = Date.now();
    await saveDataProductsCache('User@Example.com', entry(now));
    expect(await loadDataProductsCache('user@example.com', now)).toEqual(entry(now));
    expect(await loadDataProductsCache('other@example.com', now)).toBeNull();
  });

  it('ignores calls without an email', async () => {
    await saveDataProductsCache(undefined, entry(Date.now()));
    expect(mem.size).toBe(0);
    expect(await loadDataProductsCache(null)).toBeNull();
  });

  it('discards entries older than the max age', async () => {
    const now = Date.now();
    await saveDataProductsCache('a@b.com', entry(now - DATA_PRODUCTS_CACHE_MAX_AGE_MS - 1));
    expect(await loadDataProductsCache('a@b.com', now)).toBeNull();
    expect(mem.size).toBe(0);
  });

  it('rejects malformed entries', async () => {
    await saveDataProductsCache('a@b.com', { items: 'nope', fetchedAt: 'x' } as any);
    expect(await loadDataProductsCache('a@b.com')).toBeNull();
  });

  it('clears everything on logout', async () => {
    await saveDataProductsCache('a@b.com', entry(Date.now()));
    await saveDataProductsCache('c@d.com', entry(Date.now()));
    await clearDataProductsCache();
    expect(mem.size).toBe(0);
  });

  it('computes staleness against the fresh window', () => {
    const now = Date.now();
    expect(isDataProductsStale(null, now)).toBe(true);
    expect(isDataProductsStale(now - 1000, now)).toBe(false);
    expect(isDataProductsStale(now - DATA_PRODUCTS_FRESH_MS - 1, now)).toBe(true);
  });
});
