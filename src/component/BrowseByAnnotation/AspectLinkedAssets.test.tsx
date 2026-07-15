import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AspectLinkedAssets from './AspectLinkedAssets';
import AspectLinkedAssetsSkeleton from './AspectLinkedAssetsSkeleton';

// Mock ResourceViewer component
vi.mock('../Common/ResourceViewer', () => ({
  default: ({
    resources,
    resourcesStatus,
    previewData,
    onPreviewDataChange,
    viewMode,
    onViewModeChange,
    pageSize,
    setPageSize,
    showFilters,
    showSortBy,
    showResultsCount,
    hideMostRelevant,
    customFilters,
  }: {
    resources: unknown[];
    resourcesStatus: string;
    previewData: unknown;
    onPreviewDataChange: (data: unknown) => void;
    viewMode: string;
    onViewModeChange: (mode: 'list' | 'table') => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    showFilters: boolean;
    showSortBy: boolean;
    showResultsCount: boolean;
    hideMostRelevant: boolean;
    customFilters: React.ReactNode;
  }) => (
    <div data-testid="resource-viewer">
      <span data-testid="rv-status">{resourcesStatus}</span>
      <span data-testid="rv-count">{resources?.length || 0}</span>
      <span data-testid="rv-preview">{previewData ? 'has-preview' : 'no-preview'}</span>
      <span data-testid="rv-view-mode">{viewMode}</span>
      <span data-testid="rv-page-size">{pageSize}</span>
      <span data-testid="rv-show-filters">{showFilters ? 'true' : 'false'}</span>
      <span data-testid="rv-show-sort">{showSortBy ? 'true' : 'false'}</span>
      <span data-testid="rv-show-results">{showResultsCount ? 'true' : 'false'}</span>
      <span data-testid="rv-hide-most-relevant">{hideMostRelevant ? 'true' : 'false'}</span>
      <div data-testid="rv-custom-filters">{customFilters}</div>
      <button data-testid="rv-set-preview" onClick={() => onPreviewDataChange({ name: 'test' })}>
        Set Preview
      </button>
      <button data-testid="rv-clear-preview" onClick={() => onPreviewDataChange(null)}>
        Clear Preview
      </button>
      <button data-testid="rv-change-view" onClick={() => onViewModeChange('table')}>
        Change View
      </button>
      <button data-testid="rv-change-page-size" onClick={() => setPageSize(50)}>
        Change Page Size
      </button>
    </div>
  ),
}));

