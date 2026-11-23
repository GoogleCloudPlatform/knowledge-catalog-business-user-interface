/**
 * @file dataProductsCache.ts
 * @description Per-user persisted cache (IndexedDB via localforage) for the
 * Data Products list, so a page reload / new tab renders instantly and then
 * revalidates in the background. Cleared on logout.
 */
import localforage from 'localforage';

export const DATA_PRODUCTS_FRESH_MS = 5 * 60 * 1000; // revalidate after 5 min
export const DATA_PRODUCTS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // discard after 24 h

const CACHE_VERSION = 'v1';

const store = localforage.createInstance({
  name: 'dataDiscoveryStudio',
  storeName: 'dataProductsCache',
});

export interface ProjectIdentity {
  projectId: string;
  projectNumber: string;
  displayName?: string;
}

export interface DataProductsCacheEntry {
  items: unknown[];
  projectIdentity: Record<string, ProjectIdentity>;
  fetchedAt: number;
}

// Scoped by user and deployment (the search project identifies the deployment).
const keyFor = (email: string) =>
  `dp-cache:${CACHE_VERSION}:${import.meta.env.VITE_GOOGLE_PROJECT_ID || 'default'}:${email.toLowerCase()}`;

export const loadDataProductsCache = async (
  email: string | undefined | null,
  now: number = Date.now(),
): Promise<DataProductsCacheEntry | null> => {
  if (!email) return null;
  try {
    const entry = await store.getItem<DataProductsCacheEntry>(keyFor(email));
    if (!entry || !Array.isArray(entry.items) || typeof entry.fetchedAt !== 'number') return null;
    if (now - entry.fetchedAt > DATA_PRODUCTS_CACHE_MAX_AGE_MS) {
      await store.removeItem(keyFor(email));
      return null;
    }
    return entry;
  } catch (err) {
    console.warn('Failed to read data products cache:', err);
    return null;
  }
};

export const saveDataProductsCache = async (
  email: string | undefined | null,
  entry: DataProductsCacheEntry,
): Promise<void> => {
  if (!email) return;
  try {
    await store.setItem(keyFor(email), entry);
  } catch (err) {
    console.warn('Failed to write data products cache:', err);
  }
};

/** Removes every user's cached data products (called on logout). */
export const clearDataProductsCache = async (): Promise<void> => {
  try {
    await store.clear();
  } catch (err) {
    console.warn('Failed to clear data products cache:', err);
  }
};

export const isDataProductsStale = (fetchedAt: number | null | undefined, now: number = Date.now()): boolean =>
  !fetchedAt || now - fetchedAt > DATA_PRODUCTS_FRESH_MS;
