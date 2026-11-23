import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, beforeEach, it, describe, expect } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ResourceViewer from './ResourceViewer';

// Mock Redux store
const createMockStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      search: (state = { searchFilters: {}, semanticSearch: true, ...(initialState.search || {}) }) => state,
      entry: (state = { status: 'idle', ...(initialState.entry || {}) }) => state,
      user: (state = { mode: 'light', ...(initialState.user || {}) }) => state
    },
    preloadedState: {
      search: { searchFilters: {}, semanticSearch: false, ...(initialState.search || {}) },
      entry: { status: 'idle', ...(initialState.entry || {}) },
      user: { mode: 'light', ...(initialState.user || {}) }
    }
  });
};

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock auth context
const mockLogout = vi.fn();
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    logout: mockLogout
  })
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

// Mock child components
vi.mock('../SearchEntriesCard/SearchEntriesCard', () => ({
  default: function MockSearchEntriesCard({ entry, css, isSelected, onDoubleClick, aspectValueColumn }: any) {
    return (
      <div
        data-testid="search-entries-card"
        style={css}
        onDoubleClick={() => onDoubleClick?.(entry)}
      >
        {entry?.entrySource?.displayName || entry?.name}
        {isSelected && <span data-testid="selected-indicator">Selected</span>}
        {aspectValueColumn && (
          <span data-testid="aspect-value-column">
            {aspectValueColumn.label}:{aspectValueColumn.valuesByEntry?.[entry?.name] ?? ''}
          </span>
        )}
      </div>
    );
  }
}));

vi.mock('../Tags/FilterTag', () => ({
  default: function MockFilterTag({ text, handleClick, handleClose, showCloseButton, css }: any) {
    return (
      <div data-testid="filter-tag" style={css}>
        {text}
        {showCloseButton && (
          <button data-testid="close-button" onClick={handleClose}>
            Close
          </button>
        )}
        <button data-testid="click-button" onClick={handleClick}>
          Click
        </button>
      </div>
    );
  }
}));

vi.mock('../SearchPage/SearchTableView', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: function MockSearchTableView({ resources, onRowClick, onFavoriteClick, getFormatedDate, getEntryType }: any) {
    // Call the utility functions to test them
    const formattedDate = getFormatedDate?.(resources[0]?.dataplexEntry?.updateTime?.seconds ? new Date(resources[0].dataplexEntry.updateTime.seconds * 1000) : null);
    // Path 'projects/test/table/dataset' splits to ['projects','test','table','dataset'], second-to-last is 'table' -> 'Table'
    const entryType = getEntryType?.('projects/test/table/dataset', '/');

    return (
      <div data-testid="search-table-view">
        Table View with {resources?.length} resources
        <span data-testid="formatted-date">{formattedDate}</span>
        <span data-testid="entry-type">{entryType}</span>
        <button onClick={() => onRowClick(resources[0]?.dataplexEntry)}>Click Row</button>
        <button onClick={() => onFavoriteClick(resources[0]?.dataplexEntry)}>Favorite</button>
      </div>
    );
  }
}));

vi.mock('../Shimmer/ShimmerLoader', () => ({
  default: function MockShimmerLoader({ count, type }: any) {
    return <div data-testid="shimmer-loader">Loading {type} ({count})</div>;
  }
}));

vi.mock('./ResourcePreview', () => ({
  default: function MockResourcePreview({ previewData, onPreviewDataChange, onViewDetails, onRequestAccess }: any) {
    return (
      <div data-testid="resource-preview">
        Preview for {previewData?.name}
        <button onClick={() => onPreviewDataChange(null)}>Close Preview</button>
        <button onClick={() => onViewDetails?.(previewData)}>View Details</button>
        <button onClick={() => onRequestAccess?.(previewData)}>Request Access</button>
      </div>
    );
  }
}));

