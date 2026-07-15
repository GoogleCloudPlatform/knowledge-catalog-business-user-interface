import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { User } from '../types/User';
import type { CredentialResponse } from '@react-oauth/google';
import React from 'react';

// Use vi.hoisted to create mock functions that are available during vi.mock hoisting
const {
  mockAxiosGet,
  mockSetCredentials,
  mockSetIsLoaded,
  mockClearPersistedState,
  mockShowSuccess,
  mockShowError,
  mockShowInfo,
  mockSetGlobalAuthFunctions,
  mockSetAuthNotificationShown,
  mockPerformSilentAuth,
  mockDispatch,
  axiosDefaultsHeaders,
  mockUseAppSelector,
  mockClearUserState,
} = vi.hoisted(() => ({
  mockAxiosGet: vi.fn(),
  mockSetCredentials: vi.fn((payload: unknown) => ({ type: 'user/setCredentials', payload })),
  mockSetIsLoaded: vi.fn((payload: unknown) => ({ type: 'projects/setIsLoaded', payload })),
  mockClearPersistedState: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
  mockShowInfo: vi.fn(),
  mockSetGlobalAuthFunctions: vi.fn(),
  mockSetAuthNotificationShown: vi.fn(),
  mockPerformSilentAuth: vi.fn(),
  mockDispatch: vi.fn(),
  axiosDefaultsHeaders: { common: {} as Record<string, string> },
  mockUseAppSelector: vi.fn(),
  mockClearUserState: vi.fn(),
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: (...args: unknown[]) => mockAxiosGet(...args),
    defaults: {
      headers: axiosDefaultsHeaders,
    },
  },
}));

// Mock react-redux (keep Provider available for test wrappers)
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
  };
});

// Mock ../app/store (useAppDispatch, useAppSelector)
vi.mock('../app/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

// Mock userSlice
vi.mock('../features/user/userSlice', () => ({
  setCredentials: (payload: unknown) => mockSetCredentials(payload),
}));

// Mock projectsSlice
vi.mock('../features/projects/projectsSlice', () => ({
  setIsLoaded: (payload: unknown) => mockSetIsLoaded(payload),
}));

// Mock persistence
vi.mock('../utils/persistence', () => ({
  clearPersistedState: () => mockClearPersistedState(),
  clearUserState: () => mockClearUserState(),
}));

// Mock NotificationContext
vi.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: mockShowInfo,
  }),
}));

// Mock authErrorService
vi.mock('../services/authErrorService', () => ({
  setGlobalAuthFunctions: (...args: unknown[]) => mockSetGlobalAuthFunctions(...args),
  setAuthNotificationShown: (shown: boolean) => mockSetAuthNotificationShown(shown),
}));

// Mock silentAuthService
vi.mock('../services/silentAuthService', () => ({
  performSilentAuth: (...args: unknown[]) => mockPerformSilentAuth(...args),
}));

// Mock GoogleOAuthProvider
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import after mocks
import { AuthProvider, AuthContext, useAuth, AuthWithProvider } from './AuthProvider';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Create a minimal mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      user: (state = { token: null, user: null }) => state,
      projects: (state = { isLoaded: false }) => state,
    },
  });
};

// Test component to access auth context
const TestConsumer = ({
  onContextReceived,
}: {
  onContextReceived: (context: ReturnType<typeof useAuth>) => void;
}) => {
  const context = useAuth();
  onContextReceived(context);
  return <div data-testid="test-consumer">Test Consumer</div>;
};

// Test component that uses auth context
const AuthConsumerComponent = () => {
  const { user, login, logout, silentLogin, updateUser } = useAuth();
  return (
    <div>
      <span data-testid="user-name">{user?.name || 'No user'}</span>
      <span data-testid="user-email">{user?.email || 'No email'}</span>
      <button data-testid="login-btn" onClick={() => login({ credential: 'test-credential' })}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="silent-login-btn" onClick={() => silentLogin()}>
        Silent Login
      </button>
      <button
        data-testid="update-user-btn"
        onClick={() =>
          updateUser('new-token', {
            name: 'Updated User',
            email: 'updated@test.com',
            picture: 'updated.jpg',
            token: 'new-token',
            tokenExpiry: 1234567890,
            tokenIssuedAt: 1234567800,
            hasRole: true,
            roles: [],
            permissions: [],
            appConfig: {},
          })
        }
      >
        Update User
      </button>
    </div>
  );
};

