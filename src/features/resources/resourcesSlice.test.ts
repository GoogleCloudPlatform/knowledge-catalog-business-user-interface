import { configureStore, type AnyAction, type ThunkDispatch } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import userReducer from '../user/userSlice';
import resourcesReducer, {
  searchResourcesByTerm,
  browseResourcesByAspects,
  fetchEntriesByParent,
  setItems,
  setItemsStatus,
  setItemsNextPageSize,
  setItemsPageRequest,
  setItemsRequestData,
  setItemsStoreData,
  resourcesSlice,
} from './resourcesSlice';

// Define the state type
type ResourcesState = {
  items: unknown;
  itemsNextPageSize: number | null;
  itemsRequestData: any | null;
  totalItems?: number;
  itemsStore: unknown[];
  aspectBrowseCache: Record<string, {
    data: unknown[];
    totalSize: number;
    fetchedAt: number;
  }>;
  entryListData: unknown;
  entryListNextPageToken: string;
  totalEntryList?: number;
  entryListStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: any | string | undefined | unknown | null;
  entryListError: any | string | undefined | unknown | null;
  browseSelectedItemName: string | null;
  browseSelectedSubItem: any | null;
  browseTabValue: number;
  browseDynamicAnnotationsData: any[];
  browseSubTypesWithCache: Record<string, boolean>;
};

// Define store type
type RootState = {
  resources: ResourcesState;
  user: any;
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      post: vi.fn(),
      defaults: {
        headers: {
          common: {} as Record<string, string>,
        },
      },
      isCancel: vi.fn().mockReturnValue(false), // Mock isCancel function
    },
  };
});

// Mock URLS
vi.mock('../../constants/urls', () => ({
  URLS: {
    API_URL: 'http://localhost:3000/api/v1',
    SEARCH: '/search',
  },
}));

// Create a typed mock for axios.post
const mockedAxiosPost = axios.post as ReturnType<typeof vi.fn>;

