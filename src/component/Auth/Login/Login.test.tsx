import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

// Mock functions using vi.hoisted
const {
  mockLogin,
  mockNavigate,
  mockSearchParamsGet,
  mockGoogleLogin,
  mockSanitizeRedirectURL,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
  mockSearchParamsGet: vi.fn(),
  mockGoogleLogin: vi.fn(),
  mockSanitizeRedirectURL: vi.fn(),
}));

// Capture the useGoogleLogin config to test callbacks
let capturedGoogleLoginConfig: {
  onSuccess?: (tokenResponse: { access_token: string }) => Promise<void>;
  onError?: () => void;
  flow?: string;
  scope?: string;
} = {};

// Mock useAuth hook
vi.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    {
      get: mockSearchParamsGet,
    },
  ],
}));

// Mock @react-oauth/google
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (config: typeof capturedGoogleLoginConfig) => {
    capturedGoogleLoginConfig = config;
    return mockGoogleLogin;
  },
}));

// Mock urlPreservationService
vi.mock('../../../services/urlPreservationService', () => ({
  sanitizeRedirectURL: (url: string) => mockSanitizeRedirectURL(url),
}));

// Mock CSS import
vi.mock('./Login.css', () => ({}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedGoogleLoginConfig = {};
    mockLogin.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('should render the login page with all elements', () => {
      render(<Login />);

      // Check for background image
      const bgImage = screen.getByAltText('Login');
      expect(bgImage).toBeInTheDocument();
      expect(bgImage).toHaveAttribute('src', '/assets/images/BG Image.png');

      // Check for logo
      const logo = screen.getByAltText('Catalog Studio Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/assets/svg/catalog-studio-logo-figma-585de1.svg');

      // Check for text elements
      expect(screen.getByText('Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Catalog')).toBeInTheDocument();

      // Check for login button
      const loginButton = screen.getByRole('button');
      expect(loginButton).toBeInTheDocument();
      expect(screen.getByText('Sign in with Google Cloud')).toBeInTheDocument();

      // Check for Google icon
      const googleIcon = screen.getByAltText('Google Icon');
      expect(googleIcon).toBeInTheDocument();
      expect(googleIcon).toHaveAttribute('src', '/assets/images/google-logo-figma-53c44d.png');
    });

    it('should render the login container structure', () => {
      const { container } = render(<Login />);

      expect(container.querySelector('.login-container-parent')).toBeInTheDocument();
      expect(container.querySelector('.login-container')).toBeInTheDocument();
      expect(container.querySelector('.login-image-container')).toBeInTheDocument();
      expect(container.querySelector('.login-button-container')).toBeInTheDocument();
      expect(container.querySelector('.login-button-card')).toBeInTheDocument();
      expect(container.querySelector('.logo-section')).toBeInTheDocument();
      expect(container.querySelector('.logo-container')).toBeInTheDocument();
    });

    it('should render with correct styling classes', () => {
      const { container } = render(<Login />);

      const loginImage = container.querySelector('.login-image');
      expect(loginImage).toBeInTheDocument();

      const logoImage = container.querySelector('.logo-image');
      expect(logoImage).toBeInTheDocument();

      const loginButton = container.querySelector('.login-button');
      expect(loginButton).toBeInTheDocument();

      const googleIcon = container.querySelector('.google-icon');
      expect(googleIcon).toBeInTheDocument();

      const loginButtonTxt = container.querySelector('.login-button-txt');
      expect(loginButtonTxt).toBeInTheDocument();
    });

    it('should render Knowledge Catalog text with correct color styling', () => {
      render(<Login />);

      const knowledgeText = screen.getByText('Knowledge');
      expect(knowledgeText).toHaveStyle({ color: '#022FCD' }); // #022FCD

      const catalogText = screen.getByText('Catalog');
      expect(catalogText).toHaveStyle({ color: '#022FCD' });
    });
  });

  describe('Google login button', () => {
    it('should call googleLogin when button is clicked', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const loginButton = screen.getByRole('button');
      await user.click(loginButton);

      expect(mockGoogleLogin).toHaveBeenCalledTimes(1);
    });

    it('should call googleLogin on multiple clicks', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const loginButton = screen.getByRole('button');
      await user.click(loginButton);
      await user.click(loginButton);
      await user.click(loginButton);

      expect(mockGoogleLogin).toHaveBeenCalledTimes(3);
    });

    it('should configure useGoogleLogin with correct flow', () => {
      render(<Login />);

      expect(capturedGoogleLoginConfig.flow).toBe('implicit');
    });

    it('should configure useGoogleLogin with correct scopes', () => {
      render(<Login />);

      expect(capturedGoogleLoginConfig.scope).toContain('https://www.googleapis.com/auth/cloud-platform');
      expect(capturedGoogleLoginConfig.scope).toContain('https://www.googleapis.com/auth/userinfo.profile');
      expect(capturedGoogleLoginConfig.scope).toContain('https://www.googleapis.com/auth/userinfo.email');
      expect(capturedGoogleLoginConfig.scope).toContain('https://www.googleapis.com/auth/gmail.send');
    });
  });

  describe('onSuccess callback', () => {
    it('should call login with access_token on successful Google auth', async () => {
      render(<Login />);

      const tokenResponse = { access_token: 'test-access-token-123' };
      await capturedGoogleLoginConfig.onSuccess?.(tokenResponse);

      expect(mockLogin).toHaveBeenCalledWith({
        credential: 'test-access-token-123',
      });
    });

    it('should redirect to sanitized continue URL when provided', async () => {
      mockSearchParamsGet.mockReturnValue('/dashboard');
      mockSanitizeRedirectURL.mockReturnValue('/dashboard');

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<Login />);

      const tokenResponse = { access_token: 'test-token' };
      await capturedGoogleLoginConfig.onSuccess?.(tokenResponse);

      expect(mockSanitizeRedirectURL).toHaveBeenCalledWith('/dashboard');
      expect(consoleLog).toHaveBeenCalledWith('[Login] Redirecting to:', '/dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });

      consoleLog.mockRestore();
    });

    it('should redirect to /home when no continue param', async () => {
      mockSearchParamsGet.mockReturnValue(null);

      render(<Login />);

      const tokenResponse = { access_token: 'test-token' };
      await capturedGoogleLoginConfig.onSuccess?.(tokenResponse);

      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });

    it('should redirect to /home when continue param is invalid', async () => {
      mockSearchParamsGet.mockReturnValue('/malicious-url');
      mockSanitizeRedirectURL.mockReturnValue(null);

      render(<Login />);

      const tokenResponse = { access_token: 'test-token' };
      await capturedGoogleLoginConfig.onSuccess?.(tokenResponse);

      expect(mockSanitizeRedirectURL).toHaveBeenCalledWith('/malicious-url');
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });

    it('should redirect to /home when sanitized URL is empty string', async () => {
      mockSearchParamsGet.mockReturnValue('/some-url');
      mockSanitizeRedirectURL.mockReturnValue('');

      render(<Login />);

      const tokenResponse = { access_token: 'test-token' };
      await capturedGoogleLoginConfig.onSuccess?.(tokenResponse);

      // Empty string is falsy, so it should redirect to /home
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });

    it('should handle various redirect URLs', async () => {
      const testCases = [
        { continueParam: '/settings', sanitized: '/settings' },
        { continueParam: '/profile/edit', sanitized: '/profile/edit' },
        { continueParam: '/search?q=test', sanitized: '/search?q=test' },
        { continueParam: '/page#section', sanitized: '/page#section' },
      ];

      for (const { continueParam, sanitized } of testCases) {
        vi.clearAllMocks();
        mockSearchParamsGet.mockReturnValue(continueParam);
        mockSanitizeRedirectURL.mockReturnValue(sanitized);
        mockLogin.mockResolvedValue(undefined);

        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

        render(<Login />);

        const tokenResponse = { access_token: 'test-token' };
        await capturedGoogleLoginConfig.onSuccess?.(tokenResponse);

        expect(mockNavigate).toHaveBeenCalledWith(sanitized, { replace: true });

        consoleLog.mockRestore();
      }
    });

    it('should await login before navigating', async () => {
      let loginResolved = false;
      mockLogin.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        loginResolved = true;
      });

      mockSearchParamsGet.mockReturnValue(null);

      render(<Login />);

      const tokenResponse = { access_token: 'test-token' };
      const successPromise = capturedGoogleLoginConfig.onSuccess?.(tokenResponse);

      // Navigate should not have been called yet
      expect(mockNavigate).not.toHaveBeenCalled();

      await successPromise;

      // Now navigate should have been called
      expect(loginResolved).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });
  });

  describe('onError callback', () => {
    it('should log error message on Google login failure', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Login />);

      capturedGoogleLoginConfig.onError?.();

      expect(consoleError).toHaveBeenCalledWith('Google Login Failed');

      consoleError.mockRestore();
    });

    it('should handle error callback being called multiple times', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Login />);

      capturedGoogleLoginConfig.onError?.();
      capturedGoogleLoginConfig.onError?.();
      capturedGoogleLoginConfig.onError?.();

      expect(consoleError).toHaveBeenCalledTimes(3);

      consoleError.mockRestore();
    });
  });

  describe('hook integration', () => {
    it('should use useAuth hook to get login function', () => {
      render(<Login />);

      // Verify login is called when onSuccess triggers
      capturedGoogleLoginConfig.onSuccess?.({ access_token: 'token' });

      expect(mockLogin).toHaveBeenCalled();
    });

    it('should use useNavigate for navigation', async () => {
      mockSearchParamsGet.mockReturnValue(null);

      render(<Login />);

      await capturedGoogleLoginConfig.onSuccess?.({ access_token: 'token' });

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should use useSearchParams to get continue param', async () => {
      mockSearchParamsGet.mockReturnValue('/custom-path');
      mockSanitizeRedirectURL.mockReturnValue('/custom-path');

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<Login />);

      await capturedGoogleLoginConfig.onSuccess?.({ access_token: 'token' });

      expect(mockSearchParamsGet).toHaveBeenCalledWith('continue');

      consoleLog.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle login function rejection gracefully', async () => {
      mockLogin.mockRejectedValue(new Error('Login failed'));
      mockSearchParamsGet.mockReturnValue(null);

      render(<Login />);

      // This should throw, but the component doesn't have error handling
      // so we just verify it propagates
      await expect(
        capturedGoogleLoginConfig.onSuccess?.({ access_token: 'token' })
      ).rejects.toThrow('Login failed');
    });

    it('should render correctly after re-render', () => {
      const { rerender } = render(<Login />);

      expect(screen.getByText('Sign in with Google Cloud')).toBeInTheDocument();

      rerender(<Login />);

      expect(screen.getByText('Sign in with Google Cloud')).toBeInTheDocument();
    });

    it('should maintain button functionality after multiple renders', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Login />);

      const loginButton = screen.getByRole('button');
      await user.click(loginButton);

      expect(mockGoogleLogin).toHaveBeenCalledTimes(1);

      rerender(<Login />);

      const loginButtonAfterRerender = screen.getByRole('button');
      await user.click(loginButtonAfterRerender);

      expect(mockGoogleLogin).toHaveBeenCalledTimes(2);
    });
  });

  describe('accessibility', () => {
    it('should have accessible button', () => {
      render(<Login />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have alt text for all images', () => {
      render(<Login />);

      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
    });

    it('should have three images total', () => {
      render(<Login />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(3); // BG image, logo, Google icon
    });
  });

  describe('default export', () => {
    it('should export Login as default', async () => {
      const module = await import('./Login');
      expect(module.default).toBeDefined();
    });
  });
});
