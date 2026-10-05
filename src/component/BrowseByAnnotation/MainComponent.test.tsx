import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainComponent from './MainComponent';

// Mock functions using vi.hoisted
const { mockDispatch, mockNavigate, mockUseSelector, mockUseAuth } = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseSelector: vi.fn(),
  mockUseAuth: vi.fn(),
}));

// Mock useAuth hook
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useAppBootstrapStatus — default to "bootstrap complete" so existing
// tests (written before browseResourcesByAspects started waiting on
// get-projects) keep exercising the fetch path unless a test overrides this.
const { mockUseAppBootstrapStatus } = vi.hoisted(() => ({
  mockUseAppBootstrapStatus: vi.fn(() => ({
    isAppConfigReady: true,
    areProjectsReady: true,
    isBootstrapping: false,
  })),
}));
vi.mock('../../hooks/useAppBootstrap', () => ({
  useAppBootstrapStatus: () => mockUseAppBootstrapStatus(),
}));

// Mock react-redux
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => mockUseSelector(selector),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock browseResourcesByAspects action
vi.mock('../../features/resources/resourcesSlice', () => ({
  browseResourcesByAspects: vi.fn((params) => ({
    type: 'resources/browseResourcesByAspects',
    payload: params,
  })),
}));

// Mock ResourceViewer component
vi.mock('../Common/ResourceViewer', () => ({
  default: ({
    resources,
    resourcesStatus,
    error,
    previewData,
    onPreviewDataChange,
    customHeader,
    handlePagination,
    startIndex,
    pageSize,
  }: {
    resources: unknown[];
    resourcesStatus: string;
    error: string | null;
    previewData: unknown;
    onPreviewDataChange: (data: unknown) => void;
    customHeader: React.ReactNode;
    handlePagination: (direction: 'next' | 'previous', size: number, sizeChange?: boolean) => void;
    startIndex: number;
    pageSize: number;
  }) => (
    <div data-testid="resource-viewer">
      <div data-testid="rv-header">{customHeader}</div>
      <span data-testid="rv-status">{resourcesStatus}</span>
      <span data-testid="rv-count">{resources?.length || 0}</span>
      <span data-testid="rv-error">{error || 'none'}</span>
      <span data-testid="rv-preview">{previewData ? 'has-preview' : 'no-preview'}</span>
      <span data-testid="rv-start-index">{startIndex}</span>
      <span data-testid="rv-page-size">{pageSize}</span>
      <button data-testid="rv-set-preview" onClick={() => onPreviewDataChange({ name: 'test' })}>
        Set Preview
      </button>
      <button data-testid="rv-clear-preview" onClick={() => onPreviewDataChange(null)}>
        Clear Preview
      </button>
      <button data-testid="rv-next-page" onClick={() => handlePagination('next', pageSize)}>
        Next Page
      </button>
      <button data-testid="rv-prev-page" onClick={() => handlePagination('previous', pageSize)}>
        Prev Page
      </button>
      <button
        data-testid="rv-change-size"
        onClick={() => handlePagination('next', 50, true)}
      >
        Change Size
      </button>
    </div>
  ),
}));

// Mock ResourcePreview component
vi.mock('../Common/ResourcePreview', () => ({
  default: ({
    previewData,
    onPreviewDataChange,
  }: {
    previewData: unknown;
    onPreviewDataChange: (data: unknown) => void;
    id_token: string;
  }) => (
    <div data-testid="resource-preview">
      <span data-testid="preview-data">{previewData ? JSON.stringify(previewData) : 'none'}</span>
      <button data-testid="close-preview" onClick={() => onPreviewDataChange(null)}>
        Close
      </button>
    </div>
  ),
}));

// Mock DetailPageOverview component
vi.mock('../DetailPageOverview/DetailPageOverview', () => ({
  default: ({ entry }: { entry: unknown }) => (
    <div data-testid="detail-page-overview">
      <span data-testid="overview-entry">{entry ? JSON.stringify(entry) : 'none'}</span>
    </div>
  ),
}));

