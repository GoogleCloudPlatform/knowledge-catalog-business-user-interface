/**
 * @file appVersion.ts
 * @description Detects that the application was redeployed while a tab is open.
 *
 * Every production build is stamped (see vite.config.ts + entrypoint.sh):
 *  - index.html carries <meta name="app-build-time"> and <meta name="app-deploy-id">
 *    describing the build this tab is running;
 *  - /version.json (never cached) describes the build currently deployed.
 *
 * A deployment is "newer" when its deploy id differs and its build is not older
 * than ours. The build-time guard avoids reload ping-pong while Cloud Run is
 * briefly serving both the old and the new revision during a rollout.
 */

export interface AppVersion {
  buildTime: number;
  deployId: string;
}

const PLACEHOLDER_PREFIX = '__';
const RELOAD_GUARD_KEY = 'app-version:last-reload';
/** Do not reload twice for the same target deployment within this window. */
export const RELOAD_GUARD_WINDOW_MS = 10 * 60 * 1000;

const readMeta = (name: string, doc: Document): string | null =>
  doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || null;

const isPlaceholder = (value: string | null): boolean => !value || value.startsWith(PLACEHOLDER_PREFIX);

/** Version of the build running in this tab, or null when not stamped (dev / tests). */
export const readClientVersion = (doc: Document = document): AppVersion | null => {
  const buildTime = readMeta('app-build-time', doc);
  if (isPlaceholder(buildTime)) return null;
  const parsed = Number(buildTime);
  if (!Number.isFinite(parsed)) return null;
  const deployId = readMeta('app-deploy-id', doc);
  return { buildTime: parsed, deployId: isPlaceholder(deployId) ? String(buildTime) : (deployId as string) };
};

/** Version currently deployed, or null if it cannot be determined right now. */
export const fetchServerVersion = async (fetchImpl: typeof fetch = fetch): Promise<AppVersion | null> => {
  try {
    const response = await fetchImpl(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const buildTime = Number(data?.buildTime);
    const deployId = typeof data?.deployId === 'string' && data.deployId ? data.deployId : String(data?.buildTime ?? '');
    if (!Number.isFinite(buildTime) || !deployId) return null;
    return { buildTime, deployId };
  } catch {
    return null; // offline, mid-deploy, etc. - try again later
  }
};

export const isNewerDeployment = (client: AppVersion, server: AppVersion): boolean =>
  server.deployId !== client.deployId && server.buildTime >= client.buildTime;

/** True if we already reloaded for this deployment recently (prevents reload loops). */
export const wasRecentlyReloadedFor = (deployId: string, now: number = Date.now(), storage: Storage = sessionStorage): boolean => {
  try {
    const raw = storage.getItem(RELOAD_GUARD_KEY);
    if (!raw) return false;
    const last = JSON.parse(raw) as { deployId?: string; at?: number };
    return last.deployId === deployId && typeof last.at === 'number' && now - last.at < RELOAD_GUARD_WINDOW_MS;
  } catch {
    return false;
  }
};

export const markReloadFor = (deployId: string, now: number = Date.now(), storage: Storage = sessionStorage): void => {
  try {
    storage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ deployId, at: now }));
  } catch {
    // sessionStorage unavailable (privacy mode) - the build-time guard still applies
  }
};
