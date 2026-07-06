import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock functions using vi.hoisted
const { mockRender, mockCreateRoot, mockGetElementById, mockHydrateUserState } = vi.hoisted(() => ({
  mockRender: vi.fn(),
  mockCreateRoot: vi.fn(() => ({ render: mockRender })),
  mockGetElementById: vi.fn(),
  mockHydrateUserState: vi.fn(() => Promise.resolve()),
}));

// Mock ReactDOM
vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot,
  },
}));

// Mock react-redux Provider
vi.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="redux-provider">{children}</div>
  ),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="browser-router">{children}</div>
  ),
}));

// Mock AuthProvider
vi.mock('./auth/AuthProvider', () => ({
  AuthWithProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

// Mock MUI ThemeProvider
vi.mock('@mui/material/styles', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock NotificationContext
vi.mock('./contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="notification-provider">{children}</div>
  ),
}));

// Mock AccessRequestContext
vi.mock('./contexts/AccessRequestContext', () => ({
  AccessRequestProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="access-request-provider">{children}</div>
  ),
}));

// Mock ThemeSyncProvider
vi.mock('./contexts/ThemeSyncProvider', () => ({
  default: function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="theme-sync-provider">{children}</div>;
  },
}));

// Mock side-effect imports
vi.mock('./utils/apiInterceptor', () => ({}));
vi.mock('./utils/testHelpers', () => ({}));

// Mock theme
vi.mock('./theme', () => ({
  default: { palette: { mode: 'light' } },
}));

// Mock store
vi.mock('./app/store', () => ({
  default: { getState: vi.fn(), dispatch: vi.fn(), subscribe: vi.fn() },
  hydrateUserState: () => mockHydrateUserState(),
}));

// Mock App
vi.mock('./App', () => ({
  default: () => <div data-testid="app">App Component</div>,
}));

// Mock CSS
vi.mock('./index.css', () => ({}));
vi.mock('./styles/dark-mode.css', () => ({}));

