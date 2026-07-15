import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SessionExpired from './SessionExpired';

const createMockStore = () =>
  configureStore({
    reducer: {
      user: (state = { mode: 'light' }) => state,
    },
  });

const renderWithStore = (ui: React.ReactElement) =>
  render(<Provider store={createMockStore()}>{ui}</Provider>);

// Mock functions using vi.hoisted
const { mockLogout, mockNavigate } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockNavigate: vi.fn(),
}));

// Mock useAuth hook
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

// Mock useNavigate hook
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('SessionExpired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('should render the component with default props', () => {
      renderWithStore(<SessionExpired />);

      expect(screen.getByRole('heading', { name: 'Session Expired' })).toBeInTheDocument();
      expect(
        screen.getByText(
          'Your session has expired. Please sign in again to continue using the application.'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    });

    it('should render footer text', () => {
      renderWithStore(<SessionExpired />);

      expect(
        screen.getByText(/if you continue to experience issues, please contact your system administrator/i)
      ).toBeInTheDocument();
    });

    it('should not render Try Again button when onRetry is not provided', () => {
      renderWithStore(<SessionExpired />);

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should render Try Again button when onRetry is provided', () => {
      const onRetry = vi.fn();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should render both Sign In and Try Again buttons when onRetry is provided', () => {
      const onRetry = vi.fn();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('getTitle function - renders correct title based on reason', () => {
    it('should display "Session Expired" for session_expired reason', () => {
      renderWithStore(<SessionExpired reason="session_expired" />);

      expect(screen.getByRole('heading', { name: 'Session Expired' })).toBeInTheDocument();
    });

    it('should display "Access Token Expired" for token_expired reason', () => {
      renderWithStore(<SessionExpired reason="token_expired" />);

      expect(screen.getByRole('heading', { name: 'Access Token Expired' })).toBeInTheDocument();
    });

    it('should display "Access Denied" for unauthorized reason', () => {
      renderWithStore(<SessionExpired reason="unauthorized" />);

      expect(screen.getByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    });

    it('should display "Session Expired" when no reason is provided (default)', () => {
      renderWithStore(<SessionExpired />);

      expect(screen.getByRole('heading', { name: 'Session Expired' })).toBeInTheDocument();
    });
  });

  describe('getMessage function - renders correct message based on reason', () => {
    it('should display default session expired message for session_expired reason', () => {
      renderWithStore(<SessionExpired reason="session_expired" />);

      expect(
        screen.getByText(
          'Your session has expired. Please sign in again to continue using the application.'
        )
      ).toBeInTheDocument();
    });

    it('should display token expired message for token_expired reason', () => {
      renderWithStore(<SessionExpired reason="token_expired" />);

      expect(
        screen.getByText(
          'Your access token has expired. Please sign in again to continue using the application.'
        )
      ).toBeInTheDocument();
    });

    it('should display unauthorized message for unauthorized reason', () => {
      renderWithStore(<SessionExpired reason="unauthorized" />);

      expect(
        screen.getByText(
          'You do not have permission to access this resource. Please contact your administrator or sign in with a different account.'
        )
      ).toBeInTheDocument();
    });

    it('should display customMessage when provided regardless of reason', () => {
      const customMessage = 'This is a custom error message.';
      renderWithStore(<SessionExpired reason="token_expired" customMessage={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(
        screen.queryByText(
          'Your access token has expired. Please sign in again to continue using the application.'
        )
      ).not.toBeInTheDocument();
    });

    it('should display customMessage with session_expired reason', () => {
      const customMessage = 'Custom session message';
      renderWithStore(<SessionExpired reason="session_expired" customMessage={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should display customMessage with unauthorized reason', () => {
      const customMessage = 'Custom unauthorized message';
      renderWithStore(<SessionExpired reason="unauthorized" customMessage={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('getIcon function - renders correct icon based on reason', () => {
    it('should render report icon for session_expired reason', () => {
      renderWithStore(<SessionExpired reason="session_expired" />);

      const icon = document.querySelector('.material-symbols-outlined');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('report');
    });

    it('should render history_2 icon for token_expired reason', () => {
      renderWithStore(<SessionExpired reason="token_expired" />);

      const icon = document.querySelector('.material-symbols-outlined');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('history_2');
    });

    it('should render gpp_bad icon for unauthorized reason', () => {
      renderWithStore(<SessionExpired reason="unauthorized" />);

      const icon = document.querySelector('.material-symbols-outlined');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('gpp_bad');
    });

    it('should render report icon when no reason is provided (default)', () => {
      renderWithStore(<SessionExpired />);

      const icon = document.querySelector('.material-symbols-outlined');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('report');
    });
  });

  describe('handleReLogin function', () => {
    it('should call logout and navigate to /login when Sign In Again is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<SessionExpired />);

      const signInButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(signInButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should navigate to /login even if logout throws an error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLogout.mockImplementation(() => {
        throw new Error('Logout failed');
      });

      const user = userEvent.setup();
      renderWithStore(<SessionExpired />);

      const signInButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(signInButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith('Error during logout:', expect.any(Error));
      expect(mockNavigate).toHaveBeenCalledWith('/login');

      consoleError.mockRestore();
    });

    it('should handle async nature of handleReLogin', async () => {
      const user = userEvent.setup();
      renderWithStore(<SessionExpired reason="token_expired" />);

      const signInButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('handleRetry function', () => {
    it('should call onRetry callback when Try Again is clicked and onRetry is provided', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(mockReload).not.toHaveBeenCalled();
    });

    it('should not render Try Again button when onRetry is not provided', () => {
      // The Try Again button only renders when onRetry is provided
      // This means the else branch (window.location.reload) is unreachable through normal UI
      renderWithStore(<SessionExpired />);
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should not call window.location.reload when onRetry is provided', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      expect(onRetry).toHaveBeenCalled();
      expect(mockReload).not.toHaveBeenCalled();
    });
  });

  describe('prop combinations', () => {
    it('should render correctly with all props provided', () => {
      const onRetry = vi.fn();
      const customMessage = 'Custom error message for testing';

      renderWithStore(
        <SessionExpired
          reason="unauthorized"
          customMessage={customMessage}
          onRetry={onRetry}
        />
      );

      expect(screen.getByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should render correctly with only reason prop', () => {
      renderWithStore(<SessionExpired reason="token_expired" />);

      expect(screen.getByRole('heading', { name: 'Access Token Expired' })).toBeInTheDocument();
      expect(
        screen.getByText(
          'Your access token has expired. Please sign in again to continue using the application.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should render correctly with only customMessage prop', () => {
      const customMessage = 'Only custom message provided';
      renderWithStore(<SessionExpired customMessage={customMessage} />);

      expect(screen.getByRole('heading', { name: 'Session Expired' })).toBeInTheDocument();
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should render correctly with only onRetry prop', () => {
      const onRetry = vi.fn();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      expect(screen.getByRole('heading', { name: 'Session Expired' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should handle multiple clicks on Sign In Again button', async () => {
      const user = userEvent.setup();
      renderWithStore(<SessionExpired />);

      const signInButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.click(signInButton);
      await user.click(signInButton);

      expect(mockLogout).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple clicks on Try Again button', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });

      await user.click(tryAgainButton);
      await user.click(tryAgainButton);
      await user.click(tryAgainButton);

      expect(onRetry).toHaveBeenCalledTimes(3);
    });

    it('should allow clicking both buttons', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      const signInButton = screen.getByRole('button', { name: /^sign in$/i });
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });

      await user.click(tryAgainButton);
      await user.click(signInButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string customMessage', () => {
      renderWithStore(<SessionExpired customMessage="" />);

      // Empty string is falsy, so default message should be shown
      expect(
        screen.getByText(
          'Your session has expired. Please sign in again to continue using the application.'
        )
      ).toBeInTheDocument();
    });

    it('should handle very long customMessage', () => {
      const longMessage = 'A'.repeat(500);
      renderWithStore(<SessionExpired customMessage={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in customMessage', () => {
      const specialMessage = 'Error: <script>alert("xss")</script> & other "special" chars';
      renderWithStore(<SessionExpired customMessage={specialMessage} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('should render with all three reason types sequentially', () => {
      const { rerender } = renderWithStore(<SessionExpired reason="session_expired" />);
      expect(screen.getByRole('heading', { name: 'Session Expired' })).toBeInTheDocument();

      rerender(<Provider store={createMockStore()}><SessionExpired reason="token_expired" /></Provider>);
      expect(screen.getByRole('heading', { name: 'Access Token Expired' })).toBeInTheDocument();

      rerender(<Provider store={createMockStore()}><SessionExpired reason="unauthorized" /></Provider>);
      expect(screen.getByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithStore(<SessionExpired />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Session Expired');
    });

    it('should have accessible button names', () => {
      const onRetry = vi.fn();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should render buttons as interactive elements', () => {
      const onRetry = vi.fn();
      renderWithStore(<SessionExpired onRetry={onRetry} />);

      const signInButton = screen.getByRole('button', { name: /^sign in$/i });
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });

      expect(signInButton).not.toBeDisabled();
      expect(tryAgainButton).not.toBeDisabled();
    });
  });

  describe('default export', () => {
    it('should export SessionExpired as default', async () => {
      const module = await import('./SessionExpired');
      expect(module.default).toBeDefined();
    });
  });
});