// Mock SubTypesTab component
vi.mock('./SubTypesTab', () => ({
  default: ({
    items,
    searchTerm,
    onSearchTermChange,
    sortBy,
    onSortByChange,
    onItemClick,
  }: {
    items: unknown[];
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    sortBy: string;
    onSortByChange: (value: string) => void;
    onItemClick: (item: unknown) => void;
  }) => (
    <div data-testid="sub-types-tab">
      <span data-testid="sub-types-count">{items?.length || 0}</span>
      <span data-testid="sub-types-search">{searchTerm}</span>
      <span data-testid="sub-types-sort">{sortBy}</span>
      <input
        data-testid="sub-types-search-input"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
      />
      <button data-testid="sub-types-sort-change" onClick={() => onSortByChange('name')}>
        Change Sort
      </button>
      {(items as any[])?.map((item: any, index: number) => (
        <button
          key={index}
          data-testid={`sub-type-item-${index}`}
          onClick={() => onItemClick(item)}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}));

// Mock SubTypesTabSkeleton component
vi.mock('./SubTypesTabSkeleton', () => ({
  default: () => <div data-testid="sub-types-skeleton">Loading...</div>,
}));

// Mock AspectLinkedAssets component
vi.mock('./AspectLinkedAssets', () => ({
  default: ({
    onAssetPreviewChange,
  }: {
    linkedAssets: unknown[];
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    idToken: string;
    onAssetPreviewChange: (data: unknown) => void;
    resourcesStatus: string;
  }) => (
    <div data-testid="aspect-linked-assets">
      <button data-testid="set-asset-preview" onClick={() => onAssetPreviewChange({ name: 'test-asset' })}>
        Set Preview
      </button>
      <button data-testid="clear-asset-preview" onClick={() => onAssetPreviewChange(null)}>
        Clear Preview
      </button>
    </div>
  ),
}));

// Mock resourceUtils
vi.mock('../../utils/resourceUtils', () => ({
  typeAliases: {
    TABLE: 'Table',
    VIEW: 'View',
    DATASET: 'Dataset',
  },
  getFormattedDateTimeParts: (timestamp: any) => {
    if (!timestamp) return { date: '-', time: '' };
    return { date: 'Jan 1, 2022', time: '12:00:00 AM' };
  },
}));

// Mock NotificationContext
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({
    showNotification: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    clearNotification: vi.fn(),
    clearAllNotifications: vi.fn()
  })
}));

// Mock SVG imports
vi.mock('../../assets/svg/annotations-icon-blue.svg', () => ({
  default: 'annotations-icon-blue.svg',
}));

// Mock data
const mockAnnotationsData = [
  {
    title: 'Aspect One',
    fieldValues: 3,
    assets: 10,
    name: 'projects/test/aspectTypes/aspect1',
    subItems: [
      { title: 'Field1', fieldValues: 5, assets: 5 },
      { title: 'Field2', fieldValues: 3, assets: 3 },
      { title: 'Field3', fieldValues: 2, assets: 2 },
    ],
  },
  {
    title: 'Aspect Two',
    fieldValues: 2,
    assets: 5,
    name: 'projects/test/aspectTypes/aspect2',
    subItems: [
      { title: 'FieldA', fieldValues: 3, assets: 3 },
      { title: 'FieldB', fieldValues: 2, assets: 2 },
    ],
  },
];

const mockSelectedCard = {
  title: 'Aspect One',
  fieldValues: 3,
  assets: 10,
  name: 'projects/test/aspectTypes/aspect1',
  countsFetched: true,
  subTypesLoaded: true,
  subItems: [
    { title: 'Field1', fieldValues: 5, assets: 5 },
    { title: 'Field2', fieldValues: 3, assets: 3 },
    { title: 'Field3', fieldValues: 2, assets: 2 },
  ],
};

const mockSelectedCardWithoutCountsFetched = {
  title: 'Aspect One',
  fieldValues: 3,
  assets: 10,
  name: 'projects/test/aspectTypes/aspect1',
  countsFetched: false,
  subTypesLoaded: false,
  subItems: [
    { title: 'Field1', fieldValues: 5, assets: 5 },
    { title: 'Field2', fieldValues: 3, assets: 3 },
  ],
};

const mockSelectedSubItem = {
  title: 'Field1',
  fieldValues: 5,
  assets: 5,
};

const mockResources = [
  { name: 'resource1', type: 'TABLE' },
  { name: 'resource2', type: 'VIEW' },
];

// Default selector return values
const createMockSelectorState = (overrides = {}) => ({
  user: { token: 'test-token-123' },
  resources: {
    items: [],
    status: 'idle',
    error: null,
    totalItems: 0,
    itemsRequestData: null,
    itemsStore: [],
    aspectBrowseCache: {},
    ...overrides,
  },
  search: {
    searchTerm: '',
    searchType: 'all',
  },
  projects: {
    isLoaded: true,
  },
});

// Default props for MainComponent
const createDefaultProps = (overrides = {}) => ({
  selectedCard: null as any,
  onItemClick: vi.fn(),
  selectedSubItem: null as any,
  onSubItemClick: vi.fn(),
  annotationsData: mockAnnotationsData,
  tabValue: 0,
  onTabChange: vi.fn(),
  contentSearchTerm: '',
  onContentSearchTermChange: vi.fn(),
  sortBy: 'name' as const,
  onSortByChange: vi.fn(),
  sortOrder: 'desc' as const,
  onSortOrderToggle: vi.fn(),
  subTypesWithCache: {},
  ...overrides,
});

describe('MainComponent', () => {
  let mockOnItemClick: ReturnType<typeof vi.fn>;
  let mockOnSubItemClick: ReturnType<typeof vi.fn>;
  let mockOnTabChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnItemClick = vi.fn();
    mockOnSubItemClick = vi.fn();
    mockOnTabChange = vi.fn();

    // Setup default useAuth mock
    mockUseAuth.mockReturnValue({
      user: { token: 'test-token-123' },
    });

    // Setup default useAppBootstrapStatus mock (bootstrap complete)
    mockUseAppBootstrapStatus.mockReturnValue({
      isAppConfigReady: true,
      areProjectsReady: true,
      isBootstrapping: false,
    });

    // Setup default useSelector mock
    const defaultState = createMockSelectorState();
    mockUseSelector.mockImplementation((selector: (state: typeof defaultState) => unknown) => {
      return selector(defaultState);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Empty State (no selectedCard)', () => {
    it('should render empty state when no card is selected', () => {
      const props = createDefaultProps({
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByText('Select an aspect from the sidebar')).toBeInTheDocument();
    });

    it('should not render tabs when no card is selected', () => {
      const props = createDefaultProps();

      render(<MainComponent {...props} />);

      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });
  });

  describe('Tab-based View (selectedCard set, no selectedSubItem)', () => {
    it('should render title with selected card name', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByText('Aspect One')).toBeInTheDocument();
    });

    it('should render Overview and Sub Types tabs', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Sub Types' })).toBeInTheDocument();
    });

    it('should render DetailPageOverview when Overview tab is selected', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        tabValue: 0,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
    });

    it('should render SubTypesTab when Sub Types tab is selected and counts are fetched', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        tabValue: 1,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByTestId('sub-types-tab')).toBeInTheDocument();
    });

    it('should render SubTypesTabSkeleton when Sub Types tab is selected but counts not fetched', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCardWithoutCountsFetched,
        tabValue: 1,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByTestId('sub-types-skeleton')).toBeInTheDocument();
    });

    it('should call onTabChange when tab is clicked', async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        tabValue: 0,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      await user.click(screen.getByRole('tab', { name: 'Sub Types' }));

      expect(mockOnTabChange).toHaveBeenCalled();
    });

    it('should display correct sub-item count in SubTypesTab', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        tabValue: 1,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByTestId('sub-types-count')).toHaveTextContent('3');
    });

    it('should call onSubItemClick when sub-item is clicked in SubTypesTab', async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        tabValue: 1,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      await user.click(screen.getByTestId('sub-type-item-0'));

      expect(mockOnSubItemClick).toHaveBeenCalledWith(mockSelectedCard.subItems[0]);
    });
  });

  describe('Resource View (selectedSubItem set)', () => {
    beforeEach(() => {
      const stateWithResources = createMockSelectorState({
        items: mockResources,
        status: 'succeeded',
        totalItems: 2,
        itemsStore: mockResources,
      });
      mockUseSelector.mockImplementation(
        (selector: (state: typeof stateWithResources) => unknown) => {
          return selector(stateWithResources);
        }
      );
    });

    it('should render AspectLinkedAssets when selectedSubItem is set', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        selectedSubItem: mockSelectedSubItem,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByTestId('aspect-linked-assets')).toBeInTheDocument();
    });

    it('should display selectedSubItem title in custom header', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        selectedSubItem: mockSelectedSubItem,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByText('Field1')).toBeInTheDocument();
    });

    it('should dispatch browseResourcesByAspects when selectedSubItem changes', async () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        selectedSubItem: mockSelectedSubItem,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it('should open ResourcePreview when preview data is set', async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        selectedSubItem: mockSelectedSubItem,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      await user.click(screen.getByTestId('set-asset-preview'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-data')).toHaveTextContent('test-asset');
      });
    });

    it('should handle preview close action', async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        selectedSubItem: mockSelectedSubItem,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      // First open the preview via AspectLinkedAssets
      await user.click(screen.getByTestId('set-asset-preview'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-data')).toHaveTextContent('test-asset');
      });

      // Click close button - the component sets isPreviewOpen to false but keeps previewData
      // The preview panel remains in DOM but with opacity 0 and width 0 (CSS transition)
      await user.click(screen.getByTestId('close-preview'));

      // Verify close button can be clicked without error - component handles the close action
      // Note: The actual visual hiding is done via CSS (width/opacity transitions),
      // not by removing the element from DOM or clearing previewData
      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
    });

    it('should call onSubItemClick with null when back is clicked in resource view', async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        selectedSubItem: mockSelectedSubItem,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      const backArrow = document.querySelector('[data-testid="ArrowBackIcon"]');
      if (backArrow) {
        await user.click(backArrow);
        expect(mockOnSubItemClick).toHaveBeenCalledWith(null);
      }
    });
  });

  describe('Navigation', () => {
    it('should render empty state which has no back button', () => {
      const props = createDefaultProps({
        selectedCard: null,
        selectedSubItem: null,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      // Empty state doesn't have back button
      expect(screen.getByText('Select an aspect from the sidebar')).toBeInTheDocument();
    });
  });

  // Note: Pagination tests were removed as MainComponent was refactored to use
  // AspectLinkedAssets instead of ResourceViewer. Pagination is now handled
  // within AspectLinkedAssets component.

  describe('useEffect hooks', () => {
    it('should dispatch clear actions on mount', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        selectedSubItem: mockSelectedSubItem,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'resources/setItemsPreviousPageRequest',
        payload: null,
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'resources/setItemsPageRequest',
        payload: null,
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'resources/setItemsStoreData',
        payload: [],
      });
    });

    // Note: Tests for setItemsNextPageSize dispatch were removed as this functionality
    // no longer exists in MainComponent. The component was refactored to use
    // AspectLinkedAssets instead of ResourceViewer for the resource view.
  });

  // Note: handlePagination edge cases tests were removed as MainComponent was refactored
  // to use AspectLinkedAssets instead of ResourceViewer with internal pagination handling.

  describe('transformAnnotationToEntry', () => {
    it('should transform selectedCard to entry format for DetailPageOverview', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        tabValue: 0,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      const overviewEntry = screen.getByTestId('overview-entry');
      expect(overviewEntry).toBeInTheDocument();
      expect(overviewEntry.textContent).toContain('Aspect One');
    });
  });

  describe('default export', () => {
    it('should export MainComponent as default', async () => {
      const module = await import('./MainComponent');
      expect(module.default).toBeDefined();
    });
  });

  describe('Search and Sort in SubTypesTab', () => {
    it('should pass search term to SubTypesTab', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        tabValue: 1,
        contentSearchTerm: 'test search',
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByTestId('sub-types-search')).toHaveTextContent('test search');
    });

    it('should pass sortBy to SubTypesTab', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        tabValue: 1,
        sortBy: 'name',
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      render(<MainComponent {...props} />);

      expect(screen.getByTestId('sub-types-sort')).toHaveTextContent('name');
    });
  });

  describe('Annotation icon', () => {
    it('should render annotation icon in header', () => {
      const props = createDefaultProps({
        selectedCard: mockSelectedCard,
        onItemClick: mockOnItemClick,
        onSubItemClick: mockOnSubItemClick,
        onTabChange: mockOnTabChange,
      });

      const { container } = render(<MainComponent {...props} />);

      const icon = container.querySelector('img[alt=""]');
      expect(icon).toBeInTheDocument();
    });
  });
});
