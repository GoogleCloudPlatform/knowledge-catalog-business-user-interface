import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../app/store';
import { useAuth } from '../auth/AuthProvider';
import { useNotification } from '../contexts/NotificationContext';
import { useNoAccess } from '../contexts/NoAccessContext';
import { getProjects } from '../features/projects/projectsSlice';
import { URLS, APP_CONFIG_REQUEST_TIMEOUT_MS } from '../constants/urls';

// Two retries, then give up and let the app render degraded. Timeouts are
// exempt — see isTimeoutError below.
const RETRY_DELAYS_MS = [1000, 3000];

// A timeout means "this endpoint is slow", not "this request was unlucky".
// Retrying burns another full timeout and re-runs the same expensive query, so
// we treat it as terminal and degrade immediately.
const isTimeoutError = (err: any): boolean =>
  err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT';

export type AppBootstrapStatus = {
  /** appConfig is available (or has definitively failed and won't arrive). */
  isAppConfigReady: boolean;
  /** The project list is available (or has definitively failed). */
  areProjectsReady: boolean;
  /** Both of the above. Prefer the specific flag your feature actually needs. */
  isBootstrapping: boolean;
};

// Default assumes bootstrapping is in progress so a consumer rendered outside
// <Layout> (which should never happen) fails safe rather than assuming data.
export const AppBootstrapContext = createContext<AppBootstrapStatus>({
  isAppConfigReady: false,
  areProjectsReady: false,
  isBootstrapping: true,
});

export const useAppBootstrapStatus = (): AppBootstrapStatus => useContext(AppBootstrapContext);

/**
 * Fetches appConfig and get-projects once per Layout mount, regardless of which
 * route is the entry point (fresh login, deep link, or page reload). Call this
 * once in Layout.tsx and provide the result via AppBootstrapContext; pages
 * consume it with useAppBootstrapStatus().
 */
