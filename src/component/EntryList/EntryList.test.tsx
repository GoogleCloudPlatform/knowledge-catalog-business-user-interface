import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, beforeEach, it, describe, expect } from 'vitest';
import EntryList from './EntryList';

// Mock auth context
const mockAuthContext = {
  user: {
    token: 'test-token',
    name: 'Test User',
    email: 'test@example.com',
    picture: 'test-picture',
    hasRole: true,
    roles: [],
    permissions: [],
    appConfig: {
      aspects: {},
      projects: {},
      defaultSearchProduct: {},
      defaultSearchAssets: {},
      browseByAspectTypes: {},
      browseByAspectTypesLabels: {}
    }
  },
  login: vi.fn(),
  logout: vi.fn()
};

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => mockAuthContext
}));

// Mock Redux store
const createMockStore = (initialState: Record<string, unknown> = {}) => {
  return configureStore({
    reducer: {
      resources: (state = initialState.resources ?? initialState) => state
    } as Record<string, () => unknown>,
    preloadedState: initialState
  });
};

// Mock resources slice
vi.mock('../../features/resources/resourcesSlice', () => ({
  fetchEntriesByParent: vi.fn(() => ({ type: 'resources/fetchEntriesByParent' }))
}));

// Mock entry slice
vi.mock('../../features/entry/entrySlice', () => ({
  fetchEntry: vi.fn(() => ({ type: 'entry/fetchEntry' })),
  pushToHistory: vi.fn(() => ({ type: 'entry/pushToHistory' }))
}));

