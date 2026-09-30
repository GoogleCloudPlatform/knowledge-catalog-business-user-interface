import { configureStore, type AnyAction, type ThunkDispatch } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import projectsReducer, { getProjects, setIsLoaded, resetProjects, projectsSlice } from './projectsSlice';

// Define the state type
type ProjectsState = {
  items: any[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | undefined | unknown | null;
  isloaded: boolean;
  epoch: number;
};

// Define store type
type RootState = {
  projects: ProjectsState;
};

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      get: vi.fn(),
      defaults: {
        headers: {
          common: {} as Record<string, string>,
        },
      },
    },
  };
});

// Mock URLS
vi.mock('../../constants/urls', () => ({
  URLS: {
    API_URL: 'http://localhost:3000/api/v1',
    GET_PROJECTS: '/get-projects',
  },
  GET_PROJECTS_REQUEST_TIMEOUT_MS: 90000,
}));

// Create a typed mock for axios.get
const mockedAxiosGet = axios.get as ReturnType<typeof vi.fn>;

describe('projectsSlice', () => {
  // Mock data
  const mockRequestData = {
    id_token: 'test-token-123',
  };

  const mockProjectsResponse = [
    {
      projectId: 'project-1',
      displayName: 'Test Project 1',
      name: 'projects/project-1',
      state: 'ACTIVE',
      createTime: '2024-01-15T10:30:00Z',
    },
    {
      projectId: 'project-2',
      displayName: 'Test Project 2',
      name: 'projects/project-2',
      state: 'ACTIVE',
      createTime: '2024-01-16T14:45:00Z',
    },
    {
      projectId: 'project-3',
      displayName: 'Test Project 3',
      name: 'projects/project-3',
      state: 'DELETE_REQUESTED',
      createTime: '2024-01-17T09:00:00Z',
    },
  ];

  let store: ReturnType<typeof configureStore<{ projects: ProjectsState }>>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = configureStore({
      reducer: {
        projects: projectsReducer,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().projects;

      expect(state.items).toEqual([]);
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
      expect(state.isloaded).toBe(false);
    });

    it('should return initial state when called with undefined state', () => {
      const state = projectsReducer(undefined, { type: 'unknown' });

      expect(state.items).toEqual([]);
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
      expect(state.isloaded).toBe(false);
    });
  });

  describe('Slice Configuration', () => {
    it('should have correct slice name', () => {
      expect(projectsSlice.name).toBe('projects');
    });

    it('should have setIsLoaded reducer', () => {
      expect(projectsSlice.caseReducers.setIsLoaded).toBeDefined();
    });
  });

  describe('Synchronous Reducers', () => {
    describe('setIsLoaded', () => {
      it('should set isloaded to true', () => {
        const state = projectsReducer(undefined, setIsLoaded({ isloaded: true }));

        expect(state.isloaded).toBe(true);
      });

      it('should set isloaded to false', () => {
        const initialStateWithLoaded: ProjectsState = {
          items: mockProjectsResponse,
          status: 'succeeded',
          error: null,
          isloaded: true,
          epoch: 0,
        };

        const state = projectsReducer(initialStateWithLoaded, setIsLoaded({ isloaded: false }));

        expect(state.isloaded).toBe(false);
      });

      it('should not affect other state properties', () => {
        const initialStateWithData: ProjectsState = {
          items: mockProjectsResponse,
          status: 'succeeded',
          error: null,
          isloaded: false,
          epoch: 0,
        };

        const state = projectsReducer(initialStateWithData, setIsLoaded({ isloaded: true }));

        expect(state.items).toEqual(mockProjectsResponse);
        expect(state.status).toBe('succeeded');
        expect(state.error).toBeNull();
        expect(state.isloaded).toBe(true);
      });
    });
  });

  describe('getProjects Thunk', () => {
    describe('Pending State', () => {
      it('should set status to loading and isloaded to false when pending', () => {
        const action = { type: getProjects.pending.type };
        const state = projectsReducer(undefined, action);

        expect(state.status).toBe('loading');
        expect(state.isloaded).toBe(false);
      });

      it('should preserve items when pending', () => {
        const initialStateWithItems: ProjectsState = {
          items: mockProjectsResponse,
          status: 'succeeded',
          error: null,
          isloaded: true,
          epoch: 0,
        };
        const action = { type: getProjects.pending.type };
        const state = projectsReducer(initialStateWithItems, action);

        expect(state.items).toEqual(mockProjectsResponse);
        expect(state.status).toBe('loading');
        expect(state.isloaded).toBe(false);
      });

      it('should reset isloaded even if it was true', () => {
        const initialStateWithLoaded: ProjectsState = {
          items: [],
          status: 'idle',
          error: null,
          isloaded: true,
          epoch: 0,
        };
        const action = { type: getProjects.pending.type };
        const state = projectsReducer(initialStateWithLoaded, action);

        expect(state.isloaded).toBe(false);
      });
    });

    describe('Fulfilled State', () => {
      it('should set status to succeeded, isloaded to true, and update items on fulfilled', () => {
        const action = {
          type: getProjects.fulfilled.type,
          payload: mockProjectsResponse,
        };
        const state = projectsReducer(undefined, action);

        expect(state.status).toBe('succeeded');
        expect(state.isloaded).toBe(true);
        expect(state.items).toEqual(mockProjectsResponse);
      });

      it('should replace existing items on fulfilled', () => {
        const initialStateWithItems: ProjectsState = {
          items: [{ old: 'data' }],
          status: 'loading',
          error: null,
          isloaded: false,
          epoch: 0,
        };
        const action = {
          type: getProjects.fulfilled.type,
          payload: mockProjectsResponse,
        };
        const state = projectsReducer(initialStateWithItems, action);

        expect(state.items).toEqual(mockProjectsResponse);
        expect(state.items).not.toEqual([{ old: 'data' }]);
      });

      it('should handle empty array payload on fulfilled', () => {
        const action = {
          type: getProjects.fulfilled.type,
          payload: [],
        };
        const state = projectsReducer(undefined, action);

        expect(state.status).toBe('succeeded');
        expect(state.isloaded).toBe(true);
        expect(state.items).toEqual([]);
      });

      it('should handle null payload on fulfilled', () => {
        const action = {
          type: getProjects.fulfilled.type,
          payload: null,
        };
        const state = projectsReducer(undefined, action);

        expect(state.status).toBe('succeeded');
        expect(state.isloaded).toBe(true);
        expect(state.items).toBeNull();
      });
    });

    describe('Rejected State', () => {
      it('should set status to failed, isloaded to false, and store error on rejected', () => {
        const errorMessage = 'Network error occurred';
        const action = {
          type: getProjects.rejected.type,
          payload: errorMessage,
        };
        const state = projectsReducer(undefined, action);

        expect(state.status).toBe('failed');
        expect(state.isloaded).toBe(false);
        expect(state.error).toBe(errorMessage);
      });

      it('should handle object error payload on rejected', () => {
        const errorPayload = { message: 'Unauthorized', code: 401 };
        const action = {
          type: getProjects.rejected.type,
          payload: errorPayload,
        };
        const state = projectsReducer(undefined, action);

        expect(state.status).toBe('failed');
        expect(state.isloaded).toBe(false);
        expect(state.error).toEqual(errorPayload);
      });

      it('should preserve items on rejection', () => {
        const initialStateWithItems: ProjectsState = {
          items: mockProjectsResponse,
          status: 'loading',
          error: null,
          isloaded: false,
          epoch: 0,
        };
        const action = {
          type: getProjects.rejected.type,
          payload: 'Error occurred',
        };
        const state = projectsReducer(initialStateWithItems, action);

        expect(state.items).toEqual(mockProjectsResponse);
        expect(state.status).toBe('failed');
        expect(state.isloaded).toBe(false);
      });

      it('should reset isloaded to false on rejection', () => {
        const initialStateWithLoaded: ProjectsState = {
          items: mockProjectsResponse,
          status: 'loading',
          error: null,
          isloaded: true,
          epoch: 0,
        };
        const action = {
          type: getProjects.rejected.type,
          payload: 'Error',
        };
        const state = projectsReducer(initialStateWithLoaded, action);

        expect(state.isloaded).toBe(false);
      });
    });

    describe('Async Thunk Execution', () => {
      it('should make API call with correct URL', async () => {
        mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        // Bounded so a hung request can't leave the bootstrap loading forever,
        // but generous: this endpoint legitimately takes ~31s at 40k projects.
        expect(mockedAxiosGet).toHaveBeenCalledWith(
          'http://localhost:3000/api/v1/get-projects',
          { timeout: 90000 }
        );
      });

      it('should set Authorization header with token', async () => {
        mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        expect(axios.defaults.headers.common['Authorization']).toBe(
          `Bearer ${mockRequestData.id_token}`
        );
      });

      it('should set empty Authorization header when no token provided', async () => {
        mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects({})
        );

        expect(axios.defaults.headers.common['Authorization']).toBe('');
      });

      it('should set empty Authorization header when token is null', async () => {
        mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects({ id_token: null })
        );

        expect(axios.defaults.headers.common['Authorization']).toBe('');
      });

      it('should set empty Authorization header when token is empty string', async () => {
        mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects({ id_token: '' })
        );

        expect(axios.defaults.headers.common['Authorization']).toBe('');
      });

      it('should update store state on successful API call', async () => {
        mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.status).toBe('succeeded');
        expect(state.isloaded).toBe(true);
        expect(state.items).toEqual(mockProjectsResponse);
      });

      it('should handle AxiosError with response data', async () => {
        const errorResponse = { message: 'Projects not found', code: 'NOT_FOUND' };

        const axiosError = new AxiosError(
          'Request failed',
          'ERR_BAD_REQUEST',
          undefined,
          undefined,
          {
            data: errorResponse,
            status: 404,
            statusText: 'Not Found',
            headers: {},
            config: { headers: new AxiosHeaders() },
          }
        );

        mockedAxiosGet.mockRejectedValueOnce(axiosError);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.status).toBe('failed');
        expect(state.isloaded).toBe(false);
        expect(state.error).toEqual(errorResponse);
      });

      it('should handle AxiosError without response data', async () => {
        const axiosError = new AxiosError('Network Error', 'ERR_NETWORK');

        mockedAxiosGet.mockRejectedValueOnce(axiosError);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.status).toBe('failed');
        expect(state.isloaded).toBe(false);
        expect(state.error).toBe('Network Error');
      });

      it('should handle non-Axios error (unknown error)', async () => {
        const genericError = new Error('Something went wrong');

        mockedAxiosGet.mockRejectedValueOnce(genericError);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.status).toBe('failed');
        expect(state.isloaded).toBe(false);
        expect(state.error).toBe('An unknown error occurred');
      });

      it('should handle string error', async () => {
        mockedAxiosGet.mockRejectedValueOnce('String error');

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.status).toBe('failed');
        expect(state.error).toBe('An unknown error occurred');
      });

      it('should handle null error', async () => {
        mockedAxiosGet.mockRejectedValueOnce(null);

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.status).toBe('failed');
        expect(state.error).toBe('An unknown error occurred');
      });

      it('should transition through loading state', async () => {
        let resolvePromise: (value: { data: typeof mockProjectsResponse }) => void;
        const pendingPromise = new Promise<{ data: typeof mockProjectsResponse }>((resolve) => {
          resolvePromise = resolve;
        });

        mockedAxiosGet.mockReturnValueOnce(pendingPromise);

        const dispatchPromise = (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        // Check loading state
        expect(store.getState().projects.status).toBe('loading');
        expect(store.getState().projects.isloaded).toBe(false);

        // Resolve the promise
        resolvePromise!({ data: mockProjectsResponse });
        await dispatchPromise;

        // Check succeeded state
        expect(store.getState().projects.status).toBe('succeeded');
        expect(store.getState().projects.isloaded).toBe(true);
      });
    });

    describe('Response Data Variations', () => {
      it('should handle single project response', async () => {
        const singleProjectResponse = [mockProjectsResponse[0]];

        mockedAxiosGet.mockResolvedValueOnce({ data: singleProjectResponse });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.items).toEqual(singleProjectResponse);
        expect((state.items as typeof singleProjectResponse).length).toBe(1);
      });

      it('should handle project with additional fields', async () => {
        const projectWithExtraFields = [
          {
            projectId: 'project-1',
            displayName: 'Test Project',
            name: 'projects/project-1',
            state: 'ACTIVE',
            createTime: '2024-01-15T10:30:00Z',
            labels: { env: 'production', team: 'data' },
            parent: 'organizations/123',
            lifecycleState: 'ACTIVE',
          },
        ];

        mockedAxiosGet.mockResolvedValueOnce({ data: projectWithExtraFields });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.items).toEqual(projectWithExtraFields);
      });

      it('should handle empty object response', async () => {
        mockedAxiosGet.mockResolvedValueOnce({ data: {} });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.status).toBe('succeeded');
        expect(state.isloaded).toBe(true);
        expect(state.items).toEqual({});
      });

      it('should handle undefined response data', async () => {
        mockedAxiosGet.mockResolvedValueOnce({ data: undefined });

        await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
          getProjects(mockRequestData)
        );

        const state = store.getState().projects;
        expect(state.status).toBe('succeeded');
        expect(state.isloaded).toBe(true);
        expect(state.items).toBeUndefined();
      });
    });
  });

  describe('State Transitions', () => {
    it('should handle complete flow: idle -> loading -> succeeded', async () => {
      mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });

      // Initial state
      expect(store.getState().projects.status).toBe('idle');
      expect(store.getState().projects.isloaded).toBe(false);

      const promise = (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      // Loading state
      expect(store.getState().projects.status).toBe('loading');
      expect(store.getState().projects.isloaded).toBe(false);

      await promise;

      // Succeeded state
      expect(store.getState().projects.status).toBe('succeeded');
      expect(store.getState().projects.isloaded).toBe(true);
      expect(store.getState().projects.items).toEqual(mockProjectsResponse);
    });

    it('should handle complete flow: idle -> loading -> failed', async () => {
      mockedAxiosGet.mockRejectedValueOnce(new Error('Failed'));

      // Initial state
      expect(store.getState().projects.status).toBe('idle');
      expect(store.getState().projects.isloaded).toBe(false);

      const promise = (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      // Loading state
      expect(store.getState().projects.status).toBe('loading');
      expect(store.getState().projects.isloaded).toBe(false);

      await promise;

      // Failed state
      expect(store.getState().projects.status).toBe('failed');
      expect(store.getState().projects.isloaded).toBe(false);
      expect(store.getState().projects.error).toBe('An unknown error occurred');
    });

    it('should handle retry after failure', async () => {
      // First call fails
      mockedAxiosGet.mockRejectedValueOnce(new Error('Failed'));
      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );
      expect(store.getState().projects.status).toBe('failed');
      expect(store.getState().projects.isloaded).toBe(false);

      // Second call succeeds
      mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });
      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      expect(store.getState().projects.status).toBe('succeeded');
      expect(store.getState().projects.isloaded).toBe(true);
      expect(store.getState().projects.items).toEqual(mockProjectsResponse);
    });

    it('should handle multiple successful calls', async () => {
      const firstResponse = [{ projectId: 'project-1' }];
      const secondResponse = [{ projectId: 'project-2' }, { projectId: 'project-3' }];

      // First call
      mockedAxiosGet.mockResolvedValueOnce({ data: firstResponse });
      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );
      expect(store.getState().projects.items).toEqual(firstResponse);

      // Second call should replace items
      mockedAxiosGet.mockResolvedValueOnce({ data: secondResponse });
      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );
      expect(store.getState().projects.items).toEqual(secondResponse);
    });

    it('should handle setIsLoaded action interleaved with async thunk', async () => {
      mockedAxiosGet.mockResolvedValueOnce({ data: mockProjectsResponse });

      // Initial state
      expect(store.getState().projects.isloaded).toBe(false);

      // Manually set isloaded
      store.dispatch(setIsLoaded({ isloaded: true }));
      expect(store.getState().projects.isloaded).toBe(true);

      // Dispatch thunk - should reset isloaded during loading
      const promise = (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );
      expect(store.getState().projects.isloaded).toBe(false);

      await promise;

      // After success, isloaded should be true again
      expect(store.getState().projects.isloaded).toBe(true);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle AxiosError with status 401 Unauthorized', async () => {
      const axiosError = new AxiosError(
        'Unauthorized',
        'ERR_UNAUTHORIZED',
        undefined,
        undefined,
        {
          data: { message: 'Invalid token' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      );

      mockedAxiosGet.mockRejectedValueOnce(axiosError);

      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      const state = store.getState().projects;
      expect(state.status).toBe('failed');
      expect(state.error).toEqual({ message: 'Invalid token' });
    });

    it('should handle AxiosError with status 403 Forbidden', async () => {
      const axiosError = new AxiosError(
        'Forbidden',
        'ERR_FORBIDDEN',
        undefined,
        undefined,
        {
          data: { message: 'Access denied', reason: 'Insufficient permissions' },
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      );

      mockedAxiosGet.mockRejectedValueOnce(axiosError);

      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      const state = store.getState().projects;
      expect(state.status).toBe('failed');
      expect(state.error).toEqual({ message: 'Access denied', reason: 'Insufficient permissions' });
    });

    it('should handle AxiosError with status 500 Internal Server Error', async () => {
      const axiosError = new AxiosError(
        'Internal Server Error',
        'ERR_SERVER',
        undefined,
        undefined,
        {
          data: { message: 'Server error' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      );

      mockedAxiosGet.mockRejectedValueOnce(axiosError);

      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      const state = store.getState().projects;
      expect(state.status).toBe('failed');
      expect(state.error).toEqual({ message: 'Server error' });
    });

    it('should handle timeout error', async () => {
      const axiosError = new AxiosError('timeout exceeded', 'ECONNABORTED');

      mockedAxiosGet.mockRejectedValueOnce(axiosError);

      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      const state = store.getState().projects;
      expect(state.status).toBe('failed');
      // Timeouts are tagged rather than reduced to a message, so the bootstrap
      // can tell "slow endpoint" from "flaky request" and skip retrying.
      expect(state.error).toEqual({ type: 'TIMEOUT', message: 'timeout exceeded' });
    });
  });

  describe('timeout handling', () => {
    it('tags a timeout so the bootstrap can skip retrying a slow endpoint', async () => {
      const timeoutError = new AxiosError('timeout of 90000ms exceeded', 'ECONNABORTED');

      mockedAxiosGet.mockRejectedValueOnce(timeoutError);

      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      const state = store.getState().projects;
      expect(state.status).toBe('failed');
      // The shape matters: useAppBootstrap reads error.type to decide not to
      // retry. A plain message string would be retried like any other failure.
      expect(state.error).toEqual({
        type: 'TIMEOUT',
        message: 'timeout of 90000ms exceeded',
      });
    });

    it('does not tag non-timeout failures', async () => {
      const serverError = new AxiosError('Request failed with status code 500');
      serverError.response = { data: { message: 'Server error' } } as any;

      mockedAxiosGet.mockRejectedValueOnce(serverError);

      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      expect(store.getState().projects.error).toEqual({ message: 'Server error' });
    });
  });

  describe('resetProjects (logout)', () => {
    it('clears items, not just the isloaded flag', async () => {
      mockedAxiosGet.mockResolvedValueOnce({ data: [{ projectId: 'user-a-project', name: 'projects/111' }] });
      await (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );
      expect(store.getState().projects.items).toHaveLength(1);

      store.dispatch(resetProjects());

      const state = store.getState().projects;
      expect(state.items).toEqual([]);
      expect(state.isloaded).toBe(false);
      expect(state.status).toBe('idle');
    });

    it('discards a response that resolves after a reset, so the next user never sees the previous list', async () => {
      // Simulates: user A's /get-projects is still in flight when they log out.
      let resolveRequest: (value: unknown) => void = () => {};
      mockedAxiosGet.mockReturnValueOnce(
        new Promise((resolve) => { resolveRequest = resolve; })
      );

      const pending = (store.dispatch as ThunkDispatch<RootState, unknown, AnyAction>)(
        getProjects(mockRequestData)
      );

      // Logout happens while the request is in flight.
      store.dispatch(resetProjects());

      // User A's response lands afterwards.
      resolveRequest({ data: [{ projectId: 'user-a-project', name: 'projects/111' }] });
      await pending;

      const state = store.getState().projects;
      // Without the epoch guard this would repopulate items and set
      // isloaded=true, so the next user's bootstrap would skip the refetch.
      expect(state.items).toEqual([]);
      expect(state.isloaded).toBe(false);
    });
  });
});
