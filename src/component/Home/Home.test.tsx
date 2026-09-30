import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, beforeEach, it, describe, expect } from 'vitest';
import Home from './Home';
import axios from 'axios';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock react-redux
const mockDispatch = vi.fn();
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

// Mock axios - only used here for the OAuth-scope/IAM permission check effect
vi.mock('axios');

// Mock auth provider - will be set per test
let mockAuthContext: { user: unknown } = { user: null };
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => mockAuthContext
}));

// Mock NoAccessContext
const mockTriggerNoAccess = vi.fn();
vi.mock('../../contexts/NoAccessContext', () => ({
  useNoAccess: () => ({
    isNoAccessOpen: false,
    noAccessMessage: null,
    triggerNoAccess: mockTriggerNoAccess,
    dismissNoAccess: vi.fn(),
  }),
}));

// Mock the shared app bootstrap status - Home only *reads* it now; the
// fetch/dispatch logic itself is covered by useAppBootstrap.test.ts.
// Home gates on isAppConfigReady only: it needs neither appConfig nor the
// project list, so it must not wait on a /get-projects round-trip.
let mockIsBootstrapping = false;
vi.mock('../../hooks/useAppBootstrap', () => ({
  useAppBootstrapStatus: () => ({
    isAppConfigReady: !mockIsBootstrapping,
    areProjectsReady: !mockIsBootstrapping,
    isBootstrapping: mockIsBootstrapping,
  }),
}));

// Mock constants
vi.mock('../../constants/urls', () => ({
  URLS: {
    API_URL: 'http://localhost:3000/api',
    CHECK_PERMISSIONS: '/check-permissions',
  }
}));

vi.mock('../../constants/auth', () => ({
  REQUIRED_PERMISSIONS: [
    'dataplex.lakes.get',
    'dataplex.lakes.list',
  ],
}));

// Mock SearchBar component
vi.mock('../SearchBar/SearchBar', () => ({
  default: function MockSearchBar({ handleSearchSubmit, variant, dataSearch }: { handleSearchSubmit: (text: string) => void; variant: string; dataSearch: Array<{ name: string }> }) {
    return (
      <div data-testid="search-bar">
        <input
          data-testid="search-input"
          placeholder="Search..."
          onChange={(e) => {
            if (e.target.value) {
              handleSearchSubmit(e.target.value);
            }
          }}
        />
        <div data-testid="search-variant">{variant}</div>
        <div data-testid="search-data">{JSON.stringify(dataSearch)}</div>
      </div>
    );
  }
}));

// Mock CSS file
vi.mock('./Home.css', () => ({}));

describe('Home', () => {
  const mockUser = {
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

  // Mock sessionStorage
  const mockSessionStorage = (() => {
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
      })
    };
  })();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    mockIsBootstrapping = false;
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });

    vi.mocked(axios.post).mockResolvedValue({ data: { hasPermission: true } });
    if (!axios.defaults) {
      (axios as any).defaults = { headers: { common: {} } };
    }
    localStorage.removeItem('scopeCheckFailed');
  });

  const renderHome = (user: unknown = mockUser, isBootstrapping = false) => {
    mockAuthContext = { user };
    mockIsBootstrapping = isBootstrapping;

    return render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
  };

  describe('Loading state', () => {
    it('shows CircularProgress while the app bootstrap is in progress', () => {
      renderHome(mockUser, true);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows home banner once the app bootstrap has completed', async () => {
      renderHome(mockUser, false);

      await waitFor(() => {
        expect(screen.getByText('What would you like to discover?')).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Redux integration', () => {
    it('dispatches resources state reset actions on mount', async () => {
      renderHome();

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'resources/setItemsPreviousPageRequest',
          payload: null
        });
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'resources/setItemsPageRequest',
          payload: null
        });
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'resources/setItemsStoreData',
          payload: []
        });
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'resources/setItems',
          payload: []
        });
      });
    });
  });

  describe('Search functionality', () => {
    it('handleSearch navigates to /search route', async () => {
      renderHome();

      await waitFor(() => {
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/search');
      });
    });

    it('handleSearch dispatches all 4 resource reset actions', async () => {
      renderHome();

      await waitFor(() => {
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      });

      mockDispatch.mockClear();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(4);
      });
    });

    it('SearchBar receives correct props', async () => {
      renderHome();

      await waitFor(() => {
        expect(screen.getByTestId('search-variant')).toHaveTextContent('default');
        const searchData = screen.getByTestId('search-data');
        expect(searchData).toHaveTextContent('BigQuery');
        expect(searchData).toHaveTextContent('Data Warehouse');
        expect(searchData).toHaveTextContent('Data Lake');
        expect(searchData).toHaveTextContent('Data Pipeline');
        expect(searchData).toHaveTextContent('GCS');
      });
    });
  });

  describe('Rendering', () => {
    it('renders correct heading text', async () => {
      renderHome();

      await waitFor(() => {
        expect(screen.getByText('What would you like to discover?')).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes', async () => {
      renderHome();

      await waitFor(() => {
        expect(document.querySelector('.home')).toBeInTheDocument();
        expect(document.querySelector('.home-body')).toBeInTheDocument();
        expect(document.querySelector('.home-banner')).toBeInTheDocument();
        expect(document.querySelector('.home-search-container')).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('handles user with empty token', async () => {
      renderHome({ ...mockUser, token: '' });

      await waitFor(() => {
        expect(screen.getByText('What would you like to discover?')).toBeInTheDocument();
      });
    });

    it('handles multiple search submissions without duplicate navigation issues', async () => {
      renderHome();

      await waitFor(() => {
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-input');

      fireEvent.change(searchInput, { target: { value: 'search 1' } });
      fireEvent.change(searchInput, { target: { value: 'search 2' } });
      fireEvent.change(searchInput, { target: { value: 'search 3' } });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(3);
      });
    });
  });
});
