import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Routing from './Routing';

// Mock navigate function
const mockNavigate = vi.fn();
const mockLogout = vi.fn();

// Mock useLocation
let mockLocation = { pathname: '/' };

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock useAuth
let mockUser: { email?: string } | null = null;
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

// Mock useSelector
let mockUserState: { userData?: { hasRole?: boolean }; token?: string } | null = null;
vi.mock('react-redux', () => ({
  useSelector: (selector: any) =>
    selector({ user: mockUserState }),
}));

// Mock child components
vi.mock('../component/Auth/Login/LoginV2', () => ({
  default: () => <div data-testid="login-component">Login Component</div>,
}));

vi.mock('../component/Layout/Layout', () => ({
  default: ({ children, searchBar }: { children: React.ReactNode; searchBar: boolean }) => (
    <div data-testid="layout-component" data-searchbar={searchBar}>
      {children}
    </div>
  ),
}));

vi.mock('../component/Home/Home', () => ({
  default: () => <div data-testid="home-component">Home Component</div>,
}));

vi.mock('../component/SearchPage/SearchPage', () => ({
  default: () => <div data-testid="search-page-component">Search Page Component</div>,
}));

vi.mock('../component/ViewDetails/ViewDetails', () => ({
  default: () => <div data-testid="view-details-component">View Details Component</div>,
}));

vi.mock('../component/AdminPanel/AdminPanel', () => ({
  default: () => <div data-testid="admin-panel-component">Admin Panel Component</div>,
}));

vi.mock('../component/BrowseByAnnotation/BrowseByAnnotation', () => ({
  default: () => <div data-testid="browse-annotation-component">Browse By Annotation Component</div>,
}));

vi.mock('../component/Auth/SessionExpirationWrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-wrapper">{children}</div>
  ),
}));

vi.mock('../component/Guide/UserGuide', () => ({
  default: () => <div data-testid="user-guide-component">User Guide Component</div>,
}));

vi.mock('../component/Glossaries/Glossaries', () => ({
  default: () => <div data-testid="glossaries-component">Glossaries Component</div>,
}));

vi.mock('../component/DataProducts/DataProducts', () => ({
  default: () => <div data-testid="data-products-component">Data Products Component</div>,
}));

vi.mock('../component/DataProducts/DataProductsDetailView', () => ({
  default: () => <div data-testid="data-products-detail-component">Data Products Detail Component</div>,
}));

// Mock ProtectedRoute to render children if user is authenticated
vi.mock('../auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => {
    if (mockUser && mockUser.email) {
      return <>{children}</>;
    }
    return <div data-testid="protected-redirect">Redirecting to login</div>;
  },
}));

