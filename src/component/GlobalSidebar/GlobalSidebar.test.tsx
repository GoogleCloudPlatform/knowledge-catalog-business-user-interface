import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalSidebar from './GlobalSidebar';

const mockNavigate = vi.fn();
const mockDispatch = vi.fn();
let mockLocation = { pathname: '/home' };
let mockIsAccessPanelOpen = false;
let mockUser: { token: string; name?: string; email?: string; picture?: string } | null = {
  token: 'test-token',
  name: 'Test User',
  email: 'test@example.com',
  picture: '',
};

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: any) => {
      const mockState = {
        user: { mode: 'light' }
      };
      return selector(mockState);
    },
  };
});

vi.mock('../../contexts/AccessRequestContext', () => ({
  useAccessRequest: () => ({
    isAccessPanelOpen: mockIsAccessPanelOpen,
    setAccessPanelOpen: vi.fn(),
  }),
}));

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../../features/dataProducts/dataProductsSlice', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return {
    ...actual,
    fetchDataProductsList: vi.fn((params) => ({ type: 'dataProducts/fetchDataProductsList', payload: params })),
  };
});

vi.mock('../../features/glossaries/glossariesSlice', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return {
    ...actual,
    fetchGlossaries: vi.fn((params) => ({ type: 'glossaries/fetchGlossaries', payload: params })),
  };
});

vi.mock('./SidebarMenuItem', () => ({
  default: vi.fn(({ icon, label, isActive, onClick, disabled }) => {
    const getLabelText = (l: any): string => {
      if (typeof l === 'string') return l;
      try {
        const children = Array.isArray(l?.props?.children) ? l.props.children : [l?.props?.children];
        return children.filter((c: any) => typeof c === 'string').join(' ');
      } catch { return 'unknown'; }
    };
    const labelText = getLabelText(label);
    const testIdSuffix = labelText.toLowerCase().replace(/\s+/g, '-');
    return (
      <div
        data-testid={`sidebar-menu-item-${testIdSuffix}`}
        data-active={isActive}
        data-disabled={disabled}
        onClick={onClick}
        role="button"
      >
        <span data-testid={`icon-${testIdSuffix}`}>{icon}</span>
        <span>{typeof label === 'string' ? label : labelText}</span>
      </div>
    );
  }),
}));

