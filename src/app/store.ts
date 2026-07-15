import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './api/apiSlice';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import userReducer, { setCredentials } from '../features/user/userSlice';
import searchReducer from '../features/search/searchSlice';
import resourcesReducer from '../features/resources/resourcesSlice';
import entryReducer from '../features/entry/entrySlice';
import sampleDataReducer from '../features/sample-data/sampleDataSlice';
import dataScanReducer from '../features/dataScan/dataScanSlice';
import lineageReducer from '../features/lineage/lineageSlice';
import projectsReducer from '../features/projects/projectsSlice';
import glossariesReducer from '../features/glossaries/glossariesSlice';
import dataProductsReducer from '../features/dataProducts/dataProductsSlice';
import { loadStateFromStorage, saveStateToStorage, saveUserState, loadUserState } from '../utils/persistence';
import { authMiddleware } from '../middleware/authMiddleware';
import insightsReducer from '../features/tableInsights/tableInsightsSlice';

// Load persisted state from localStorage (for search, resources, entry)
const persistedState = loadStateFromStorage();

const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    user: userReducer,
    search: searchReducer,
    resources: resourcesReducer,
    entry: entryReducer,
    sampleData: sampleDataReducer,
    dataScan: dataScanReducer,
    lineage: lineageReducer,
    projects: projectsReducer,
    glossaries: glossariesReducer,
    dataProducts: dataProductsReducer,
    insights: insightsReducer,
  },
  preloadedState: persistedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, authMiddleware),
});

// Subscribe to store changes and persist
store.subscribe(() => {
  const state = store.getState();
  saveStateToStorage(state);  // search, resources, entry → localStorage
  saveUserState(state.user);  // user slice → IndexedDB
});

// Hydrate user state from IndexedDB (async — call before first render)
export const hydrateUserState = async () => {
  const persisted = await loadUserState();
  if (persisted) {
    store.dispatch(setCredentials({
      token: persisted.token,
      user: persisted.userData,
    }));
  }
};

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