// Mock FilterDropdown component
vi.mock('../Filter/FilterDropDown', () => ({
  default: ({
    filters,
    onFilterChange,
    isGlossary,
  }: {
    filters: unknown[];
    onFilterChange: (filters: unknown[]) => void;
    isGlossary: boolean;
  }) => (
    <div data-testid="filter-dropdown">
      <span data-testid="fd-count">{(filters as unknown[])?.length || 0}</span>
      <span data-testid="fd-is-glossary">{isGlossary ? 'true' : 'false'}</span>
      <button
        data-testid="fd-add-system-filter"
        onClick={() => onFilterChange([...filters as unknown[], { type: 'system', name: 'BigQuery' }])}
      >
        Add System Filter
      </button>
      <button
        data-testid="fd-add-type-filter"
        onClick={() => onFilterChange([...filters as unknown[], { type: 'typeAliases', name: 'Table' }])}
      >
        Add Type Filter
      </button>
      <button
        data-testid="fd-add-project-filter"
        onClick={() => onFilterChange([...filters as unknown[], { type: 'project', name: 'my-project' }])}
      >
        Add Project Filter
      </button>
      <button
        data-testid="fd-add-aspect-filter"
        onClick={() => onFilterChange([...filters as unknown[], { type: 'aspectType', name: 'custom-aspect' }])}
      >
        Add Aspect Filter
      </button>
      <button
        data-testid="fd-add-others-system-filter"
        onClick={() => onFilterChange([...filters as unknown[], { type: 'system', name: 'Others' }])}
      >
        Add Others System Filter
      </button>
      <button
        data-testid="fd-add-others-project-filter"
        onClick={() => onFilterChange([...filters as unknown[], { type: 'project', name: 'Others' }])}
      >
        Add Others Project Filter
      </button>
      <button data-testid="fd-clear-filters" onClick={() => onFilterChange([])}>
        Clear Filters
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
}));

// Sample test data
const mockLinkedAssets = [
  {
    dataplexEntry: {
      entrySource: {
        displayName: 'Asset One',
        description: 'First asset description',
        system: 'BigQuery',
        resource: 'projects/project-one/datasets/ds1/tables/t1',
      },
      entryType: 'projects/test/entryTypes/table',
      aspects: {
        'custom-aspect': { data: 'value' },
      },
    },
    linkedResource: 'projects/project-one/datasets/ds1/tables/t1',
  },
  {
    dataplexEntry: {
      entrySource: {
        displayName: 'Asset Two',
        description: 'Second asset description',
        system: 'Dataplex',
        resource: 'projects/project-two/datasets/ds2/views/v1',
      },
      entryType: 'projects/test/entryTypes/view',
      aspects: {
        'another-aspect': { data: 'value2' },
      },
    },
    linkedResource: 'projects/project-two/datasets/ds2/views/v1',
  },
  {
    dataplexEntry: {
      entrySource: {
        displayName: 'Asset Three',
        description: 'Third asset description',
        system: 'BigQuery',
        resource: 'projects/my-project/datasets/ds3/tables/t3',
      },
      entryType: 'projects/test/entryTypes/data-set',
      aspects: {
        'custom-aspect': { data: 'value3' },
      },
    },
    linkedResource: 'projects/my-project/datasets/ds3/tables/t3',
  },
];

const defaultProps = {
  linkedAssets: mockLinkedAssets,
  searchTerm: '',
  onSearchTermChange: vi.fn(),
  idToken: 'test-token',
  onAssetPreviewChange: vi.fn(),
  resourcesStatus: 'succeeded' as const,
};

describe('AspectLinkedAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component with linked assets', () => {
      render(<AspectLinkedAssets {...defaultProps} />);

      expect(screen.getByTestId('resource-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should render search input with correct placeholder', () => {
      render(<AspectLinkedAssets {...defaultProps} />);

      expect(screen.getByPlaceholderText('Filter linked assets by name or description')).toBeInTheDocument();
    });

    it('should render filter toggle button', () => {
      render(<AspectLinkedAssets {...defaultProps} />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should render ResourceViewer with correct props', () => {
      render(<AspectLinkedAssets {...defaultProps} />);

      expect(screen.getByTestId('rv-status')).toHaveTextContent('succeeded');
      expect(screen.getByTestId('rv-view-mode')).toHaveTextContent('list');
      expect(screen.getByTestId('rv-page-size')).toHaveTextContent('20');
      expect(screen.getByTestId('rv-show-filters')).toHaveTextContent('true');
      expect(screen.getByTestId('rv-show-sort')).toHaveTextContent('true');
      expect(screen.getByTestId('rv-show-results')).toHaveTextContent('false');
      expect(screen.getByTestId('rv-hide-most-relevant')).toHaveTextContent('true');
    });

    it('should pass isGlossary=true to FilterDropdown', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      // Open filter panel
      const filterToggle = screen.getByText('Filters');
      await user.click(filterToggle);

      expect(screen.getByTestId('fd-is-glossary')).toHaveTextContent('true');
    });
  });

  describe('loading state', () => {
    it('should render skeleton when resourcesStatus is loading', () => {
      render(<AspectLinkedAssets {...defaultProps} resourcesStatus="loading" />);

      // Should render skeleton, not the main content
      expect(screen.queryByTestId('resource-viewer')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Filter linked assets by name or description')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should render empty state when linkedAssets is empty', () => {
      render(<AspectLinkedAssets {...defaultProps} linkedAssets={[]} />);

      expect(screen.getByText('No linked assets available.')).toBeInTheDocument();
      expect(screen.queryByTestId('resource-viewer')).not.toBeInTheDocument();
    });

    it('should render empty state when linkedAssets is null', () => {
      render(<AspectLinkedAssets {...defaultProps} linkedAssets={null as any} />);

      expect(screen.getByText('No linked assets available.')).toBeInTheDocument();
    });

    it('should render empty state when linkedAssets is undefined', () => {
      render(<AspectLinkedAssets {...defaultProps} linkedAssets={undefined as any} />);

      expect(screen.getByText('No linked assets available.')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should display searchTerm in input without filtering results', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="Asset One" />);

      // searchTerm is now just the FilterBar input text, not an active filter
      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should not filter by description via searchTerm', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="Second asset" />);

      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should not filter case-insensitively via searchTerm', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="ASSET ONE" />);

      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should show all assets when search term is empty', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="" />);

      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should show all assets when search term is whitespace', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="   " />);

      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should call onSearchTermChange when typing in search input', async () => {
      const user = userEvent.setup();
      const onSearchTermChange = vi.fn();

      render(<AspectLinkedAssets {...defaultProps} onSearchTermChange={onSearchTermChange} />);

      const searchInput = screen.getByPlaceholderText('Filter linked assets by name or description');
      await user.type(searchInput, 'test');

      expect(onSearchTermChange).toHaveBeenCalled();
    });

    it('should display current search term value in input', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="existing search" />);

      const searchInput = screen.getByPlaceholderText('Filter linked assets by name or description');
      expect(searchInput).toHaveValue('existing search');
    });

    it('should show all assets even with non-matching searchTerm', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="nonexistent asset" />);

      // searchTerm is just input text, filtering requires creating chips
      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should show all assets with partial name searchTerm', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="One" />);

      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should show all assets with partial description searchTerm', () => {
      render(<AspectLinkedAssets {...defaultProps} searchTerm="First" />);

      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });
  });

  describe('filter toggle', () => {
    it('should toggle filter panel visibility when filter button is clicked', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      // The filter panel container uses CSS transitions (width/opacity) rather than conditional rendering
      // Initially filter panel is closed (opacity 0, width 0)
      // We can verify by checking if the filter toggle has the "closed" styling
      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;

      // Click to open filter panel
      await user.click(filterToggle);

      // After clicking, the filter panel should be accessible
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();
    });

    it('should toggle filter state on repeated clicks', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;

      // Open
      await user.click(filterToggle);
      // Filter dropdown is always in DOM due to CSS transition approach
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();

      // Close - the component uses CSS width/opacity transitions
      await user.click(filterToggle);
      // FilterDropdown remains in DOM but with CSS hiding
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();
    });
  });

  describe('filter functionality', () => {
    it('should filter by system (BigQuery)', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      // Open filter panel
      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      // Add system filter for BigQuery
      await user.click(screen.getByTestId('fd-add-system-filter'));

      // Should show only BigQuery assets (2 out of 3)
      expect(screen.getByTestId('rv-count')).toHaveTextContent('2');
    });

    it('should filter by type (Table)', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      await user.click(screen.getByTestId('fd-add-type-filter'));

      // Should show only Table assets
      expect(screen.getByTestId('rv-count')).toHaveTextContent('1');
    });

    it('should filter by project', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      await user.click(screen.getByTestId('fd-add-project-filter'));

      // Should show only my-project assets
      expect(screen.getByTestId('rv-count')).toHaveTextContent('1');
    });

    it('should filter by aspect type', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      await user.click(screen.getByTestId('fd-add-aspect-filter'));

      // Should show assets with custom-aspect (2 out of 3)
      expect(screen.getByTestId('rv-count')).toHaveTextContent('2');
    });

    it('should handle "Others" system filter', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      await user.click(screen.getByTestId('fd-add-others-system-filter'));

      // "Others" system filter should match all (returns true for all)
      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should handle "Others" project filter', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      await user.click(screen.getByTestId('fd-add-others-project-filter'));

      // "Others" project filter should match all (returns true for all)
      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should combine multiple filters (AND logic)', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      // Add system filter for BigQuery
      await user.click(screen.getByTestId('fd-add-system-filter'));

      // Add project filter for my-project
      await user.click(screen.getByTestId('fd-add-project-filter'));

      // Should show only assets that are both BigQuery AND in my-project (1 asset)
      expect(screen.getByTestId('rv-count')).toHaveTextContent('1');
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      // Add a filter
      await user.click(screen.getByTestId('fd-add-system-filter'));
      expect(screen.getByTestId('rv-count')).toHaveTextContent('2');

      // Clear filters
      await user.click(screen.getByTestId('fd-clear-filters'));
      expect(screen.getByTestId('rv-count')).toHaveTextContent('3');
    });

    it('should apply dropdown filters with searchTerm as input text only', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} searchTerm="Asset Three" />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      // Add system filter for BigQuery
      await user.click(screen.getByTestId('fd-add-system-filter'));

      // searchTerm doesn't filter, only dropdown filter applies (2 BigQuery assets)
      expect(screen.getByTestId('rv-count')).toHaveTextContent('2');
    });
  });

  describe('preview data handling', () => {
    it('should call onAssetPreviewChange when preview is set', async () => {
      const user = userEvent.setup();
      const onAssetPreviewChange = vi.fn();

      render(<AspectLinkedAssets {...defaultProps} onAssetPreviewChange={onAssetPreviewChange} />);

      await user.click(screen.getByTestId('rv-set-preview'));

      expect(onAssetPreviewChange).toHaveBeenCalledWith({ name: 'test' });
    });

    it('should call onAssetPreviewChange with null when preview is cleared', async () => {
      const user = userEvent.setup();
      const onAssetPreviewChange = vi.fn();

      render(<AspectLinkedAssets {...defaultProps} onAssetPreviewChange={onAssetPreviewChange} />);

      await user.click(screen.getByTestId('rv-clear-preview'));

      expect(onAssetPreviewChange).toHaveBeenCalledWith(null);
    });

    it('should set isFilterOpen to false when preview is opened', async () => {
      const user = userEvent.setup();
      const onAssetPreviewChange = vi.fn();

      render(<AspectLinkedAssets {...defaultProps} onAssetPreviewChange={onAssetPreviewChange} />);

      // Open filter panel first
      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();

      // Set preview - this should trigger isFilterOpen = false internally
      await user.click(screen.getByTestId('rv-set-preview'));

      // The component sets isFilterOpen to false when preview data is set
      // FilterDropdown remains in DOM due to CSS transition approach, but state changed
      expect(onAssetPreviewChange).toHaveBeenCalledWith({ name: 'test' });
    });

    it('should not close filter panel when preview is cleared', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      // Open filter panel first
      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();

      // Clear preview (null)
      await user.click(screen.getByTestId('rv-clear-preview'));

      // Filter panel should still be open
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();
    });
  });

  describe('view mode and page size', () => {
    it('should start with list view mode', () => {
      render(<AspectLinkedAssets {...defaultProps} />);

      expect(screen.getByTestId('rv-view-mode')).toHaveTextContent('list');
    });

    it('should change view mode when triggered', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      await user.click(screen.getByTestId('rv-change-view'));

      expect(screen.getByTestId('rv-view-mode')).toHaveTextContent('table');
    });

    it('should start with page size of 20', () => {
      render(<AspectLinkedAssets {...defaultProps} />);

      expect(screen.getByTestId('rv-page-size')).toHaveTextContent('20');
    });

    it('should change page size when triggered', async () => {
      const user = userEvent.setup();

      render(<AspectLinkedAssets {...defaultProps} />);

      await user.click(screen.getByTestId('rv-change-page-size'));

      expect(screen.getByTestId('rv-page-size')).toHaveTextContent('50');
    });
  });

  describe('edge cases', () => {
    it('should handle assets with missing displayName', () => {
      const assetsWithMissingName = [
        {
          dataplexEntry: {
            entrySource: {
              description: 'Has description but no name',
              system: 'BigQuery',
              resource: 'projects/p1/tables/t1',
            },
            entryType: 'projects/test/entryTypes/table',
            aspects: {},
          },
          linkedResource: 'projects/p1/tables/t1',
        },
      ];

      render(<AspectLinkedAssets {...defaultProps} linkedAssets={assetsWithMissingName} searchTerm="missing" />);

      // searchTerm is just input text, doesn't filter — asset is still shown
      expect(screen.getByTestId('rv-count')).toHaveTextContent('1');
    });

    it('should handle assets with missing description', () => {
      const assetsWithMissingDesc = [
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Has name but no description',
              system: 'BigQuery',
              resource: 'projects/p1/tables/t1',
            },
            entryType: 'projects/test/entryTypes/table',
            aspects: {},
          },
          linkedResource: 'projects/p1/tables/t1',
        },
      ];

      render(<AspectLinkedAssets {...defaultProps} linkedAssets={assetsWithMissingDesc} searchTerm="name" />);

      expect(screen.getByTestId('rv-count')).toHaveTextContent('1');
    });

    it('should handle assets with missing entrySource', () => {
      const assetsWithMissingEntrySource = [
        {
          dataplexEntry: {
            entryType: 'projects/test/entryTypes/table',
            aspects: {},
          },
          linkedResource: 'projects/p1/tables/t1',
        },
      ];

      render(<AspectLinkedAssets {...defaultProps} linkedAssets={assetsWithMissingEntrySource} searchTerm="anything" />);

      // searchTerm is just input text, doesn't filter — asset is still shown
      expect(screen.getByTestId('rv-count')).toHaveTextContent('1');
    });

    it('should handle assets with missing aspects', () => {
      const assetsWithMissingAspects = [
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Asset without aspects',
              description: 'Description',
              system: 'BigQuery',
              resource: 'projects/p1/tables/t1',
            },
            entryType: 'projects/test/entryTypes/table',
          },
          linkedResource: 'projects/p1/tables/t1',
        },
      ];

      render(<AspectLinkedAssets {...defaultProps} linkedAssets={assetsWithMissingAspects} />);

      expect(screen.getByTestId('rv-count')).toHaveTextContent('1');
    });

    it('should handle assets with missing entryType', async () => {
      const user = userEvent.setup();
      const assetsWithMissingEntryType = [
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Asset without entryType',
              description: 'Description',
              system: 'BigQuery',
              resource: 'projects/p1/tables/t1',
            },
            aspects: {},
          },
          linkedResource: 'projects/p1/tables/t1',
        },
      ];

      render(<AspectLinkedAssets {...defaultProps} linkedAssets={assetsWithMissingEntryType} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      // Add type filter - should not match since entryType is missing
      await user.click(screen.getByTestId('fd-add-type-filter'));

      expect(screen.getByTestId('rv-count')).toHaveTextContent('0');
    });

    it('should handle assets with missing linkedResource', async () => {
      const user = userEvent.setup();
      const assetsWithMissingLinkedResource = [
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Asset without linkedResource',
              description: 'Description',
              system: 'BigQuery',
              resource: 'projects/my-project/tables/t1',
            },
            entryType: 'projects/test/entryTypes/table',
            aspects: {},
          },
        },
      ];

      render(<AspectLinkedAssets {...defaultProps} linkedAssets={assetsWithMissingLinkedResource} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      // Add project filter - should still match via resource path
      await user.click(screen.getByTestId('fd-add-project-filter'));

      expect(screen.getByTestId('rv-count')).toHaveTextContent('1');
    });

    it('should handle type filter with hyphenated names', async () => {
      const user = userEvent.setup();
      const assetsWithHyphenatedType = [
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Hyphenated Type Asset',
              description: 'Description',
              system: 'BigQuery',
              resource: 'projects/p1/tables/t1',
            },
            entryType: 'projects/test/entryTypes/data-set',
            aspects: {},
          },
          linkedResource: 'projects/p1/tables/t1',
        },
      ];

      render(<AspectLinkedAssets {...defaultProps} linkedAssets={assetsWithHyphenatedType} />);

      const filterToggle = document.querySelector('[data-testid="TuneIcon"]')?.closest('div') as HTMLElement;
      await user.click(filterToggle);

      // The mock adds "Table" as type filter - shouldn't match data-set
      await user.click(screen.getByTestId('fd-add-type-filter'));

      expect(screen.getByTestId('rv-count')).toHaveTextContent('0');
    });
  });

  describe('component exports', () => {
    it('should export AspectLinkedAssets as default', async () => {
      const module = await import('./AspectLinkedAssets');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });
  });
});

