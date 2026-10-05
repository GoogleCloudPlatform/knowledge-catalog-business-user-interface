import { act, renderHook, waitFor } from '@testing-library/react';
import { vi, beforeEach, it, describe, expect } from 'vitest';
import axios from 'axios';
import { useAppBootstrap } from './useAppBootstrap';

// Track projects state across tests
let mockProjectsLoaded = false;
let mockProjectsStatus = 'idle';
let mockProjectsError: unknown = null;
let mockProjectsList: unknown[] = [];

// Mock react-redux. dispatch returns a promise because the hook chains
// .finally() on the getProjects thunk to clear its in-flight guard.
const mockDispatch = vi.fn(() => Promise.resolve());
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: (state: any) => unknown) => {
      const mockState = {
        projects: {
          isloaded: mockProjectsLoaded,
          items: mockProjectsList,
          status: mockProjectsStatus,
          error: mockProjectsError,
        }
      };
      return selector(mockState);
    }
  };
});

// Mock getProjects action
vi.mock('../features/projects/projectsSlice', () => ({
  getProjects: vi.fn((data: { id_token?: string }) => ({ type: 'projects/getProjects', payload: data }))
}));

// Mock axios
vi.mock('axios');

// Mock NotificationContext
const mockShowError = vi.fn();
vi.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: mockShowError,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    clearNotification: vi.fn(),
    clearAllNotifications: vi.fn(),
  })
}));

// Mock NoAccessContext
const mockTriggerNoAccess = vi.fn();
vi.mock('../contexts/NoAccessContext', () => ({
  useNoAccess: () => ({
    isNoAccessOpen: false,
    noAccessMessage: null,
    triggerNoAccess: mockTriggerNoAccess,
    dismissNoAccess: vi.fn(),
  }),
}));

// Mock constants
vi.mock('../constants/urls', () => ({
  URLS: {
    API_URL: 'http://localhost:3000/api',
    APP_CONFIG: '/app-config',
  },
  APP_CONFIG_REQUEST_TIMEOUT_MS: 10000,
}));

// Mock auth provider - set per test
const mockLogout = vi.fn();
const mockUpdateUser = vi.fn();
let mockUser: any = null;
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    login: vi.fn(),
    logout: mockLogout,
    updateUser: mockUpdateUser,
  })
}));

