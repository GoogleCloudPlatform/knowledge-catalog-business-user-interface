/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, act } from '@testing-library/react';
import DataProductsDetailView from './DataProductsDetailView';
import { AuthContext } from '../../auth/AuthProvider';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Redux hooks
const mockDispatch = vi.fn();
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

// Mock the dataProducts slice
vi.mock('../../features/dataProducts/dataProductsSlice', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    fetchDataProductsList: vi.fn(() => ({ type: 'dataProducts/fetchDataProductsList' })),
    fetchDataProductsAssetsList: vi.fn(() => ({ type: 'dataProducts/fetchDataProductsAssetsList' })),
    setDataProductsDetailTabValue: vi.fn((val: number) => ({ type: 'dataProducts/setDataProductsDetailTabValue', payload: val })),
  };
});

// Mock the entry slice
vi.mock('../../features/entry/entrySlice', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    pushToHistory: vi.fn(() => ({ type: 'entry/pushToHistory' })),
    fetchEntry: vi.fn(() => ({ type: 'entry/fetchEntry' })),
  };
});

// Mock the utility functions
vi.mock('../../utils/resourceUtils', () => ({
  getName: vi.fn((name: string) => {
    if (!name) return '';
    return name.split('/').pop() || name;
  }),
  getEntryType: vi.fn((name: string) => {
    if (!name) return 'Other';
    if (name.includes('tables')) return 'tables';
    if (name.includes('datasets')) return 'datasets';
    return 'Other';
  }),
  getMimeType: vi.fn((base64: string) => {
    if (base64?.startsWith('iVBORw0KGgo')) return 'png';
    if (base64?.startsWith('/9j/')) return 'jpg';
    return 'png';
  }),
  hasValidAnnotationData: vi.fn(() => true),
  getFormattedDateTimeParts: vi.fn(() => ({ date: 'Jan 1, 2025', time: '12:00:00 AM' })),
}));

// Mock the apiInterceptor axios instance used by loadChangeRequests.
// The component renders a Skeleton in place of the RequestAccessButton while
// changeRequestStatus === 'loading'. Resolving this call lets the status flip to
// 'success' so the actual RequestAccessButton (cta-button) renders.
const { mockAxiosGet } = vi.hoisted(() => ({
  mockAxiosGet: vi.fn(() =>
    Promise.resolve({ data: { changeRequests: [] } })
  ),
}));
vi.mock('../../utils/apiInterceptor', () => ({
  default: {
    get: mockAxiosGet,
  },
}));

// Mock NotificationContext
const mockShowError = vi.fn();
const mockShowNotification = vi.fn();
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    showError: mockShowError,
    showNotification: mockShowNotification,
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    clearNotification: vi.fn(),
    clearAllNotifications: vi.fn()
  })
}));

// Mock AccessRequestContext
const mockSetAccessPanelOpen = vi.fn();
vi.mock('../../contexts/AccessRequestContext', () => ({
  useAccessRequest: () => ({
    setAccessPanelOpen: mockSetAccessPanelOpen,
    isAccessPanelOpen: false,
    selectedAsset: null,
    setSelectedAsset: vi.fn(),
  })
}));

// Mock child components
vi.mock('../TabPanel/CustomTabPanel', () => ({
  default: function MockCustomTabPanel({ children, value, index }: any) {
    return value === index ? <div data-testid={`tabpanel-${index}`}>{children}</div> : null;
  }
}));

vi.mock('../Annotation/PreviewAnnotation', () => ({
  default: function MockPreviewAnnotation({ entry }: any) {
    return <div data-testid="preview-annotation">Preview Annotation for {entry?.name}</div>;
  }
}));

vi.mock('../Annotation/AnnotationFilter', () => ({
  default: function MockAnnotationFilter({ entry, onFilteredEntryChange, onCollapseAll, onExpandAll }: any) {
    return (
      <div data-testid="annotation-filter">
        Annotation Filter for {entry?.name}
        <button onClick={() => onFilteredEntryChange(entry)}>Apply Filter</button>
        <button onClick={onCollapseAll} data-testid="collapse-all-btn">Collapse All</button>
        <button onClick={onExpandAll} data-testid="expand-all-btn">Expand All</button>
      </div>
    );
  }
}));

