import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';
import { AuthContext } from '../../auth/AuthProvider';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from '../../app/store';

let mockLocation = { pathname: '/home' };
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation
  };
});

const mockDispatch = vi.fn();
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: any) => {
      const mockState = {
        search: {
          searchTerm: '',
          searchFilters: {},
          semanticSearch: false,
          isSearchFiltersOpen: false,
          isSideNavOpen: false,
        },
        user: {
          mode: 'light'
        }
      };
      return selector(mockState);
    }
  };
});

vi.mock('./SendFeedback', () => ({
  default: function MockSendFeedback({ isOpen, onClose, onSubmitSuccess }: any) {
    return (
      <div data-testid="send-feedback" style={{ display: isOpen ? 'block' : 'none' }}>
        <button data-testid="close-feedback" onClick={onClose}>Close</button>
        <button
          data-testid="submit-feedback"
          onClick={() => onSubmitSuccess('Feedback sent')}
        >
          Submit
        </button>
      </div>
    );
  }
}));

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: () => vi.fn(),
  GoogleOAuthProvider: ({ children }: any) => children,
}));

vi.mock('../SearchPage/NotificationBar', () => ({
  default: function MockNotificationBar({ isVisible, onClose, onUndo, message }: any) {
    if (!isVisible) return null;
    return (
      <div data-testid="notification-bar">
        <span data-testid="notification-message">{message}</span>
        <button data-testid="close-notification" onClick={onClose}>Close</button>
        {onUndo && <button data-testid="undo-notification" onClick={onUndo}>Undo</button>}
      </div>
    );
  }
}));

vi.mock('./UserAccountDropdown', () => ({
  default: function MockUserAccountDropdown({ open, onClose }: any) {
    return open ? (
      <div data-testid="user-account-dropdown">
        <button onClick={onClose}>Close Dropdown</button>
      </div>
    ) : null;
  }
}));

