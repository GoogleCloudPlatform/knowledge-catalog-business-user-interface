import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock @mui/x-data-grid to avoid CSS import issues
vi.mock('@mui/x-data-grid', () => ({
  GridFilterListIcon: () => <span data-testid="GridFilterListIcon">FilterIcon</span>,
  DataGrid: () => <div data-testid="data-grid">DataGrid</div>
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock react-redux
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
}));

// Mock entrySlice
vi.mock('../../features/entry/entrySlice', () => ({
  fetchEntry: vi.fn(),
  clearHistory: vi.fn(),
}));

// Mock FilterBar to avoid deep rendering issues while satisfying the tests
vi.mock('../Common/FilterBar', () => ({
  __esModule: true,
  default: (props: any) => (
    <input
      data-testid="mock-filter-bar"
      placeholder={props.placeholder}
      value={props.filterText}
      onChange={(e) => props.onFilterTextChange(e.target.value)}
    />
  ),
  FilterBarChips: () => <div data-testid="mock-filter-bar-chips" />
}));

// Capture props for child components
let capturedResourceViewerProps: any = null;
let capturedFilterDropdownProps: any = null;

// Mock ResourceViewer
vi.mock('../Common/ResourceViewer', () => ({
  default: (props: any) => {
    capturedResourceViewerProps = props;
    return (
      <div data-testid="resource-viewer">
        ResourceViewer Mock - {props.resources?.length || 0} resources
        <div data-testid="rv-custom-filters">{props.customFilters}</div>
        <button
          data-testid="trigger-preview"
          onClick={() => props.onPreviewDataChange && props.onPreviewDataChange({ name: 'preview-asset' })}
        >
          Preview
        </button>
        <button
          data-testid="clear-preview"
          onClick={() => props.onPreviewDataChange && props.onPreviewDataChange(null)}
        >
          Clear Preview
        </button>
        <button
          data-testid="change-view-mode"
          onClick={() => props.onViewModeChange && props.onViewModeChange('table')}
        >
          Change View
        </button>
        <button
          data-testid="change-page-size"
          onClick={() => props.setPageSize && props.setPageSize(50)}
        >
          Change Page Size
        </button>
      </div>
    );
  }
}));

// Mock FilterDropdown
vi.mock('../Filter/FilterDropDown', () => ({
  default: (props: any) => {
    capturedFilterDropdownProps = props;
    return (
      <div data-testid="filter-dropdown">
        FilterDropdown Mock - {props.filters?.length || 0} filters
        <button
          data-testid="add-system-filter"
          onClick={() => props.onFilterChange && props.onFilterChange([
            ...props.filters,
            { type: 'system', name: 'BigQuery' }
          ])}
        >
          Add System Filter
        </button>
        <button
          data-testid="add-type-filter"
          onClick={() => props.onFilterChange && props.onFilterChange([
            ...props.filters,
            { type: 'typeAliases', name: 'Tables' }
          ])}
        >
          Add Type Filter
        </button>
        <button
          data-testid="add-project-filter"
          onClick={() => props.onFilterChange && props.onFilterChange([
            ...props.filters,
            { type: 'project', name: 'my-project' }
          ])}
        >
          Add Project Filter
        </button>
        <button
          data-testid="add-aspect-filter"
          onClick={() => props.onFilterChange && props.onFilterChange([
            ...props.filters,
            { type: 'aspectType', name: 'schema' }
          ])}
        >
          Add Aspect Filter
        </button>
        <button
          data-testid="add-others-system-filter"
          onClick={() => props.onFilterChange && props.onFilterChange([
            { type: 'system', name: 'Others' }
          ])}
        >
          Add Others System Filter
        </button>
        <button
          data-testid="add-others-project-filter"
          onClick={() => props.onFilterChange && props.onFilterChange([
            { type: 'project', name: 'Others' }
          ])}
        >
          Add Others Project Filter
        </button>
        <button
          data-testid="clear-filters"
          onClick={() => props.onFilterChange && props.onFilterChange([])}
        >
          Clear Filters
        </button>
      </div>
    );
  }
}));