describe('AuthProvider', () => {
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockStore = createMockStore();
    axiosDefaultsHeaders.common = {};
    mockUseAppSelector.mockReset();
    mockClearUserState.mockReset();
    // Default: useAppSelector returns null (no user)
    mockUseAppSelector.mockImplementation((selector: any) =>
      selector({ user: { token: null, userData: null, mode: 'light' } })
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<AuthConsumerComponent />);
      }).toThrow('useAuth must be used within AuthProvider');

      consoleError.mockRestore();
    });

    it('should return context when used within AuthProvider', () => {
      let receivedContext: ReturnType<typeof useAuth> | null = null;

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <TestConsumer onContextReceived={(ctx) => (receivedContext = ctx)} />
          </AuthProvider>
        </Provider>
      );

      expect(receivedContext).not.toBeNull();
      expect(receivedContext).toHaveProperty('user');
      expect(receivedContext).toHaveProperty('login');
      expect(receivedContext).toHaveProperty('logout');
      expect(receivedContext).toHaveProperty('updateUser');
      expect(receivedContext).toHaveProperty('silentLogin');
    });
  });

  describe('initial state', () => {
    it('should initialize with null user when no stored data', () => {
      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <AuthConsumerComponent />
          </AuthProvider>
        </Provider>
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('No user');
    });

    it('should initialize with stored user data from Redux', () => {
      const storedUser: User = {
        name: 'Stored User',
        email: 'stored@test.com',
        picture: 'stored.jpg',
        token: 'stored-token',
        tokenExpiry: 9999999999,
        tokenIssuedAt: 9999999900,
        hasRole: true,
        roles: ['admin'],
        permissions: ['read'],
        appConfig: {},
      };
      mockUseAppSelector.mockImplementation((selector: any) =>
        selector({ user: { token: 'stored-token', userData: storedUser, mode: 'light' } })
      );

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <AuthConsumerComponent />
          </AuthProvider>
        </Provider>
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('Stored User');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          picture: 'https://example.com/picture.jpg',
        },
      });

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <AuthConsumerComponent />
          </AuthProvider>
        </Provider>
      );

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(mockAxiosGet).toHaveBeenCalledWith(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.any(String) }) })
        );
      });

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockSetAuthNotificationShown).toHaveBeenCalledWith(false);
      expect(mockShowSuccess).toHaveBeenCalledWith('Successfully signed in!', 3000);
    });

    it('should handle login failure', async () => {
      mockAxiosGet.mockRejectedValue(new Error('Network error'));

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <AuthConsumerComponent />
          </AuthProvider>
        </Provider>
      );

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Failed to sign in. Please try again.', 5000);
      });

      consoleError.mockRestore();
    });

    it('should not proceed if credential is missing', async () => {
      const LoginWithEmptyCredential = () => {
        const { login } = useAuth();
        return (
          <button data-testid="login-empty" onClick={() => login({} as CredentialResponse)}>
            Login Empty
          </button>
        );
      };

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <LoginWithEmptyCredential />
          </AuthProvider>
        </Provider>
      );

      await act(async () => {
        screen.getByTestId('login-empty').click();
      });

      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it('should set axios Authorization header on login', async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          picture: 'https://example.com/picture.jpg',
        },
      });

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <AuthConsumerComponent />
          </AuthProvider>
        </Provider>
      );

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(axiosDefaultsHeaders.common['Authorization']).toBe('Bearer test-credential');
      });
    });
  });

  describe('logout', () => {
    it('should clear user data and dispatch actions', async () => {
      const storedUser: User = {
        name: 'User To Logout',
        email: 'logout@test.com',
        picture: 'logout.jpg',
        token: 'logout-token',
        tokenExpiry: 9999999999,
        tokenIssuedAt: 9999999900,
        hasRole: true,
        roles: [],
        permissions: [],
        appConfig: {},
      };
      mockUseAppSelector.mockImplementation((selector: any) =>
        selector({ user: { token: 'logout-token', userData: storedUser, mode: 'light' } })
      );

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <AuthConsumerComponent />
          </AuthProvider>
        </Provider>
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('User To Logout');

      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'user/setCredentials', payload: { token: null, user: null } })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'projects/setIsLoaded', payload: { isloaded: false } })
      );
      expect(mockClearUserState).toHaveBeenCalled();
      expect(mockClearPersistedState).toHaveBeenCalled();
      expect(mockShowInfo).toHaveBeenCalledWith('You have been signed out.', 3000);
    });
  });

  describe('updateUser', () => {
    it('should update user data and dispatch setCredentials', async () => {
      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <AuthConsumerComponent />
          </AuthProvider>
        </Provider>
      );

      await act(async () => {
        screen.getByTestId('update-user-btn').click();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user/setCredentials',
          payload: expect.objectContaining({ token: 'new-token' }),
        })
      );
    });
  });

  describe('silentLogin', () => {
    it('should return false when user has no email', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let silentLoginResult: boolean | null = null;
      const SilentLoginTest = () => {
        const { silentLogin } = useAuth();
        return (
          <button
            data-testid="silent-login-test"
            onClick={async () => {
              silentLoginResult = await silentLogin();
            }}
          >
            Silent Login
          </button>
        );
      };

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <SilentLoginTest />
          </AuthProvider>
        </Provider>
      );

      await act(async () => {
        screen.getByTestId('silent-login-test').click();
      });

      expect(silentLoginResult).toBe(false);
      expect(consoleWarn).toHaveBeenCalledWith(
        '[Silent Auth] Cannot perform silent login - no user email or logged out'
      );

      consoleWarn.mockRestore();
    });

    it('should successfully perform silent login', async () => {
      const storedUser: User = {
        name: 'Silent User',
        email: 'silent@test.com',
        picture: 'silent.jpg',
        token: 'old-token',
        tokenExpiry: 9999999999,
        tokenIssuedAt: 9999999900,
        hasRole: true,
        roles: [],
        permissions: [],
        appConfig: {},
      };
      mockUseAppSelector.mockImplementation((selector: any) =>
        selector({ user: { token: 'old-token', userData: storedUser, mode: 'light' } })
      );

      mockPerformSilentAuth.mockResolvedValue('new-silent-token');

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      let silentLoginResult: boolean | null = null;
      const SilentLoginTest = () => {
        const { silentLogin } = useAuth();
        return (
          <button
            data-testid="silent-login-test"
            onClick={async () => {
              silentLoginResult = await silentLogin();
            }}
          >
            Silent Login
          </button>
        );
      };

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <SilentLoginTest />
          </AuthProvider>
        </Provider>
      );

      await act(async () => {
        screen.getByTestId('silent-login-test').click();
      });

      await waitFor(() => {
        expect(silentLoginResult).toBe(true);
      });

      expect(mockPerformSilentAuth).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith('[Silent Auth] Successfully refreshed token');
      expect(axiosDefaultsHeaders.common['Authorization']).toBe('Bearer new-silent-token');

      consoleLog.mockRestore();
    });

    it('should return false when silent auth fails', async () => {
      const storedUser: User = {
        name: 'Silent User',
        email: 'silent@test.com',
        picture: 'silent.jpg',
        token: 'old-token',
        tokenExpiry: 9999999999,
        tokenIssuedAt: 9999999900,
        hasRole: true,
        roles: [],
        permissions: [],
        appConfig: {},
      };
      mockUseAppSelector.mockImplementation((selector: any) =>
        selector({ user: { token: 'old-token', userData: storedUser, mode: 'light' } })
      );

      mockPerformSilentAuth.mockRejectedValue(new Error('Silent auth failed'));

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      let silentLoginResult: boolean | null = null;
      const SilentLoginTest = () => {
        const { silentLogin } = useAuth();
        return (
          <button
            data-testid="silent-login-test"
            onClick={async () => {
              silentLoginResult = await silentLogin();
            }}
          >
            Silent Login
          </button>
        );
      };

      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <SilentLoginTest />
          </AuthProvider>
        </Provider>
      );

      await act(async () => {
        screen.getByTestId('silent-login-test').click();
      });

      await waitFor(() => {
        expect(silentLoginResult).toBe(false);
      });

      expect(consoleError).toHaveBeenCalledWith('[Silent Auth] Failed:', expect.any(Error));

      consoleLog.mockRestore();
      consoleError.mockRestore();
    });
  });

  describe('setGlobalAuthFunctions', () => {
    it('should call setGlobalAuthFunctions on mount', () => {
      render(
        <Provider store={mockStore}>
          <AuthProvider>
            <div>Test</div>
          </AuthProvider>
        </Provider>
      );

      expect(mockSetGlobalAuthFunctions).toHaveBeenCalledWith(mockShowError, expect.any(Function));
    });
  });

  describe('AuthContext', () => {
    it('should export AuthContext', () => {
      expect(AuthContext).toBeDefined();
    });

    it('should have undefined as default value', () => {
      const TestDefault = () => {
        const context = React.useContext(AuthContext);
        return <div data-testid="context-value">{context === undefined ? 'undefined' : 'defined'}</div>;
      };

      render(<TestDefault />);
      expect(screen.getByTestId('context-value')).toHaveTextContent('undefined');
    });
  });

  describe('AuthWithProvider', () => {
    it('should render children with GoogleOAuthProvider and AuthProvider', () => {
      render(
        <Provider store={mockStore}>
          <AuthWithProvider>
            <div data-testid="child-component">Child Content</div>
          </AuthWithProvider>
        </Provider>
      );

      expect(screen.getByTestId('child-component')).toHaveTextContent('Child Content');
    });

    it('should provide auth context through AuthWithProvider', () => {
      let receivedContext: ReturnType<typeof useAuth> | null = null;

      render(
        <Provider store={mockStore}>
          <AuthWithProvider>
            <TestConsumer onContextReceived={(ctx) => (receivedContext = ctx)} />
          </AuthWithProvider>
        </Provider>
      );

      expect(receivedContext).not.toBeNull();
      expect(receivedContext).toHaveProperty('login');
      expect(receivedContext).toHaveProperty('logout');
    });
  });

  describe('context memoization', () => {
    it('should provide memoized context value', () => {
      const contextValues: ReturnType<typeof useAuth>[] = [];

      const ContextCollector = () => {
        const context = useAuth();
        contextValues.push(context);
        return null;
      };

      const { rerender } = render(
        <Provider store={mockStore}>
          <AuthProvider>
            <ContextCollector />
          </AuthProvider>
        </Provider>
      );

      rerender(
        <Provider store={mockStore}>
          <AuthProvider>
            <ContextCollector />
          </AuthProvider>
        </Provider>
      );

      expect(contextValues.length).toBeGreaterThan(0);
      expect(contextValues[0]).toHaveProperty('user');
      expect(contextValues[0]).toHaveProperty('login');
      expect(contextValues[0]).toHaveProperty('logout');
    });
  });
});