// Mock RedirectGuard
vi.mock('../auth/RedirectGuard', () => ({
  RedirectGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockUserState = null;
    mockLocation = { pathname: '/' };
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Root Path Navigation', () => {
    it('should redirect to /login when user is not authenticated at root path', () => {
      mockUser = null;

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routing />
        </MemoryRouter>
      );

      // Navigate should be called or Login should render based on redirect
      expect(screen.queryByTestId('home-component')).not.toBeInTheDocument();
    });

    it('should redirect to /home when user is authenticated at root path', () => {
      mockUser = { email: 'test@example.com' };
      mockUserState = { userData: { hasRole: true } };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routing />
        </MemoryRouter>
      );

      // Should attempt navigation to home
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Login Route', () => {
    it('should render Login component when user is not authenticated', () => {
      mockUser = null;
      mockLocation = { pathname: '/login' };

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('login-component')).toBeInTheDocument();
    });

    it('should redirect away from login when user is authenticated with email', () => {
      mockUser = { email: 'test@example.com' };
      mockUserState = { userData: { hasRole: true } };
      mockLocation = { pathname: '/login' };

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routing />
        </MemoryRouter>
      );

      // Should redirect when user has email
      expect(screen.queryByTestId('login-component')).not.toBeInTheDocument();
    });
  });

  describe('Home Route', () => {
    it('should render Home component when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockUserState = { userData: { hasRole: true } };
      mockLocation = { pathname: '/home' };

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('home-component')).toBeInTheDocument();
      expect(screen.getByTestId('layout-component')).toBeInTheDocument();
      expect(screen.getByTestId('session-wrapper')).toBeInTheDocument();
    });

    it('should redirect to login when user is not authenticated on home route', () => {
      mockUser = null;
      mockLocation = { pathname: '/home' };

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-redirect')).toBeInTheDocument();
    });

  });

  describe('Search Route', () => {
    it('should render SearchPage component when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/search' };

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-page-component')).toBeInTheDocument();
    });

  });

  describe('Permission Required Route', () => {
    it('should render permission required page when authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/permission-required' };

      render(
        <MemoryRouter initialEntries={['/permission-required']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByText('Permission Required')).toBeInTheDocument();
      expect(screen.getByText(/You do not have the required permissions/)).toBeInTheDocument();
    });

    it('should render SignOut button on permission required page', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/permission-required' };

      render(
        <MemoryRouter initialEntries={['/permission-required']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /signout/i })).toBeInTheDocument();
    });

    it('should call logout and clear sessionStorage when SignOut is clicked', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/permission-required' };
      sessionStorage.setItem('welcomeShown', 'true');

      render(
        <MemoryRouter initialEntries={['/permission-required']}>
          <Routing />
        </MemoryRouter>
      );

      const signOutButton = screen.getByRole('button', { name: /signout/i });
      fireEvent.click(signOutButton);

      expect(mockLogout).toHaveBeenCalled();
      expect(sessionStorage.getItem('welcomeShown')).toBeNull();
    });
  });

  describe('View Details Route', () => {
    it('should render ViewDetails component when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/view-details' };

      render(
        <MemoryRouter initialEntries={['/view-details']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('view-details-component')).toBeInTheDocument();
    });
  });

  describe('Browse By Annotation Route', () => {
    it('should render BrowseByAnnotation component when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/browse-by-annotation' };

      render(
        <MemoryRouter initialEntries={['/browse-by-annotation']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('browse-annotation-component')).toBeInTheDocument();
    });
  });

  describe('Glossaries Route', () => {
    it('should render Glossaries component when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/glossaries' };

      render(
        <MemoryRouter initialEntries={['/glossaries']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('glossaries-component')).toBeInTheDocument();
    });
  });

  describe('Data Products Route', () => {
    it('should render DataProducts component when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/data-products' };

      render(
        <MemoryRouter initialEntries={['/data-products']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('data-products-component')).toBeInTheDocument();
    });
  });

  describe('Data Products Details Route', () => {
    it('should render DataProductsDetailView component when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/data-products-details' };

      render(
        <MemoryRouter initialEntries={['/data-products-details']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('data-products-detail-component')).toBeInTheDocument();
    });
  });

  describe('Guide Route', () => {
    it('should render UserGuide component when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/guide' };

      render(
        <MemoryRouter initialEntries={['/guide']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('user-guide-component')).toBeInTheDocument();
    });
  });

  describe('Help Support Route', () => {
    it('should render help support page when user is authenticated', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/help-support' };

      render(
        <MemoryRouter initialEntries={['/help-support']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByText('For help contact over these email')).toBeInTheDocument();
      expect(screen.getByText('Admin/Support Contact Email')).toBeInTheDocument();
      expect(screen.getByText('Knowledge Catalog Business Interface Support')).toBeInTheDocument();
      expect(screen.getByText('dataplex-interface-feedback@google.com')).toBeInTheDocument();
    });
  });

  describe('useEffect Navigation Logic', () => {
    it('should navigate to /home when user has role and at root path', () => {
      mockUser = { email: 'test@example.com' };
      mockUserState = { userData: { hasRole: true } };
      mockLocation = { pathname: '/' };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routing />
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });

    it('should navigate to /login when user does not have role and at root path', () => {
      mockUser = { email: 'test@example.com' };
      mockUserState = { userData: { hasRole: false } };
      mockLocation = { pathname: '/' };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routing />
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should navigate to /home when user has role and at /login path', () => {
      mockUser = { email: 'test@example.com' };
      mockUserState = { userData: { hasRole: true } };
      mockLocation = { pathname: '/login' };

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routing />
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });

    it('should not navigate when user is on a different path', () => {
      mockUser = { email: 'test@example.com' };
      mockUserState = { userData: { hasRole: true } };
      mockLocation = { pathname: '/search' };

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routing />
        </MemoryRouter>
      );

      // Should not call navigate because we're not on / or /login
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when userState is null', () => {
      mockUser = null;
      mockUserState = null;
      mockLocation = { pathname: '/' };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routing />
        </MemoryRouter>
      );

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Protected Routes', () => {
    const protectedPaths = [
      '/home',
      '/search',
      '/permission-required',
      '/view-details',
      '/browse-by-annotation',
      '/glossaries',
      '/data-products',
      '/data-products-details',
      '/guide',
      '/help-support',
    ];

    protectedPaths.forEach((path) => {
      it(`should redirect to login when accessing ${path} without authentication`, () => {
        mockUser = null;
        mockLocation = { pathname: path };

        render(
          <MemoryRouter initialEntries={[path]}>
            <Routing />
          </MemoryRouter>
        );

        expect(screen.getByTestId('protected-redirect')).toBeInTheDocument();
      });
    });
  });

  describe('Layout Configuration', () => {
    it('should wrap routes with Layout component', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/view-details' };

      render(
        <MemoryRouter initialEntries={['/view-details']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('layout-component')).toBeInTheDocument();
    });

    it('should wrap routes with SessionExpirationWrapper', () => {
      mockUser = { email: 'test@example.com' };
      mockLocation = { pathname: '/glossaries' };

      render(
        <MemoryRouter initialEntries={['/glossaries']}>
          <Routing />
        </MemoryRouter>
      );

      expect(screen.getByTestId('session-wrapper')).toBeInTheDocument();
    });
  });

  describe('Component Export', () => {
    it('should export Routing as default', () => {
      expect(Routing).toBeDefined();
      expect(typeof Routing).toBe('function');
    });
  });
});