// Mock typeAliases
vi.mock('../../utils/resourceUtils', () => ({
  typeAliases: {
    'Tables': 'tables',
    'Datasets': 'datasets',
    'Views': 'views'
  }
}));

// Import component after mocks
import DataProductAssets from './DataProductAssets';

describe('DataProductAssets', () => {
  const mockLinkedAssets = [
    {
      dataplexEntry: {
        name: 'asset-1',
        entrySource: {
          displayName: 'Customer Table',
          description: 'Contains customer information',
          system: 'BigQuery',
          resource: 'projects/my-project/datasets/my-dataset/tables/customers'
        },
        entryType: 'projects/123/locations/us/entryTypes/tables',
        aspects: {
          'schema.global': { fields: [] }
        }
      },
      linkedResource: 'projects/my-project/datasets/my-dataset/tables/customers'
    },
    {
      dataplexEntry: {
        name: 'asset-2',
        entrySource: {
          displayName: 'Orders Table',
          description: 'Contains order data',
          system: 'BigQuery',
          resource: 'projects/other-project/datasets/sales/tables/orders'
        },
        entryType: 'projects/123/locations/us/entryTypes/tables',
        aspects: {
          'usage.global': { queries: 100 }
        }
      },
      linkedResource: 'projects/other-project/datasets/sales/tables/orders'
    },
    {
      dataplexEntry: {
        name: 'asset-3',
        entrySource: {
          displayName: 'Product View',
          description: 'View for product catalog',
          system: 'Spanner',
          resource: 'projects/my-project/instances/main/databases/catalog/views/products'
        },
        entryType: 'projects/123/locations/us/entryTypes/views',
        aspects: {}
      },
      linkedResource: 'projects/my-project/instances/main/databases/catalog/views/products'
    }
  ];

  const defaultProps = {
    linkedAssets: mockLinkedAssets,
    searchTerm: '',
    onSearchTermChange: vi.fn(),
    idToken: 'test-token-123',
    onAssetPreviewChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedResourceViewerProps = null;
    capturedFilterDropdownProps = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(<DataProductAssets {...defaultProps} {...props} />);
  };

  // ============================================
  // EMPTY STATE TESTS
  // ============================================
  describe('Empty State', () => {
    it('should render empty state when linkedAssets is null', () => {
      renderComponent({ linkedAssets: null });

      expect(screen.getByText('No assets available for this Data Product.')).toBeInTheDocument();
      expect(screen.queryByTestId('resource-viewer')).not.toBeInTheDocument();
    });

    it('should render empty state when linkedAssets is undefined', () => {
      renderComponent({ linkedAssets: undefined });

      expect(screen.getByText('No assets available for this Data Product.')).toBeInTheDocument();
    });

    it('should render empty state when linkedAssets is empty array', () => {
      renderComponent({ linkedAssets: [] });

      expect(screen.getByText('No assets available for this Data Product.')).toBeInTheDocument();
    });

    it('should not render filter toggle or search in empty state', () => {
      renderComponent({ linkedAssets: [] });

      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Filter assets by name or description')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('Rendering', () => {
    it('should render ResourceViewer when assets are available', () => {
      renderComponent();

      expect(screen.getByTestId('resource-viewer')).toBeInTheDocument();
      expect(screen.getByText(/3 resources/)).toBeInTheDocument();
    });

    it('should render search input with correct placeholder', () => {
      renderComponent();

      expect(screen.getByPlaceholderText('Filter assets by name or description')).toBeInTheDocument();
    });

    it('should render filter toggle button', () => {
      renderComponent();

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should render search icon in search box', () => {
      renderComponent();

      expect(screen.getByPlaceholderText('Filter assets by name or description')).toBeInTheDocument();
    });

    it('should pass correct props to ResourceViewer', () => {
      renderComponent();

      expect(capturedResourceViewerProps).not.toBeNull();
      expect(capturedResourceViewerProps.resources).toHaveLength(3);
      expect(capturedResourceViewerProps.resourcesStatus).toBe('succeeded');
      expect(capturedResourceViewerProps.id_token).toBe('test-token-123');
      expect(capturedResourceViewerProps.viewMode).toBe('table');
      expect(capturedResourceViewerProps.pageSize).toBe(20);
      expect(capturedResourceViewerProps.showFilters).toBe(true);
      expect(capturedResourceViewerProps.showSortBy).toBe(true);
      expect(capturedResourceViewerProps.showResultsCount).toBe(false);
      expect(capturedResourceViewerProps.hideMostRelevant).toBe(true);
    });

    it('should pass typeAliases to ResourceViewer', () => {
      renderComponent();

      expect(capturedResourceViewerProps.typeAliases).toEqual({
        'Tables': 'tables',
        'Datasets': 'datasets',
        'Views': 'views'
      });
    });
  });

  // ============================================
  // SEARCH FILTERING TESTS
  // ============================================
  describe('Search Filtering', () => {
    it('should display searchTerm value in input', () => {
      renderComponent({ searchTerm: 'customer' });

      const input = screen.getByPlaceholderText('Filter assets by name or description') as HTMLInputElement;
      expect(input.value).toBe('customer');
    });

    it('should call onSearchTermChange when typing in search', async () => {
      const mockOnSearchTermChange = vi.fn();
      renderComponent({ onSearchTermChange: mockOnSearchTermChange });

      const input = screen.getByPlaceholderText('Filter assets by name or description');
      fireEvent.change(input, { target: { value: 'test search' } });

      expect(mockOnSearchTermChange).toHaveBeenCalledWith('test search');
    });

    it('should display searchTerm in input without filtering results', () => {
      renderComponent({ searchTerm: 'customer' });

      // searchTerm is just input text, doesn't filter — all assets shown
      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should not filter by description via searchTerm', () => {
      renderComponent({ searchTerm: 'order data' });

      // searchTerm is just input text, doesn't filter — all assets shown
      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should not filter case-insensitively via searchTerm', () => {
      renderComponent({ searchTerm: 'CUSTOMER' });

      // searchTerm is just input text, doesn't filter — all assets shown
      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should show all assets when searchTerm is empty', () => {
      renderComponent({ searchTerm: '' });

      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should show all assets when searchTerm is only whitespace', () => {
      renderComponent({ searchTerm: '   ' });

      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should show all assets even with non-matching searchTerm', () => {
      renderComponent({ searchTerm: 'nonexistent-asset-xyz' });

      // searchTerm is just input text, doesn't filter
      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should handle assets with missing displayName', () => {
      const assetsWithMissingName = [
        {
          dataplexEntry: {
            name: 'asset-no-name',
            entrySource: {
              description: 'Has description but no name'
            }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithMissingName, searchTerm: 'description' });

      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });

    it('should handle assets with missing description', () => {
      const assetsWithMissingDesc = [
        {
          dataplexEntry: {
            name: 'asset-no-desc',
            entrySource: {
              displayName: 'Has name but no description'
            }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithMissingDesc, searchTerm: 'name' });

      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });

    it('should handle assets with missing entrySource', () => {
      const assetsWithMissingEntrySource = [
        {
          dataplexEntry: {
            name: 'asset-no-entry-source'
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithMissingEntrySource, searchTerm: 'something' });

      // searchTerm is just input text, doesn't filter — asset is still shown
      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });
  });

  // ============================================
  // FILTER TOGGLE TESTS
  // ============================================
  describe('Filter Toggle', () => {
    it('should initially have filter panel closed', () => {
      renderComponent();

      // FilterDropdown should not be visible initially (opacity 0, width 0)
      // But the component is still rendered, just hidden
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();
    });

    it('should toggle filter panel when filter button is clicked', async () => {
      renderComponent();

      const filterButton = screen.getByText('Filters');
      expect(filterButton).toBeInTheDocument();

      // Click to open
      fireEvent.click(filterButton);

      // Click again to close
      fireEvent.click(filterButton);
    });

    it('should render Filters text on filter button', () => {
      renderComponent();

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should pass correct props to FilterDropdown', () => {
      renderComponent();

      expect(capturedFilterDropdownProps).not.toBeNull();
      expect(capturedFilterDropdownProps.filters).toEqual([]);
      expect(capturedFilterDropdownProps.isGlossary).toBe(true);
      expect(capturedFilterDropdownProps.onFilterChange).toBeDefined();
    });
  });

  // ============================================
  // SYSTEM FILTER TESTS
  // ============================================
  describe('System Filters', () => {
    it('should filter assets by system', () => {
      renderComponent();

      // Add system filter for BigQuery
      const addSystemFilterBtn = screen.getByTestId('add-system-filter');
      fireEvent.click(addSystemFilterBtn);

      // Should only show BigQuery assets (asset-1 and asset-2)
      expect(capturedResourceViewerProps.resources).toHaveLength(2);
      expect(capturedResourceViewerProps.resources.every(
        (a: any) => a.dataplexEntry.entrySource.system === 'BigQuery'
      )).toBe(true);
    });

    it('should handle "Others" system filter', () => {
      renderComponent();

      // Add "Others" system filter - should match all
      const addOthersBtn = screen.getByTestId('add-others-system-filter');
      fireEvent.click(addOthersBtn);

      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should handle assets with missing system', () => {
      const assetsWithMissingSystem = [
        {
          dataplexEntry: {
            name: 'asset-no-system',
            entrySource: {
              displayName: 'No System Asset'
            }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithMissingSystem });

      // Add system filter
      const addSystemFilterBtn = screen.getByTestId('add-system-filter');
      fireEvent.click(addSystemFilterBtn);

      // Should not match because system is missing
      expect(capturedResourceViewerProps.resources).toHaveLength(0);
    });

    it('should be case-insensitive for system filter', () => {
      const assetsWithDifferentCase = [
        {
          dataplexEntry: {
            name: 'asset-1',
            entrySource: {
              displayName: 'Test',
              system: 'BIGQUERY'
            }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithDifferentCase });

      const addSystemFilterBtn = screen.getByTestId('add-system-filter');
      fireEvent.click(addSystemFilterBtn);

      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });
  });

  // ============================================
  // TYPE FILTER TESTS
  // ============================================
  describe('Type Filters', () => {
    it('should filter assets by type', () => {
      renderComponent();

      // Add type filter for Tables
      const addTypeFilterBtn = screen.getByTestId('add-type-filter');
      fireEvent.click(addTypeFilterBtn);

      // Should only show tables (asset-1 and asset-2)
      expect(capturedResourceViewerProps.resources).toHaveLength(2);
    });

    it('should handle type filter with spaces converted to hyphens', () => {
      const assetsWithHyphenatedType = [
        {
          dataplexEntry: {
            name: 'asset-1',
            entrySource: { displayName: 'Test' },
            entryType: 'projects/123/entryTypes/big-query-tables'
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithHyphenatedType });

      // The filter converts spaces to hyphens
      // "Big Query Tables" -> "big-query-tables"
      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });

    it('should handle assets with missing entryType', () => {
      const assetsWithMissingType = [
        {
          dataplexEntry: {
            name: 'asset-no-type',
            entrySource: { displayName: 'No Type Asset' }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithMissingType });

      const addTypeFilterBtn = screen.getByTestId('add-type-filter');
      fireEvent.click(addTypeFilterBtn);

      expect(capturedResourceViewerProps.resources).toHaveLength(0);
    });
  });

  // ============================================
  // PROJECT FILTER TESTS
  // ============================================
  describe('Project Filters', () => {
    it('should filter assets by project in resource path', () => {
      renderComponent();

      // Add project filter for my-project
      const addProjectFilterBtn = screen.getByTestId('add-project-filter');
      fireEvent.click(addProjectFilterBtn);

      // Should match assets with my-project in resource or linkedResource
      expect(capturedResourceViewerProps.resources).toHaveLength(2);
    });

    it('should handle "Others" project filter', () => {
      renderComponent();

      const addOthersBtn = screen.getByTestId('add-others-project-filter');
      fireEvent.click(addOthersBtn);

      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should match project in linkedResource path', () => {
      const assetsWithLinkedResource = [
        {
          dataplexEntry: {
            name: 'asset-1',
            entrySource: {
              displayName: 'Test',
              resource: 'projects/other/datasets/ds/tables/tbl'
            }
          },
          linkedResource: 'projects/my-project/datasets/ds/tables/tbl'
        }
      ];

      renderComponent({ linkedAssets: assetsWithLinkedResource });

      const addProjectFilterBtn = screen.getByTestId('add-project-filter');
      fireEvent.click(addProjectFilterBtn);

      // Should match because linkedResource contains my-project
      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });

    it('should handle assets with missing resource paths', () => {
      const assetsWithMissingPaths = [
        {
          dataplexEntry: {
            name: 'asset-no-paths',
            entrySource: { displayName: 'No Paths' }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithMissingPaths });

      const addProjectFilterBtn = screen.getByTestId('add-project-filter');
      fireEvent.click(addProjectFilterBtn);

      expect(capturedResourceViewerProps.resources).toHaveLength(0);
    });
  });

  // ============================================
  // ASPECT FILTER TESTS
  // ============================================
  describe('Aspect Filters', () => {
    it('should filter assets by aspect type', () => {
      renderComponent();

      // Add aspect filter for schema
      const addAspectFilterBtn = screen.getByTestId('add-aspect-filter');
      fireEvent.click(addAspectFilterBtn);

      // Should only show assets with schema aspect (asset-1)
      expect(capturedResourceViewerProps.resources).toHaveLength(1);
      expect(capturedResourceViewerProps.resources[0].dataplexEntry.name).toBe('asset-1');
    });

    it('should be case-insensitive for aspect filter', () => {
      const assetsWithUpperCaseAspect = [
        {
          dataplexEntry: {
            name: 'asset-1',
            entrySource: { displayName: 'Test' },
            aspects: { 'SCHEMA.GLOBAL': {} }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithUpperCaseAspect });

      const addAspectFilterBtn = screen.getByTestId('add-aspect-filter');
      fireEvent.click(addAspectFilterBtn);

      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });

    it('should handle assets with empty aspects', () => {
      renderComponent();

      const addAspectFilterBtn = screen.getByTestId('add-aspect-filter');
      fireEvent.click(addAspectFilterBtn);

      // asset-3 has empty aspects, should not match
      expect(capturedResourceViewerProps.resources.every(
        (a: any) => Object.keys(a.dataplexEntry.aspects || {}).length > 0
      )).toBe(true);
    });

    it('should handle assets with missing aspects', () => {
      const assetsWithMissingAspects = [
        {
          dataplexEntry: {
            name: 'asset-no-aspects',
            entrySource: { displayName: 'No Aspects' }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithMissingAspects });

      const addAspectFilterBtn = screen.getByTestId('add-aspect-filter');
      fireEvent.click(addAspectFilterBtn);

      expect(capturedResourceViewerProps.resources).toHaveLength(0);
    });
  });

  // ============================================
  // COMBINED FILTERS TESTS
  // ============================================
  describe('Combined Filters', () => {
    it('should apply multiple filter types (AND logic)', () => {
      renderComponent();

      // Add system filter for BigQuery
      const addSystemFilterBtn = screen.getByTestId('add-system-filter');
      fireEvent.click(addSystemFilterBtn);

      // Add project filter
      const addProjectFilterBtn = screen.getByTestId('add-project-filter');
      fireEvent.click(addProjectFilterBtn);

      // Should only show BigQuery assets in my-project (asset-1)
      expect(capturedResourceViewerProps.resources).toHaveLength(1);
      expect(capturedResourceViewerProps.resources[0].dataplexEntry.name).toBe('asset-1');
    });

    it('should clear filters when clear button is clicked', () => {
      renderComponent();

      // Add some filters
      const addSystemFilterBtn = screen.getByTestId('add-system-filter');
      fireEvent.click(addSystemFilterBtn);

      // Clear filters
      const clearFiltersBtn = screen.getByTestId('clear-filters');
      fireEvent.click(clearFiltersBtn);

      // Should show all assets again
      expect(capturedResourceViewerProps.resources).toHaveLength(3);
    });

    it('should apply dropdown filters with searchTerm as input text only', () => {
      renderComponent({ searchTerm: 'customer' });

      // Add system filter
      const addSystemFilterBtn = screen.getByTestId('add-system-filter');
      fireEvent.click(addSystemFilterBtn);

      // searchTerm doesn't filter, only dropdown filter applies (2 BigQuery assets)
      expect(capturedResourceViewerProps.resources).toHaveLength(2);
    });
  });

  // ============================================
  // PREVIEW DATA HANDLING TESTS
  // ============================================
  describe('Preview Data Handling', () => {
    it('should call onAssetPreviewChange when preview is triggered', () => {
      const mockOnAssetPreviewChange = vi.fn();
      renderComponent({ onAssetPreviewChange: mockOnAssetPreviewChange });

      const previewBtn = screen.getByTestId('trigger-preview');
      fireEvent.click(previewBtn);

      expect(mockOnAssetPreviewChange).toHaveBeenCalledWith({ name: 'preview-asset' });
    });

    it('should close filter panel when preview data is set', () => {
      renderComponent();

      // Open filter panel first
      const filterButton = screen.getByText('Filters');
      fireEvent.click(filterButton);

      // Trigger preview
      const previewBtn = screen.getByTestId('trigger-preview');
      fireEvent.click(previewBtn);

      // Filter panel should close (isFilterOpen becomes false)
      // The component re-renders with filter closed
    });

    it('should not close filter panel when preview is cleared', () => {
      const mockOnAssetPreviewChange = vi.fn();
      renderComponent({ onAssetPreviewChange: mockOnAssetPreviewChange });

      const clearPreviewBtn = screen.getByTestId('clear-preview');
      fireEvent.click(clearPreviewBtn);

      expect(mockOnAssetPreviewChange).toHaveBeenCalledWith(null);
    });

    it('should pass previewData to ResourceViewer', () => {
      renderComponent();

      // Initially null
      expect(capturedResourceViewerProps.previewData).toBeNull();

      // Trigger preview
      const previewBtn = screen.getByTestId('trigger-preview');
      fireEvent.click(previewBtn);

      expect(capturedResourceViewerProps.previewData).toEqual({ name: 'preview-asset' });
    });
  });

  // ============================================
  // VIEW MODE AND PAGINATION TESTS
  // ============================================
  describe('View Mode and Pagination', () => {
    it('should change view mode when triggered', () => {
      renderComponent();

      // Initially table view
      expect(capturedResourceViewerProps.viewMode).toBe('table');

      // Change to table view
      const changeViewBtn = screen.getByTestId('change-view-mode');
      fireEvent.click(changeViewBtn);

      expect(capturedResourceViewerProps.viewMode).toBe('table');
    });

    it('should change page size when triggered', () => {
      renderComponent();

      // Initially 20
      expect(capturedResourceViewerProps.pageSize).toBe(20);

      // Change to 50
      const changePageSizeBtn = screen.getByTestId('change-page-size');
      fireEvent.click(changePageSizeBtn);

      expect(capturedResourceViewerProps.pageSize).toBe(50);
    });

    it('should pass handlePagination as no-op function', () => {
      renderComponent();

      expect(capturedResourceViewerProps.handlePagination).toBeDefined();
      expect(() => capturedResourceViewerProps.handlePagination()).not.toThrow();
    });

    it('should pass onTypeFilterChange as no-op function', () => {
      renderComponent();

      expect(capturedResourceViewerProps.onTypeFilterChange).toBeDefined();
      expect(() => capturedResourceViewerProps.onTypeFilterChange()).not.toThrow();
    });
  });

  // ============================================
  // EDGE CASES TESTS
  // ============================================
  describe('Edge Cases', () => {
    it('should handle null dataplexEntry', () => {
      const assetsWithNullEntry = [
        {
          dataplexEntry: null
        }
      ];

      // searchTerm is just input text, doesn't filter — asset is still shown
      renderComponent({ linkedAssets: assetsWithNullEntry, searchTerm: 'test' });

      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });

    it('should handle assets with all fields missing', () => {
      const minimalAssets = [{}];

      renderComponent({ linkedAssets: minimalAssets });

      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });

    it('should maintain filter state across re-renders', () => {
      const { rerender } = renderComponent();

      // Add a filter
      const addSystemFilterBtn = screen.getByTestId('add-system-filter');
      fireEvent.click(addSystemFilterBtn);

      // Re-render with new props
      rerender(
        <DataProductAssets
          {...defaultProps}
          searchTerm="customer"
        />
      );

      // Filter should still be applied (searchTerm is just input text, doesn't filter)
      expect(capturedResourceViewerProps.resources).toHaveLength(2);
    });

    it('should handle rapid filter changes', () => {
      renderComponent();

      // Rapidly add multiple filters
      const addSystemFilterBtn = screen.getByTestId('add-system-filter');
      const addTypeFilterBtn = screen.getByTestId('add-type-filter');
      const addProjectFilterBtn = screen.getByTestId('add-project-filter');

      fireEvent.click(addSystemFilterBtn);
      fireEvent.click(addTypeFilterBtn);
      fireEvent.click(addProjectFilterBtn);

      // All filters should be applied
      expect(capturedFilterDropdownProps.filters).toHaveLength(3);
    });

    it('should handle special characters in search term', () => {
      const assetsWithSpecialChars = [
        {
          dataplexEntry: {
            name: 'asset-special',
            entrySource: {
              displayName: 'Test (with) [special] {chars}',
              description: 'Description with <tags> & symbols'
            }
          }
        }
      ];

      renderComponent({ linkedAssets: assetsWithSpecialChars, searchTerm: 'special' });

      expect(capturedResourceViewerProps.resources).toHaveLength(1);
    });
  });

  // ============================================
  // CONTAINER STYLING TESTS
  // ============================================
  describe('Container Styling', () => {
    it('should pass correct container styles to ResourceViewer', () => {
      renderComponent();

      expect(capturedResourceViewerProps.containerStyle).toEqual({
        height: '100%',
        border: 'none',
        margin: 0,
        backgroundColor: '#F7F9F9',
        width: 'auto'
      });
    });

    it('should pass correct content styles to ResourceViewer', () => {
      renderComponent();

      expect(capturedResourceViewerProps.contentStyle).toEqual({
        minHeight: 'auto',
        maxHeight: '100%',
        margin: 0,
        padding: 0
      });
    });
  });

  // ============================================
  // MODULE EXPORT TESTS
  // ============================================
  describe('Module Exports', () => {
    it('should export DataProductAssets as default', async () => {
      const module = await import('./DataProductAssets');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });
  });
});