const mockSessionStorage = {
  removeItem: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

describe('Navbar', () => {
  const mockUser = {
    name: 'Test User',
    email: 'testuser@sample.com',
    picture: 'https://example.com/avatar.jpg',
    token: 'random-token',
    tokenExpiry: Math.floor(Date.now() / 1000) + 3600,
    tokenIssuedAt: Math.floor(Date.now() / 1000),
    hasRole: true,
    roles: [],
    permissions: [],
    iamDisplayRole: 'Viewer',
    appConfig: {
      aspects: {},
      projects: {},
      defaultSearchProduct: {},
      defaultSearchAssets: {},
      browseByAspectTypes: {},
      browseByAspectTypesLabels: {},
    }
  };

  const mockAuthContextValue = {
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    silentLogin: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { pathname: '/home' };
    mockSessionStorage.removeItem.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderNavbar = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContextValue}>
            <Navbar />
          </AuthContext.Provider>
        </BrowserRouter>
      </Provider>
    );
  };

  describe('Structure', () => {
    it('renders the navbar with Guide and Feedback icons', () => {
      renderNavbar();
      // expect(screen.getByLabelText('Guide')).toBeInTheDocument();
      expect(screen.getByLabelText('Feedback')).toBeInTheDocument();
    });

    it('renders the Knowledge Catalog logo (desktop)', () => {
      renderNavbar();
      expect(screen.getByAltText('Knowledge Catalog')).toBeInTheDocument();
    });

    it('renders the user avatar', () => {
      renderNavbar();
      expect(screen.getByAltText('Test User')).toBeInTheDocument();
    });

    it('exposes an Open settings button for the avatar', () => {
      renderNavbar();
      expect(screen.getByLabelText('Open settings')).toBeInTheDocument();
    });

    it('does not render a search bar', () => {
      renderNavbar();
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });

    it('renders mobile menu button', () => {
      renderNavbar();
      expect(screen.getByLabelText('account of current user')).toBeInTheDocument();
    });
  });

  describe('Logo click', () => {
    it('navigates to /home when logo is clicked', () => {
      renderNavbar();
      fireEvent.click(screen.getByAltText('Knowledge Catalog'));
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });

    it('calls updateUser when logo is clicked with a logged-in user', () => {
      renderNavbar();
      fireEvent.click(screen.getByAltText('Knowledge Catalog'));
      expect(mockAuthContextValue.updateUser).toHaveBeenCalled();
    });
  });

  // describe('Guide button', () => {
  //   it('navigates to /guide when clicked', () => {
  //     renderNavbar();
  //     fireEvent.click(screen.getByLabelText('Guide'));
  //     expect(mockNavigate).toHaveBeenCalledWith('/guide');
  //   });

  //   it('handles rapid clicks', () => {
  //     renderNavbar();
  //     const guideButton = screen.getByLabelText('Guide');
  //     fireEvent.click(guideButton);
  //     fireEvent.click(guideButton);
  //     fireEvent.click(guideButton);
  //     expect(mockNavigate).toHaveBeenCalledTimes(3);
  //   });
  // });

  describe('Feedback dialog', () => {
    it('feedback dialog is initially closed', () => {
      renderNavbar();
      expect(screen.getByTestId('send-feedback')).toHaveStyle({ display: 'none' });
    });

    it('opens feedback dialog when Feedback icon is clicked', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Feedback'));
      expect(screen.getByTestId('send-feedback')).toHaveStyle({ display: 'block' });
    });

    it('closes feedback dialog when close button is clicked', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Feedback'));
      fireEvent.click(screen.getByTestId('close-feedback'));
      expect(screen.getByTestId('send-feedback')).toHaveStyle({ display: 'none' });
    });

    it('shows notification when feedback is submitted', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Feedback'));
      fireEvent.click(screen.getByTestId('submit-feedback'));
      expect(screen.getByTestId('notification-bar')).toBeInTheDocument();
      expect(screen.getByTestId('notification-message')).toHaveTextContent('Feedback sent');
    });

    it('schedules auto-hide for the notification', () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Feedback'));
      fireEvent.click(screen.getByTestId('submit-feedback'));
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      setTimeoutSpy.mockRestore();
    });
  });

  describe('NotificationBar', () => {
    it('is hidden initially', () => {
      renderNavbar();
      expect(screen.queryByTestId('notification-bar')).not.toBeInTheDocument();
    });

    it('closes when close action fires', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Feedback'));
      fireEvent.click(screen.getByTestId('submit-feedback'));
      fireEvent.click(screen.getByTestId('close-notification'));
      expect(screen.queryByTestId('notification-bar')).not.toBeInTheDocument();
    });

    it('closes when undo action fires', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Feedback'));
      fireEvent.click(screen.getByTestId('submit-feedback'));
      fireEvent.click(screen.getByTestId('undo-notification'));
      expect(screen.queryByTestId('notification-bar')).not.toBeInTheDocument();
    });
  });

  describe('Mobile menu', () => {
    it('opens when menu button is clicked', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('account of current user'));
      // expect(screen.getByText('Guide')).toBeInTheDocument();
      expect(screen.getByText('Feedback')).toBeInTheDocument();
    });

    // it('Guide item in mobile menu navigates to /guide', () => {
    //   renderNavbar();
    //   fireEvent.click(screen.getByLabelText('account of current user'));
    //   fireEvent.click(screen.getByText('Guide'));
    //   expect(mockNavigate).toHaveBeenCalledWith('/guide');
    // });

    it('Feedback item in mobile menu opens feedback dialog', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('account of current user'));
      fireEvent.click(screen.getByText('Feedback'));
      expect(screen.getByTestId('send-feedback')).toHaveStyle({ display: 'block' });
    });
  });

  describe('UserAccountDropdown', () => {
    it('is not rendered until avatar is clicked', () => {
      renderNavbar();
      expect(screen.queryByTestId('user-account-dropdown')).not.toBeInTheDocument();
    });

    it('opens when avatar is clicked', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Open settings'));
      expect(screen.getByTestId('user-account-dropdown')).toBeInTheDocument();
    });

    it('closes when its close callback fires', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Open settings'));
      fireEvent.click(screen.getByText('Close Dropdown'));
      expect(screen.queryByTestId('user-account-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('Missing user data', () => {
    it('renders without crashing when user is null', () => {
      const authContextWithoutUser = { ...mockAuthContextValue, user: null };
      render(
        <Provider store={store}>
          <BrowserRouter>
            <AuthContext.Provider value={authContextWithoutUser}>
              <Navbar />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );
      expect(screen.getByLabelText('account of current user')).toBeInTheDocument();
    });

    it('does not call updateUser when user is null', () => {
      const authContextWithoutUser = { ...mockAuthContextValue, user: null };
      render(
        <Provider store={store}>
          <BrowserRouter>
            <AuthContext.Provider value={authContextWithoutUser}>
              <Navbar />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );
      fireEvent.click(screen.getByAltText('Knowledge Catalog'));
      expect(mockAuthContextValue.updateUser).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });
});
