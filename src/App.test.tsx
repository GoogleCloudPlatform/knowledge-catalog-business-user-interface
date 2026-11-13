import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock MUI CssBaseline
vi.mock('@mui/material', () => ({
  CssBaseline: () => <div data-testid="css-baseline">CssBaseline</div>,
}));

// Mock Routing component
vi.mock('./routes/Routing', () => ({
  default: () => <div data-testid="routing">Routing Component</div>,
}));

// The redeploy watcher renders nothing and needs NotificationProvider; it is
// covered by src/hooks/useAppVersionCheck.test.ts.
const { mockWatcher } = vi.hoisted(() => ({ mockWatcher: vi.fn(() => null) }));
vi.mock('./hooks/useAppVersionCheck', () => ({ AppVersionWatcher: mockWatcher }));

describe('App', () => {
  it('mounts the redeploy watcher', async () => {
    const { render } = await import('@testing-library/react');
    const { default: AppComponent } = await import('./App');
    render(<AppComponent />);
    expect(mockWatcher).toHaveBeenCalled();
  });

  describe('rendering', () => {
    it('should render CssBaseline component', () => {
      render(<App />);

      expect(screen.getByTestId('css-baseline')).toBeInTheDocument();
    });

    it('should render Routing component', () => {
      render(<App />);

      expect(screen.getByTestId('routing')).toBeInTheDocument();
    });

    it('should render both CssBaseline and Routing together', () => {
      render(<App />);

      expect(screen.getByTestId('css-baseline')).toBeInTheDocument();
      expect(screen.getByTestId('routing')).toBeInTheDocument();
    });

    it('should render CssBaseline before Routing', () => {
      const { container } = render(<App />);

      const children = container.firstChild?.childNodes;
      expect(children).toBeTruthy();

      // Get the order of elements
      const elements = Array.from(container.querySelectorAll('[data-testid]'));
      const cssBaselineIndex = elements.findIndex(
        (el) => el.getAttribute('data-testid') === 'css-baseline'
      );
      const routingIndex = elements.findIndex(
        (el) => el.getAttribute('data-testid') === 'routing'
      );

      expect(cssBaselineIndex).toBeLessThan(routingIndex);
    });
  });

  describe('component structure', () => {
    it('should render as a fragment with two children', () => {
      const { container } = render(<App />);

      // The fragment renders its children directly into the container's div
      const testIds = container.querySelectorAll('[data-testid]');
      expect(testIds.length).toBe(2);
    });

    it('should not have any wrapper element around children', () => {
      const { container } = render(<App />);

      // The direct child of container should be a div (from render)
      // which contains the fragment's children
      const children = container.firstChild;
      expect(children).toBeTruthy();
    });
  });

  describe('default export', () => {
    it('should export App as default', async () => {
      const module = await import('./App');
      expect(module.default).toBeDefined();
    });

    it('should export a function component', async () => {
      const module = await import('./App');
      expect(typeof module.default).toBe('function');
    });
  });

  describe('multiple renders', () => {
    it('should render consistently on multiple renders', () => {
      const { rerender } = render(<App />);

      expect(screen.getByTestId('css-baseline')).toBeInTheDocument();
      expect(screen.getByTestId('routing')).toBeInTheDocument();

      rerender(<App />);

      expect(screen.getByTestId('css-baseline')).toBeInTheDocument();
      expect(screen.getByTestId('routing')).toBeInTheDocument();
    });

    it('should unmount and remount correctly', () => {
      const { unmount } = render(<App />);

      expect(screen.getByTestId('css-baseline')).toBeInTheDocument();
      expect(screen.getByTestId('routing')).toBeInTheDocument();

      unmount();

      expect(screen.queryByTestId('css-baseline')).not.toBeInTheDocument();
      expect(screen.queryByTestId('routing')).not.toBeInTheDocument();

      // Render again
      render(<App />);

      expect(screen.getByTestId('css-baseline')).toBeInTheDocument();
      expect(screen.getByTestId('routing')).toBeInTheDocument();
    });
  });
});