describe('resourcesSlice', () => {
  // Mock session data for localStorage
  const mockSessionData = {
    appConfig: {
      aspects: [
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Test Aspect',
              resource: 'projects/test-project/locations/us-central1/aspectTypes/test-aspect',
            },
          },
        },
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Another Aspect',
              resource: 'projects/another-project/locations/eu-west1/aspectTypes/another-aspect',
            },
          },
        },
      ],
      projects: [
        { name: 'projects/test-project', projectId: 'test-project-id' },
        { name: 'projects/another-project', projectId: 'another-project-id' },
      ],
    },
  };

  // Mock request data
  const mockSearchRequestData = {
    id_token: 'test-token-123',
    term: 'test search term',
  };

  const mockSearchResponse = {
    results: [
      {
        displayName: 'Test Resource 1',
        fullyQualifiedName: 'bigquery:test-project.test-dataset.test-table',
        entryType: 'TABLE',
      },
      {
        displayName: 'Test Resource 2',
        fullyQualifiedName: 'bigquery:test-project.test-dataset.test-table-2',
        entryType: 'TABLE',
      },
    ],
    totalSize: 2,
    nextPageToken: 'next-token-123',
  };

  const mockBrowseRequestData = {
    id_token: 'test-token-123',
    annotationName: 'Test Aspect',
  };

  const mockBrowseResponse = {
    data: [
      { displayName: 'Browse Result 1' },
      { displayName: 'Browse Result 2' },
    ],
    results: { totalSize: 2 },
  };

  const mockFetchEntriesRequestData = {
    id_token: 'test-token-123',
    parent: 'projects/test-project/locations/us-central1/entryGroups/test-group',
  };

  const mockFetchEntriesResponse = {
    data: [
      { name: 'entry-1', displayName: 'Entry 1' },
      { name: 'entry-2', displayName: 'Entry 2' },
    ],
  };

  let store: ReturnType<typeof configureStore<{ resources: ResourcesState; user: any }>>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = configureStore({
      reducer: {
        resources: resourcesReducer,
        user: userReducer as any,
      },
      preloadedState: {
        user: { token: null, userData: mockSessionData, mode: 'light' as const },
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().resources;

      expect(state.items).toEqual([]);
      expect(state.itemsNextPageSize).toBeNull();
      expect(state.itemsRequestData).toBeNull();
      expect(state.totalItems).toBe(0);
      expect(state.itemsStore).toEqual([]);
      expect(state.entryListData).toEqual([]);
      expect(state.entryListNextPageToken).toBe('');
      expect(state.totalEntryList).toBe(0);
      expect(state.entryListStatus).toBe('idle');
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
      expect(state.entryListError).toBeNull();
    });

    it('should return initial state when called with undefined state', () => {
      const state = resourcesReducer(undefined, { type: 'unknown' });

      expect(state.items).toEqual([]);
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
    });
  });

  describe('Slice Configuration', () => {
    it('should have correct slice name', () => {
      expect(resourcesSlice.name).toBe('resources');
    });

    it('should have all synchronous reducers defined', () => {
      expect(resourcesSlice.caseReducers.setItems).toBeDefined();
      expect(resourcesSlice.caseReducers.setItemsStatus).toBeDefined();
      expect(resourcesSlice.caseReducers.setItemsNextPageSize).toBeDefined();
      expect(resourcesSlice.caseReducers.setItemsPageRequest).toBeDefined();
      expect(resourcesSlice.caseReducers.setItemsRequestData).toBeDefined();
      expect(resourcesSlice.caseReducers.setItemsStoreData).toBeDefined();
    });
  });

  describe('Synchronous Reducers', () => {
    describe('setItems', () => {
      it('should set items and status to succeeded', () => {
        const items = [{ name: 'item1' }, { name: 'item2' }];
        const state = resourcesReducer(undefined, setItems(items));

        expect(state.items).toEqual(items);
        expect(state.status).toBe('succeeded');
      });

      it('should replace existing items', () => {
        const initialStateWithItems: ResourcesState = {
          items: [{ old: 'data' }],
          itemsNextPageSize: null,
          itemsRequestData: null,
          totalItems: 1,
          itemsStore: [],
          aspectBrowseCache: {},
          entryListData: [],
          entryListNextPageToken: '',
          totalEntryList: 0,
          entryListStatus: 'idle',
          status: 'loading',
          error: null,
          entryListError: null,
          browseSelectedItemName: null,
          browseSelectedSubItem: null,
          browseTabValue: 0,
          browseDynamicAnnotationsData: [],
          browseSubTypesWithCache: {},
        };

        const newItems = [{ new: 'data' }];
        const state = resourcesReducer(initialStateWithItems, setItems(newItems));

        expect(state.items).toEqual(newItems);
        expect(state.status).toBe('succeeded');
      });
    });

    describe('setItemsStatus', () => {
      it('should set status to loading', () => {
        const state = resourcesReducer(undefined, setItemsStatus('loading'));
        expect(state.status).toBe('loading');
      });

      it('should set status to succeeded', () => {
        const state = resourcesReducer(undefined, setItemsStatus('succeeded'));
        expect(state.status).toBe('succeeded');
      });

      it('should set status to failed', () => {
        const state = resourcesReducer(undefined, setItemsStatus('failed'));
        expect(state.status).toBe('failed');
      });

      it('should set status to idle', () => {
        const state = resourcesReducer(undefined, setItemsStatus('idle'));
        expect(state.status).toBe('idle');
      });
    });

    describe('setItemsNextPageSize', () => {
      it('should set itemsNextPageSize', () => {
        const state = resourcesReducer(undefined, setItemsNextPageSize(20));
        expect(state.itemsNextPageSize).toBe(20);
      });

      it('should set itemsNextPageSize to null', () => {
        const initialStateWithPageSize: ResourcesState = {
          ...resourcesReducer(undefined, { type: 'unknown' }),
          itemsNextPageSize: 20,
        };
        const state = resourcesReducer(initialStateWithPageSize, setItemsNextPageSize(null));
        expect(state.itemsNextPageSize).toBeNull();
      });
    });

    describe('setItemsPageRequest', () => {
      it('should set itemsRequestData', () => {
        const requestData = { query: 'test', pageSize: 20 };
        const state = resourcesReducer(undefined, setItemsPageRequest(requestData));
        expect(state.itemsRequestData).toEqual(requestData);
      });
    });

    describe('setItemsRequestData', () => {
      it('should set itemsRequestData', () => {
        const requestData = { query: 'test query', filters: [] };
        const state = resourcesReducer(undefined, setItemsRequestData(requestData));
        expect(state.itemsRequestData).toEqual(requestData);
      });
    });

    describe('setItemsStoreData', () => {
      it('should set itemsStore', () => {
        const storeData = [{ item: 1 }, { item: 2 }];
        const state = resourcesReducer(undefined, setItemsStoreData(storeData));
        expect(state.itemsStore).toEqual(storeData);
      });

      it('should replace existing itemsStore', () => {
        const initialStateWithStore: ResourcesState = {
          ...resourcesReducer(undefined, { type: 'unknown' }),
          itemsStore: [{ old: 'store' }],
        };
        const newStoreData = [{ new: 'store' }];
        const state = resourcesReducer(initialStateWithStore, setItemsStoreData(newStoreData));
        expect(state.itemsStore).toEqual(newStoreData);
      });
    });
  });

  describe('searchResourcesByTerm Thunk', () => {
    describe('Pending State', () => {
      it('should clear items and set status to loading', () => {
        const action = { type: searchResourcesByTerm.pending.type };
        const state = resourcesReducer(undefined, action);

        expect(state.items).toEqual([]);
        expect(state.status).toBe('loading');
      });
    });

    describe('Fulfilled State', () => {
      it('should update state on fulfilled with response data', () => {
        const payload = {
          data: mockSearchResponse.results,
          requestData: { query: 'test', pageToken: 'token' },
          results: { totalSize: 2, nextPageToken: 'next' },
        };
        const action = {
          type: searchResourcesByTerm.fulfilled.type,
          payload,
        };
        const state = resourcesReducer(undefined, action);

        expect(state.status).toBe('succeeded');
        expect(state.totalItems).toBe(2);
        expect(state.itemsRequestData).toEqual(payload.requestData);
      });

      it('should handle empty array payload', () => {
        const action = {
          type: searchResourcesByTerm.fulfilled.type,
          payload: [],
        };
        const state = resourcesReducer(undefined, action);

        expect(state.status).toBe('succeeded');
        expect(state.items).toEqual([]);
        expect(state.totalItems).toBe(0);
      });

      it('should append to itemsStore on fulfilled', () => {
        const initialStateWithStore: ResourcesState = {
          ...resourcesReducer(undefined, { type: 'unknown' }),
          itemsStore: [{ existing: 'item' }],
        };
        const payload = {
          data: [{ new: 'item' }],
          requestData: {},
          results: { totalSize: 2 },
        };
        const action = {
          type: searchResourcesByTerm.fulfilled.type,
          payload,
        };
        const state = resourcesReducer(initialStateWithStore, action);

        expect(state.itemsStore).toEqual([{ existing: 'item' }, { new: 'item' }]);
      });

      it('should slice itemsStore when itemsNextPageSize is set', () => {
        const initialStateWithPageSize: ResourcesState = {
          ...resourcesReducer(undefined, { type: 'unknown' }),
          itemsNextPageSize: 1,
          itemsStore: [{ item: 1 }, { item: 2 }],
        };
        const payload = {
          data: [{ item: 3 }],
          requestData: {},
          results: { totalSize: 3 },
        };
        const action = {
          type: searchResourcesByTerm.fulfilled.type,
          payload,
        };
        const state = resourcesReducer(initialStateWithPageSize, action);

        // itemsStore now has 3 items, slice from end with pageSize 1
        expect(state.items).toEqual([{ item: 3 }]);
      });
    });

    describe('Rejected State', () => {
      it('should set status to failed and store error', () => {
        const errorMessage = 'Search failed';
        const action = {
          type: searchResourcesByTerm.rejected.type,
          payload: errorMessage,
        };
        const state = resourcesReducer(undefined, action);

        expect(state.status).toBe('failed');
        expect(state.error).toBe(errorMessage);
      });
    });

    describe('Async Thunk Execution', () => {
      it('should make API call when term is empty', async () => {
        mockedAxiosPost.mockRejectedValueOnce(new Error('Request failed'));
        const result = await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm({ id_token: 'token', term: '' })
        );

        expect(result.type).toBe(searchResourcesByTerm.rejected.type);
        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should make API call when term is missing', async () => {
        mockedAxiosPost.mockRejectedValueOnce(new Error('Request failed'));
        const result = await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm({ id_token: 'token' })
        );

        expect(result.type).toBe(searchResourcesByTerm.rejected.type);
        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should set Authorization header with token', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(mockSearchRequestData)
        );

        expect(axios.defaults.headers.common['Authorization']).toBe(
          `Bearer ${mockSearchRequestData.id_token}`
        );
      });

      it('should set empty Authorization header when no token', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm({ term: 'test' })
        );

        expect(axios.defaults.headers.common['Authorization']).toBe('');
      });

      it('should use requestResourceData when provided', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const customRequestData = {
          id_token: 'token',
          term: 'test',
          requestResourceData: { query: 'custom query', pageSize: 50 },
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(customRequestData)
        );

        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.any(String),
          customRequestData.requestResourceData
        );
      });

      it('should handle filters with aspectType', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithFilters = {
          id_token: 'token',
          term: 'test',
          filters: [{ type: 'aspectType', name: 'Test Aspect' }],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithFilters)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle filters with system', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithFilters = {
          id_token: 'token',
          term: 'test',
          filters: [{ type: 'system', name: 'BigQuery' }],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithFilters)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle filters with typeAliases', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithFilters = {
          id_token: 'token',
          term: 'test',
          filters: [{ type: 'typeAliases', name: 'Table' }],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithFilters)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle exchange typeAlias specially', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithExchange = {
          id_token: 'token',
          term: 'test',
          filters: [{ type: 'typeAliases', name: 'Exchange' }],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithExchange)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle filters with project', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithFilters = {
          id_token: 'token',
          term: 'test',
          filters: [{ type: 'project', name: 'test-project' }],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithFilters)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle semantic search flag', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const semanticSearchRequest = {
          id_token: 'token',
          term: 'test',
          semanticSearch: true,
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(semanticSearchRequest)
        );

        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            semanticSearch: true,
            pageSize: 100,
            orderBy: 'relevance',
          })
        );
      });

      it('should handle aspectType filter with subAnnotationData', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithSubAnnotation = {
          id_token: 'token',
          term: 'test',
          filters: [
            {
              type: 'aspectType',
              name: 'Test Aspect',
              subAnnotationData: [
                { fieldName: 'field1', enabled: true, filterType: 'include', value: 'value1' },
              ],
            },
          ],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithSubAnnotation)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle aspectType filter with subAnnotationData and exclude filterType', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithExclude = {
          id_token: 'token',
          term: 'test',
          filters: [
            {
              type: 'aspectType',
              name: 'Test Aspect',
              subAnnotationData: [
                { fieldName: 'field1', enabled: true, filterType: 'exclude', value: 'value1' },
              ],
            },
          ],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithExclude)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle semantic search with aspectType filter', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const semanticWithAspect = {
          id_token: 'token',
          term: 'test',
          semanticSearch: true,
          filters: [{ type: 'aspectType', name: 'Test Aspect' }],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(semanticWithAspect)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle semantic search with subAnnotationData', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const semanticWithSubAnnotation = {
          id_token: 'token',
          term: 'test',
          semanticSearch: true,
          filters: [
            {
              type: 'aspectType',
              name: 'Test Aspect',
              subAnnotationData: [
                { fieldName: 'field1', enabled: true, filterType: 'include', value: 'value1' },
              ],
            },
          ],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(semanticWithSubAnnotation)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should handle nextPageToken in request', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithPageToken = {
          id_token: 'token',
          term: 'test',
          nextPageToken: 'page-token-123',
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithPageToken)
        );

        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            pageToken: 'page-token-123',
          })
        );
      });

      it('should handle AxiosError with response data', async () => {
        const errorResponse = { message: 'Bad request' };
        const axiosError = new AxiosError(
          'Request failed',
          'ERR_BAD_REQUEST',
          undefined,
          undefined,
          {
            data: errorResponse,
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            config: { headers: new AxiosHeaders() },
          }
        );

        mockedAxiosPost.mockRejectedValueOnce(axiosError);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(mockSearchRequestData)
        );

        const state = store.getState().resources;
        expect(state.status).toBe('failed');
        expect(state.error).toEqual(errorResponse);
      });

      it('should handle AxiosError without response data', async () => {
        const axiosError = new AxiosError('Network Error', 'ERR_NETWORK');

        mockedAxiosPost.mockRejectedValueOnce(axiosError);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(mockSearchRequestData)
        );

        const state = store.getState().resources;
        expect(state.status).toBe('failed');
        expect(state.error).toBe('Network Error');
      });

      it('should handle non-Axios error', async () => {
        mockedAxiosPost.mockRejectedValueOnce(new Error('Generic error'));

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(mockSearchRequestData)
        );

        const state = store.getState().resources;
        expect(state.status).toBe('failed');
        expect(state.error).toBe('An unknown error occurred');
      });

      it('should handle multiple filters at once', async () => {
        mockedAxiosPost.mockResolvedValueOnce({
          status: 200,
          data: mockSearchResponse,
        });

        const requestWithMultipleFilters = {
          id_token: 'token',
          term: 'test',
          filters: [
            { type: 'aspectType', name: 'Test Aspect' },
            { type: 'system', name: 'BigQuery' },
            { type: 'typeAliases', name: 'Table' },
            { type: 'project', name: 'test-project' },
          ],
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          searchResourcesByTerm(requestWithMultipleFilters)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });
    });
  });

  describe('browseResourcesByAspects Thunk', () => {
    describe('Pending State', () => {
      it('should clear items and set status to loading', () => {
        const action = { type: browseResourcesByAspects.pending.type };
        const state = resourcesReducer(undefined, action);

        expect(state.items).toEqual([]);
        expect(state.status).toBe('loading');
      });
    });

    describe('Fulfilled State', () => {
      it('should update state on fulfilled', () => {
        const action = {
          type: browseResourcesByAspects.fulfilled.type,
          payload: mockBrowseResponse,
        };
        const state = resourcesReducer(undefined, action);

        expect(state.status).toBe('succeeded');
        expect(state.totalItems).toBe(2);
      });

      it('should append to itemsStore on fulfilled', () => {
        const initialStateWithStore: ResourcesState = {
          ...resourcesReducer(undefined, { type: 'unknown' }),
          itemsStore: [{ existing: 'item' }],
        };
        const action = {
          type: browseResourcesByAspects.fulfilled.type,
          payload: mockBrowseResponse,
        };
        const state = resourcesReducer(initialStateWithStore, action);

        expect(state.itemsStore.length).toBeGreaterThan(1);
      });
    });

    describe('Rejected State', () => {
      it('should set status to failed and store error', () => {
        const errorMessage = 'Browse failed';
        const action = {
          type: browseResourcesByAspects.rejected.type,
          payload: errorMessage,
        };
        const state = resourcesReducer(undefined, action);

        expect(state.status).toBe('failed');
        expect(state.error).toBe(errorMessage);
      });
    });

    describe('Async Thunk Execution', () => {
      it('should make API call with correct query', async () => {
        mockedAxiosPost.mockResolvedValueOnce({ data: mockBrowseResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          browseResourcesByAspects(mockBrowseRequestData)
        );

        expect(mockedAxiosPost).toHaveBeenCalledWith(
          'http://localhost:3000/api/v1/search',
          expect.objectContaining({
            query: expect.any(String),
          }),
          expect.objectContaining({
            signal: expect.anything(), // AbortSignal from thunk
          })
        );
      });

      it('should set Authorization header', async () => {
        mockedAxiosPost.mockResolvedValueOnce({ data: mockBrowseResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          browseResourcesByAspects(mockBrowseRequestData)
        );

        expect(axios.defaults.headers.common['Authorization']).toBe(
          `Bearer ${mockBrowseRequestData.id_token}`
        );
      });

      it('should handle subAnnotationName', async () => {
        mockedAxiosPost.mockResolvedValueOnce({ data: mockBrowseResponse });

        const requestWithSubAnnotation = {
          id_token: 'token',
          annotationName: 'Test Aspect',
          subAnnotationName: 'subField',
        };

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          browseResourcesByAspects(requestWithSubAnnotation)
        );

        expect(mockedAxiosPost).toHaveBeenCalled();
      });

      it('should reject with error when annotationName is empty', async () => {
        const result = await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          browseResourcesByAspects({ id_token: 'token', annotationName: '' })
        );

        expect(result.payload).toBe('Invalid annotation name');
      });

      it('should reject with error when annotationName is missing', async () => {
        const result = await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          browseResourcesByAspects({ id_token: 'token' })
        );

        expect(result.payload).toBe('Invalid annotation name');
      });

      it('should handle AxiosError', async () => {
        const axiosError = new AxiosError(
          'Request failed',
          'ERR_BAD_REQUEST',
          undefined,
          undefined,
          {
            data: { message: 'Error' },
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            config: { headers: new AxiosHeaders() },
          }
        );

        mockedAxiosPost.mockRejectedValueOnce(axiosError);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          browseResourcesByAspects(mockBrowseRequestData)
        );

        const state = store.getState().resources;
        expect(state.status).toBe('failed');
      });

      it('should handle Error instance', async () => {
        const error = new Error('Something went wrong');

        mockedAxiosPost.mockRejectedValueOnce(error);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          browseResourcesByAspects(mockBrowseRequestData)
        );

        const state = store.getState().resources;
        expect(state.status).toBe('failed');
      });

      it('should handle unknown error', async () => {
        mockedAxiosPost.mockRejectedValueOnce('string error');

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          browseResourcesByAspects(mockBrowseRequestData)
        );

        const state = store.getState().resources;
        expect(state.status).toBe('failed');
        expect(state.error).toBe('An unknown error occurred');
      });
    });
  });

  describe('fetchEntriesByParent Thunk', () => {
    describe('Pending State', () => {
      it('should set entryListStatus to loading', () => {
        const action = { type: fetchEntriesByParent.pending.type };
        const state = resourcesReducer(undefined, action);

        expect(state.entryListStatus).toBe('loading');
      });
    });

    describe('Fulfilled State', () => {
      it('should update entryListData and set entryListStatus to succeeded', () => {
        const action = {
          type: fetchEntriesByParent.fulfilled.type,
          payload: mockFetchEntriesResponse,
        };
        const state = resourcesReducer(undefined, action);

        expect(state.entryListStatus).toBe('succeeded');
        expect(state.entryListData).toEqual(mockFetchEntriesResponse.data);
      });

      it('should handle payload without data', () => {
        const action = {
          type: fetchEntriesByParent.fulfilled.type,
          payload: {},
        };
        const state = resourcesReducer(undefined, action);

        expect(state.entryListStatus).toBe('succeeded');
        expect(state.entryListData).toEqual([]);
      });
    });

    describe('Rejected State', () => {
      it('should set entryListStatus to failed and store error', () => {
        const errorMessage = 'Fetch entries failed';
        const action = {
          type: fetchEntriesByParent.rejected.type,
          payload: errorMessage,
        };
        const state = resourcesReducer(undefined, action);

        expect(state.entryListStatus).toBe('failed');
        expect(state.entryListError).toBe(errorMessage);
      });
    });

    describe('Async Thunk Execution', () => {
      it('should return empty array when parent is missing', async () => {
        const result = await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          fetchEntriesByParent({ id_token: 'token' })
        );

        expect(result.payload).toEqual([]);
        expect(mockedAxiosPost).not.toHaveBeenCalled();
      });

      it('should return empty array when parent is empty', async () => {
        const result = await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          fetchEntriesByParent({ id_token: 'token', parent: '' })
        );

        expect(result.payload).toEqual([]);
        expect(mockedAxiosPost).not.toHaveBeenCalled();
      });

      it('should make API call with correct query', async () => {
        mockedAxiosPost.mockResolvedValueOnce({ data: mockFetchEntriesResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          fetchEntriesByParent(mockFetchEntriesRequestData)
        );

        expect(mockedAxiosPost).toHaveBeenCalledWith(
          'http://localhost:3000/api/v1/search',
          { query: `parent=${mockFetchEntriesRequestData.parent}` }
        );
      });

      it('should set Authorization header', async () => {
        mockedAxiosPost.mockResolvedValueOnce({ data: mockFetchEntriesResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          fetchEntriesByParent(mockFetchEntriesRequestData)
        );

        expect(axios.defaults.headers.common['Authorization']).toBe(
          `Bearer ${mockFetchEntriesRequestData.id_token}`
        );
      });

      it('should set empty Authorization header when no token', async () => {
        mockedAxiosPost.mockResolvedValueOnce({ data: mockFetchEntriesResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          fetchEntriesByParent({ parent: 'test-parent' })
        );

        expect(axios.defaults.headers.common['Authorization']).toBe('');
      });

      it('should handle AxiosError with response', async () => {
        const axiosError = new AxiosError(
          'Request failed',
          'ERR_BAD_REQUEST',
          undefined,
          undefined,
          {
            data: { message: 'Not found' },
            status: 404,
            statusText: 'Not Found',
            headers: {},
            config: { headers: new AxiosHeaders() },
          }
        );

        mockedAxiosPost.mockRejectedValueOnce(axiosError);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          fetchEntriesByParent(mockFetchEntriesRequestData)
        );

        const state = store.getState().resources;
        expect(state.entryListStatus).toBe('failed');
        expect(state.entryListError).toEqual({ message: 'Not found' });
      });

      it('should handle AxiosError without response', async () => {
        const axiosError = new AxiosError('Network Error', 'ERR_NETWORK');

        mockedAxiosPost.mockRejectedValueOnce(axiosError);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          fetchEntriesByParent(mockFetchEntriesRequestData)
        );

        const state = store.getState().resources;
        expect(state.entryListStatus).toBe('failed');
        expect(state.entryListError).toBe('Network Error');
      });

      it('should handle non-Axios error', async () => {
        mockedAxiosPost.mockRejectedValueOnce(new Error('Unknown'));

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          fetchEntriesByParent(mockFetchEntriesRequestData)
        );

        const state = store.getState().resources;
        expect(state.entryListStatus).toBe('failed');
        expect(state.entryListError).toBe('An unknown error occurred');
      });
    });
  });

  describe('State Transitions', () => {
    it('should handle complete search flow: idle -> loading -> succeeded', async () => {
      mockedAxiosPost.mockResolvedValueOnce({
        status: 200,
        data: mockSearchResponse,
      });

      expect(store.getState().resources.status).toBe('idle');

      const promise = (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        searchResourcesByTerm(mockSearchRequestData)
      );

      expect(store.getState().resources.status).toBe('loading');

      await promise;

      expect(store.getState().resources.status).toBe('succeeded');
    });

    it('should handle complete search flow: idle -> loading -> failed', async () => {
      mockedAxiosPost.mockRejectedValueOnce(new Error('Failed'));

      expect(store.getState().resources.status).toBe('idle');

      const promise = (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        searchResourcesByTerm(mockSearchRequestData)
      );

      expect(store.getState().resources.status).toBe('loading');

      await promise;

      expect(store.getState().resources.status).toBe('failed');
    });

    it('should handle complete fetchEntriesByParent flow', async () => {
      mockedAxiosPost.mockResolvedValueOnce({ data: mockFetchEntriesResponse });

      expect(store.getState().resources.entryListStatus).toBe('idle');

      const promise = (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        fetchEntriesByParent(mockFetchEntriesRequestData)
      );

      expect(store.getState().resources.entryListStatus).toBe('loading');

      await promise;

      expect(store.getState().resources.entryListStatus).toBe('succeeded');
    });
  });

  describe('getAspectName helper function behavior', () => {
    it('should read appConfig from Redux state instead of localStorage', async () => {
      mockedAxiosPost.mockResolvedValueOnce({ data: mockBrowseResponse });

      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        browseResourcesByAspects(mockBrowseRequestData)
      );

      // Thunk should read from Redux state, not localStorage
      expect(mockLocalStorage.getItem).not.toHaveBeenCalledWith('sessionUserData');
      expect(mockedAxiosPost).toHaveBeenCalled();
    });

    it('should handle missing userData in Redux state', async () => {
      // Create a store without userData
      const storeWithoutUserData = configureStore({
        reducer: {
          resources: resourcesReducer,
          user: userReducer,
        },
        preloadedState: {
          user: { token: null, userData: null, mode: 'light' as const },
        },
      });

      // This should not throw an error
      await (storeWithoutUserData.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        browseResourcesByAspects(mockBrowseRequestData)
      );

      expect(storeWithoutUserData.getState().resources.status).toBe('failed');
    });
  });
});
