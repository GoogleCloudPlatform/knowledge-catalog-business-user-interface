import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeEach, afterEach, it, describe, expect } from 'vitest';
import React from 'react';
import { NoAccessModal } from './NoAccessModal';

// Use vi.hoisted for dialog callback capture
const { dialogCallbacks } = vi.hoisted(() => ({
  dialogCallbacks: {
    onClose: null as ((event: {}, reason: string) => void) | null,
  },
}));

// Mock MUI components
vi.mock('@mui/material', () => ({
  Dialog: ({ children, open, onClose }: { children: React.ReactNode; open: boolean; onClose?: (event: {}, reason: string) => void }) => {
    dialogCallbacks.onClose = onClose || null;
    return open ? <div role="dialog" data-testid="mock-dialog">{children}</div> : null;
  },
  Box: ({ children }: { children: React.ReactNode }) => <div className="MuiBox-root">{children}</div>,
  Typography: ({ children, component }: { children: React.ReactNode; component?: string }) => {
    if (component === 'h2') return <h2>{children}</h2>;
    return <span>{children}</span>;
  },
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('NoAccessModal', () => {
  const defaultProps = {
    open: true,
    onSignIn: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('should render the component with default props', () => {
      render(<NoAccessModal {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
      expect(
        screen.getByText(/You do not have permission to access this resource/)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In Again/i })).toBeInTheDocument();
    });

    it('should render when open is true and hide when open is false', () => {
      const { rerender } = render(<NoAccessModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();

      rerender(<NoAccessModal {...defaultProps} open={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });

    it('should render footer text', () => {
      render(<NoAccessModal {...defaultProps} />);

      expect(
        screen.getByText(/if you continue to experience issues, please contact your system administrator/i)
      ).toBeInTheDocument();
    });

    it('should render the cancel icon', () => {
      render(<NoAccessModal {...defaultProps} />);

      const icon = document.querySelector('.material-symbols-outlined');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('cancel');
    });
  });

  describe('message prop', () => {
    it('should display default message when no message prop is provided', () => {
      render(<NoAccessModal {...defaultProps} />);

      expect(
        screen.getByText(
          'You do not have permission to access this resource. This may be because you did not grant the required permissions during sign-in, or your account lacks the necessary roles. Please sign in again and ensure all requested permissions are accepted.'
        )
      ).toBeInTheDocument();
    });

    it('should display custom message when message prop is provided', () => {
      const customMessage = 'Custom access denied message for testing.';
      render(<NoAccessModal {...defaultProps} message={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(
        screen.queryByText(/You do not have permission to access this resource/)
      ).not.toBeInTheDocument();
    });

    it('should display default message when message is null', () => {
      render(<NoAccessModal {...defaultProps} message={null} />);

      expect(
        screen.getByText(/You do not have permission to access this resource/)
      ).toBeInTheDocument();
    });

    it('should display default message when message is empty string', () => {
      render(<NoAccessModal {...defaultProps} message="" />);

      // Empty string is falsy, so default message should be shown
      expect(
        screen.getByText(/You do not have permission to access this resource/)
      ).toBeInTheDocument();
    });

    it('should display very long custom message', () => {
      const longMessage = 'A'.repeat(500);
      render(<NoAccessModal {...defaultProps} message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in custom message', () => {
      const specialMessage = 'Error: <script>alert("xss")</script> & other "special" chars';
      render(<NoAccessModal {...defaultProps} message={specialMessage} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });

  describe('onSignIn callback', () => {
    it('should call onSignIn when Sign In Again button is clicked', () => {
      const onSignIn = vi.fn();
      render(<NoAccessModal {...defaultProps} onSignIn={onSignIn} />);

      const button = screen.getByRole('button', { name: /Sign In Again/i });
      fireEvent.click(button);

      expect(onSignIn).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks on Sign In Again button', () => {
      const onSignIn = vi.fn();
      render(<NoAccessModal {...defaultProps} onSignIn={onSignIn} />);

      const button = screen.getByRole('button', { name: /Sign In Again/i });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(onSignIn).toHaveBeenCalledTimes(3);
    });
  });

  describe('dialog close handling', () => {
    it('should prevent closing on backdrop click', () => {
      render(<NoAccessModal {...defaultProps} />);

      if (dialogCallbacks.onClose) {
        dialogCallbacks.onClose({}, 'backdropClick');
      }

      // Dialog should still be present
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should prevent closing on escape key', () => {
      render(<NoAccessModal {...defaultProps} />);

      if (dialogCallbacks.onClose) {
        dialogCallbacks.onClose({}, 'escapeKeyDown');
      }

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle other close reasons', () => {
      render(<NoAccessModal {...defaultProps} />);

      if (dialogCallbacks.onClose) {
        dialogCallbacks.onClose({}, 'otherReason');
      }

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<NoAccessModal {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Access Denied');
    });

    it('should have accessible button name', () => {
      render(<NoAccessModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Sign In Again/i })).toBeInTheDocument();
    });

    it('should render button as interactive element', () => {
      render(<NoAccessModal {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Sign In Again/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('prop combinations', () => {
    it('should render correctly with all props provided', () => {
      const customMessage = 'Custom error for testing';
      const onSignIn = vi.fn();

      render(
        <NoAccessModal open={true} message={customMessage} onSignIn={onSignIn} />
      );

      expect(screen.getByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In Again/i })).toBeInTheDocument();
    });

    it('should render correctly with only required props', () => {
      const onSignIn = vi.fn();
      render(<NoAccessModal open={true} onSignIn={onSignIn} />);

      expect(screen.getByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
      expect(
        screen.getByText(/You do not have permission to access this resource/)
      ).toBeInTheDocument();
    });
  });

  describe('named export', () => {
    it('should export NoAccessModal as named export', async () => {
      const module = await import('./NoAccessModal');
      expect(module.NoAccessModal).toBeDefined();
    });
  });
});
