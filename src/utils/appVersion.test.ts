import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchServerVersion,
  isNewerDeployment,
  markReloadFor,
  readClientVersion,
  RELOAD_GUARD_WINDOW_MS,
  wasRecentlyReloadedFor,
} from './appVersion';

const docWith = (buildTime?: string, deployId?: string) => {
  const doc = document.implementation.createHTMLDocument('t');
  if (buildTime !== undefined) {
    const m = doc.createElement('meta');
    m.setAttribute('name', 'app-build-time');
    m.setAttribute('content', buildTime);
    doc.head.appendChild(m);
  }
  if (deployId !== undefined) {
    const m = doc.createElement('meta');
    m.setAttribute('name', 'app-deploy-id');
    m.setAttribute('content', deployId);
    doc.head.appendChild(m);
  }
  return doc;
};

const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('readClientVersion', () => {
  it('reads build time and deploy id', () => {
    expect(readClientVersion(docWith('1000', '1000-abc'))).toEqual({ buildTime: 1000, deployId: '1000-abc' });
  });
  it('falls back to build time when the deploy id was not stamped', () => {
    expect(readClientVersion(docWith('1000', '__APP_DEPLOY_ID__'))).toEqual({ buildTime: 1000, deployId: '1000' });
  });
  it('returns null for unstamped (dev) builds', () => {
    expect(readClientVersion(docWith('__APP_BUILD_TIME__', '__APP_DEPLOY_ID__'))).toBeNull();
    expect(readClientVersion(docWith())).toBeNull();
    expect(readClientVersion(docWith('not-a-number'))).toBeNull();
  });
});

describe('fetchServerVersion', () => {
  it('fetches version.json without caching', async () => {
    const f = vi.fn().mockResolvedValue(response({ buildTime: '2000', deployId: '2000-def' }));
    expect(await fetchServerVersion(f as any)).toEqual({ buildTime: 2000, deployId: '2000-def' });
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/^\/version\.json\?t=\d+$/);
    expect(init).toMatchObject({ cache: 'no-store' });
  });
  it('uses build time as deploy id when missing', async () => {
    const f = vi.fn().mockResolvedValue(response({ buildTime: '2000' }));
    expect(await fetchServerVersion(f as any)).toEqual({ buildTime: 2000, deployId: '2000' });
  });
  it('returns null on errors, non-OK responses and bad payloads', async () => {
    expect(await fetchServerVersion(vi.fn().mockRejectedValue(new Error('offline')) as any)).toBeNull();
    expect(await fetchServerVersion(vi.fn().mockResolvedValue(response({}, false)) as any)).toBeNull();
    expect(await fetchServerVersion(vi.fn().mockResolvedValue(response({ buildTime: 'x' })) as any)).toBeNull();
  });
});

describe('isNewerDeployment', () => {
  const client = { buildTime: 1000, deployId: '1000-abc' };
  it('detects a new build', () => {
    expect(isNewerDeployment(client, { buildTime: 2000, deployId: '2000-abc' })).toBe(true);
  });
  it('detects a config-only redeploy (same build, different env)', () => {
    expect(isNewerDeployment(client, { buildTime: 1000, deployId: '1000-xyz' })).toBe(true);
  });
  it('ignores the same deployment and older builds (rollout overlap)', () => {
    expect(isNewerDeployment(client, { ...client })).toBe(false);
    expect(isNewerDeployment(client, { buildTime: 500, deployId: '500-abc' })).toBe(false);
  });
});

describe('reload guard', () => {
  beforeEach(() => sessionStorage.clear());
  it('remembers a reload for a deployment within the window', () => {
    const now = 1_000_000;
    expect(wasRecentlyReloadedFor('d1', now)).toBe(false);
    markReloadFor('d1', now);
    expect(wasRecentlyReloadedFor('d1', now + 1000)).toBe(true);
    expect(wasRecentlyReloadedFor('d2', now + 1000)).toBe(false);
    expect(wasRecentlyReloadedFor('d1', now + RELOAD_GUARD_WINDOW_MS + 1)).toBe(false);
  });
  it('tolerates corrupt storage', () => {
    sessionStorage.setItem('app-version:last-reload', '{oops');
    expect(wasRecentlyReloadedFor('d1')).toBe(false);
  });
});