export const useAppBootstrap = (): AppBootstrapStatus => {
  const { user, updateUser } = useAuth();
  const { showError } = useNotification();
  const { triggerNoAccess } = useNoAccess();
  const dispatch = useDispatch<AppDispatch>();
  const projectsLoaded = useSelector((state: any) => state.projects.isloaded);
  const projectsStatus = useSelector((state: any) => state.projects.status);
  const projectsError = useSelector((state: any) => state.projects.error);
  const projectsList = useSelector((state: any) => state.projects.items);

  const appConfigInFlight = useRef(false);
  const appConfigAttempts = useRef(0);
  const projectsInFlight = useRef(false);
  const projectsAttempts = useRef(0);
  const timers = useRef<number[]>([]);
  const isMounted = useRef(true);

  // Terminal failure has to be state, not a ref: releasing the readiness gates
  // must re-render consumers, otherwise a failed fetch leaves them spinning.
  const [appConfigGaveUp, setAppConfigGaveUp] = useState(false);
  const [projectsGaveUp, setProjectsGaveUp] = useState(false);

  const appConfigMissing = Object.keys(user?.appConfig ?? {}).length === 0;

  useEffect(() => {
    isMounted.current = true;
    const pending = timers.current;
    return () => {
      isMounted.current = false;
      pending.forEach((t) => clearTimeout(t));
    };
  }, []);

  const fetchAppConfig = useCallback(() => {
    if (!user || appConfigInFlight.current) return;
    appConfigInFlight.current = true;
    axios.get(URLS.API_URL + URLS.APP_CONFIG, { timeout: APP_CONFIG_REQUEST_TIMEOUT_MS })
      .then((res) => {
        const appConfig: any = res.data;
        updateUser(user.token, {
          name: user.name,
          email: user.email,
          picture: user.picture,
          token: user.token,
          tokenExpiry: user.tokenExpiry,
          tokenIssuedAt: user.tokenIssuedAt,
          hasRole: user.hasRole,
          roles: user.roles || [],
          permissions: user.permissions || [],
          iamDisplayRole: user.iamDisplayRole,
          appConfig,
        });
      })
      .catch((err) => {
        // Deliberately no logout here: the axios response interceptor
        // (utils/apiInterceptor) already routes real 401s through
        // checkAndHandleAuthError. Everything else (500, timeout, offline) is
        // transient and must not evict the user — retry, then degrade.
        console.error('[bootstrap] app-config fetch failed:', err);
        if (!isMounted.current) return;

        // A timeout means the endpoint is slow, not flaky — retrying just waits
        // the full timeout again and re-runs the same expensive query.
        const timedOut = isTimeoutError(err);

        if (!timedOut && appConfigAttempts.current < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[appConfigAttempts.current];
          appConfigAttempts.current += 1;
          timers.current.push(window.setTimeout(fetchAppConfig, delay));
        } else {
          setAppConfigGaveUp(true);
          showError(
            timedOut
              ? 'Workspace configuration is taking longer than expected. Some filters and project names may be unavailable.'
              : 'Could not load workspace configuration. Some filters and project names may be unavailable.',
            5000,
          );
        }
      })
      .finally(() => {
        appConfigInFlight.current = false;
      });
  }, [user, updateUser, showError]);

  const fetchProjects = useCallback(() => {
    if (!user || projectsInFlight.current) return;
    projectsInFlight.current = true;
    dispatch(getProjects({ id_token: user.token }))
      .finally(() => {
        projectsInFlight.current = false;
      });
  }, [user, dispatch]);

  useEffect(() => {
    if (!user || !appConfigMissing || appConfigGaveUp) return;
    fetchAppConfig();
  }, [user, appConfigMissing, appConfigGaveUp, fetchAppConfig]);

  useEffect(() => {
    if (!user || projectsLoaded || projectsGaveUp) return;
    // 'failed' is owned by the retry effect below; 'loading' is already in flight.
    if (projectsStatus === 'loading' || projectsStatus === 'failed') return;
    fetchProjects();
  }, [user, projectsLoaded, projectsGaveUp, projectsStatus, fetchProjects]);

  // Bounded retry for get-projects. Without this a single failed request left
  // isloaded=false forever, so every consumer gated on it spun indefinitely.
  useEffect(() => {
    if (!user || projectsStatus !== 'failed' || projectsGaveUp) return;

    // The thunk tags timeouts so the reason survives into the slice. Retrying a
    // slow endpoint just waits the full timeout again (and re-runs a query that
    // walks every page), so give up immediately instead.
    const timedOut = (projectsError as any)?.type === 'TIMEOUT';

    if (timedOut || projectsAttempts.current >= RETRY_DELAYS_MS.length) {
      setProjectsGaveUp(true);
      showError(
        timedOut
          ? 'Project list is taking longer than expected. Project names may appear as IDs.'
          : 'Could not load your project list. Project names may appear as IDs.',
        5000,
      );
      return;
    }

    const delay = RETRY_DELAYS_MS[projectsAttempts.current];
    projectsAttempts.current += 1;
    const timer = window.setTimeout(() => {
      if (isMounted.current) fetchProjects();
    }, delay);
    timers.current.push(timer);
    return () => clearTimeout(timer);
  }, [user, projectsStatus, projectsError, projectsGaveUp, fetchProjects, showError]);

  // Check project-level access once both appConfig (configuredProjectIds) and
  // the user's accessible projects (/get-projects) have actually loaded.
  //
  // This is the one place that still genuinely needs the full list — it asks
  // "does this user have access to ANY configured project?" — so it must never
  // run on an untrustworthy list or it would lock people out spuriously. Three
  // guards make that safe: it uses projectsLoaded (true only on `fulfilled`)
  // rather than areProjectsReady, so a gave-up/timed-out fetch is skipped; and
  // the backend now returns an error instead of HTTP 200 with a partial list,
  // so a half-finished walk lands in `failed` rather than looking successful.
  useEffect(() => {
    if (!user?.appConfig?.projectsRestricted) return;
    if (!projectsLoaded) return;
    const configuredIds: string[] = user.appConfig.configuredProjectIds || [];
    const intersection = (projectsList as any[]).filter((p: any) => configuredIds.includes(p.projectId));
    if (intersection.length === 0) {
      triggerNoAccess({
        message: 'You do not have access to any of the configured projects. Please contact your administrator.',
      });
    }
  }, [projectsLoaded, user?.appConfig?.projectsRestricted, user?.appConfig?.configuredProjectIds, projectsList, triggerNoAccess]);

  const isAppConfigReady = !appConfigMissing || appConfigGaveUp;
  const areProjectsReady = projectsLoaded || projectsGaveUp;

  return {
    isAppConfigReady,
    areProjectsReady,
    isBootstrapping: !isAppConfigReady || !areProjectsReady,
  };
};
