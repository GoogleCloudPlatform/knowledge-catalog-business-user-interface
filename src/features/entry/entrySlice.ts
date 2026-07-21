import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { URLS } from '../../constants/urls';
import axios, { AxiosError } from 'axios';
import type { GlossaryItem } from '../../component/Glossaries/GlossaryDataType';

// The Dataplex Node.js client returns Timestamp fields as { seconds, nanos }
// when JSON-serialized, while the REST API returns ISO strings. Handle both.
const toEpochSeconds = (t: any): number => {
  if (!t) return 0;
  if (typeof t === 'string') {
    const ms = new Date(t).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
  }
  if (typeof t === 'object' && t.seconds !== undefined) {
    return Number(t.seconds) || 0;
  }
  return 0;
};

const mapTermEntryToGlossaryItem = (entry: any): GlossaryItem => {
  const src = entry?.entrySource || {};
  const updateTimeSec = toEpochSeconds(entry?.updateTime ?? src?.updateTime);
  return {
    id: entry?.name,
    type: 'term',
    displayName: src.displayName || 'Untitled',
    description: src.description || '',
    lastModified: updateTimeSec,
    labels: src.labels
      ? Object.keys(src.labels).map((k) => `${k}:${src.labels[k]}`)
      : [],
    entryType: entry?.entryType,
    linkedPaths: entry?.linkedPaths || [],
  };
};

// createAsyncThunk is used for asynchronous actions.
// It will automatically dispatch pending, fulfilled, and rejected actions.
export const fetchEntry = createAsyncThunk('entry/fetchEntry', async (requestData: any , { rejectWithValue }) => {
  // If the search term is empty, we are returning an empty list.
  if (!requestData) {
    return [];
  }

  // If the term is not empty, we will perform a search.
  try {
    // search from your API endpoint 
    axios.defaults.headers.common['Authorization'] = requestData.id_token ? `Bearer ${requestData.id_token}` : '';
    const entryName = requestData.entryName
    
    const response = await axios.get(URLS.API_URL + URLS.GET_ENTRY + `?entryName=${entryName}`);
    const data = await response.data;
    return data;
    //return mockSearchData; // For testing, we return mock data

  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 403) {
        return rejectWithValue({
          type: 'PERMISSION_DENIED',
          message: "You don't have access to this resource",
        });
      }
      return rejectWithValue(error.response?.data || error.message);
    }
    return rejectWithValue('An unknown error occurred');
  }
});

export const fetchLineageEntry = createAsyncThunk('entry/fetchLineageEntry', async (requestData: any , { rejectWithValue }) => {
  // If the search term is empty, we are returning an empty list.
  if (!requestData) {
    return [];
  }

  // If the term is not empty, we will perform a search.
  try {
    // search from your API endpoint
    axios.defaults.headers.common['Authorization'] = requestData.id_token ? `Bearer ${requestData.id_token}` : '';
    const fqn = requestData.fqn

    const response = await axios.get(URLS.API_URL + URLS.GET_ENTRY_BY_FQN + `?fqn=${fqn}`);
    const data = await response.data;
    return data;
    //return mockSearchData; // For testing, we return mock data

  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 403) {
        return rejectWithValue({
          type: 'PERMISSION_DENIED',
          message: "You don't have access to this resource",
        });
      }
      return rejectWithValue(error.response?.data || error.message);
    }
    return rejectWithValue('An unknown error occurred');
  }
});