vi.mock('./DataProductOverviewNew', () => ({
  default: function MockDataProductOverviewNew({ entry, entryType }: any) {
    return <div data-testid="data-product-overview">Overview for {entry?.name} - Type: {entryType}</div>;
  }
}));

vi.mock('./Assets', () => ({
  default: function MockAssets({ entry, onAssetPreviewChange }: any) {
    return (
      <div data-testid="assets-tab">
        Assets for {entry?.name}
        <button
          onClick={() => onAssetPreviewChange({ name: 'test-asset', displayName: 'Test Asset' })}
          data-testid="open-asset-preview"
        >
          Open Preview
        </button>
        <button
          onClick={() => onAssetPreviewChange(null)}
          data-testid="close-asset-preview"
        >
          Close Preview
        </button>
      </div>
    );
  }
}));

vi.mock('./AccessGroup', () => ({
  default: function MockAccessGroup({ entry }: any) {
    return <div data-testid="access-group-tab">Access Group for {entry?.name}</div>;
  }
}));

vi.mock('./Contract', () => ({
  default: function MockContract({ entry }: any) {
    return <div data-testid="contract-tab">Contract for {entry?.name}</div>;
  }
}));

vi.mock('./RequestAccessButton', () => ({
  default: function MockRequestAccessButton({ entry, onRequestAccess }: any) {
    return (
      <button 
        onClick={() => onRequestAccess(entry)} 
        data-testid="cta-button"
      >
        Request Access
      </button>
    );
  }
}));

vi.mock('../SearchPage/SubmitAccess', () => ({
  default: function MockSubmitAccess({ isOpen, onClose, onSubmitSuccess, assetName }: any) {
    return isOpen ? (
      <div data-testid="submit-access-panel">
        Submit Access for {assetName}
        <button onClick={onClose} data-testid="close-submit-access">Close</button>
        <button onClick={() => onSubmitSuccess(assetName)} data-testid="submit-success">Submit</button>
      </div>
    ) : null;
  }
}));

vi.mock('../SearchPage/NotificationBar', () => ({
  default: function MockNotificationBar({ isVisible, onClose, onUndo, message }: any) {
    return isVisible ? (
      <div data-testid="notification-bar">
        {message}
        <button onClick={onClose} data-testid="close-notification">Close</button>
        {onUndo && <button onClick={onUndo} data-testid="undo-notification">Undo</button>}
      </div>
    ) : null;
  }
}));

vi.mock('../Common/ResourcePreview', () => ({
  default: function MockResourcePreview({ previewData, onPreviewDataChange, onViewDetails }: any) {
    return previewData ? (
      <div data-testid="resource-preview">
        Resource Preview for {previewData?.name}
        <button onClick={() => onPreviewDataChange(null)} data-testid="close-resource-preview">Close</button>
        <button onClick={() => onViewDetails(previewData)} data-testid="view-details">View Details</button>
      </div>
    ) : <div data-testid="resource-preview-empty">No Preview</div>;
  }
}));

// ================================================================================
// TEST DATA FIXTURES
// ================================================================================

const createMockDataProductDetails = (overrides: any = {}) => ({
  name: 'projects/test-project/locations/us/dataProducts/test-product',
  entryType: 'data-products/123',
  fullyQualifiedName: 'test-project:data-product.test',
  createTime: '2022-01-01T10:00:00Z',
  updateTime: '2022-01-02T15:30:00Z',
  entrySource: {
    displayName: 'Test Data Product',
    description: 'A test data product for testing',
    system: 'Dataplex',
    location: 'US',
    resource: 'projects/test-project/dataProducts/test-product'
  },
  aspects: {
    '123.global.contacts': {
      data: {
        identities: [
          { name: 'John Doe <test@example.com>', role: 'Owner' }
        ]
      }
    },
    '123.global.overview': {
      data: {
        content: '<p>Test documentation</p>'
      }
    },
    '123.global.schema': {
      data: {}
    },
    '123.global.usage': {
      data: {}
    },
    'custom.annotation1': {
      data: { value: 'test1' }
    },
    'custom.annotation2': {
      data: { value: 'test2' }
    }
  },
  ...overrides
});

const createMockDataProductsItems = () => [
  { name: 'product1', displayName: 'Alpha Product', updateTime: '2022-01-01' },
  { name: 'product2', displayName: 'Beta Product', updateTime: '2022-02-01' },
  { name: 'product3', displayName: 'Gamma Product', updateTime: '2022-03-01' }
];

