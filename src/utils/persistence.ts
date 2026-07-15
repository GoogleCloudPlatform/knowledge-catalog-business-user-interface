import localforage from 'localforage';

// Redux state persistence utilities
// Define the state structure locally to avoid circular imports
type PersistedState = {
  search?: any;
  resources?: any;
  entry?: any;
};

// Keys for localStorage
const PERSISTENCE_KEYS = {
  SEARCH: 'searchState',
  RESOURCES: 'resourcesState',
  ENTRY: 'entryState',
} as const;

// Define which parts of the state should be persisted
export const PERSISTED_STATE_KEYS = [
  'search',
  'resources', 
  'entry'
] as const;

// Save state to localStorage
export const saveStateToStorage = (state: PersistedState) => {
  try {
    // Save search state
    if (state.search) {
      localStorage.setItem(PERSISTENCE_KEYS.SEARCH, JSON.stringify(state.search));
    }
    
    // Save resources state
    if (state.resources) {
      localStorage.setItem(PERSISTENCE_KEYS.RESOURCES, JSON.stringify(state.resources));
    }
    
    // Save entry state (but not history to avoid circular references)
    if (state.entry) {
      const entryStateToSave = {
        ...state.entry,
        history: [] // Don't persist history
      };
      localStorage.setItem(PERSISTENCE_KEYS.ENTRY, JSON.stringify(entryStateToSave));
    }
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
};

// Load state from localStorage
export const loadStateFromStorage = (): PersistedState => {
  try {
    const searchState = localStorage.getItem(PERSISTENCE_KEYS.SEARCH);
    const resourcesState = localStorage.getItem(PERSISTENCE_KEYS.RESOURCES);
    const entryState = localStorage.getItem(PERSISTENCE_KEYS.ENTRY);

    const persistedState: PersistedState = {};

    if (searchState) {
      persistedState.search = JSON.parse(searchState);
    }

    if (resourcesState) {
      persistedState.resources = JSON.parse(resourcesState);
    }

    if (entryState) {
      const parsed = JSON.parse(entryState);
      // Ensure accessCheckCache always exists (may be missing from older persisted state)
      if (!parsed.accessCheckCache) {
        parsed.accessCheckCache = {};
      }
      persistedState.entry = parsed;
    }

    return persistedState;
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
    return {};
  }
};

// Clear persisted state
export const clearPersistedState = () => {
  try {
    Object.values(PERSISTENCE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear persisted state:', error);
  }
};

// --- User state persistence via IndexedDB (localforage) ---
// Token is stored in IndexedDB instead of localStorage so it is not
// trivially visible in DevTools → Local Storage.

const userStorage = localforage.createInstance({
  name: 'data-discovery-studio',
  storeName: 'user',
  driver: [localforage.INDEXEDDB, localforage.WEBSQL],
});

// Migration: remove stale redux-persist entry from localStorage
try { localStorage.removeItem('persist:user'); } catch { /* ignore */ }

export const saveUserState = (userState: any) => {
  userStorage.setItem('userState', userState).catch((err) =>
    console.warn('Failed to save user state to IndexedDB:', err)
  );
};

export const loadUserState = async (): Promise<any> => {
  try {
    return await userStorage.getItem('userState');
  } catch (err) {
    console.warn('Failed to load user state from IndexedDB:', err);
    return null;
  }
};

export const clearUserState = async () => {
  try {
    await userStorage.removeItem('userState');
  } catch (err) {
    console.warn('Failed to clear user state from IndexedDB:', err);
  }
};