export const fetchEntryLinks = createAsyncThunk(
  'entry/fetchEntryLinks',
  async (requestData: { entryName: string; id_token: string }, { rejectWithValue }) => {
    try {
      axios.defaults.headers.common['Authorization'] = requestData.id_token
        ? `Bearer ${requestData.id_token}` : '';

      const response = await axios.get(
        URLS.API_URL + URLS.LOOKUP_ENTRY_LINKS + `?entryName=${encodeURIComponent(requestData.entryName)}`
      );

      // Backend returns { entryLinks: [...], terms: [...dataplexEntries with linkedPaths] }
      const termEntries: any[] = response.data?.terms || [];
      return termEntries.map(mapTermEntryToGlossaryItem);
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          return rejectWithValue({
            type: 'PERMISSION_DENIED',
            message: "You don't have access to this resource",
          });
        }
        return rejectWithValue(error.response?.data || error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const checkEntryAccess = createAsyncThunk(
  'entry/checkEntryAccess',
  async (requestData: { entryName: string; id_token: string }, { rejectWithValue }) => {
    if (!requestData) return rejectWithValue('No request data provided');
    try {
      axios.defaults.headers.common['Authorization'] = requestData.id_token
        ? `Bearer ${requestData.id_token}` : '';
      const response = await axios.get(
        URLS.API_URL + URLS.CHECK_ENTRY_ACCESS + `?entryName=${requestData.entryName}`
      );
      return { entryName: requestData.entryName, data: response.data };
    } catch (error) {
      if (error instanceof AxiosError) {
        return rejectWithValue({ entryName: requestData.entryName, error: error.response?.data || error.message });
      }
      return rejectWithValue({ entryName: requestData.entryName, error: 'An unknown error occurred' });
    }
  }
);

type EntryState = {
  items: unknown; // Replace 'unknown' with your actual resource type
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | undefined | unknown | null;
  lineageEntryItems: unknown; // Replace 'unknown' with your actual resource type
  lineageEntrystatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  lineageEntryError: string | undefined | unknown | null;
  lineageToEntryCopy: boolean;
  history: unknown[]; // Stack to track previous entries
  tabHistory: (string | null)[]; // Parallel stack: tab name active when each history entry was pushed
  pendingTabName: string | null; // Tab name to restore after popFromHistory (consumed by ViewDetails)
  accessCheckCache: Record<string, { status: 'loading' | 'succeeded' | 'failed'; error?: unknown }>;
  entryLinks: GlossaryItem[];
  entryLinksStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  entryLinksError: unknown | null;
};

const initialState: EntryState = {
  items: [],
  status: 'idle',
  error: null,
  lineageEntryItems: [],
  lineageEntrystatus: 'idle',
  lineageEntryError: null,
  lineageToEntryCopy:false,
  history: [],
  tabHistory: [],
  pendingTabName: null,
  accessCheckCache: {},
  entryLinks: [],
  entryLinksStatus: 'idle',
  entryLinksError: null,
};

// createSlice generates actions and reducers for a slice of the Redux state.
export const entrySlice = createSlice({
  name: 'entry',
  initialState,
  reducers: {
    setEntry: (state, action) => {
      state.items = action.payload;
      state.status = 'succeeded';
    },
    setLineageToEntryCopy: (state, action) => {
      state.lineageToEntryCopy = action.payload;
    },
    pushToHistory: (state, action: PayloadAction<string | undefined>) => {
      // Push current entry to history before setting new entry.
      // Optional payload = the tab name active when leaving, so back can restore it.
      if (state.items && Object.keys(state.items).length > 0) {
        state.history.push(state.items);
        state.tabHistory.push(action.payload ?? null);
      }
    },
    popFromHistory: (state) => {
      // Pop the last entry from history and set it as current
      if (state.history.length > 0) {
        state.items = state.history.pop();
        state.status = 'succeeded';
        // Restore the tab that was active for this entry (consumed by ViewDetails).
        state.pendingTabName = state.tabHistory.length > 0 ? (state.tabHistory.pop() ?? null) : null;
      }
    },
    clearHistory: (state) => {
      state.history = [];
      state.tabHistory = [];
      state.pendingTabName = null;
    },
    clearPendingTab: (state) => {
      state.pendingTabName = null;
    },
    resetAccessCheck: (state) => {
      state.accessCheckCache = {};
    },
  },
  // The `extraReducers` field lets the slice handle actions defined elsewhere,
  // including actions generated by createAsyncThunk.
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntry.pending, (state) => {
        state.status = 'loading';
        // Clear prior entry's linked terms so they don't flash for the new entry
        state.entryLinks = [];
        state.entryLinksStatus = 'idle';
        state.entryLinksError = null;
      })
      .addCase(fetchEntry.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchEntry.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchLineageEntry.pending, (state) => {
        state.lineageEntrystatus = 'loading';
        if(state.lineageToEntryCopy){
          state.status = 'loading';
        }
      })
      .addCase(fetchLineageEntry.fulfilled, (state, action) => {
        state.lineageEntrystatus = 'succeeded';
        state.lineageEntryItems = action.payload;
        // Also store in items so ViewDetails can access it
        if(state.lineageToEntryCopy){
          state.items = action.payload;
          state.status = 'succeeded';
          state.lineageToEntryCopy = false;
        }
      })
      .addCase(fetchLineageEntry.rejected, (state, action) => {
        state.lineageEntrystatus = 'failed';
        state.lineageEntryError = action.payload;
        if(state.lineageToEntryCopy){
          state.status = 'failed';
          state.error = action.payload;
          state.lineageToEntryCopy = false;
        }
      })
      .addCase(fetchEntryLinks.pending, (state) => {
        state.entryLinksStatus = 'loading';
        state.entryLinksError = null;
      })
      .addCase(fetchEntryLinks.fulfilled, (state, action) => {
        state.entryLinksStatus = 'succeeded';
        state.entryLinks = action.payload as GlossaryItem[];
      })
      .addCase(fetchEntryLinks.rejected, (state, action) => {
        state.entryLinksStatus = 'failed';
        state.entryLinksError = action.payload;
        state.entryLinks = [];
      })
      .addCase(checkEntryAccess.pending, (state, action) => {
        state.accessCheckCache[action.meta.arg.entryName] = { status: 'loading' };
      })
      .addCase(checkEntryAccess.fulfilled, (state, action) => {
        state.accessCheckCache[action.payload.entryName] = { status: 'succeeded' };
      })
      .addCase(checkEntryAccess.rejected, (state, action) => {
        const entryName = (action.payload as any)?.entryName || action.meta.arg.entryName;
        state.accessCheckCache[entryName] = {
          status: 'failed',
          error: (action.payload as any)?.error || action.error,
        };
      });
  },
});

export const { setEntry, pushToHistory, popFromHistory, clearHistory, clearPendingTab, resetAccessCheck } = entrySlice.actions;
export default entrySlice.reducer;