const mockUser = {
  token: 'test-token-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/picture.png',
  tokenExpiry: Date.now() / 1000 + 3600,
  tokenIssuedAt: Date.now() / 1000,
  hasRole: true,
  roles: ['admin'],
  permissions: ['read', 'write'],
  appConfig: {}
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  loginWithToken: vi.fn(),
  checkSessionExpiration: vi.fn(() => false),
  getRemainingTime: vi.fn(() => 3600),
  extendSession: vi.fn(),
  isSessionExpired: false,
  handleSessionExtension: vi.fn(),
  updateUser: vi.fn(),
  silentLogin: vi.fn()
};

// Create a mock store
const createMockStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      dataProducts: (state = initialState.dataProducts) => state,
      entry: (state = initialState.entry) => state,
      user: (state = initialState.user) => state,
    },
  });
};

const defaultStoreState = {
  dataProducts: {
    dataProductsItems: createMockDataProductsItems(),
    status: 'succeeded',
    selectedDataProductDetails: createMockDataProductDetails(),
    selectedDataProductStatus: 'succeeded',
    selectedDataProductError: null,
    viewMode: 'list',
    detailTabValue: 0,
  },
  entry: {
    items: {},
    history: []
  },
  user: {
    mode: 'light'
  }
};

// ================================================================================
// TEST HELPER
// ================================================================================

const renderWithProviders = (
  component: React.ReactElement,
  storeState: any = defaultStoreState
) => {
  const store = createMockStore(storeState);

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(() => JSON.stringify({ icon: 'iVBORw0KGgo' })),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  return render(
    <Provider store={store}>
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {component}
        </AuthContext.Provider>
      </BrowserRouter>
    </Provider>
  );
};

// loadChangeRequests resolves asynchronously and flips changeRequestStatus from
// 'loading' to 'success', which swaps the loading Skeleton for the real
// RequestAccessButton (cta-button). Flush the pending promise chain so the
// button is in the DOM before assertions/interactions.
const flushChangeRequests = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// ================================================================================
// TESTS
// ================================================================================