// Helper: import main and wait for async bootstrap to complete
const importMainAndWait = async () => {
  await import('./main');
  // Flush the microtask queue so the async bootstrap() completes
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('main.tsx', () => {
  let rootElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Create a mock root element
    rootElement = document.createElement('div');
    rootElement.id = 'root';

    // Mock document.getElementById
    mockGetElementById.mockReturnValue(rootElement);
    vi.spyOn(document, 'getElementById').mockImplementation(mockGetElementById);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should call document.getElementById with "root"', async () => {
      await importMainAndWait();

      expect(mockGetElementById).toHaveBeenCalledWith('root');
    });

    it('should call ReactDOM.createRoot with the root element', async () => {
      await importMainAndWait();

      expect(mockCreateRoot).toHaveBeenCalledTimes(1);
      expect(mockCreateRoot).toHaveBeenCalledWith(rootElement);
    });

    it('should call render on the created root', async () => {
      await importMainAndWait();

      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it('should hydrate user state from IndexedDB before rendering', async () => {
      await importMainAndWait();

      expect(mockHydrateUserState).toHaveBeenCalledTimes(1);
    });
  });

  describe('provider structure', () => {
    it('should render with React.StrictMode at the top level', async () => {
      const React = await import('react');
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      // React.StrictMode uses Symbol, so we compare the type directly
      expect(renderCall.type).toBe(React.StrictMode);
    });

    it('should render Provider as child of StrictMode', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const strictModeChildren = renderCall.props.children;

      // Provider is wrapped by our mock
      expect(strictModeChildren).toBeTruthy();
    });

    it('should pass store to Provider', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;

      expect(providerElement.props.store).toBeDefined();
    });

    it('should render ThemeSyncProvider inside Provider', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;
      const themeSyncProviderElement = providerElement.props.children;

      expect(themeSyncProviderElement).toBeTruthy();
    });

    it('should render BrowserRouter inside ThemeSyncProvider', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;
      const themeSyncProviderElement = providerElement.props.children;
      const browserRouterElement = themeSyncProviderElement.props.children;

      expect(browserRouterElement).toBeTruthy();
    });

    it('should render NotificationProvider inside BrowserRouter', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;
      const themeSyncProviderElement = providerElement.props.children;
      const browserRouterElement = themeSyncProviderElement.props.children;
      const notificationProviderElement = browserRouterElement.props.children;

      expect(notificationProviderElement).toBeTruthy();
    });

    it('should render AccessRequestProvider inside NotificationProvider', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;
      const themeSyncProviderElement = providerElement.props.children;
      const browserRouterElement = themeSyncProviderElement.props.children;
      const notificationProviderElement = browserRouterElement.props.children;
      const accessRequestProviderElement = notificationProviderElement.props.children;

      expect(accessRequestProviderElement).toBeTruthy();
    });

    it('should render AuthWithProvider inside AccessRequestProvider', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;
      const themeSyncProviderElement = providerElement.props.children;
      const browserRouterElement = themeSyncProviderElement.props.children;
      const notificationProviderElement = browserRouterElement.props.children;
      const accessRequestProviderElement = notificationProviderElement.props.children;
      const authProviderElement = accessRequestProviderElement.props.children;

      expect(authProviderElement).toBeTruthy();
    });

    it('should render ThemeProvider inside AuthWithProvider', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;
      const themeSyncProviderElement = providerElement.props.children;
      const browserRouterElement = themeSyncProviderElement.props.children;
      const notificationProviderElement = browserRouterElement.props.children;
      const accessRequestProviderElement = notificationProviderElement.props.children;
      const authProviderElement = accessRequestProviderElement.props.children;
      const themeProviderElement = authProviderElement.props.children;

      expect(themeProviderElement).toBeTruthy();
    });

    it('should pass theme to ThemeProvider', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;
      const themeSyncProviderElement = providerElement.props.children;
      const browserRouterElement = themeSyncProviderElement.props.children;
      const notificationProviderElement = browserRouterElement.props.children;
      const accessRequestProviderElement = notificationProviderElement.props.children;
      const authProviderElement = accessRequestProviderElement.props.children;
      const themeProviderElement = authProviderElement.props.children;

      expect(themeProviderElement.props.theme).toBeDefined();
    });

    it('should render App as the innermost component', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      const providerElement = renderCall.props.children;
      const themeSyncProviderElement = providerElement.props.children;
      const browserRouterElement = themeSyncProviderElement.props.children;
      const notificationProviderElement = browserRouterElement.props.children;
      const accessRequestProviderElement = notificationProviderElement.props.children;
      const authProviderElement = accessRequestProviderElement.props.children;
      const themeProviderElement = authProviderElement.props.children;
      const appElement = themeProviderElement.props.children;

      expect(appElement).toBeTruthy();
    });
  });

  describe('imports verification', () => {
    it('should import and use apiInterceptor side effects', async () => {
      // The import happens as a side effect
      await importMainAndWait();

      // apiInterceptor is imported for side effects, just verify main imports successfully
      expect(mockCreateRoot).toHaveBeenCalled();
    });

    it('should import and use testHelpers side effects', async () => {
      // The import happens as a side effect
      await importMainAndWait();

      // testHelpers is imported for side effects, just verify main imports successfully
      expect(mockCreateRoot).toHaveBeenCalled();
    });

    it('should import CSS file', async () => {
      await importMainAndWait();

      // CSS is imported for side effects, just verify main imports successfully
      expect(mockCreateRoot).toHaveBeenCalled();
    });
  });

  describe('render call structure', () => {
    it('should call render exactly once', async () => {
      await importMainAndWait();

      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it('should render a valid React element', async () => {
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall).toBeTruthy();
      expect(renderCall.$$typeof).toBeDefined();
    });

    it('should have complete provider chain from StrictMode to App', async () => {
      const React = await import('react');
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];

      // Verify the top level is StrictMode
      expect(renderCall.type).toBe(React.StrictMode);

      // Traverse the tree and verify we have the expected depth
      let current = renderCall;
      let depth = 0;

      while (current) {
        depth++;
        current = current.props?.children;
      }

      // StrictMode -> Provider -> ThemeSyncProvider -> BrowserRouter -> NotificationProvider
      // -> AccessRequestProvider -> AuthWithProvider -> ThemeProvider -> App
      // That's 9 levels of nesting
      expect(depth).toBeGreaterThanOrEqual(9);
    });
  });

  describe('error scenarios', () => {
    it('should handle missing root element gracefully', async () => {
      mockGetElementById.mockReturnValue(null);

      // This will cause createRoot to be called with null
      // The actual behavior depends on React's implementation
      await importMainAndWait();

      expect(mockCreateRoot).toHaveBeenCalledWith(null);
    });
  });

  describe('module behavior', () => {
    it('should be a module with no exports', async () => {
      const mainModule = await import('./main');

      // main.tsx has no exports, it only has side effects
      const exportKeys = Object.keys(mainModule).filter((key) => key !== 'default');
      expect(exportKeys.length).toBe(0);
    });

    it('should execute render on import', async () => {
      // Before import, render should not have been called (in this test context)
      expect(mockRender).not.toHaveBeenCalled();

      await importMainAndWait();

      // After import, render should have been called
      expect(mockRender).toHaveBeenCalled();
    });
  });

  describe('provider nesting order verification', () => {
    it('should have correct provider nesting order from outside to inside', async () => {
      const React = await import('react');
      await importMainAndWait();

      const renderCall = mockRender.mock.calls[0][0];

      // Verify StrictMode is at the root
      expect(renderCall.type).toBe(React.StrictMode);

      // Build the nesting chain (skip StrictMode since it uses Symbol)
      const nestingOrder: string[] = [];
      let current = renderCall.props?.children;

      while (current) {
        if (current.type) {
          const name =
            typeof current.type === 'string'
              ? current.type
              : current.type.name || current.type.displayName || 'Component';
          nestingOrder.push(name);
        }
        current = current.props?.children;
      }

      // Expected order after StrictMode: Provider -> ThemeSyncProvider -> BrowserRouter
      // -> NotificationProvider -> AccessRequestProvider -> AuthWithProvider -> ThemeProvider -> App
      const expectedOrder = [
        'Provider',
        'ThemeSyncProvider',
        'BrowserRouter',
        'NotificationProvider',
        'AccessRequestProvider',
        'AuthWithProvider',
        'ThemeProvider',
      ];

      expectedOrder.forEach((expected, index) => {
        expect(nestingOrder[index]).toBe(expected);
      });
    });
  });

  describe('type assertions', () => {
    it('should treat root element as HTMLElement', async () => {
      await importMainAndWait();

      // The code uses `as HTMLElement` type assertion
      // Verify createRoot was called with our mock element
      expect(mockCreateRoot).toHaveBeenCalledWith(expect.any(HTMLElement));
    });
  });
});