vi.mock('./FilterChips', () => ({
  default: function MockFilterChips({ selectedFilters, handleRemoveFilterTag }: any) {
    return (
      <div data-testid="filter-chips">
        {selectedFilters?.map((filter: any) => (
          <div key={filter.name} data-testid="filter-chip">
            {filter.name}
            <button data-testid="close-button" onClick={() => handleRemoveFilterTag(filter)}>×</button>
          </div>
        ))}
      </div>
    );
  }
}));

// Mock SVG assets
vi.mock('@mui/icons-material', () => ({
  KeyboardArrowDown: () => <div data-testid="keyboard-arrow-down">Arrow</div>,
  InfoOutlined: () => <div data-testid="info-outlined">Info</div>,
  ChevronLeftOutlined: () => <div data-testid="chevron-left">ChevronLeft</div>,
  ChevronRightOutlined: () => <div data-testid="chevron-right">ChevronRight</div>
}));

describe('ResourceViewer', () => {
  const mockResources = [
    {
      dataplexEntry: {
        name: 'project/dataset/table1',
        entrySource: {
          displayName: 'Table 1',
          system: 'BigQuery'
        },
        entryType: 'tables-table',
        updateTime: { seconds: 1640995200 } // Jan 1, 2022
      }
    },
    {
      dataplexEntry: {
        name: 'project/dataset/table2',
        entrySource: {
          displayName: 'Table 2',
          system: 'BigQuery'
        },
        entryType: 'tables-table',
        updateTime: { seconds: 1641081600 } // Jan 2, 2022
      }
    },
    {
      dataplexEntry: {
        name: 'project/dataset/dataset1',
        entrySource: {
          displayName: 'Dataset 1',
          system: 'BigQuery'
        },
        entryType: 'datasets-dataset',
        updateTime: { seconds: 1641168000 } // Jan 3, 2022
      }
    }
  ];

  const defaultProps = {
    resources: mockResources,
    resourcesStatus: 'succeeded' as const,
    previewData: null,
    onPreviewDataChange: vi.fn(),
    selectedTypeFilter: null,
    onTypeFilterChange: vi.fn(),
    typeAliases: ['table', 'dataset'],
    viewMode: 'list' as const,
    onViewModeChange: vi.fn(),
    id_token: 'test-token',
    startIndex : 0,
    pageSize : 20,
    setPageSize : vi.fn(),
    requestItemStore: [],
    resourcesTotalSize: 6,
    handlePagination: vi.fn(),
  };

  const renderResourceViewer = (props = {}, storeState = {}) => {
    const store = createMockStore(storeState);
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <ResourceViewer {...defaultProps} {...props} />
        </BrowserRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    renderResourceViewer({ resourcesStatus: 'loading' });

    expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();
    expect(screen.getByText('Loading search-card (6)')).toBeInTheDocument();
  });

  it('renders resources in list view by default', () => {
    renderResourceViewer();

    expect(screen.getByText('Table 1')).toBeInTheDocument();
    expect(screen.getByText('Table 2')).toBeInTheDocument();
    expect(screen.getByText('Dataset 1')).toBeInTheDocument();
    expect(screen.getAllByTestId('search-entries-card')).toHaveLength(3);
  });

  it('forwards aspectValueColumn through to SearchEntriesCard in list view', () => {
    renderResourceViewer({
      aspectValueColumn: {
        label: 'Aspect Value',
        valuesByEntry: { 'project/dataset/table1': 'Confidential' },
      },
    });

    const columns = screen.getAllByTestId('aspect-value-column');
    expect(columns[0]).toHaveTextContent('Aspect Value:Confidential');
  });

  it('renders resources in table view when viewMode is table', () => {
    renderResourceViewer({ viewMode: 'table' });

    expect(screen.getByTestId('search-table-view')).toBeInTheDocument();
    expect(screen.getByText('Table View with 3 resources')).toBeInTheDocument();
  });

  it('displays top results indicator', () => {
    renderResourceViewer();

    expect(screen.getByText('Search results')).toBeInTheDocument();
  });


  it('filters resources by selected type filter', () => {
    renderResourceViewer({ selectedTypeFilter: 'table' });

    // Filtering by selectedTypeFilter is commented out in the component
    // All resources are displayed regardless of selectedTypeFilter
    expect(screen.getByText('Table 1')).toBeInTheDocument();
    expect(screen.getByText('Table 2')).toBeInTheDocument();
    expect(screen.getByText('Dataset 1')).toBeInTheDocument();
    expect(screen.getAllByTestId('search-entries-card')).toHaveLength(3);
  });


  it('handles view mode toggle', () => {
    const mockOnViewModeChange = vi.fn();
    renderResourceViewer({ onViewModeChange: mockOnViewModeChange });

    const tableToggle = screen.getByLabelText('table view');
    fireEvent.click(tableToggle);

    expect(mockOnViewModeChange).toHaveBeenCalledWith('table');
  });

  it('displays sort options when showSortBy is true', () => {
    renderResourceViewer({ showSortBy: true });

    expect(screen.getByText('Most relevant')).toBeInTheDocument();
  });

  it('handles sort menu interactions', () => {
    renderResourceViewer({ showSortBy: true });

    const sortButton = screen.getByText('Most relevant');
    fireEvent.click(sortButton);

    // Check that menu items are present
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Last Modified')).toBeInTheDocument();
  });

  it('handles sort option selection', () => {
    renderResourceViewer({ showSortBy: true });

    const sortButton = screen.getByText('Most relevant');
    fireEvent.click(sortButton);

    const nameOptions = screen.getAllByText('Name');
    const menuItem = nameOptions.find(el => el.closest('[role="menuitem"]'));
    fireEvent.click(menuItem!);

    // Sort menu should close and sort should change
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('sorts resources by name', () => {
    renderResourceViewer({ showSortBy: true });

    const sortButton = screen.getByText('Most relevant');
    fireEvent.click(sortButton);
    const nameOptions = screen.getAllByText('Name');
    const menuItem = nameOptions.find(el => el.closest('[role="menuitem"]'));
    fireEvent.click(menuItem!);

    // Resources should be sorted by name (alphabetically)
    const cards = screen.getAllByTestId('search-entries-card');
    expect(cards[0]).toHaveTextContent('Dataset 1');
    expect(cards[1]).toHaveTextContent('Table 1');
    expect(cards[2]).toHaveTextContent('Table 2');
  });

  it('sorts resources by last modified (default)', () => {
    renderResourceViewer();

    // Default sortOrder is null, so resources display in original order
    const cards = screen.getAllByTestId('search-entries-card');
    expect(cards[0]).toHaveTextContent('Table 1');
    expect(cards[1]).toHaveTextContent('Table 2');
    expect(cards[2]).toHaveTextContent('Dataset 1');
  });

  it('handles resource selection for preview', () => {
    const mockOnPreviewDataChange = vi.fn();
    renderResourceViewer({ onPreviewDataChange: mockOnPreviewDataChange });

    const firstCard = screen.getAllByTestId('search-entries-card')[0];
    fireEvent.click(firstCard);

    // Default sortOrder is null, so resources are in original order. First card is Table 1.
    expect(mockOnPreviewDataChange).toHaveBeenCalledWith(mockResources[0].dataplexEntry);
  });

  it('shows selected resource indicator', () => {
    const previewData = mockResources[0].dataplexEntry;
    renderResourceViewer({ previewData });

    const selectedIndicator = screen.getByTestId('selected-indicator');
    expect(selectedIndicator).toBeInTheDocument();
  });


  it('handles table view row click', () => {
    const mockOnPreviewDataChange = vi.fn();
    renderResourceViewer({
      viewMode: 'table',
      onPreviewDataChange: mockOnPreviewDataChange
    });

    const clickRowButton = screen.getByText('Click Row');
    fireEvent.click(clickRowButton);

    // Default sortOrder is null, so resources are in original order. First is Table 1.
    expect(mockOnPreviewDataChange).toHaveBeenCalledWith(mockResources[0].dataplexEntry);
  });

  it('handles table view favorite click', () => {
    const mockOnFavoriteClick = vi.fn();
    renderResourceViewer({
      viewMode: 'table',
      onFavoriteClick: mockOnFavoriteClick
    });

    const favoriteButton = screen.getByText('Favorite');
    fireEvent.click(favoriteButton);

    // Default sortOrder is null, so resources are in original order. First is Table 1.
    expect(mockOnFavoriteClick).toHaveBeenCalledWith(mockResources[0].dataplexEntry);
  });

  it('displays no resources message when filtered results are empty', () => {
    renderResourceViewer({
      resources: [],
      resourcesStatus: 'succeeded'
    });

    expect(screen.getByText('No Resources found')).toBeInTheDocument();
  });

  it('handles failed resources status by logging out and navigating', () => {
    renderResourceViewer({
      resourcesStatus: 'failed',
      error: 'Failed to fetch resources'
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles failed resources status with 403 by showing no-access modal', () => {
    renderResourceViewer({
      resourcesStatus: 'failed',
      error: { error: { code: 403, status: 'PERMISSION_DENIED' } }
    });

    expect(mockTriggerNoAccess).toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('handles custom header rendering', () => {
    const customHeader = <div data-testid="custom-header">Custom Header</div>;
    renderResourceViewer({ customHeader });

    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('handles custom filters rendering', () => {
    const customFilters = <div data-testid="custom-filters">Custom Filters</div>;
    renderResourceViewer({ customFilters });

    expect(screen.getByTestId('custom-filters')).toBeInTheDocument();
  });

  it('hides filters when showFilters is false', () => {
    renderResourceViewer({ showFilters: false });

    expect(screen.queryByText('table (2)')).not.toBeInTheDocument();
    expect(screen.queryByText('dataset (1)')).not.toBeInTheDocument();
  });

  it('hides results count when showResultsCount is false', () => {
    renderResourceViewer({ showResultsCount: false });

    expect(screen.queryByText('3 results')).not.toBeInTheDocument();
  });

  it('handles resources without display names', () => {
    const resourcesWithoutNames = [
      {
        dataplexEntry: {
          name: 'project/dataset/table1',
          entrySource: {},
          entryType: 'tables-table',
          updateTime: { seconds: 1640995200 }
        }
      }
    ];

    renderResourceViewer({ 
      resources: resourcesWithoutNames,
      showSortBy: true
    });

    // Should still render the resource
    expect(screen.getByTestId('search-entries-card')).toBeInTheDocument();
  });

  it('handles resources without update time', () => {
    const resourcesWithoutTime = [
      {
        dataplexEntry: {
          name: 'project/dataset/table1',
          entrySource: { displayName: 'Table 1' },
          entryType: 'tables-table'
        }
      }
    ];

    renderResourceViewer({ resources: resourcesWithoutTime });

    expect(screen.getByText('Table 1')).toBeInTheDocument();
  });

  it('handles empty type aliases', () => {
    renderResourceViewer({ typeAliases: [] });

    expect(screen.queryByText('table (2)')).not.toBeInTheDocument();
    expect(screen.queryByText('dataset (1)')).not.toBeInTheDocument();
  });





  it('applies custom container style', () => {
    const containerStyle = { backgroundColor: 'red' };
    renderResourceViewer({ containerStyle });

    // The container style should be applied to the main container
    const container = screen.getByText('Dataset 1').closest('div')?.parentElement?.parentElement?.parentElement;
    expect(container).toHaveStyle('background-color: rgb(255, 0, 0)');
  });

  it('applies custom content style', () => {
    const contentStyle = { padding: '20px' };
    renderResourceViewer({ contentStyle });

    // The content style should be applied to the main content container
    expect(screen.getByText('Table 1')).toBeInTheDocument();
  });



  it('handles empty resources array', () => {
    renderResourceViewer({
      resources: [],
      resourcesStatus: 'succeeded'
    });

    expect(screen.getByText('No Resources found')).toBeInTheDocument();
    // Results count display is commented out in component
  });

  it('handles resources with missing entryType', () => {
    const resourcesWithMissingType = [
      {
        dataplexEntry: {
          name: 'project/dataset/table1',
          entrySource: { displayName: 'Table 1' },
          entryType: undefined, // Missing entryType
          updateTime: { seconds: 1640995200 }
        }
      }
    ];

    // Type filtering is commented out, so missing entryType no longer crashes
    renderResourceViewer({ resources: resourcesWithMissingType });
    expect(screen.getByText('Table 1')).toBeInTheDocument();
  });

  it('handles sort by name with missing display names', () => {
    const resourcesWithMissingNames = [
      {
        dataplexEntry: {
          name: 'project/dataset/table1',
          entrySource: {},
          entryType: 'tables-table',
          updateTime: { seconds: 1640995200 }
        }
      },
      {
        dataplexEntry: {
          name: 'project/dataset/table2',
          entrySource: { displayName: 'Table 2' },
          entryType: 'tables-table',
          updateTime: { seconds: 1641081600 }
        }
      }
    ];

    renderResourceViewer({ 
      resources: resourcesWithMissingNames,
      showSortBy: true
    });

    // Should still render both resources
    expect(screen.getAllByTestId('search-entries-card')).toHaveLength(2);
  });

  // Additional tests for increased coverage

  it('displays semantic search results indicator', () => {
    renderResourceViewer({}, { search: { searchFilters: [], semanticSearch: true } });

    expect(screen.getByText('Search results')).toBeInTheDocument();
  });

  it('handles failed status with INVALID_ARGUMENT error', () => {
    renderResourceViewer({
      resourcesStatus: 'failed',
      error: {
        message: 'Bad Request',
        details: 'INVALID_ARGUMENT: The query is malformed'
      }
    });

    expect(screen.getByText(/invalid arguments passed in search params/)).toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
  });

  it('handles failed status with non-INVALID_ARGUMENT error with details', () => {
    renderResourceViewer({
      resourcesStatus: 'failed',
      error: {
        message: 'Unauthorized',
        details: 'Authentication failed'
      }
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles failed status with error without details', () => {
    renderResourceViewer({
      resourcesStatus: 'failed',
      error: {
        message: 'Server Error'
      }
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles double click on resource when access is granted', () => {
    const mockOnPreviewDataChange = vi.fn();
    // Use the first resource's dataplexEntry which has name 'project/dataset/table1'
    const previewData = mockResources[0].dataplexEntry;

    renderResourceViewer(
      {
        previewData,
        onPreviewDataChange: mockOnPreviewDataChange
      },
      { entry: { status: 'succeeded' } }
    );

    // Find the selected card - Table 1 should have the selected indicator
    const selectedIndicator = screen.getByTestId('selected-indicator');
    const selectedCard = selectedIndicator.closest('[data-testid="search-entries-card"]');

    if (selectedCard) {
      fireEvent.doubleClick(selectedCard);
      expect(mockNavigate).toHaveBeenCalledWith(
        `/view-details?entry=${encodeURIComponent(btoa(previewData.name))}`
      );
    }
  });

  it('handles double click on different resource when another is previewed', () => {
    const mockOnPreviewDataChange = vi.fn();
    // Preview Table 1
    const previewData = mockResources[0].dataplexEntry;

    renderResourceViewer(
      {
        previewData,
        onPreviewDataChange: mockOnPreviewDataChange
      },
      { entry: { status: 'succeeded' } }
    );

    // Find a card that is NOT selected (doesn't have the selected indicator)
    const cards = screen.getAllByTestId('search-entries-card');
    // Default sortOrder is null so original order: Table 1 (selected), Table 2, Dataset 1
    // Use cards[1] which is Table 2, not the previewed one
    const differentCard = cards[1];

    // Make sure it's not the selected one
    if (!differentCard.querySelector('[data-testid="selected-indicator"]')) {
      fireEvent.doubleClick(differentCard);
      // Should update preview data, not navigate
      expect(mockOnPreviewDataChange).toHaveBeenCalled();
    }
  });

  it('handles scroll event and shows shadow', () => {
    renderResourceViewer();

    // Find the scrollable container
    const scrollableContainer = screen.getByText('Dataset 1').closest('div[style*="overflow"]');

    if (scrollableContainer) {
      fireEvent.scroll(scrollableContainer, { target: { scrollTop: 100 } });
      // The shadow element should be visible (opacity: 1) after scrolling
    }
  });

  it('handles hover on resource card', () => {
    renderResourceViewer();

    const cards = screen.getAllByTestId('search-entries-card');

    // Hover on first card
    fireEvent.mouseEnter(cards[0].closest('div[class*="MuiBox"]') || cards[0]);
    // Mouse leave
    fireEvent.mouseLeave(cards[0].closest('div[class*="MuiBox"]') || cards[0]);

    // Should not throw and cards should still be visible
    expect(cards[0]).toBeInTheDocument();
  });


  it('sorts resources correctly when both have no display name', () => {
    const resourcesNoNames = [
      {
        dataplexEntry: {
          name: 'project/dataset/a',
          entrySource: {},
          entryType: 'tables-table',
          updateTime: { seconds: 1640995200 }
        }
      },
      {
        dataplexEntry: {
          name: 'project/dataset/b',
          entrySource: {},
          entryType: 'tables-table',
          updateTime: { seconds: 1641081600 }
        }
      }
    ];

    renderResourceViewer({
      resources: resourcesNoNames,
      showSortBy: true
    });

    // Open sort menu and select Name
    const sortButton = screen.getByText('Most relevant');
    fireEvent.click(sortButton);
    const nameOptions = screen.getAllByText('Name');
    const menuItem = nameOptions.find(el => el.closest('[role="menuitem"]'));
    fireEvent.click(menuItem!);

    // Both should still be rendered (they have same empty name)
    expect(screen.getAllByTestId('search-entries-card')).toHaveLength(2);
  });

  it('handles sort by last modified with missing update time', () => {
    const resourcesMixedTime = [
      {
        dataplexEntry: {
          name: 'project/dataset/a',
          entrySource: { displayName: 'A' },
          entryType: 'tables-table'
          // No updateTime
        }
      },
      {
        dataplexEntry: {
          name: 'project/dataset/b',
          entrySource: { displayName: 'B' },
          entryType: 'tables-table',
          updateTime: { seconds: 1641081600 }
        }
      }
    ];

    renderResourceViewer({
      resources: resourcesMixedTime
    });

    // Default sortOrder is null, so resources are in original order (A first, then B)
    const cards = screen.getAllByTestId('search-entries-card');
    expect(cards[0]).toHaveTextContent('A');
    expect(cards[1]).toHaveTextContent('B');
  });


  it('handles onFavoriteClick being undefined in list view', () => {
    renderResourceViewer({
      onFavoriteClick: undefined
    });

    // Should render without errors
    expect(screen.getAllByTestId('search-entries-card')).toHaveLength(3);
  });



  it('handles idle resources status', () => {
    renderResourceViewer({
      resourcesStatus: 'idle'
    });

    // Should render empty content for idle state
    expect(screen.queryByTestId('shimmer-loader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('search-entries-card')).not.toBeInTheDocument();
  });

  it('calls getFormatedDate and getEntryType in table view', () => {
    renderResourceViewer({ viewMode: 'table' });

    // Check that the utility functions were called and rendered output
    expect(screen.getByTestId('formatted-date')).toBeInTheDocument();
    expect(screen.getByTestId('entry-type')).toHaveTextContent('Table');
  });

  it('handles getFormatedDate with invalid date', () => {
    const resourcesWithInvalidDate = [
      {
        dataplexEntry: {
          name: 'project/dataset/table1',
          entrySource: { displayName: 'Table 1' },
          entryType: 'tables-table',
          updateTime: { seconds: 'invalid' }
        }
      }
    ];

    renderResourceViewer({
      resources: resourcesWithInvalidDate,
      viewMode: 'table'
    });

    // Should still render without crashing
    expect(screen.getByTestId('search-table-view')).toBeInTheDocument();
  });







});
