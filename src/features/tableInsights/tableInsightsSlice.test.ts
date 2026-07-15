import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import insightsReducer, {
  fetchInsights,
  clearInsightsData,
  clearAllInsightsData,
  selectInsightsData,
  selectInsightsStatus,
  selectInsightsError,
  selectIsInsightsLoading,
  selectInsightsGlobalStatus,
} from './tableInsightsSlice';
import type { InsightJob } from '../../mocks/insightsMockData';

// ============================================================================
// Mock Setup
// ============================================================================

const mockAxiosGet = vi.fn();

vi.mock('axios', () => ({
  default: {
    get: (...args: any[]) => mockAxiosGet(...args),
    defaults: { headers: { common: {} } },
  },
  AxiosError: class AxiosError extends Error {
    response?: { data: unknown };
    constructor(message: string) {
      super(message);
      this.name = 'AxiosError';
    }
  },
}));

// ============================================================================
// Test Utilities
// ============================================================================

const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: { insights: insightsReducer },
    preloadedState: preloadedState ? { insights: preloadedState } : undefined,
  });
};

const createMockInsightJob = (overrides: Partial<InsightJob> = {}): InsightJob => ({
  name: 'projects/test/locations/us-central1/dataScans/scan-id/jobs/job-id',
  uid: 'test-job-uid',
  startTime: '2026-02-05T12:11:36.626112533Z',
  endTime: '2026-02-05T12:12:23.122921884Z',
  state: 'SUCCEEDED',
  type: 'DATA_DOCUMENTATION',
  createTime: '2026-02-05T12:11:36.626050423Z',
  dataDocumentationSpec: { catalogPublishingEnabled: true },
  dataDocumentationResult: {
    tableResult: {
      name: 'test-table',
      overview: 'Test table description',
      schema: { fields: [{ name: 'col1', description: 'Column 1' }] },
      queries: [{ sql: 'SELECT * FROM table', description: 'Get all records' }],
    },
  },
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('tableInsightsSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('Initial State', () => {
    it('returns correct initial state', () => {
      const store = createTestStore();
      const state = store.getState().insights;

      expect(state.insightsByResource).toEqual({});
      expect(state.loadingResources).toEqual([]);
      expect(state.globalStatus).toBe('idle');
      expect(state.error).toBeNull();
    });

    it('has correct slice name', () => {
      const store = createTestStore();
      expect(store.getState()).toHaveProperty('insights');
    });
  });

  // ==========================================================================
  // Synchronous Reducers
  // ==========================================================================

  describe('Synchronous Reducers', () => {
    describe('clearInsightsData', () => {
      it('removes insights for specific resourceId', () => {
        const store = createTestStore({
          insightsByResource: {
            'resource-1': { jobs: [], lastFetched: Date.now(), status: 'succeeded', error: null },
            'resource-2': { jobs: [], lastFetched: Date.now(), status: 'succeeded', error: null },
          },
          loadingResources: ['resource-1'],
          globalStatus: 'succeeded',
          error: null,
        });

        store.dispatch(clearInsightsData('resource-1'));

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1']).toBeUndefined();
        expect(state.insightsByResource['resource-2']).toBeDefined();
      });

      it('removes resourceId from loadingResources', () => {
        const store = createTestStore({
          insightsByResource: {
            'resource-1': { jobs: [], lastFetched: Date.now(), status: 'loading', error: null },
          },
          loadingResources: ['resource-1', 'resource-2'],
          globalStatus: 'loading',
          error: null,
        });

        store.dispatch(clearInsightsData('resource-1'));

        const state = store.getState().insights;
        expect(state.loadingResources).not.toContain('resource-1');
        expect(state.loadingResources).toContain('resource-2');
      });

      it('does not affect other resources', () => {
        const resource2Data = { jobs: [createMockInsightJob()], lastFetched: Date.now(), status: 'succeeded' as const, error: null };
        const store = createTestStore({
          insightsByResource: {
            'resource-1': { jobs: [], lastFetched: Date.now(), status: 'succeeded', error: null },
            'resource-2': resource2Data,
          },
          loadingResources: [],
          globalStatus: 'succeeded',
          error: null,
        });

        store.dispatch(clearInsightsData('resource-1'));

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-2'].jobs).toHaveLength(1);
      });
    });

    describe('clearAllInsightsData', () => {
      it('clears all insightsByResource', () => {
        const store = createTestStore({
          insightsByResource: {
            'resource-1': { jobs: [], lastFetched: Date.now(), status: 'succeeded', error: null },
            'resource-2': { jobs: [], lastFetched: Date.now(), status: 'succeeded', error: null },
          },
          loadingResources: [],
          globalStatus: 'succeeded',
          error: null,
        });

        store.dispatch(clearAllInsightsData());

        const state = store.getState().insights;
        expect(state.insightsByResource).toEqual({});
      });

      it('clears loadingResources array', () => {
        const store = createTestStore({
          insightsByResource: {},
          loadingResources: ['resource-1', 'resource-2'],
          globalStatus: 'loading',
          error: null,
        });

        store.dispatch(clearAllInsightsData());

        const state = store.getState().insights;
        expect(state.loadingResources).toEqual([]);
      });

      it('resets globalStatus to idle', () => {
        const store = createTestStore({
          insightsByResource: {},
          loadingResources: [],
          globalStatus: 'succeeded',
          error: null,
        });

        store.dispatch(clearAllInsightsData());

        const state = store.getState().insights;
        expect(state.globalStatus).toBe('idle');
      });

      it('clears error', () => {
        const store = createTestStore({
          insightsByResource: {},
          loadingResources: [],
          globalStatus: 'failed',
          error: 'Some error',
        });

        store.dispatch(clearAllInsightsData());

        const state = store.getState().insights;
        expect(state.error).toBeNull();
      });
    });
  });

  // ==========================================================================
  // fetchInsights Thunk
  // ==========================================================================

  describe('fetchInsights Thunk', () => {
    describe('Condition Check', () => {
      it('does not make API call when resourceId is missing', async () => {
        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: '', id_token: 'token', scanName: 'scan' })
        );

        // Should not make API call due to condition check
        expect(mockAxiosGet).not.toHaveBeenCalled();
      });

      it('handles missing scanName gracefully', async () => {
        mockAxiosGet.mockResolvedValueOnce({ data: [] });
        const store = createTestStore();

        const result = await store.dispatch(
          fetchInsights({ resourceId: 'resource', id_token: 'token', scanName: '' })
        );

        // The thunk checks params and returns early if invalid
        expect(result.payload).toEqual({ resourceId: '', data: null });
      });

      it('handles missing id_token gracefully', async () => {
        const store = createTestStore();

        const result = await store.dispatch(
          fetchInsights({ resourceId: 'resource', id_token: '', scanName: 'scan' })
        );

        expect(result.payload).toEqual({ resourceId: '', data: null });
      });

      it('does not fetch when already loading same resource', async () => {
        const store = createTestStore({
          insightsByResource: {},
          loadingResources: ['resource-1'],
          globalStatus: 'loading',
          error: null,
        });

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        expect(mockAxiosGet).not.toHaveBeenCalled();
      });

      it('does not fetch when data is within TTL (5 minutes)', async () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const store = createTestStore({
          insightsByResource: {
            'resource-1': {
              jobs: [createMockInsightJob()],
              lastFetched: now - 2 * 60 * 1000, // 2 minutes ago
              status: 'succeeded',
              error: null,
            },
          },
          loadingResources: [],
          globalStatus: 'succeeded',
          error: null,
        });

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        expect(mockAxiosGet).not.toHaveBeenCalled();
      });

      it('fetches when data is stale (beyond TTL)', async () => {
        const now = Date.now();
        vi.setSystemTime(now);

        mockAxiosGet.mockResolvedValueOnce({ data: [] });

        const store = createTestStore({
          insightsByResource: {
            'resource-1': {
              jobs: [createMockInsightJob()],
              lastFetched: now - 6 * 60 * 1000, // 6 minutes ago
              status: 'succeeded',
              error: null,
            },
          },
          loadingResources: [],
          globalStatus: 'succeeded',
          error: null,
        });

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        expect(mockAxiosGet).toHaveBeenCalled();
      });

      it('fetches for new resource', async () => {
        mockAxiosGet.mockResolvedValueOnce({ data: [] });

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'new-resource', id_token: 'token', scanName: 'scan' })
        );

        expect(mockAxiosGet).toHaveBeenCalled();
      });
    });

    describe('Pending State', () => {
      it('initializes resource data if not exists', async () => {
        mockAxiosGet.mockImplementation(() => new Promise(() => {})); // Never resolves

        const store = createTestStore();

        store.dispatch(
          fetchInsights({ resourceId: 'new-resource', id_token: 'token', scanName: 'scan' })
        );

        // Wait for pending state
        await vi.advanceTimersByTimeAsync(0);

        const state = store.getState().insights;
        expect(state.insightsByResource['new-resource']).toBeDefined();
        expect(state.insightsByResource['new-resource'].status).toBe('loading');
      });

      it('sets status to loading', async () => {
        mockAxiosGet.mockImplementation(() => new Promise(() => {}));

        const store = createTestStore({
          insightsByResource: {
            'resource-1': { jobs: [], lastFetched: 0, status: 'idle', error: null },
          },
          loadingResources: [],
          globalStatus: 'idle',
          error: null,
        });

        store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        await vi.advanceTimersByTimeAsync(0);

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1'].status).toBe('loading');
      });

      it('clears previous error', async () => {
        mockAxiosGet.mockImplementation(() => new Promise(() => {}));

        const store = createTestStore({
          insightsByResource: {
            'resource-1': { jobs: [], lastFetched: 0, status: 'failed', error: 'Previous error' },
          },
          loadingResources: [],
          globalStatus: 'failed',
          error: null,
        });

        store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        await vi.advanceTimersByTimeAsync(0);

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1'].error).toBeNull();
      });

      it('adds resourceId to loadingResources', async () => {
        mockAxiosGet.mockImplementation(() => new Promise(() => {}));

        const store = createTestStore();

        store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        await vi.advanceTimersByTimeAsync(0);

        const state = store.getState().insights;
        expect(state.loadingResources).toContain('resource-1');
      });

      it('updates globalStatus to loading', async () => {
        mockAxiosGet.mockImplementation(() => new Promise(() => {}));

        const store = createTestStore();

        store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        await vi.advanceTimersByTimeAsync(0);

        const state = store.getState().insights;
        expect(state.globalStatus).toBe('loading');
      });
    });

    describe('Fulfilled State', () => {
      it('sets status to succeeded', async () => {
        const mockJobs = [createMockInsightJob()];
        mockAxiosGet.mockResolvedValueOnce({ data: mockJobs });

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1'].status).toBe('succeeded');
      });

      it('stores jobs array from response', async () => {
        const mockJobs = [createMockInsightJob({ uid: 'job-1' }), createMockInsightJob({ uid: 'job-2' })];
        mockAxiosGet.mockResolvedValueOnce({ data: mockJobs });

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1'].jobs).toHaveLength(2);
      });

      it('updates lastFetched timestamp', async () => {
        const now = Date.now();
        vi.setSystemTime(now);
        mockAxiosGet.mockResolvedValueOnce({ data: [] });

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1'].lastFetched).toBe(now);
      });

      it('removes resourceId from loadingResources', async () => {
        mockAxiosGet.mockResolvedValueOnce({ data: [] });

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.loadingResources).not.toContain('resource-1');
      });

      it('updates globalStatus when all loading complete', async () => {
        mockAxiosGet.mockResolvedValueOnce({ data: [] });

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.globalStatus).toBe('succeeded');
      });

      it('handles response with full_details', async () => {
        const mockJobWithDetails = { full_details: createMockInsightJob({ uid: 'detailed-job' }) };
        mockAxiosGet.mockResolvedValueOnce({ data: [mockJobWithDetails] });

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1'].jobs[0].uid).toBe('detailed-job');
      });
    });

    describe('Rejected State', () => {
      it('sets status to failed', async () => {
        mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1'].status).toBe('failed');
      });

      it('stores error message', async () => {
        mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.insightsByResource['resource-1'].error).toBeTruthy();
      });

      it('removes resourceId from loadingResources', async () => {
        mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.loadingResources).not.toContain('resource-1');
      });

      it('updates globalStatus to failed', async () => {
        mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'scan' })
        );

        const state = store.getState().insights;
        expect(state.globalStatus).toBe('failed');
      });
    });

    describe('API Integration', () => {
      it('constructs correct API URL with scanName', async () => {
        mockAxiosGet.mockResolvedValueOnce({ data: [] });

        const store = createTestStore();

        await store.dispatch(
          fetchInsights({ resourceId: 'resource-1', id_token: 'token', scanName: 'projects/test/scans/my-scan' })
        );

        expect(mockAxiosGet).toHaveBeenCalledWith(
          expect.stringContaining('parent=projects/test/scans/my-scan')
        );
      });
    });
  });

  // ==========================================================================
  // Selectors
  // ==========================================================================

  describe('Selectors', () => {
    it('selectInsightsData returns jobs for resourceId', () => {
      const mockJobs = [createMockInsightJob()];
      const state = {
        insights: {
          insightsByResource: {
            'resource-1': { jobs: mockJobs, lastFetched: Date.now(), status: 'succeeded', error: null },
          },
          loadingResources: [],
          globalStatus: 'succeeded',
          error: null,
        },
      };

      const result = selectInsightsData('resource-1')(state);
      expect(result).toEqual(mockJobs);
    });

    it('selectInsightsData returns undefined for unknown resource', () => {
      const state = {
        insights: {
          insightsByResource: {},
          loadingResources: [],
          globalStatus: 'idle',
          error: null,
        },
      };

      const result = selectInsightsData('unknown-resource')(state);
      expect(result).toBeUndefined();
    });

    it('selectInsightsStatus returns status for resourceId', () => {
      const state = {
        insights: {
          insightsByResource: {
            'resource-1': { jobs: [], lastFetched: Date.now(), status: 'succeeded', error: null },
          },
          loadingResources: [],
          globalStatus: 'succeeded',
          error: null,
        },
      };

      const result = selectInsightsStatus('resource-1')(state);
      expect(result).toBe('succeeded');
    });

    it('selectInsightsStatus returns idle for unknown resource', () => {
      const state = {
        insights: {
          insightsByResource: {},
          loadingResources: [],
          globalStatus: 'idle',
          error: null,
        },
      };

      const result = selectInsightsStatus('unknown-resource')(state);
      expect(result).toBe('idle');
    });

    it('selectInsightsError returns error for resourceId', () => {
      const state = {
        insights: {
          insightsByResource: {
            'resource-1': { jobs: [], lastFetched: Date.now(), status: 'failed', error: 'Some error' },
          },
          loadingResources: [],
          globalStatus: 'failed',
          error: null,
        },
      };

      const result = selectInsightsError('resource-1')(state);
      expect(result).toBe('Some error');
    });

    it('selectIsInsightsLoading returns true when loading', () => {
      const state = {
        insights: {
          insightsByResource: {},
          loadingResources: ['resource-1'],
          globalStatus: 'loading',
          error: null,
        },
      };

      const result = selectIsInsightsLoading('resource-1')(state);
      expect(result).toBe(true);
    });

    it('selectIsInsightsLoading returns false when not loading', () => {
      const state = {
        insights: {
          insightsByResource: {},
          loadingResources: ['other-resource'],
          globalStatus: 'loading',
          error: null,
        },
      };

      const result = selectIsInsightsLoading('resource-1')(state);
      expect(result).toBe(false);
    });

    it('selectInsightsGlobalStatus returns global status', () => {
      const state = {
        insights: {
          insightsByResource: {},
          loadingResources: [],
          globalStatus: 'loading',
          error: null,
        },
      };

      const result = selectInsightsGlobalStatus(state);
      expect(result).toBe('loading');
    });
  });
});