describe('GlobalSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { pathname: '/home' };
    mockIsAccessPanelOpen = false;
    mockUser = { token: 'test-token', name: 'Test User', email: 'test@example.com', picture: '' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the sidebar navigation', () => {
      render(<GlobalSidebar />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders with global-sidebar class', () => {
      render(<GlobalSidebar />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('global-sidebar');
    });

    it('renders all menu items', () => {
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-search')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toBeInTheDocument();
    });

    it('renders the version number', () => {
      render(<GlobalSidebar />);
      const versionEl = document.querySelector('.sidebar-version');
      expect(versionEl).toBeInTheDocument();
    });

    it('does not render an in-sidebar user card', () => {
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-user-card')).not.toBeInTheDocument();
    });
  });

  describe('Home Menu Item', () => {
    it('does not render Home menu item', () => {
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });
  });

  describe('Search Menu Item', () => {
    it('renders Search menu item', () => {
      render(<GlobalSidebar />);
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('Search click navigates to /home', async () => {
      const user = userEvent.setup();
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-search'));
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });

    it('Search is active when pathname is /home', () => {
      mockLocation = { pathname: '/home' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'true');
    });

    it('Search is not active when pathname is /glossaries', () => {
      mockLocation = { pathname: '/glossaries' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'false');
    });

    it('Search icon is rendered', () => {
      render(<GlobalSidebar />);
      expect(screen.getByTestId('icon-search')).toBeInTheDocument();
    });
  });

  describe('Glossaries Menu Item', () => {
    it('renders Glossaries menu item', () => {
      render(<GlobalSidebar />);
      expect(screen.getByText('Glossaries')).toBeInTheDocument();
    });

    it('Glossaries click navigates to /glossaries and dispatches fetchGlossaries', async () => {
      const user = userEvent.setup();
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-glossaries'));
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/glossaries');
    });

    it('Glossaries is active when pathname is /glossaries', () => {
      mockLocation = { pathname: '/glossaries' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'true');
    });

    it('Glossaries is not active when on other paths', () => {
      mockLocation = { pathname: '/home' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'false');
    });
  });

  describe('Aspects Menu Item', () => {
    it('renders Aspects menu item', () => {
      render(<GlobalSidebar />);
      expect(screen.getByText('Aspects')).toBeInTheDocument();
    });

    it('Aspects click navigates to /browse-by-annotation', async () => {
      const user = userEvent.setup();
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-aspects'));
      expect(mockNavigate).toHaveBeenCalledWith('/browse-by-annotation');
    });

    it('Aspects is active when pathname is /browse-by-annotation', () => {
      mockLocation = { pathname: '/browse-by-annotation' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toHaveAttribute('data-active', 'true');
    });

    it('Aspects is not active when on other paths', () => {
      mockLocation = { pathname: '/home' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toHaveAttribute('data-active', 'false');
    });
  });

  describe('Data Products Menu Item', () => {
    it('renders Data Products menu item', () => {
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toBeInTheDocument();
    });

    it('Data Products click dispatches action and navigates', async () => {
      const user = userEvent.setup();
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-data-products'));
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/data-products');
    });

    it('Data Products click dispatches action with user token', async () => {
      const user = userEvent.setup();
      mockUser = { token: 'my-special-token', name: 'Test', email: 'test@test.com', picture: '' };
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-data-products'));
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dataProducts/fetchDataProductsList',
          payload: { id_token: 'my-special-token' },
        })
      );
    });

    it('Data Products click works with null user', async () => {
      const user = userEvent.setup();
      mockUser = null;
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-data-products'));
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { id_token: undefined },
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/data-products');
    });

    it('Data Products is active when pathname starts with /data-products', () => {
      mockLocation = { pathname: '/data-products' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'true');
    });

    it('Data Products is active when on nested data-products path', () => {
      mockLocation = { pathname: '/data-products/some-product' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'true');
    });

    it('Data Products is not active when on other paths', () => {
      mockLocation = { pathname: '/home' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'false');
    });
  });

  describe('z-index behavior', () => {
    it('has higher z-index when access panel is closed', () => {
      mockIsAccessPanelOpen = false;
      render(<GlobalSidebar />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({ zIndex: 1200 });
    });

    it('has lower z-index when access panel is open', () => {
      mockIsAccessPanelOpen = true;
      render(<GlobalSidebar />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({ zIndex: 999 });
    });
  });

  describe('Combined Active States', () => {
    it('only Search is active on /home', () => {
      mockLocation = { pathname: '/home' };
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'false');
    });

    it('only Glossaries is active on /glossaries', () => {
      mockLocation = { pathname: '/glossaries' };
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'false');
    });

    it('only Aspects is active on /browse-by-annotation', () => {
      mockLocation = { pathname: '/browse-by-annotation' };
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'false');
    });

    it('only Data Products is active on /data-products', () => {
      mockLocation = { pathname: '/data-products' };
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'true');
    });

    it('no menu is active on unknown path', () => {
      mockLocation = { pathname: '/unknown-page' };
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'false');
    });
  });

  describe('CSS Classes', () => {
    it('sidebar has global-sidebar class', () => {
      render(<GlobalSidebar />);
      expect(screen.getByRole('navigation')).toHaveClass('global-sidebar');
    });

    it('menu items container has sidebar-menu-items class', () => {
      render(<GlobalSidebar />);
      const menuContainer = document.querySelector('.sidebar-menu-items');
      expect(menuContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders as nav element', () => {
      render(<GlobalSidebar />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('menu items have button role', () => {
      render(<GlobalSidebar />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Navigation Flows', () => {
    it('multiple search clicks work correctly', async () => {
      const user = userEvent.setup();
      render(<GlobalSidebar />);
      const searchItem = screen.getByTestId('sidebar-menu-item-search');
      await user.click(searchItem);
      await user.click(searchItem);
      await user.click(searchItem);
      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, '/home');
      expect(mockNavigate).toHaveBeenNthCalledWith(2, '/home');
      expect(mockNavigate).toHaveBeenNthCalledWith(3, '/home');
    });

    it('navigating to data products after search works', async () => {
      const user = userEvent.setup();
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-search'));
      await user.click(screen.getByTestId('sidebar-menu-item-data-products'));
      expect(mockNavigate).toHaveBeenNthCalledWith(1, '/home');
      expect(mockNavigate).toHaveBeenNthCalledWith(2, '/data-products');
    });

    it('handles fireEvent for Search click', () => {
      render(<GlobalSidebar />);
      fireEvent.click(screen.getByTestId('sidebar-menu-item-search'));
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });

    it('handles fireEvent for Data Products click', () => {
      render(<GlobalSidebar />);
      fireEvent.click(screen.getByTestId('sidebar-menu-item-data-products'));
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/data-products');
    });
  });

  describe('User token handling', () => {
    it('dispatches with user token when available', async () => {
      const user = userEvent.setup();
      mockUser = { token: 'abc123', name: 'Test', email: 'test@test.com', picture: '' };
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-data-products'));
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { id_token: 'abc123' },
        })
      );
    });

    it('dispatches with undefined when user is null', async () => {
      const user = userEvent.setup();
      mockUser = null;
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-data-products'));
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { id_token: undefined },
        })
      );
    });

    it('handles user with empty token', async () => {
      const user = userEvent.setup();
      mockUser = { token: '', name: 'Test', email: 'test@test.com', picture: '' };
      render(<GlobalSidebar />);
      await user.click(screen.getByTestId('sidebar-menu-item-data-products'));
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { id_token: '' },
        })
      );
    });
  });

  describe('Path matching edge cases', () => {
    it('/home matches isSearchActive only', () => {
      mockLocation = { pathname: '/home' };
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'true');
    });

    it('/home-page does not render a Home item', () => {
      mockLocation = { pathname: '/home-page' };
      render(<GlobalSidebar />);
      expect(screen.queryByTestId('sidebar-menu-item-home')).not.toBeInTheDocument();
      expect(screen.getByTestId('sidebar-menu-item-search')).toHaveAttribute('data-active', 'false');
    });

    it('/glossaries matches isGlossariesActive', () => {
      mockLocation = { pathname: '/glossaries' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'true');
    });

    it('/browse-by-annotation matches isAnnotationsActive', () => {
      mockLocation = { pathname: '/browse-by-annotation' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-aspects')).toHaveAttribute('data-active', 'true');
    });

    it('/glossaries-extra does not match isGlossariesActive', () => {
      mockLocation = { pathname: '/glossaries-extra' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-glossaries')).toHaveAttribute('data-active', 'false');
    });

    it('/data-products/id/details matches isDataProductsActive', () => {
      mockLocation = { pathname: '/data-products/id/details' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'true');
    });

    it('/data-products/ matches isDataProductsActive', () => {
      mockLocation = { pathname: '/data-products/' };
      render(<GlobalSidebar />);
      expect(screen.getByTestId('sidebar-menu-item-data-products')).toHaveAttribute('data-active', 'true');
    });
  });
});