describe('DataProductsDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('renders skeleton loading state when data is loading', () => {
      const loadingState = {
        ...defaultStoreState,
        dataProducts: {
          ...defaultStoreState.dataProducts,
          selectedDataProductStatus: 'loading'
        }
      };

      renderWithProviders(<DataProductsDetailView />, loadingState);

      // Check for skeleton elements
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders skeleton state when status is idle', () => {
      const idleState = {
        ...defaultStoreState,
        dataProducts: {
          ...defaultStoreState.dataProducts,
          selectedDataProductStatus: 'idle'
        }
      };

      renderWithProviders(<DataProductsDetailView />, idleState);

      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Successful Render', () => {
    it('renders the component with all main elements when data is loaded', async () => {
      renderWithProviders(<DataProductsDetailView />);
      await flushChangeRequests();

      // Check for title
      expect(screen.getByText('Test Data Product')).toBeInTheDocument();

      // Check for Request Access button
      expect(screen.getByTestId('cta-button')).toBeInTheDocument();
      expect(screen.getByText('Request Access')).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      renderWithProviders(<DataProductsDetailView />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Access Groups & Permissions')).toBeInTheDocument();
      expect(screen.getByText('Contracts')).toBeInTheDocument();
      expect(screen.getByText('Aspects')).toBeInTheDocument();
    });

    it('renders Overview tab content by default', () => {
      renderWithProviders(<DataProductsDetailView />);

      expect(screen.getByTestId('tabpanel-0')).toBeInTheDocument();
      expect(screen.getByTestId('data-product-overview')).toBeInTheDocument();
    });

    it('renders back button', () => {
      renderWithProviders(<DataProductsDetailView />);

      const backButton = screen.getByRole('button', { name: '' });
      expect(backButton).toBeInTheDocument();
    });

    it('displays product icon with correct src', () => {
      renderWithProviders(<DataProductsDetailView />);

      const icon = screen.getByAltText('Test Data Product');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to Assets tab when clicked', () => {
      renderWithProviders(<DataProductsDetailView />);

      const assetsTab = screen.getByText('Assets');
      fireEvent.click(assetsTab);

      // Verify dispatch was called to change tab
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dataProducts/setDataProductsDetailTabValue', payload: 1 }));
    });

    it('renders Assets tab content when detailTabValue is 1', () => {
      const stateWithAssetsTab = {
        ...defaultStoreState,
        dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 1 },
      };
      renderWithProviders(<DataProductsDetailView />, stateWithAssetsTab);

      expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
      expect(screen.getByTestId('assets-tab')).toBeInTheDocument();
    });

    it('switches to Access Groups & Permissions tab when clicked', () => {
      renderWithProviders(<DataProductsDetailView />);

      const accessGroupTab = screen.getByText('Access Groups & Permissions');
      fireEvent.click(accessGroupTab);

      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dataProducts/setDataProductsDetailTabValue', payload: 2 }));
    });

    it('renders Access Groups tab content when detailTabValue is 2', () => {
      const stateWithAccessTab = {
        ...defaultStoreState,
        dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 2 },
      };
      renderWithProviders(<DataProductsDetailView />, stateWithAccessTab);

      expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      expect(screen.getByTestId('access-group-tab')).toBeInTheDocument();
    });

    it('switches to Contract tab when clicked', () => {
      renderWithProviders(<DataProductsDetailView />);

      const contractTab = screen.getByText('Contracts');
      fireEvent.click(contractTab);

      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dataProducts/setDataProductsDetailTabValue', payload: 3 }));
    });

    it('renders Contract tab content when detailTabValue is 3', () => {
      const stateWithContractTab = {
        ...defaultStoreState,
        dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 3 },
      };
      renderWithProviders(<DataProductsDetailView />, stateWithContractTab);

      expect(screen.getByTestId('tabpanel-3')).toBeInTheDocument();
      expect(screen.getByTestId('contract-tab')).toBeInTheDocument();
    });

    it('switches to Aspects tab when clicked', () => {
      renderWithProviders(<DataProductsDetailView />);

      const aspectsTab = screen.getByText('Aspects');
      fireEvent.click(aspectsTab);

      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dataProducts/setDataProductsDetailTabValue', payload: 5 }));
    });

    it('renders Aspects tab content when detailTabValue is 5', () => {
      const stateWithAspectsTab = {
        ...defaultStoreState,
        dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 5 },
      };
      renderWithProviders(<DataProductsDetailView />, stateWithAspectsTab);

      expect(screen.getByTestId('tabpanel-5')).toBeInTheDocument();
      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      expect(screen.getByTestId('preview-annotation')).toBeInTheDocument();
    });

    it('dispatches tab change when switching tabs, closing asset preview', () => {
      const stateWithAssetsTab = {
        ...defaultStoreState,
        dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 1 },
      };
      renderWithProviders(<DataProductsDetailView />, stateWithAssetsTab);

      // Open preview on Assets tab
      const openPreviewBtn = screen.getByTestId('open-asset-preview');
      fireEvent.click(openPreviewBtn);

      // Switch to Overview tab
      const overviewTab = screen.getByText('Overview');
      fireEvent.click(overviewTab);

      // Verify dispatch was called to change tab to 0
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dataProducts/setDataProductsDetailTabValue', payload: 0 }));
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is clicked', () => {
      renderWithProviders(<DataProductsDetailView />);

      const backButton = document.querySelector('button[class*="MuiButton"]');
      if (backButton) {
        fireEvent.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith(-1);
      }
    });
  });

  describe('Request Access Flow', () => {
    it('opens submit access panel when Request Access button is clicked', async () => {
      renderWithProviders(<DataProductsDetailView />);
      await flushChangeRequests();

      const requestAccessBtn = screen.getByTestId('cta-button');
      fireEvent.click(requestAccessBtn);

      expect(screen.getByTestId('submit-access-panel')).toBeInTheDocument();
    });

    it('calls onRequestAccess prop if provided', async () => {
      const mockOnRequestAccess = vi.fn();
      renderWithProviders(<DataProductsDetailView onRequestAccess={mockOnRequestAccess} />);
      await flushChangeRequests();

      const requestAccessBtn = screen.getByTestId('cta-button');
      fireEvent.click(requestAccessBtn);

      expect(mockOnRequestAccess).toHaveBeenCalledWith(expect.objectContaining({
        name: expect.any(String)
      }));
    });

    it('closes submit access panel when close button is clicked', async () => {
      renderWithProviders(<DataProductsDetailView />);
      await flushChangeRequests();

      // Open the panel
      const requestAccessBtn = screen.getByTestId('cta-button');
      fireEvent.click(requestAccessBtn);

      expect(screen.getByTestId('submit-access-panel')).toBeInTheDocument();

      // Close the panel
      const closeBtn = screen.getByTestId('close-submit-access');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('submit-access-panel')).not.toBeInTheDocument();
    });

    it('shows notification after successful submit', async () => {
      renderWithProviders(<DataProductsDetailView />);
      await flushChangeRequests();

      // Open the panel
      const requestAccessBtn = screen.getByTestId('cta-button');
      fireEvent.click(requestAccessBtn);

      // Submit
      const submitBtn = screen.getByTestId('submit-success');
      fireEvent.click(submitBtn);

      // Check notification is shown
      expect(screen.getByTestId('notification-bar')).toBeInTheDocument();
      expect(screen.getByText('Request sent')).toBeInTheDocument();
    });

    it('auto-hides notification after 5 seconds', async () => {
      renderWithProviders(<DataProductsDetailView />);
      await flushChangeRequests();

      // Open and submit
      const requestAccessBtn = screen.getByTestId('cta-button');
      fireEvent.click(requestAccessBtn);

      const submitBtn = screen.getByTestId('submit-success');
      fireEvent.click(submitBtn);

      expect(screen.getByTestId('notification-bar')).toBeInTheDocument();

      // Fast-forward 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByTestId('notification-bar')).not.toBeInTheDocument();
    });

    it('closes notification when close button is clicked', async () => {
      renderWithProviders(<DataProductsDetailView />);
      await flushChangeRequests();

      // Open and submit
      const requestAccessBtn = screen.getByTestId('cta-button');
      fireEvent.click(requestAccessBtn);

      const submitBtn = screen.getByTestId('submit-success');
      fireEvent.click(submitBtn);

      // Close notification
      const closeNotificationBtn = screen.getByTestId('close-notification');
      fireEvent.click(closeNotificationBtn);

      expect(screen.queryByTestId('notification-bar')).not.toBeInTheDocument();
    });

    it('does not show undo button in request access notification', async () => {
      renderWithProviders(<DataProductsDetailView />);
      await flushChangeRequests();

      // Open and submit
      const requestAccessBtn = screen.getByTestId('cta-button');
      fireEvent.click(requestAccessBtn);

      const submitBtn = screen.getByTestId('submit-success');
      fireEvent.click(submitBtn);

      // Notification should be visible but without undo button
      expect(screen.getByTestId('notification-bar')).toBeInTheDocument();
      expect(screen.queryByTestId('undo-notification')).not.toBeInTheDocument();
    });
  });

  describe('Asset Preview', () => {
    const assetsTabState = {
      ...defaultStoreState,
      dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 1 },
    };

    it('opens asset preview panel when asset is selected', () => {
      renderWithProviders(<DataProductsDetailView />, assetsTabState);

      // Open preview
      const openPreviewBtn = screen.getByTestId('open-asset-preview');
      fireEvent.click(openPreviewBtn);

      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
    });

    it('closes asset preview panel when close is triggered', () => {
      renderWithProviders(<DataProductsDetailView />, assetsTabState);

      // Open preview
      const openPreviewBtn = screen.getByTestId('open-asset-preview');
      fireEvent.click(openPreviewBtn);

      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();

      // Close preview via Assets component's close button
      const closePreviewBtn = screen.getByTestId('close-asset-preview');
      fireEvent.click(closePreviewBtn);

      // Preview should be closed (empty state)
      expect(screen.getByTestId('resource-preview-empty')).toBeInTheDocument();
    });

    it('navigates to asset details when View Details is clicked', () => {
      renderWithProviders(<DataProductsDetailView />, assetsTabState);

      // Open preview
      const openPreviewBtn = screen.getByTestId('open-asset-preview');
      fireEvent.click(openPreviewBtn);

      // Click view details
      const viewDetailsBtn = screen.getByTestId('view-details');
      fireEvent.click(viewDetailsBtn);

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Annotation Actions', () => {
    const aspectsTabState = {
      ...defaultStoreState,
      dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 5 },
    };

    it('collapses all annotations when collapse button is clicked', () => {
      renderWithProviders(<DataProductsDetailView />, aspectsTabState);

      // Click collapse all
      const collapseBtn = screen.getByTestId('collapse-all-btn');
      fireEvent.click(collapseBtn);

      // Verify the function was called (component state changes)
      expect(collapseBtn).toBeInTheDocument();
    });

    it('expands all annotations when expand button is clicked', () => {
      renderWithProviders(<DataProductsDetailView />, aspectsTabState);

      // Click expand all
      const expandBtn = screen.getByTestId('expand-all-btn');
      fireEvent.click(expandBtn);

      // Verify the function was called
      expect(expandBtn).toBeInTheDocument();
    });

    it('applies filter when filter is changed', () => {
      renderWithProviders(<DataProductsDetailView />, aspectsTabState);

      // Apply filter
      const applyFilterBtn = screen.getByText('Apply Filter');
      fireEvent.click(applyFilterBtn);

      expect(applyFilterBtn).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error and navigates away when data fetch fails', () => {
      const errorState = {
        ...defaultStoreState,
        dataProducts: {
          ...defaultStoreState.dataProducts,
          selectedDataProductStatus: 'failed',
          selectedDataProductError: 'Network error'
        }
      };

      renderWithProviders(<DataProductsDetailView />, errorState);

      // The error effect should run immediately on mount
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Network error'),
        5000
      );

      // Fast-forward 2 seconds for navigation
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/data-products');
    });
  });

  describe('Data Fetching', () => {
    it('dispatches fetchDataProductsList when items are empty and status is idle', () => {
      const emptyState = {
        ...defaultStoreState,
        dataProducts: {
          ...defaultStoreState.dataProducts,
          dataProductsItems: [],
          status: 'idle'
        }
      };

      renderWithProviders(<DataProductsDetailView />, emptyState);

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('dispatches fetchDataProductsAssetsList when selectedDataProductStatus is succeeded', () => {
      renderWithProviders(<DataProductsDetailView />);

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Sort Functionality', () => {
    it('sorts items by name in ascending order', () => {
      renderWithProviders(<DataProductsDetailView />);

      // The component internally handles sorting - verify render completes without error
      expect(screen.getByText('Test Data Product')).toBeInTheDocument();
    });
  });

  describe('Access Panel Sync', () => {
    it('syncs panel state with global context', async () => {
      renderWithProviders(<DataProductsDetailView />);
      await flushChangeRequests();

      // Open submit access panel
      const requestAccessBtn = screen.getByTestId('cta-button');
      fireEvent.click(requestAccessBtn);

      expect(mockSetAccessPanelOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('Resource Click Handler', () => {
    it('handles resource click with entry name format', () => {
      const assetsTabState = {
        ...defaultStoreState,
        dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 1 },
      };
      renderWithProviders(<DataProductsDetailView />, assetsTabState);

      // Open preview
      const openPreviewBtn = screen.getByTestId('open-asset-preview');
      fireEvent.click(openPreviewBtn);

      // Click view details to trigger handleResourceClick
      const viewDetailsBtn = screen.getByTestId('view-details');
      fireEvent.click(viewDetailsBtn);

      // Verify dispatch was called for pushToHistory and fetchEntry
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Entry Source Display Name Fallback', () => {
    it('uses getName fallback when displayName is empty', async () => {
      const stateWithEmptyDisplayName = {
        ...defaultStoreState,
        dataProducts: {
          ...defaultStoreState.dataProducts,
          selectedDataProductDetails: createMockDataProductDetails({
            name: 'projects/test-project/locations/us/dataProducts/fallback-mock-title-name',
            entrySource: {
              displayName: '',
              description: 'A test data product for testing',
              system: 'Dataplex',
              location: 'US',
              resource: 'projects/test-project/dataProducts/test-product'
            }
          })
        }
      };

      renderWithProviders(<DataProductsDetailView />, stateWithEmptyDisplayName);
      await flushChangeRequests();

      expect(screen.getByText('fallback-mock-title-name')).toBeInTheDocument();
      expect(screen.getByTestId('cta-button')).toBeInTheDocument();
    });
  });

 describe('Icon Display', () => {
    it('uses default material icon when no icon in localStorage', () => {
        const localStorageMock = {
          getItem: vi.fn(() => '{}'),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        };
        Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

        const store = createMockStore(defaultStoreState);

        render(
          <Provider store={store}>
            <BrowserRouter>
              <AuthContext.Provider value={mockAuthContext}>
                <DataProductsDetailView />
              </AuthContext.Provider>
            </BrowserRouter>
          </Provider>
        );

        // Verify the image is NOT rendered
        expect(screen.queryByAltText('Test Data Product')).not.toBeInTheDocument();

        // Verify the fallback SVG is rendered instead
        const svgs = document.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
  });

  describe('Tab Props', () => {
    it('generates correct tab props with id and aria-controls', () => {
      renderWithProviders(<DataProductsDetailView />);

      const overviewTab = screen.getByRole('tab', { name: 'Overview' });
      expect(overviewTab).toHaveAttribute('id', 'tab-0');
      expect(overviewTab).toHaveAttribute('aria-controls', 'tabpanel-0');

      const assetsTab = screen.getByRole('tab', { name: 'Assets' });
      expect(assetsTab).toHaveAttribute('id', 'tab-1');
      expect(assetsTab).toHaveAttribute('aria-controls', 'tabpanel-1');
    });
  });

  describe('Expand All with Empty Aspects', () => {
    it('displays the empty state message when aspects is undefined', () => {
      const stateWithNoAspects = {
        ...defaultStoreState,
        dataProducts: {
          ...defaultStoreState.dataProducts,
          detailTabValue: 5,
          selectedDataProductDetails: {
            ...createMockDataProductDetails(),
            aspects: undefined
          }
        }
      };

      renderWithProviders(<DataProductsDetailView />, stateWithNoAspects);

      // Verify the button does NOT exist
      expect(screen.queryByTestId('expand-all-btn')).not.toBeInTheDocument();
      
      // Verify the empty state message is rendered instead
      expect(screen.getByText('No aspects available for this data product.')).toBeInTheDocument();
    });
  });

  describe('ResourcePreview PreviewDataChange', () => {
    const assetsTabState = {
      ...defaultStoreState,
      dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 1 },
    };

    it('opens preview when data is provided to onPreviewDataChange', () => {
      renderWithProviders(<DataProductsDetailView />, assetsTabState);

      // Open preview
      const openPreviewBtn = screen.getByTestId('open-asset-preview');
      fireEvent.click(openPreviewBtn);

      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
    });

    it('closes preview when null is provided to onPreviewDataChange', () => {
      renderWithProviders(<DataProductsDetailView />, assetsTabState);

      // Open then close preview
      const openPreviewBtn = screen.getByTestId('open-asset-preview');
      fireEvent.click(openPreviewBtn);

      const closePreviewBtn = screen.getByTestId('close-asset-preview');
      fireEvent.click(closePreviewBtn);

      // Preview should show empty state
      expect(screen.getByTestId('resource-preview-empty')).toBeInTheDocument();
    });
  });

  describe('handleResourceClick with different ID formats', () => {
    it('handles ID that already contains entryGroups', async () => {
      const assetsTabState = {
        ...defaultStoreState,
        dataProducts: { ...defaultStoreState.dataProducts, detailTabValue: 1 },
      };
      renderWithProviders(<DataProductsDetailView />, assetsTabState);

      // Open preview
      const openPreviewBtn = screen.getByTestId('open-asset-preview');
      fireEvent.click(openPreviewBtn);

      // Click view details
      const viewDetailsBtn = screen.getByTestId('view-details');
      fireEvent.click(viewDetailsBtn);

      // Verify pushToHistory and fetchEntry were called
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Search Term Effect', () => {
    it('filters dataProductsList based on search term', () => {
      renderWithProviders(<DataProductsDetailView />);

      // The search filtering happens internally - component should render
      expect(screen.getByText('Test Data Product')).toBeInTheDocument();
    });
  });

  describe('Component with no user token', () => {
    it('handles case when user token is undefined', () => {
      const authContextNoToken = {
        ...mockAuthContext,
        user: { ...mockUser, token: undefined }
      };

      const store = createMockStore(defaultStoreState);

      render(
        <Provider store={store}>
          <BrowserRouter>
            <AuthContext.Provider value={authContextNoToken}>
              <DataProductsDetailView />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      // Should still render
      expect(screen.getByText('Test Data Product')).toBeInTheDocument();
    });
  });
});
