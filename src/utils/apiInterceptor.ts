import axios from 'axios';
import { checkAndHandleAuthError } from '../services/authErrorService';
import { saveCurrentLocationForRedirect } from '../services/urlPreservationService';
import { recordTiming } from './apiTiming';

// Global flag to track if session expiration modal is active
let sessionExpirationModalActive = false;

export const setSessionExpirationModalActive = (active: boolean) => {
  sessionExpirationModalActive = active;
};

export const isSessionExpirationModalActive = (): boolean => {
  return sessionExpirationModalActive;
};

// Axios request interceptor: stamp the start time for response-time measurement.
axios.interceptors.request.use((config) => {
  (config as { metadata?: { startTime: number } }).metadata = {
    startTime: performance.now(),
  };
  return config;
});

// Axios response interceptor
axios.interceptors.response.use(
  (response) => {
    const startTime = (response.config as { metadata?: { startTime: number } } | undefined)?.metadata?.startTime;
    if (startTime != null) {
      recordTiming(
        response.config?.method,
        response.config?.url,
        performance.now() - startTime,
        response.status,
      );
    }
    return response;
  },
  (error: { config?: { method?: string; url?: string; metadata?: { startTime: number } }; response?: { status: number } }) => {
    const startTime = error.config?.metadata?.startTime;
    if (startTime != null) {
      recordTiming(
        error.config?.method,
        error.config?.url,
        performance.now() - startTime,
        error.response?.status ?? 'error',
      );
    }

    const isAuthError = checkAndHandleAuthError(error as Error);

    // If this is an auth error and the session expiration modal is NOT active,
    // save the current URL before logout (hard 401 from API call during normal usage)
    if (isAuthError && !isSessionExpirationModalActive()) {
      saveCurrentLocationForRedirect(
        window.location.pathname +
        window.location.search +
        window.location.hash
      );
    }

    return Promise.reject(error);
  }
);

export default axios;