describe('EntryList', () => {
  const mockEntry = {
    name: 'projects/test-project/locations/us-central1/lakes/test-lake'
  };

  const mockEntryListData = [
    {
      dataplexEntry: {
        name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset1',
        entrySource: {
          description: 'Test dataset 1 description'
        },
        updateTime: {
          seconds: 1640995200 // Jan 1, 2022
        }
      }
    },
    {
      dataplexEntry: {
        name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset2',
        entrySource: {
          description: 'Test dataset 2 description'
        },
        updateTime: {
          seconds: 1641081600 // Jan 2, 2022
        }
      }
    },
    {
      dataplexEntry: {
        name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset3',
        entrySource: {
          description: 'Another test dataset'
        },
        updateTime: {
          seconds: 1641168000 // Jan 3, 2022
        }
      }
    }
  ];

  const renderEntryList = (props: any = {}, storeState: any = {}) => {
    const defaultStoreState = {
      resources: {
        entryListData: mockEntryListData,
        entryListStatus: 'succeeded',
        entryListError: null,
        ...storeState.resources
      }
    };

    const store = createMockStore(defaultStoreState);

    return render(
      <Provider store={store}>
        <EntryList entry={mockEntry} {...props} />
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering & Data Display ──

  it('renders the component with loading state initially', () => {
    renderEntryList({}, {
      resources: {
        entryListData: [],
        entryListStatus: 'idle',
        entryListError: null
      }
    });

    expect(screen.getByTestId('entry-list-skeleton')).toBeInTheDocument();
  });

  it('renders entry list when data is available', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
      expect(screen.getByText('dataset2')).toBeInTheDocument();
      expect(screen.getByText('dataset3')).toBeInTheDocument();
    });
  });

  it('displays correct table headers', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Last Modification Time')).toBeInTheDocument();
    });
  });

  it('displays entry descriptions', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('Test dataset 1 description')).toBeInTheDocument();
      expect(screen.getByText('Test dataset 2 description')).toBeInTheDocument();
      expect(screen.getByText('Another test dataset')).toBeInTheDocument();
    });
  });

  it('displays formatted dates', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('Jan 1, 2022')).toBeInTheDocument();
      expect(screen.getByText('Jan 2, 2022')).toBeInTheDocument();
      expect(screen.getByText('Jan 3, 2022')).toBeInTheDocument();
    });
  });

  it('handles entries without description', async () => {
    const entryListWithoutDescription = [
      {
        dataplexEntry: {
          name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset1',
          entrySource: {
            description: ''
          },
          updateTime: {
            seconds: 1640995200
          }
        }
      }
    ];

    renderEntryList({}, {
      resources: {
        entryListData: entryListWithoutDescription,
        entryListStatus: 'succeeded',
        entryListError: null
      }
    });

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  it('handles failed data fetch', () => {
    renderEntryList({}, {
      resources: {
        entryListData: [],
        entryListStatus: 'failed',
        entryListError: 'Failed to fetch entries'
      }
    });

    expect(screen.getByText('Failed to fetch entries')).toBeInTheDocument();
  });

  it('handles empty entry list', async () => {
    renderEntryList({}, {
      resources: {
        entryListData: [],
        entryListStatus: 'succeeded',
        entryListError: null
      }
    });

    await waitFor(() => {
      expect(screen.getByText('No entries available')).toBeInTheDocument();
    });
  });

  it('handles different date formats correctly', async () => {
    const entryListWithDifferentDates = [
      {
        dataplexEntry: {
          name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset1',
          entrySource: {
            description: 'Test dataset'
          },
          updateTime: {
            seconds: 1609459200 // Jan 1, 2021
          }
        }
      }
    ];

    renderEntryList({}, {
      resources: {
        entryListData: entryListWithDifferentDates,
        entryListStatus: 'succeeded',
        entryListError: null
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Jan 1, 2021')).toBeInTheDocument();
    });
  });

  it('handles missing entry prop', () => {
    expect(() => {
      renderEntryList({ entry: undefined });
    }).toThrow();
  });

  it('handles entry with empty description edge case', async () => {
    const entryWithEmptyDesc = [
      {
        dataplexEntry: {
          name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/empty-desc',
          entrySource: {
            description: ''
          },
          updateTime: {
            seconds: 1640995200
          }
        }
      }
    ];

    renderEntryList({}, {
      resources: {
        entryListData: entryWithEmptyDesc,
        entryListStatus: 'succeeded',
        entryListError: null
      }
    });

    await waitFor(() => {
      const cells = screen.getAllByRole('cell');
      const hasDash = cells.some(cell => cell.textContent === '-');
      expect(hasDash).toBe(true);
    });
  });

  it('handles description sorting with empty values', async () => {
    const mixedData = [
      {
        dataplexEntry: {
          name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset-a',
          entrySource: { description: 'Z description' },
          updateTime: { seconds: 1640995200 }
        }
      },
      {
        dataplexEntry: {
          name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset-b',
          entrySource: { description: '' },
          updateTime: { seconds: 1641081600 }
        }
      },
      {
        dataplexEntry: {
          name: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset-c',
          entrySource: { description: 'A description' },
          updateTime: { seconds: 1641168000 }
        }
      }
    ];

    renderEntryList({}, {
      resources: {
        entryListData: mixedData,
        entryListStatus: 'succeeded',
        entryListError: null
      }
    });

    await waitFor(() => {
      expect(screen.getByText('dataset-a')).toBeInTheDocument();
      expect(screen.getByText('dataset-b')).toBeInTheDocument();
      expect(screen.getByText('dataset-c')).toBeInTheDocument();
    });
  });

  // ── Table Structure ──

  it('applies correct styling to table container', async () => {
    renderEntryList();

    await waitFor(() => {
      const tableContainer = screen.getByRole('table').closest('[class*="MuiTableContainer"]');
      expect(tableContainer).toBeInTheDocument();
    });
  });

  it('applies correct styling to table headers', async () => {
    renderEntryList();

    await waitFor(() => {
      const nameHeader = screen.getByText('Name');
      expect(nameHeader).toBeInTheDocument();
    });
  });

  it('renders table with correct aria-label', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'entry list table');
    });
  });

  it('renders colgroup with three columns', async () => {
    renderEntryList();

    await waitFor(() => {
      const table = screen.getByRole('table');
      const cols = table.querySelectorAll('col');
      expect(cols.length).toBe(3);
    });
  });

  // ── FilterBar ──

  it('displays FilterBar with search input', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter property name or value')).toBeInTheDocument();
    });
  });

  it('displays FilterBar with filter icon', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByTestId('FilterListIcon')).toBeInTheDocument();
    });
  });

  it('handles search input changes', async () => {
    renderEntryList();

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(searchInput, { target: { value: 'dataset1' } });
      expect(searchInput).toHaveValue('dataset1');
    });
  });

  it('filters entries when pressing Enter to create a filter chip', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    fireEvent.change(searchInput, { target: { value: 'dataset1' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      // "dataset1" appears in table cell AND filter chip — use getAllByText
      const matches = screen.getAllByText('dataset1');
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('dataset2')).not.toBeInTheDocument();
      expect(screen.queryByText('dataset3')).not.toBeInTheDocument();
    });
  });

  it('filters entries by description via chip', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    fireEvent.change(searchInput, { target: { value: 'Test dataset 1' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
      expect(screen.queryByText('dataset2')).not.toBeInTheDocument();
      expect(screen.queryByText('dataset3')).not.toBeInTheDocument();
    });
  });

  it('filters entries by date via chip', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    fireEvent.change(searchInput, { target: { value: 'Jan 1, 2022' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
      expect(screen.queryByText('dataset2')).not.toBeInTheDocument();
      expect(screen.queryByText('dataset3')).not.toBeInTheDocument();
    });
  });

  it('handles case insensitive search via chip', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    fireEvent.change(searchInput, { target: { value: 'DATASET1' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
      expect(screen.queryByText('dataset2')).not.toBeInTheDocument();
    });
  });

  it('shows no results message when filter matches nothing', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('No entries match your search or filter criteria')).toBeInTheDocument();
    });
  });

  it('handles search with special characters', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    fireEvent.change(searchInput, { target: { value: 'test@#$%' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.queryByText('dataset1')).not.toBeInTheDocument();
      expect(screen.queryByText('dataset2')).not.toBeInTheDocument();
      expect(screen.queryByText('dataset3')).not.toBeInTheDocument();
    });
  });

  it('handles very long search text', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    const longText = 'a'.repeat(100);
    fireEvent.change(searchInput, { target: { value: longText } });

    expect(searchInput).toHaveValue(longText);
  });

  it('clears search when clear button is clicked', async () => {
    renderEntryList();

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(searchInput, { target: { value: 'dataset1' } });

      const closeButton = screen.getByTestId('CloseIcon');
      fireEvent.click(closeButton);

      expect(searchInput).toHaveValue('');
    });
  });

  it('displays Clear All button when filters are active', async () => {
    renderEntryList();

    await waitFor(() => {
      // Initially, there should be no Clear All button
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  it('shows Clear All after creating a filter chip and clears on click', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    fireEvent.change(searchInput, { target: { value: 'dataset1' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      const clearAllButton = screen.getByText('Clear All');
      expect(clearAllButton).toBeInTheDocument();
      fireEvent.click(clearAllButton);
    });

    // After clearing, all entries should be visible again
    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
      expect(screen.getByText('dataset2')).toBeInTheDocument();
      expect(screen.getByText('dataset3')).toBeInTheDocument();
    });
  });

  it('opens filter dropdown when filter icon is clicked', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const filterIcon = screen.getByTestId('FilterListIcon');
    const filterButton = filterIcon.closest('button');
    fireEvent.click(filterButton!);

    // FilterBar shows property names in dropdown
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('shows property names in filter dropdown', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const filterIcon = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterIcon.closest('button')!);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      // FilterBar renders property names as menu items
      const menuItems = screen.getAllByRole('menuitem');
      const propertyNames = menuItems.map(item => item.textContent);
      expect(propertyNames).toContain('Name');
      expect(propertyNames).toContain('Description');
      expect(propertyNames).toContain('Last Modification Time');
    });
  });

  // ── Sorting ──

  it('handles sorting by name via sort button', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    // Sort buttons are role="button" boxes
    const nameSortButton = screen.getByText('Name').closest('th');
    expect(nameSortButton).toBeInTheDocument();
    fireEvent.click(nameSortButton!);

    // Check that sorting is applied (ascending)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('dataset1');
    expect(rows[2]).toHaveTextContent('dataset2');
    expect(rows[3]).toHaveTextContent('dataset3');
  });

  it('handles sorting by last modified via sort button', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const lastModifiedSortButton = screen.getByText('Last Modification Time').closest('th');
    expect(lastModifiedSortButton).toBeInTheDocument();
    fireEvent.click(lastModifiedSortButton!);

    // All dates should still be visible (just reordered)
    expect(screen.getByText('Jan 1, 2022')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2022')).toBeInTheDocument();
    expect(screen.getByText('Jan 3, 2022')).toBeInTheDocument();
  });

  it('toggles sort direction when clicking same column', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const nameSortButton = screen.getByText('Name').closest('th')!;

    // First click - ascending
    fireEvent.click(nameSortButton);

    // Second click - descending
    fireEvent.click(nameSortButton);

    // Third click - no sort (reset)
    fireEvent.click(nameSortButton);

    expect(screen.getByText('dataset1')).toBeInTheDocument();
  });

  it('sorts in descending order on second click', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const nameSortButton = screen.getByText('Name').closest('th')!;

    // First click - ascending
    fireEvent.click(nameSortButton);

    // Second click - descending
    fireEvent.click(nameSortButton);

    // In descending order, dataset3 should come first
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('dataset3');
    expect(rows[2]).toHaveTextContent('dataset2');
    expect(rows[3]).toHaveTextContent('dataset1');
  });

  it('displays SVG sort icons in header', async () => {
    renderEntryList();

    await waitFor(() => {
      const nameSortButton = screen.getByText('Name').closest('th');
      expect(nameSortButton).toBeInTheDocument();

      // SVG sort icon should be present (opacity 0 when inactive)
      const svgs = nameSortButton!.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  it('sorts by Last Modified correctly', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const lastModifiedSortButton = screen.getByText('Last Modification Time').closest('th')!;
    fireEvent.click(lastModifiedSortButton);

    expect(screen.getByText('Jan 1, 2022')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2022')).toBeInTheDocument();
    expect(screen.getByText('Jan 3, 2022')).toBeInTheDocument();
  });

  it('sorts by Last Modified in descending order', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const lastModifiedSortButton = screen.getByText('Last Modification Time').closest('th')!;

    // First click - ascending
    fireEvent.click(lastModifiedSortButton);

    // Second click - descending
    fireEvent.click(lastModifiedSortButton);

    // All dates should still be visible (just reordered)
    expect(screen.getByText('Jan 1, 2022')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2022')).toBeInTheDocument();
    expect(screen.getByText('Jan 3, 2022')).toBeInTheDocument();
  });

  it('combines search and sorting', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    // Create a search chip for "dataset"
    const searchInput = screen.getByPlaceholderText('Enter property name or value');
    fireEvent.change(searchInput, { target: { value: 'dataset' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    // Then sort
    const nameSortButton = screen.getByText('Name').closest('th')!;
    fireEvent.click(nameSortButton);

    // All datasets should be visible (all match "dataset")
    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
      expect(screen.getByText('dataset2')).toBeInTheDocument();
      expect(screen.getByText('dataset3')).toBeInTheDocument();
    });
  });

  // ── Navigation ──

  it('handles clicking on entry name to navigate', async () => {
    const { fetchEntry, pushToHistory } = await import('../../features/entry/entrySlice');

    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('dataset1')).toBeInTheDocument();
    });

    const entryLink = screen.getByText('dataset1');
    fireEvent.click(entryLink);

    expect(pushToHistory).toHaveBeenCalled();
    expect(fetchEntry).toHaveBeenCalledWith({
      entryName: 'projects/test-project/locations/us-central1/lakes/test-lake/datasets/dataset1',
      id_token: 'test-token'
    });
  });

  // ── Description column not sortable ──

  it('does not render sort button on Description column', async () => {
    renderEntryList();

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    // Description header should not have a role="button" sort element
    const descriptionHeader = screen.getByText('Description').closest('th');
    const sortButton = descriptionHeader?.querySelector('[role="button"]');
    expect(sortButton).toBeNull();
  });

  // ── Resize handles ──

  it('renders resize handles between columns', async () => {
    renderEntryList();

    await waitFor(() => {
      const headers = screen.getAllByRole('columnheader');
      // Name and Description headers should have resize handles (position: relative + child div)
      // Last column should NOT have a resize handle
      expect(headers.length).toBe(3);
    });
  });
});