describe('useAppBootstrap', () => {
  const mockUserWithAppConfig = {
    token: 'test-token',
    name: 'Test User',
    email: 'test@example.com',
    picture: 'test-picture',
    tokenExpiry: Date.now() + 3600000,
    tokenIssuedAt: Date.now(),
    hasRole: true,
    roles: [],
    permissions: [],
    appConfig: {
      aspects: ['aspect1'],
      projects: ['project1'],
    },
  };

  const mockUserWithoutAppConfig = {
    ...mockUserWithAppConfig,
    appConfig: {} as Record<string, never>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch.mockImplementation(() => Promise.resolve());
    mockProjectsLoaded = false;
    mockProjectsStatus = 'idle';
    mockProjectsError = null;
    mockProjectsList = [];
    mockUser = mockUserWithAppConfig;
    vi.mocked(axios.get).mockClear();
    if (!axios.defaults) {
      (axios as any).defaults = { headers: { common: {} } };
    }
  });

  describe('appConfig fetching', () => {
    it('makes API call to URLS.APP_CONFIG when appConfig is empty', async () => {
      mockUser = mockUserWithoutAppConfig;
      vi.mocked(axios.get).mockResolvedValue({ data: { aspects: [], projects: [] } } as any);

      renderHook(() => useAppBootstrap());

      await waitFor(() => {
        // Bounded so a hung request still fails, retries, and gives up rather
        // than leaving the bootstrap "loading" forever.
        expect(axios.get).toHaveBeenCalledWith(
          'http://localhost:3000/api/app-config',
          { timeout: 10000 }
        );
      });
    });

    it('does NOT make API call when appConfig is already populated', () => {
      mockUser = mockUserWithAppConfig;

      renderHook(() => useAppBootstrap());

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('calls updateUser with merged user data on successful fetch', async () => {
      mockUser = mockUserWithoutAppConfig;
      const mockAppConfig = { aspects: ['aspect1'], projects: ['project1'] };
      vi.mocked(axios.get).mockResolvedValue({ data: mockAppConfig } as any);

      renderHook(() => useAppBootstrap());

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith(
          'test-token',
          expect.objectContaining({
            name: 'Test User',
            email: 'test@example.com',
            token: 'test-token',
            appConfig: mockAppConfig,
          })
        );
      });
    });

    it('retries on API error instead of failing immediately', async () => {
      vi.useFakeTimers();
      try {
        mockUser = mockUserWithoutAppConfig;
        vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

        renderHook(() => useAppBootstrap());

        // Let the first attempt reject, then run the scheduled retry.
        await vi.advanceTimersByTimeAsync(0);
        expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1500);
        expect(vi.mocked(axios.get).mock.calls.length).toBeGreaterThan(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('never logs the user out on a failed app-config fetch', async () => {
      // 401s are handled centrally by the axios interceptor; a transient 500 or
      // timeout must not evict the user.
      mockUser = mockUserWithoutAppConfig;
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      renderHook(() => useAppBootstrap());

      await waitFor(() => {
        expect(vi.mocked(axios.get)).toHaveBeenCalled();
      });
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('gives up after exhausting retries: warns once and releases the gate', async () => {
      vi.useFakeTimers();
      try {
        mockUser = mockUserWithoutAppConfig;
        vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useAppBootstrap());

        // Initial attempt + both retries (1s then 3s backoff). Wrapped in act so
        // the state update that releases the gate is flushed.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(6000);
        });

        expect(mockShowError).toHaveBeenCalledTimes(1);
        // Critically, the gate must open so consumers render degraded rather
        // than spinning forever.
        expect(result.current.isAppConfigReady).toBe(true);
        expect(mockLogout).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('get-projects fetching', () => {
    it('dispatches getProjects when projectsLoaded is false', async () => {
      mockUser = mockUserWithAppConfig;
      mockProjectsLoaded = false;

      renderHook(() => useAppBootstrap());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'projects/getProjects',
            payload: { id_token: 'test-token' },
          })
        );
      });
    });

    it('does NOT dispatch getProjects when projectsLoaded is true', () => {
      mockUser = mockUserWithAppConfig;
      mockProjectsLoaded = true;

      renderHook(() => useAppBootstrap());

      const projectsCall = mockDispatch.mock.calls.find(
        (call: unknown[]) => (call[0] as { type?: string })?.type === 'projects/getProjects'
      );
      expect(projectsCall).toBeUndefined();
    });

    it('does not retry a timeout — it gives up immediately and releases the gate', () => {
      // /get-projects legitimately takes ~31s at 40k projects. Retrying a
      // timeout just waits the whole timeout again while re-running a query
      // that walks every page, so a timeout must be terminal.
      mockUser = mockUserWithAppConfig;
      mockProjectsStatus = 'failed';
      mockProjectsError = { type: 'TIMEOUT', message: 'timeout of 90000ms exceeded' };

      const { result } = renderHook(() => useAppBootstrap());

      const projectsCalls = mockDispatch.mock.calls.filter(
        (call: unknown[]) => (call[0] as { type?: string })?.type === 'projects/getProjects'
      );
      expect(projectsCalls).toHaveLength(0);
      expect(mockShowError).toHaveBeenCalledTimes(1);
      expect(mockShowError.mock.calls[0][0]).toMatch(/taking longer than expected/i);
      // Gate released, so consumers render degraded instead of waiting forever.
      expect(result.current.areProjectsReady).toBe(true);
    });

    it('still retries a non-timeout failure', async () => {
      vi.useFakeTimers();
      try {
        mockUser = mockUserWithAppConfig;
        mockProjectsStatus = 'failed';
        mockProjectsError = { message: 'Server error' };

        renderHook(() => useAppBootstrap());

        // Nothing immediately — the retry is scheduled behind a backoff.
        expect(
          mockDispatch.mock.calls.filter(
            (call: unknown[]) => (call[0] as { type?: string })?.type === 'projects/getProjects'
          )
        ).toHaveLength(0);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1500);
        });

        expect(
          mockDispatch.mock.calls.filter(
            (call: unknown[]) => (call[0] as { type?: string })?.type === 'projects/getProjects'
          ).length
        ).toBeGreaterThan(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('readiness flags', () => {
    it('is bootstrapping while appConfig is missing or projects have not loaded', () => {
      mockUser = mockUserWithoutAppConfig;
      mockProjectsLoaded = false;
      vi.mocked(axios.get).mockResolvedValue({ data: {} } as any);

      const { result } = renderHook(() => useAppBootstrap());

      expect(result.current.isBootstrapping).toBe(true);
      expect(result.current.isAppConfigReady).toBe(false);
      expect(result.current.areProjectsReady).toBe(false);
    });

    it('is not bootstrapping once appConfig is populated and projects have loaded', () => {
      mockUser = mockUserWithAppConfig;
      mockProjectsLoaded = true;

      const { result } = renderHook(() => useAppBootstrap());

      expect(result.current.isBootstrapping).toBe(false);
      expect(result.current.isAppConfigReady).toBe(true);
      expect(result.current.areProjectsReady).toBe(true);
    });

    it('reports appConfig ready independently of the project list', () => {
      // The split is the point: a page that only needs appConfig shouldn't wait
      // on a /get-projects round-trip (which happens on every refresh, since the
      // projects slice is never persisted).
      mockUser = mockUserWithAppConfig;
      mockProjectsLoaded = false;

      const { result } = renderHook(() => useAppBootstrap());

      expect(result.current.isAppConfigReady).toBe(true);
      expect(result.current.areProjectsReady).toBe(false);
      expect(result.current.isBootstrapping).toBe(true);
    });
  });

  describe('projectsRestricted access check', () => {
    it('triggers no-access when restricted and there is no intersection with configured projects', async () => {
      mockUser = {
        ...mockUserWithAppConfig,
        appConfig: {
          ...mockUserWithAppConfig.appConfig,
          projectsRestricted: true,
          configuredProjectIds: ['configured-project'],
        },
      };
      mockProjectsLoaded = true;
      mockProjectsList = [{ projectId: 'other-project' }];

      renderHook(() => useAppBootstrap());

      await waitFor(() => {
        expect(mockTriggerNoAccess).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('do not have access to any of the configured projects'),
          })
        );
      });
    });

    it('does NOT trigger no-access when there is an intersection with configured projects', () => {
      mockUser = {
        ...mockUserWithAppConfig,
        appConfig: {
          ...mockUserWithAppConfig.appConfig,
          projectsRestricted: true,
          configuredProjectIds: ['configured-project'],
        },
      };
      mockProjectsLoaded = true;
      mockProjectsList = [{ projectId: 'configured-project' }];

      renderHook(() => useAppBootstrap());

      expect(mockTriggerNoAccess).not.toHaveBeenCalled();
    });

    it('does NOT run the check until projects have loaded', () => {
      mockUser = {
        ...mockUserWithAppConfig,
        appConfig: {
          ...mockUserWithAppConfig.appConfig,
          projectsRestricted: true,
          configuredProjectIds: ['configured-project'],
        },
      };
      mockProjectsLoaded = false;
      mockProjectsList = [];

      renderHook(() => useAppBootstrap());

      expect(mockTriggerNoAccess).not.toHaveBeenCalled();
    });
  });
});