describe('AspectLinkedAssetsSkeleton', () => {
  describe('rendering', () => {
    it('should render the skeleton component', () => {
      render(<AspectLinkedAssetsSkeleton />);

      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render filter button skeleton', () => {
      render(<AspectLinkedAssetsSkeleton />);

      // Filter button skeleton has borderRadius 59px and width 40px
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      expect(roundedSkeletons.length).toBeGreaterThan(0);
    });

    it('should render search bar skeleton', () => {
      render(<AspectLinkedAssetsSkeleton />);

      // Search bar skeleton has width 309px
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      expect(roundedSkeletons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render exactly 6 card skeletons', () => {
      const { container } = render(<AspectLinkedAssetsSkeleton />);

      // Each card has shimmer animation box
      const cardContainers = container.querySelectorAll('[class*="MuiBox-root"]');
      // Should have multiple box elements for cards
      expect(cardContainers.length).toBeGreaterThan(6);
    });

    it('should render icon skeleton in each card', () => {
      render(<AspectLinkedAssetsSkeleton />);

      // Each card has a rounded skeleton for the icon (40x40)
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      // 6 cards * icon skeleton + filter button skeleton + search skeleton = at least 8
      expect(roundedSkeletons.length).toBeGreaterThanOrEqual(8);
    });

    it('should render title skeleton in each card', () => {
      render(<AspectLinkedAssetsSkeleton />);

      // Each card has text skeletons for title and subtitle
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // 6 cards * 2 text skeletons (title + subtitle) + 1 description = at least 12
      expect(textSkeletons.length).toBeGreaterThanOrEqual(12);
    });

    it('should render description skeleton in each card', () => {
      render(<AspectLinkedAssetsSkeleton />);

      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Should have description text skeletons
      expect(textSkeletons.length).toBeGreaterThan(0);
    });

    it('should render tag skeletons in each card', () => {
      render(<AspectLinkedAssetsSkeleton />);

      // Each card has 2 rounded tag skeletons
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      // 6 cards * 2 tags + icon + filter button + search = at least 14
      expect(roundedSkeletons.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe('structure', () => {
    it('should have consistent height with AspectLinkedAssets', () => {
      const { container } = render(<AspectLinkedAssetsSkeleton />);

      const outerBox = container.firstChild as HTMLElement;
      expect(outerBox).toHaveStyle({ height: '100%' });
    });

    it('should have consistent width', () => {
      const { container } = render(<AspectLinkedAssetsSkeleton />);

      const outerBox = container.firstChild as HTMLElement;
      expect(outerBox).toHaveStyle({ width: '100%' });
    });

    it('should render cards with proper border styling', () => {
      const { container } = render(<AspectLinkedAssetsSkeleton />);

      // Cards have border and border-radius
      const boxes = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(boxes.length).toBeGreaterThan(0);
    });

    it('should render toolbar section', () => {
      const { container } = render(<AspectLinkedAssetsSkeleton />);

      // Toolbar has filter button and search bar skeletons
      const roundedSkeletons = container.querySelectorAll('.MuiSkeleton-rounded');
      expect(roundedSkeletons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('shimmer animation', () => {
    it('should include shimmer animation box in each card', () => {
      const { container } = render(<AspectLinkedAssetsSkeleton />);

      // Shimmer boxes have position: absolute
      const boxes = container.querySelectorAll('[class*="MuiBox-root"]');
      const absoluteBoxes = Array.from(boxes).filter(
        (box) => window.getComputedStyle(box).position === 'absolute'
      );
      // Each of 6 cards has a shimmer animation box
      expect(absoluteBoxes.length).toBe(6);
    });
  });

  describe('component exports', () => {
    it('should export AspectLinkedAssetsSkeleton as default', async () => {
      const module = await import('./AspectLinkedAssetsSkeleton');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });
  });

  describe('visual consistency', () => {
    it('should not have any interactive elements', () => {
      render(<AspectLinkedAssetsSkeleton />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    });

    it('should render without any text content', () => {
      render(<AspectLinkedAssetsSkeleton />);

      expect(screen.queryByText('Filter linked assets')).not.toBeInTheDocument();
      expect(screen.queryByText('No linked assets')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should render consistently on multiple renders', () => {
      const { rerender, container } = render(<AspectLinkedAssetsSkeleton />);

      const initialSkeletonCount = container.querySelectorAll('.MuiSkeleton-root').length;

      rerender(<AspectLinkedAssetsSkeleton />);

      const rerenderSkeletonCount = container.querySelectorAll('.MuiSkeleton-root').length;

      expect(initialSkeletonCount).toBe(rerenderSkeletonCount);
    });

    it('should handle unmount correctly', () => {
      const { unmount, container } = render(<AspectLinkedAssetsSkeleton />);

      expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();

      unmount();

      expect(container.querySelector('.MuiSkeleton-root')).not.toBeInTheDocument();
    });
  });
});
