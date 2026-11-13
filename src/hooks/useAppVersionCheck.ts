/**
 * @file useAppVersionCheck.ts
 * @description Reloads open tabs after the application is redeployed.
 *
 * Checks /version.json (never cached) every few minutes, whenever the tab
 * becomes visible / regains focus / comes back online, and immediately when a
 * script or stylesheet from /assets fails to load (a sign the page is older
 * than the deployment). When a newer deployment is found:
 *  - hidden tab  -> reload right away (the user is not looking at it);
 *  - visible tab -> show a short notice with "Reload now", then reload.
 * The current URL is kept, and the signed-in session survives the reload.
 */
import { useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import {
  fetchServerVersion,
  isNewerDeployment,
  markReloadFor,
  readClientVersion,
  wasRecentlyReloadedFor,
  type AppVersion,
} from '../utils/appVersion';

export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const VISIBLE_RELOAD_DELAY_MS = 10 * 1000;
/** Minimum gap between checks triggered by focus/visibility events. */
const EVENT_CHECK_THROTTLE_MS = 30 * 1000;

export interface AppVersionCheckOptions {
  intervalMs?: number;
  reloadDelayMs?: number;
  /** Override for tests. */
  reload?: () => void;
  /** Override for tests (defaults to import.meta.env.DEV). */
  disabled?: boolean;
}

export const useAppVersionCheck = ({
  intervalMs = VERSION_CHECK_INTERVAL_MS,
  reloadDelayMs = VISIBLE_RELOAD_DELAY_MS,
  reload = () => window.location.reload(),
  disabled = import.meta.env.DEV,
}: AppVersionCheckOptions = {}) => {
  const { showNotification } = useNotification();
  const pendingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const notifyRef = useRef(showNotification);
  notifyRef.current = showNotification;

  useEffect(() => {
    if (disabled) return;
    const client = readClientVersion();
    if (!client) return; // unstamped build (local dev / tests)

    let reloadTimer: number | undefined;
    let cancelled = false;

    const reloadFor = (server: AppVersion) => {
      if (cancelled) return;
      markReloadFor(server.deployId);
      reloadRef.current();
    };

    const handleNewDeployment = (server: AppVersion) => {
      if (pendingRef.current || wasRecentlyReloadedFor(server.deployId)) return;
      pendingRef.current = true;
      if (document.visibilityState === 'hidden') {
        reloadFor(server);
        return;
      }
      notifyRef.current(
        `A new version of the application is available. Reloading in ${Math.round(reloadDelayMs / 1000)} seconds…`,
        'info',
        reloadDelayMs,
        { label: 'Reload now', onClick: () => reloadFor(server) },
      );
      reloadTimer = window.setTimeout(() => reloadFor(server), reloadDelayMs);
    };

    const check = async (force = false) => {
      if (cancelled || pendingRef.current) return;
      const now = Date.now();
      if (!force && now - lastCheckRef.current < EVENT_CHECK_THROTTLE_MS) return;
      lastCheckRef.current = now;
      const server = await fetchServerVersion();
      if (server && !cancelled && isNewerDeployment(client, server)) handleNewDeployment(server);
    };

    const onVisibility = () => { if (document.visibilityState === 'visible') check(); };
    const onFocus = () => check();
    const onOnline = () => check(true);
    // A failed <script>/<link> from /assets usually means this page is older
    // than the deployment (its hashed files are gone).
    const onResourceError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const url = (target as HTMLScriptElement)?.src || (target as HTMLLinkElement)?.href || '';
      if ((target?.tagName === 'SCRIPT' || target?.tagName === 'LINK') && url.includes('/assets/')) check(true);
    };
    // Vite's event for a failed dynamic-import preload (if code splitting is added).
    const onPreloadError = (event: Event) => {
      event.preventDefault();
      check(true);
    };

    const interval = window.setInterval(() => check(true), intervalMs);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('error', onResourceError, true);
    window.addEventListener('vite:preloadError', onPreloadError);
    check(true);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (reloadTimer) window.clearTimeout(reloadTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('error', onResourceError, true);
      window.removeEventListener('vite:preloadError', onPreloadError);
    };
  }, [disabled, intervalMs, reloadDelayMs]);
};

/** Renders nothing; mounts the redeploy watcher inside the app's providers. */
export const AppVersionWatcher = () => {
  useAppVersionCheck();
  return null;
};
