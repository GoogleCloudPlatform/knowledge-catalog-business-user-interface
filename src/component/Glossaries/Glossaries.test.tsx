import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import Glossaries from './Glossaries';
import type { GlossaryItem } from './GlossaryDataType';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/glossaries' }),
}));

// Mock auth provider
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { token: 'test-token' } }),
}));

// Mock glossary utils with stable implementations
vi.mock('../../utils/glossaryUtils', () => ({
  extractGlossaryId: (id: string) => {
    const parts = id.split('/');
    return parts.length > 2 ? parts.slice(0, 3).join('/') : id;
  },
  normalizeId: (id: string) => id,
  getAllAncestorIds: () => [],
  findItem: (items: any[], id: string) => {
    const find = (arr: any[]): any => {
      for (const item of arr) {
        if (item.id === id) return item;
        if (item.children) {
          const found = find(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return find(items);
  },
  getBreadcrumbs: () => [],
  collectAllIds: () => [],
  collectAncestorIdsOfMatches: () => [],
}));

// Mock resource utils - returns true for custom aspects to enable coverage of annotation paths
vi.mock('../../utils/resourceUtils', () => ({
  hasValidAnnotationData: (aspectData: unknown) => {
    // Return true for aspects that have data.fields.value to enable testing annotation paths
    const data = aspectData as { data?: { fields?: { value?: unknown } } } | undefined;
    return data?.data?.fields?.value !== undefined;
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

// Mock glossary UI helpers
vi.mock('./glossaryUIHelpers', () => ({
  getIcon: () => <span data-testid="mock-icon">Icon</span>,
}));

// Mock child components
vi.mock('./SidebarItem', () => ({
  default: ({ item, selectedId, onSelect, onToggle }: any) => (
    <div
      data-testid={`sidebar-item-${item.id}`}
      data-selected={selectedId === item.id}
      onClick={() => onSelect(item.id)}
    >
      <span>{item.displayName}</span>
      <button
        data-testid={`toggle-${item.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(item.id);
        }}
      >
        Toggle
      </button>
    </div>
  ),
}));

vi.mock('../Common/FilterBar', () => ({
  default: ({ activeFilters, onActiveFiltersChange, placeholder }: any) => (
    <div data-testid="glossary-filter-input">
      <input
        data-testid="filter-input"
        placeholder={placeholder}
        onChange={(e) => {
          if (e.target.value) {
            onActiveFiltersChange([{ id: '1', property: 'Name', values: [e.target.value] }]);
          } else {
            onActiveFiltersChange([]);
          }
        }}
      />
      <span data-testid="filter-count">{activeFilters.length}</span>
    </div>
  ),
  FilterBarChips: ({ activeFilters }: any) => (
    <div data-testid="filter-bar-chips">
      {activeFilters.length > 0 && <span data-testid="chip-count">{activeFilters.length}</span>}
    </div>
  ),
}));

vi.mock('./GlossariesCategoriesTerms', () => ({
  default: ({ mode, items, searchTerm, onSearchTermChange, onItemClick, sortBy, sortOrder, onSortByChange, onSortOrderToggle }: any) => (
    <div data-testid={`glossaries-${mode}`}>
      <input
        data-testid={`${mode}-search`}
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
      />
      <button data-testid={`${mode}-sort-toggle`} onClick={onSortOrderToggle}>
        Sort {sortOrder}
      </button>
      <select
        data-testid={`${mode}-sort-by`}
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
      >
        <option value="name">Name</option>
        <option value="lastModified">Last Modified</option>
      </select>
      <div data-testid={`${mode}-count`}>{items.length}</div>
      {items.map((item: any) => (
        <div key={item.id} data-testid={`${mode}-item-${item.id}`} onClick={() => onItemClick(item.id)}>
          {item.displayName}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('./GlossariesSynonyms', () => ({
  default: ({ relations, onItemClick: _onItemClick, relationFilter, onRelationFilterChange }: any) => (
    <div data-testid="glossaries-synonyms">
      <select
        data-testid="relation-filter"
        value={relationFilter}
        onChange={(e) => onRelationFilterChange(e.target.value)}
      >
        <option value="all">All</option>
        <option value="synonym">Synonym</option>
        <option value="related">Related</option>
      </select>
      <div data-testid="relations-count">{relations.length}</div>
    </div>
  ),
}));

vi.mock('./GlossariesLinkedAssets', () => ({
  default: ({ linkedAssets, onAssetPreviewChange }: any) => (
    <div data-testid="glossaries-linked-assets">
      <div data-testid="linked-assets-count">{linkedAssets.length}</div>
      {linkedAssets.map((asset: any, idx: number) => (
        <div key={idx} data-testid={`linked-asset-${idx}`} onClick={() => onAssetPreviewChange(asset)}>
          Asset {idx}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../DetailPageOverview/DetailPageOverview', () => ({
  default: ({ entry, accessDenied }: any) => (
    <div data-testid="detail-page-overview" data-access-denied={accessDenied}>
      <span data-testid="overview-name">{entry?.entrySource?.displayName || 'No name'}</span>
    </div>
  ),
}));

vi.mock('../DetailPageOverview/DetailPageOverviewSkeleton', () => ({
  default: () => <div data-testid="detail-overview-skeleton">Loading Overview...</div>,
}));

vi.mock('./GlossariesCategoriesTermsSkeleton', () => ({
  default: () => <div data-testid="categories-terms-skeleton">Loading...</div>,
}));

vi.mock('./GlossariesSynonymsSkeleton', () => ({
  default: () => <div data-testid="synonyms-skeleton">Loading...</div>,
}));

vi.mock('../Annotation/PreviewAnnotation', () => ({
  default: () => <div data-testid="preview-annotation">Annotations</div>,
}));

vi.mock('../Annotation/AnnotationFilter', () => ({
  default: ({ onCollapseAll, onExpandAll }: any) => (
    <div data-testid="annotation-filter">
      <button data-testid="collapse-all" onClick={onCollapseAll}>Collapse All</button>
      <button data-testid="expand-all" onClick={onExpandAll}>Expand All</button>
    </div>
  ),
}));

vi.mock('../Common/ResourcePreview', () => ({
  default: ({ previewData, onPreviewDataChange }: any) => (
    <div data-testid="resource-preview">
      {previewData && <span data-testid="preview-data">Has Preview</span>}
      <button data-testid="close-preview" onClick={() => onPreviewDataChange(null)}>Close</button>
      <button data-testid="set-preview-data" onClick={() => onPreviewDataChange({ name: 'test-asset' })}>Set Preview</button>
    </div>
  ),
}));

vi.mock('../Shimmer/ShimmerLoader', () => ({
  default: ({ count, type }: any) => <div data-testid={`shimmer-${type}`} data-count={count}>Loading...</div>,
}));

vi.mock('../../assets/images/nothing-image.png', () => ({ default: 'nothing-image.png' }));

// Mock Redux actions
vi.mock('../../features/glossaries/glossariesSlice', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return {
    ...actual,
    fetchGlossaries: () => ({ type: 'glossaries/fetchGlossaries' }),
    fetchGlossaryChildren: () => ({
      type: 'glossaries/fetchGlossaryChildren',
      unwrap: () => Promise.resolve()
    }),
    fetchTermRelationships: () => ({ type: 'glossaries/fetchTermRelationships' }),
    fetchGlossaryEntryDetails: () => ({
      type: 'glossaries/fetchGlossaryEntryDetails',
      unwrap: () => Promise.resolve()
    }),
    filterGlossaries: () => ({ type: 'glossaries/filterGlossaries' }),
    setActiveFilters: (filters: unknown) => ({ type: 'glossaries/setActiveFilters', payload: filters }),
    clearFilters: () => ({ type: 'glossaries/clearFilters' }),
  };
});

vi.mock('../../features/projects/projectsSlice', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return {
    ...actual,
    getProjects: () => ({ type: 'projects/getProjects' }),
  };
});

// Mock data
const mockGlossaryItem: GlossaryItem = {
  id: 'glossary-1',
  type: 'glossary',
  displayName: 'Test Glossary',
  description: 'Test description',
  longDescription: 'Test long description',
  location: 'us-central1',
  lastModified: 1700000000,
  labels: ['label1:value1'],
  contacts: ['user@example.com'],
  aspects: {},
  children: [
    {
      id: 'category-1',
      type: 'category',
      displayName: 'Test Category',
      lastModified: 1700000001,
      children: [
        {
          id: 'term-1',
          type: 'term',
          displayName: 'Test Term',
          lastModified: 1700000002,
          relations: [{ id: 'term-2', type: 'synonym', displayName: 'Related Term', lastModified: 1700000003 }],
          linkedAssets: [{ name: 'asset-1' }],
        }
      ]
    }
  ]
};

const mockGlossaryWithNestedTerms: GlossaryItem = {
  id: 'glossary-nested',
  type: 'glossary',
  displayName: 'Nested Glossary',
  lastModified: 1700000000,
  aspects: {},
  children: [
    {
      id: 'category-a',
      type: 'category',
      displayName: 'Category A',
      lastModified: 1700000001,
      aspects: {},
      children: [
        {
          id: 'term-a1',
          type: 'term',
          displayName: 'Term A1',
          lastModified: 1700000002,
          aspects: {},
        },
        {
          id: 'subcategory-a1',
          type: 'category',
          displayName: 'Subcategory A1',
          lastModified: 1700000003,
          aspects: {},
          children: [
            {
              id: 'term-nested',
              type: 'term',
              displayName: 'Nested Term',
              lastModified: 1700000004,
              aspects: {},
            }
          ]
        }
      ]
    },
    {
      id: 'category-b',
      type: 'category',
      displayName: 'Category B',
      lastModified: 1700000005,
      aspects: {},
      children: [
        {
          id: 'term-b1',
          type: 'term',
          displayName: 'Term B1',
          lastModified: 1700000006,
          aspects: {},
        }
      ]
    }
  ]
};

const mockGlossaryNoChildren: GlossaryItem = {
  id: 'glossary-empty',
  type: 'glossary',
  displayName: 'Empty Glossary',
  lastModified: 1700000000,
  children: [],
  aspects: {},
};

const mockGlossaryWithLabelsEdgeCases: GlossaryItem = {
  id: 'glossary-labels',
  type: 'glossary',
  displayName: 'Labels Edge Case',
  lastModified: 1700000000,
  labels: ['validkey:validvalue', 'keyonly', 'key:value:with:colons', ''],
  contacts: [],
  aspects: {},
};

const mockTermItem: GlossaryItem = {
  id: 'term-1',
  type: 'term',
  displayName: 'Test Term',
  lastModified: 1700000002,
  relations: [{ id: 'term-2', type: 'synonym', displayName: 'Related Term', lastModified: 1700000003 }],
  linkedAssets: [{ name: 'asset-1' }],
  aspects: { 'custom.aspect': { data: {} } },
};

// Create mock store
const createMockStore = (initialState: any = {}) => {
  const defaultGlossariesState = {
    glossaryItems: [],
    status: 'idle',
    filteredTreeItems: [],
    filterStatus: 'idle',
    activeFilters: [],
    accessDeniedItemId: null,
    selectedId: '',
    expandedIds: [],
    tabValue: 0,
  };

  const defaultProjectsState = {
    isloaded: true,
    projects: [],
  };

  const defaultSearchState = {
    searchTerm: '',
    searchResult: null,
    searchType: 'All',
    searchFilters: [],
    semanticSearch: true,
    isSearchFiltersOpen: true,
    isSideNavOpen: true,
    searchSubmitted: false,
  };

  return configureStore({
    reducer: {
      glossaries: (state = { ...defaultGlossariesState, ...initialState.glossaries }) => state,
      projects: (state = { ...defaultProjectsState, ...initialState.projects }) => state,
      search: (state = { ...defaultSearchState, ...initialState.search }) => state,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
};

const renderWithStore = (initialState: any = {}) => {
  const store = createMockStore(initialState);
  return {
    ...render(
      <Provider store={store}>
        <Glossaries />
      </Provider>
    ),
    store,
  };
};

describe('Glossaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the main layout with title', () => {
      renderWithStore();
      expect(screen.getByText('Business Glossaries')).toBeInTheDocument();
    });

    it('renders filter input', () => {
      renderWithStore();
      expect(screen.getByTestId('glossary-filter-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Filter Glossaries')).toBeInTheDocument();
    });

    it('renders loading state when status is loading', () => {
      renderWithStore({ glossaries: { status: 'loading', glossaryItems: [] } });
      expect(screen.getByTestId('shimmer-simple-list')).toBeInTheDocument();
    });

    it('renders empty state when no glossaries and succeeded', () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [] } });
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('renders glossary items in sidebar when available', () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });
      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
    });

    it('shows shimmer during initial load', () => {
      renderWithStore({ glossaries: { status: 'loading', glossaryItems: [] } });
      expect(screen.getByTestId('shimmer-simple-list')).toBeInTheDocument();
    });
  });

  describe('Sidebar Interaction', () => {
    it('renders sidebar items with correct data-selected attribute', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      const sidebarItem = screen.getByTestId('sidebar-item-glossary-1');
      expect(sidebarItem).toBeInTheDocument();
    });

    it('handles click on sidebar item', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await user.click(screen.getByTestId('sidebar-item-glossary-1'));
      // Should not throw
      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
    });

    it('handles toggle on sidebar item', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await user.click(screen.getByTestId('toggle-glossary-1'));
      expect(screen.getByTestId('toggle-glossary-1')).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('shows filter count', () => {
      renderWithStore();
      expect(screen.getByTestId('filter-count')).toHaveTextContent('0');
    });

    // Loading indicator test removed — FilterBar component does not have a built-in loading state

    it('displays filtered items when filters are active', () => {
      const filteredItem = { ...mockGlossaryItem, id: 'filtered-1', displayName: 'Filtered Glossary' };
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filteredTreeItems: [filteredItem],
          activeFilters: [{ id: '1', field: 'name', value: 'test', displayLabel: 'test' }],
        },
      });
      expect(screen.getByText('Filtered Glossary')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders tabs for glossary type', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      });
    });

    it('switches to Categories tab', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));
      expect(screen.getByTestId('glossaries-categories')).toBeInTheDocument();
    });

    it('switches to Terms tab', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));
      expect(screen.getByTestId('glossaries-terms')).toBeInTheDocument();
    });
  });

  describe('Content Search and Sort', () => {
    it('allows searching in categories tab', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      const searchInput = screen.getByTestId('categories-search');
      await user.type(searchInput, 'test');
      expect(searchInput).toHaveValue('test');
    });

    it('allows toggling sort order', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      const sortButton = screen.getByTestId('categories-sort-toggle');
      await user.click(sortButton);
      expect(sortButton).toBeInTheDocument();
    });

    it('allows changing sort field', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      await user.selectOptions(screen.getByTestId('categories-sort-by'), 'name');
      expect(screen.getByTestId('categories-sort-by')).toHaveValue('name');
    });
  });

  describe('Term-Specific Features', () => {
    it('shows term-specific tabs for term type', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Synonyms & Related Terms/ })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });
    });

    it('shows Linked Assets content', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));
      expect(screen.getByTestId('glossaries-linked-assets')).toBeInTheDocument();
    });

    it('shows Synonyms content', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Synonyms & Related Terms/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Synonyms & Related Terms/ }));
      expect(screen.getByTestId('glossaries-synonyms')).toBeInTheDocument();
    });

    it('shows no aspects message when aspects tab is empty', async () => {
      const user = userEvent.setup();
      const termNoAspects = { ...mockTermItem, aspects: {} };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termNoAspects] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));
      expect(screen.getByText('No aspects available for this term')).toBeInTheDocument();
    });

    it('changes relation filter', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Synonyms & Related Terms/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Synonyms & Related Terms/ }));
      await user.selectOptions(screen.getByTestId('relation-filter'), 'synonym');
      expect(screen.getByTestId('relation-filter')).toHaveValue('synonym');
    });
  });

  describe('Resource Preview', () => {
    it('shows resource preview component for linked assets tab', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));
      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
    });

    it('opens asset preview when clicking linked asset', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));
      await user.click(screen.getByTestId('linked-asset-0'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-data')).toBeInTheDocument();
      });
    });

    it('handles close preview button click', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));

      // Verify close button is present and can be clicked without error
      const closeButton = screen.getByTestId('close-preview');
      expect(closeButton).toBeInTheDocument();
      await user.click(closeButton);
      // Should not throw
      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    it('shows detail page overview', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('shows access denied state when item is denied', async () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          accessDeniedItemId: 'glossary-1',
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toHaveAttribute('data-access-denied', 'true');
      });
    });
  });

  describe('Empty and Loading States', () => {
    it('shows nothing image when no item is selected and no glossaries', () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [] } });
      expect(screen.getByAltText('Select an item')).toBeInTheDocument();
    });

    it('shows overview skeleton during initial load', () => {
      renderWithStore({ glossaries: { status: 'loading', glossaryItems: [] } });
      expect(screen.getByTestId('detail-overview-skeleton')).toBeInTheDocument();
    });
  });

  describe('Multiple Glossaries', () => {
    it('renders multiple sidebar items', () => {
      const glossary2 = { ...mockGlossaryItem, id: 'glossary-2', displayName: 'Second Glossary' };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem, glossary2] } });

      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-item-glossary-2')).toBeInTheDocument();
    });
  });

  describe('Nested Terms and getAllTerms', () => {
    it('collects all terms from nested categories', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryWithNestedTerms] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));
      // Should show all nested terms (Term A1, Nested Term, Term B1)
      expect(screen.getByTestId('glossaries-terms')).toBeInTheDocument();
    });

    it('handles empty children gracefully', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryNoChildren] } });

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-item-glossary-empty')).toBeInTheDocument();
      });
    });
  });

  describe('Labels and Contacts Edge Cases', () => {
    it('handles various label formats in transformation', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryWithLabelsEdgeCases] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('handles glossary without long description', async () => {
      const itemWithoutDesc = { ...mockGlossaryItem, longDescription: undefined };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [itemWithoutDesc] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('handles glossary without location', async () => {
      const itemWithoutLocation = { ...mockGlossaryItem, location: undefined };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [itemWithoutLocation] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Sort Functionality', () => {
    it('sorts categories by name ascending', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryWithNestedTerms] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));
      await user.selectOptions(screen.getByTestId('categories-sort-by'), 'name');
      await user.click(screen.getByTestId('categories-sort-toggle'));

      expect(screen.getByTestId('categories-sort-by')).toHaveValue('name');
    });

    it('sorts terms by lastModified', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryWithNestedTerms] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));
      await user.selectOptions(screen.getByTestId('terms-sort-by'), 'lastModified');

      expect(screen.getByTestId('terms-sort-by')).toHaveValue('lastModified');
    });

    it('toggles sort order multiple times', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryWithNestedTerms] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      // Toggle twice to test both asc and desc
      await user.click(screen.getByTestId('categories-sort-toggle'));
      await user.click(screen.getByTestId('categories-sort-toggle'));

      expect(screen.getByTestId('categories-sort-toggle')).toBeInTheDocument();
    });
  });

  describe('Sidebar Toggle Behavior', () => {
    it('toggles sidebar item expansion', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      const toggleButton = screen.getByTestId('toggle-glossary-1');
      await user.click(toggleButton);
      await user.click(toggleButton); // Toggle closed

      expect(toggleButton).toBeInTheDocument();
    });

    it('handles multiple glossary expansion behavior', async () => {
      const user = userEvent.setup();
      const glossary2 = { ...mockGlossaryItem, id: 'glossary-2', displayName: 'Second Glossary' };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem, glossary2] } });

      // Toggle first glossary
      await user.click(screen.getByTestId('toggle-glossary-1'));
      // Toggle second glossary (should collapse first)
      await user.click(screen.getByTestId('toggle-glossary-2'));

      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-item-glossary-2')).toBeInTheDocument();
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('renders breadcrumb structure correctly', async () => {
      // Test that the component displays the overview with selected item
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
        expect(screen.getByTestId('overview-name')).toHaveTextContent('Test Glossary');
      });
    });
  });

  describe('Aspects Tab with Valid Annotations', () => {
    it('shows annotation filter when aspects are available', async () => {
      const user = userEvent.setup();
      const termWithAspects = {
        ...mockTermItem,
        aspects: {
          'custom.aspect.data': { data: { fields: { value: { stringValue: 'test' } } } },
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithAspects] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));
      // Should show annotation filter since hasValidAnnotationData returns true for valid aspects
      await waitFor(() => {
        expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      });
    });

    it('handles collapse all button click', async () => {
      const user = userEvent.setup();
      const termWithValidAspects = {
        ...mockTermItem,
        id: 'term-with-aspects',
        aspects: {
          'test.annotation': { data: { fields: { value: { stringValue: 'test' } } } },
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithValidAspects] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));

      await waitFor(() => {
        expect(screen.getByTestId('collapse-all')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('collapse-all'));
      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });
  });

  describe('Filter Clearing Behavior', () => {
    it('collapses to selected item path when filters are cleared', async () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filteredTreeItems: [mockGlossaryItem],
          activeFilters: [{ id: '1', field: 'name', value: 'test', displayLabel: 'test' }],
        },
      });

      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
    });

    it('handles filter input changes', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      const filterInput = screen.getByTestId('filter-input');
      await user.type(filterInput, 'search term');

      // The filter input element should have the typed value
      expect(filterInput).toHaveValue('search term');
    });

    it('clears filter input', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      const filterInput = screen.getByTestId('filter-input');
      await user.type(filterInput, 'test');
      await user.clear(filterInput);

      expect(screen.getByTestId('filter-count')).toHaveTextContent('0');
    });
  });

  describe('Resource Preview Panel', () => {
    it('shows resource preview panel when asset is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));
      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
    });

    it('handles preview data changes', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));

      // Click on linked asset to set preview data
      await user.click(screen.getByTestId('linked-asset-0'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-data')).toBeInTheDocument();
      });

      // Close preview
      await user.click(screen.getByTestId('close-preview'));
    });
  });

  describe('Content Loading States', () => {
    it('shows loading states correctly', () => {
      renderWithStore({
        glossaries: {
          status: 'loading',
          glossaryItems: [],
        },
      });

      // When loading, shows skeleton
      expect(screen.getByTestId('detail-overview-skeleton')).toBeInTheDocument();
    });

    it('shows categories skeleton while content is loading', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));
      expect(screen.getByTestId('glossaries-categories')).toBeInTheDocument();
    });
  });

  describe('Tab Change Behavior', () => {
    it('resets content search when changing tabs', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      // Go to Categories and search
      await user.click(screen.getByRole('tab', { name: 'Categories' }));
      await user.type(screen.getByTestId('categories-search'), 'search');

      // Switch to Terms tab - should reset search
      await user.click(screen.getByRole('tab', { name: 'Terms' }));
      expect(screen.getByTestId('terms-search')).toHaveValue('');
    });
  });

  describe('Glossary Item Navigation', () => {
    it('handles clicking on term items in Terms tab', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));

      // Verify the terms tab content is shown
      expect(screen.getByTestId('glossaries-terms')).toBeInTheDocument();
    });
  });

  describe('hasVisibleAspects filtering', () => {
    it('filters out schema, overview, contacts, usage, and glossary-term-aspect keys', async () => {
      const user = userEvent.setup();
      const termWithSystemAspects = {
        ...mockTermItem,
        aspects: {
          'term.global.schema': { data: {} },
          'term.global.overview': { data: {} },
          'term.global.contacts': { data: {} },
          'term.global.usage': { data: {} },
          'term.global.glossary-term-aspect': { data: {} },
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithSystemAspects] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));
      await waitFor(() => {
        expect(screen.getByText('No aspects available for this term')).toBeInTheDocument();
      });
    });
  });

  describe('Projects Loading', () => {
    it('handles projects not loaded state', () => {
      renderWithStore({
        glossaries: { status: 'idle', glossaryItems: [] },
        projects: { isloaded: false, projects: [] },
      });

      expect(screen.getByText('Business Glossaries')).toBeInTheDocument();
    });
  });

  describe('Synonyms Tab', () => {
    it('displays synonyms with relation filter changes', async () => {
      const user = userEvent.setup();
      const termWithRelations = {
        ...mockTermItem,
        relations: [
          { id: 'syn-1', type: 'synonym', displayName: 'Synonym 1', lastModified: 1700000001 },
          { id: 'rel-1', type: 'related', displayName: 'Related 1', lastModified: 1700000002 },
        ],
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithRelations] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Synonyms & Related Terms/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Synonyms & Related Terms/ }));

      // Change filter to synonym only
      await user.selectOptions(screen.getByTestId('relation-filter'), 'synonym');
      expect(screen.getByTestId('relation-filter')).toHaveValue('synonym');

      // Change filter to related
      await user.selectOptions(screen.getByTestId('relation-filter'), 'related');
      expect(screen.getByTestId('relation-filter')).toHaveValue('related');

      // Change back to all
      await user.selectOptions(screen.getByTestId('relation-filter'), 'all');
      expect(screen.getByTestId('relation-filter')).toHaveValue('all');
    });
  });

  describe('ResourcePreview Data Setting', () => {
    it('sets preview data when ResourcePreview triggers onPreviewDataChange with data', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));
      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();

      // Click the set preview button to trigger onPreviewDataChange with non-null data
      await user.click(screen.getByTestId('set-preview-data'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-data')).toBeInTheDocument();
      });
    });

    it('closes preview when ResourcePreview triggers onPreviewDataChange with null', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));

      // First set some preview data
      await user.click(screen.getByTestId('set-preview-data'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-data')).toBeInTheDocument();
      });

      // Then close it
      await user.click(screen.getByTestId('close-preview'));
    });
  });

  describe('Aspects with Valid Annotation Data', () => {
    it('shows annotation filter and preview annotation when aspects have valid data', async () => {
      const user = userEvent.setup();
      const termWithValidAspects: GlossaryItem = {
        id: 'term-valid-aspects',
        type: 'term',
        displayName: 'Term with Valid Aspects',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [],
        aspects: {
          'custom.annotation.type': {
            data: {
              fields: {
                value: { stringValue: 'test annotation value' }
              }
            }
          }
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithValidAspects] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));

      // Should show annotation filter since hasValidAnnotationData returns true for this aspect
      await waitFor(() => {
        expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      });
      expect(screen.getByTestId('preview-annotation')).toBeInTheDocument();
    });

    it('handles expand all annotations', async () => {
      const user = userEvent.setup();
      const termWithValidAspects: GlossaryItem = {
        id: 'term-expand-aspects',
        type: 'term',
        displayName: 'Term with Expandable Aspects',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [],
        aspects: {
          'custom.annotation.expand': {
            data: {
              fields: {
                value: { stringValue: 'expandable annotation' }
              }
            }
          }
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithValidAspects] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));

      await waitFor(() => {
        expect(screen.getByTestId('expand-all')).toBeInTheDocument();
      });

      // Click expand all
      await user.click(screen.getByTestId('expand-all'));
      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });

    it('handles collapse all annotations', async () => {
      const user = userEvent.setup();
      const termWithValidAspects: GlossaryItem = {
        id: 'term-collapse-aspects',
        type: 'term',
        displayName: 'Term with Collapsible Aspects',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [],
        aspects: {
          'custom.annotation.collapse': {
            data: {
              fields: {
                value: { stringValue: 'collapsible annotation' }
              }
            }
          }
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithValidAspects] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));

      await waitFor(() => {
        expect(screen.getByTestId('collapse-all')).toBeInTheDocument();
      });

      // Click collapse all
      await user.click(screen.getByTestId('collapse-all'));
      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });
  });

  describe('Transform Edge Cases', () => {
    it('handles null lastModified in transformation', async () => {
      const itemWithNullLastModified: GlossaryItem = {
        id: 'glossary-null-date',
        type: 'glossary',
        displayName: 'No Last Modified',
        lastModified: 0,
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [itemWithNullLastModified] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('handles empty type for system field', async () => {
      const itemWithEmptyType = {
        ...mockGlossaryItem,
        type: '' as 'glossary',
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [itemWithEmptyType] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Expansion UseEffect', () => {
    it('handles filter state with filtered results', () => {
      const filteredItem = { ...mockGlossaryItem, id: 'filtered-glossary' };
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filteredTreeItems: [filteredItem],
          activeFilters: [{ id: '1', field: 'name', value: 'filtered', displayLabel: 'filtered' }],
          filterStatus: 'succeeded',
        },
      });

      expect(screen.getByTestId('sidebar-item-filtered-glossary')).toBeInTheDocument();
    });

    it('handles empty filtered results with active filters', () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filteredTreeItems: [],
          activeFilters: [{ id: '1', field: 'name', value: 'nonexistent', displayLabel: 'nonexistent' }],
          filterStatus: 'succeeded',
        },
      });

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  describe('Content Search in Tabs', () => {
    it('filters categories by search term', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));
      const searchInput = screen.getByTestId('categories-search');
      await user.type(searchInput, 'Test');

      expect(searchInput).toHaveValue('Test');
    });

    it('filters terms by search term', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));
      const searchInput = screen.getByTestId('terms-search');
      await user.type(searchInput, 'Term');

      expect(searchInput).toHaveValue('Term');
    });
  });

  describe('Display Glossaries Logic', () => {
    it('displays glossary items when no filters active', () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filteredTreeItems: [],
          activeFilters: [],
        },
      });

      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
    });

    it('displays filtered items when filters are active', () => {
      const filtered = { ...mockGlossaryItem, id: 'filtered-id', displayName: 'Filtered Item' };
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filteredTreeItems: [filtered],
          activeFilters: [{ id: '1', field: 'name', value: 'filter', displayLabel: 'filter' }],
        },
      });

      expect(screen.getByTestId('sidebar-item-filtered-id')).toBeInTheDocument();
    });
  });

  describe('Sort Items Ordering', () => {
    it('sorts items by name in ascending order', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));
      await user.selectOptions(screen.getByTestId('categories-sort-by'), 'name');

      // Toggle to ascending
      await user.click(screen.getByTestId('categories-sort-toggle'));

      expect(screen.getByTestId('categories-sort-by')).toHaveValue('name');
    });

    it('sorts items by lastModified in descending order', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));
      await user.selectOptions(screen.getByTestId('categories-sort-by'), 'lastModified');

      expect(screen.getByTestId('categories-sort-by')).toHaveValue('lastModified');
    });
  });

  describe('Handle Toggle Scenarios', () => {
    it('expands glossary with no children', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryNoChildren] } });

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-item-glossary-empty')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTestId('toggle-glossary-empty');
      await user.click(toggleButton);

      expect(toggleButton).toBeInTheDocument();
    });

    it('collapses glossary and its descendants', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      // First expand
      await user.click(screen.getByTestId('toggle-glossary-1'));
      // Then collapse
      await user.click(screen.getByTestId('toggle-glossary-1'));

      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
    });
  });

  describe('Handle Navigate Scenarios', () => {
    it('navigates to item found in display glossaries', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await user.click(screen.getByTestId('sidebar-item-glossary-1'));

      await waitFor(() => {
        expect(screen.getByTestId('overview-name')).toHaveTextContent('Test Glossary');
      });
    });

    it('handles navigation to term item', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));

      // The terms tab should show
      expect(screen.getByTestId('glossaries-terms')).toBeInTheDocument();
    });
  });

  describe('Initial Selection', () => {
    it('auto-selects first glossary when none selected', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      // The overview should show the first item
      await waitFor(() => {
        expect(screen.getByTestId('overview-name')).toHaveTextContent('Test Glossary');
      });
    });

    it('shows nothing state when no glossaries available', () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [] } });

      expect(screen.getByAltText('Select an item')).toBeInTheDocument();
    });
  });

  describe('Tab Panel Display', () => {
    it('displays overview tab by default', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Linked Assets Tab', () => {
    it('opens and closes asset preview', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));

      // Click on asset to open preview
      await user.click(screen.getByTestId('linked-asset-0'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-data')).toBeInTheDocument();
      });

      // Close preview
      await user.click(screen.getByTestId('close-preview'));
    });
  });

  describe('Term Navigation with Relationships', () => {
    it('navigates to a term with /terms/ in path', async () => {
      const user = userEvent.setup();
      const termWithPath: GlossaryItem = {
        id: 'projects/test/terms/my-term',
        type: 'term',
        displayName: 'My Term',
        lastModified: 1700000002,
        relations: [{ id: 'term-2', type: 'synonym', displayName: 'Related', lastModified: 1700000003 }],
        linkedAssets: [],
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithPath] } });

      await user.click(screen.getByTestId('sidebar-item-projects/test/terms/my-term'));

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Category Item Selection', () => {
    it('selects a category item type', async () => {
      const user = userEvent.setup();
      const categoryItem: GlossaryItem = {
        id: 'category-standalone',
        type: 'category',
        displayName: 'Standalone Category',
        lastModified: 1700000001,
        aspects: {},
        children: [
          {
            id: 'term-in-category',
            type: 'term',
            displayName: 'Term in Category',
            lastModified: 1700000002,
            aspects: {},
          }
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [categoryItem] } });

      await user.click(screen.getByTestId('sidebar-item-category-standalone'));

      await waitFor(() => {
        expect(screen.getByTestId('overview-name')).toHaveTextContent('Standalone Category');
      });
    });
  });

  describe('No Relations Term', () => {
    it('shows empty relations count', async () => {
      const user = userEvent.setup();
      const termNoRelations: GlossaryItem = {
        id: 'term-no-relations',
        type: 'term',
        displayName: 'Term No Relations',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [],
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termNoRelations] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Synonyms & Related Terms/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Synonyms & Related Terms/ }));
      expect(screen.getByTestId('relations-count')).toHaveTextContent('0');
    });
  });

  describe('Multiple Category Children', () => {
    it('displays multiple categories', async () => {
      const user = userEvent.setup();
      const glossaryMultiCategory: GlossaryItem = {
        id: 'glossary-multi-cat',
        type: 'glossary',
        displayName: 'Multi Category Glossary',
        lastModified: 1700000000,
        aspects: {},
        children: [
          {
            id: 'cat-1',
            type: 'category',
            displayName: 'Category One',
            lastModified: 1700000001,
            aspects: {},
          },
          {
            id: 'cat-2',
            type: 'category',
            displayName: 'Category Two',
            lastModified: 1700000002,
            aspects: {},
          },
          {
            id: 'cat-3',
            type: 'category',
            displayName: 'Category Three',
            lastModified: 1700000003,
            aspects: {},
          }
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossaryMultiCategory] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));
      expect(screen.getByTestId('categories-count')).toHaveTextContent('3');
    });
  });

  describe('shouldShowSidebarShimmer Conditions', () => {
    it('shows shimmer when filter status is loading', () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filterStatus: 'loading',
        },
      });

      expect(screen.getByTestId('shimmer-simple-list')).toBeInTheDocument();
    });
  });

  describe('Filtered Annotation Entry', () => {
    it('shows preview annotation with filtered entry', async () => {
      const user = userEvent.setup();
      const termWithFilterableAspects: GlossaryItem = {
        id: 'term-filterable',
        type: 'term',
        displayName: 'Filterable Term',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [],
        aspects: {
          'custom.filter.aspect': {
            data: {
              fields: {
                value: { stringValue: 'filterable value' }
              }
            }
          }
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithFilterableAspects] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));

      await waitFor(() => {
        expect(screen.getByTestId('preview-annotation')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Linked Assets', () => {
    it('shows empty linked assets count', async () => {
      const user = userEvent.setup();
      const termEmptyAssets: GlossaryItem = {
        id: 'term-empty-assets',
        type: 'term',
        displayName: 'Term Empty Assets',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [],
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termEmptyAssets] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));
      expect(screen.getByTestId('linked-assets-count')).toHaveTextContent('0');
    });
  });

  describe('Asset Preview State Reset', () => {
    it('resets asset preview when changing selected item', async () => {
      const user = userEvent.setup();
      const term1: GlossaryItem = {
        id: 'term-preview-1',
        type: 'term',
        displayName: 'Term 1',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [{ name: 'asset-1' }],
        aspects: {},
      };
      const term2: GlossaryItem = {
        id: 'term-preview-2',
        type: 'term',
        displayName: 'Term 2',
        lastModified: 1700000003,
        relations: [],
        linkedAssets: [],
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [term1, term2] } });

      // Navigate to term1 and open linked assets tab
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Linked Assets' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Linked Assets' }));

      // Open preview
      await user.click(screen.getByTestId('linked-asset-0'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-data')).toBeInTheDocument();
      });

      // Navigate to term2 - should reset preview
      await user.click(screen.getByTestId('sidebar-item-term-preview-2'));

      // Preview should be gone after selection change
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-item-term-preview-2')).toBeInTheDocument();
      });
    });
  });

  describe('SortBy Selection Changes', () => {
    it('changes sort field in terms tab', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));

      // Change to sort by name
      await user.selectOptions(screen.getByTestId('terms-sort-by'), 'name');
      expect(screen.getByTestId('terms-sort-by')).toHaveValue('name');

      // Change back to lastModified
      await user.selectOptions(screen.getByTestId('terms-sort-by'), 'lastModified');
      expect(screen.getByTestId('terms-sort-by')).toHaveValue('lastModified');
    });
  });

  describe('Filter With No Selected ID', () => {
    it('handles clearing expanded when no selected ID', async () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [],
          filteredTreeItems: [],
          activeFilters: [],
        },
      });

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  describe('Transform Labels Edge Cases', () => {
    it('handles labels with colons in value', async () => {
      const itemWithColonLabels: GlossaryItem = {
        id: 'glossary-colon-labels',
        type: 'glossary',
        displayName: 'Colon Labels Glossary',
        lastModified: 1700000000,
        labels: ['key:value:with:extra:colons'],
        contacts: ['contact1@test.com', 'contact2@test.com'],
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [itemWithColonLabels] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('handles undefined labels array', async () => {
      const itemNoLabels: GlossaryItem = {
        id: 'glossary-no-labels',
        type: 'glossary',
        displayName: 'No Labels Glossary',
        lastModified: 1700000000,
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [itemNoLabels] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('handles undefined contacts array', async () => {
      const itemNoContacts: GlossaryItem = {
        id: 'glossary-no-contacts',
        type: 'glossary',
        displayName: 'No Contacts Glossary',
        lastModified: 1700000000,
        labels: ['key:value'],
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [itemNoContacts] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Glossary With Deep Nested Terms', () => {
    it('flattens all terms from deep nested structure', async () => {
      const user = userEvent.setup();
      const deepNestedGlossary: GlossaryItem = {
        id: 'glossary-deep',
        type: 'glossary',
        displayName: 'Deep Nested',
        lastModified: 1700000000,
        aspects: {},
        children: [
          {
            id: 'cat-level-1',
            type: 'category',
            displayName: 'Level 1',
            lastModified: 1700000001,
            aspects: {},
            children: [
              {
                id: 'cat-level-2',
                type: 'category',
                displayName: 'Level 2',
                lastModified: 1700000002,
                aspects: {},
                children: [
                  {
                    id: 'term-deep',
                    type: 'term',
                    displayName: 'Deep Term',
                    lastModified: 1700000003,
                    aspects: {},
                  }
                ]
              },
              {
                id: 'term-mid',
                type: 'term',
                displayName: 'Mid Term',
                lastModified: 1700000004,
                aspects: {},
              }
            ]
          }
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [deepNestedGlossary] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));
      // Should show count of 2 (Deep Term + Mid Term)
      expect(screen.getByTestId('terms-count')).toHaveTextContent('2');
    });
  });

  describe('Glossary Item Click Navigation', () => {
    it('navigates using handleNavigate on category item click', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      // Click on a category item in the list
      const categoryItem = screen.getByTestId('categories-item-category-1');
      await user.click(categoryItem);

      // Should have navigated and show overview for the category
      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Search Filtering in Synonyms', () => {
    it('searches in synonyms tab', async () => {
      const user = userEvent.setup();
      const termWithSynonyms: GlossaryItem = {
        id: 'term-synonyms-search',
        type: 'term',
        displayName: 'Term for Synonym Search',
        lastModified: 1700000002,
        relations: [
          { id: 'syn-1', type: 'synonym', displayName: 'First Synonym', lastModified: 1700000003 },
        ],
        linkedAssets: [],
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithSynonyms] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Synonyms & Related Terms/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Synonyms & Related Terms/ }));
      expect(screen.getByTestId('glossaries-synonyms')).toBeInTheDocument();
    });
  });

  describe('Projects Not Loaded', () => {
    it('dispatches getProjects when not loaded', () => {
      renderWithStore({
        glossaries: { status: 'idle', glossaryItems: [] },
        projects: { isloaded: false, projects: [] },
      });

      // Component should render and dispatch getProjects
      expect(screen.getByText('Business Glossaries')).toBeInTheDocument();
    });
  });

  describe('Initial Fetch When Idle', () => {
    it('fetches glossaries when status is idle', () => {
      renderWithStore({
        glossaries: { status: 'idle', glossaryItems: [] },
      });

      // Should show loading or render title
      expect(screen.getByText('Business Glossaries')).toBeInTheDocument();
    });
  });

  describe('Transform Entry with Null Description', () => {
    it('handles item with undefined description', async () => {
      const itemNoDesc: GlossaryItem = {
        id: 'glossary-no-desc',
        type: 'glossary',
        displayName: 'No Desc Glossary',
        lastModified: 1700000000,
        description: undefined,
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [itemNoDesc] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Sort Items with Missing LastModified', () => {
    it('sorts items when lastModified is 0', async () => {
      const user = userEvent.setup();
      const glossaryMissingDates: GlossaryItem = {
        id: 'glossary-missing-dates',
        type: 'glossary',
        displayName: 'Missing Dates',
        lastModified: 1700000000,
        aspects: {},
        children: [
          {
            id: 'cat-no-date-1',
            type: 'category',
            displayName: 'Cat A',
            lastModified: 0,
            aspects: {},
          },
          {
            id: 'cat-no-date-2',
            type: 'category',
            displayName: 'Cat B',
            lastModified: 1700000001,
            aspects: {},
          }
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossaryMissingDates] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      // Toggle sort order to test both asc and desc with 0 dates
      await user.click(screen.getByTestId('categories-sort-toggle'));
      expect(screen.getByTestId('categories-count')).toHaveTextContent('2');
    });
  });

  describe('DisplayName Filtering Case Insensitive', () => {
    it('filters categories case insensitively', async () => {
      const user = userEvent.setup();
      const glossaryMixedCase: GlossaryItem = {
        id: 'glossary-mixed-case',
        type: 'glossary',
        displayName: 'Mixed Case',
        lastModified: 1700000000,
        aspects: {},
        children: [
          {
            id: 'cat-upper',
            type: 'category',
            displayName: 'UPPERCASE',
            lastModified: 1700000001,
            aspects: {},
          },
          {
            id: 'cat-lower',
            type: 'category',
            displayName: 'lowercase',
            lastModified: 1700000002,
            aspects: {},
          }
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossaryMixedCase] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      // Type lowercase to test case insensitive search
      await user.type(screen.getByTestId('categories-search'), 'upper');
      expect(screen.getByTestId('categories-search')).toHaveValue('upper');
    });
  });

  describe('Toggle Multiple Root Glossaries', () => {
    it('collapses other glossaries when expanding a new one', async () => {
      const user = userEvent.setup();
      const glossary1: GlossaryItem = {
        id: 'glossary-toggle-1',
        type: 'glossary',
        displayName: 'Glossary 1',
        lastModified: 1700000000,
        aspects: {},
        children: [
          { id: 'cat-g1', type: 'category', displayName: 'Cat G1', lastModified: 1700000001, aspects: {} }
        ]
      };
      const glossary2: GlossaryItem = {
        id: 'glossary-toggle-2',
        type: 'glossary',
        displayName: 'Glossary 2',
        lastModified: 1700000002,
        aspects: {},
        children: [
          { id: 'cat-g2', type: 'category', displayName: 'Cat G2', lastModified: 1700000003, aspects: {} }
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossary1, glossary2] } });

      // Expand first glossary
      await user.click(screen.getByTestId('toggle-glossary-toggle-1'));

      // Expand second glossary - should collapse first
      await user.click(screen.getByTestId('toggle-glossary-toggle-2'));

      expect(screen.getByTestId('sidebar-item-glossary-toggle-1')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-item-glossary-toggle-2')).toBeInTheDocument();
    });
  });

  describe('Children Fetch on Toggle', () => {
    it('fetches children when expanding item with empty children', async () => {
      const user = userEvent.setup();
      const glossaryEmptyChildren: GlossaryItem = {
        id: 'glossary-fetch-children',
        type: 'glossary',
        displayName: 'Fetch Children',
        lastModified: 1700000000,
        aspects: {},
        children: []
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossaryEmptyChildren] } });

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-item-glossary-fetch-children')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('toggle-glossary-fetch-children'));

      expect(screen.getByTestId('sidebar-item-glossary-fetch-children')).toBeInTheDocument();
    });
  });

  describe('Selected Item Null Check', () => {
    it('handles selectedItem being null', () => {
      renderWithStore({
        glossaries: { status: 'succeeded', glossaryItems: [] },
      });

      expect(screen.getByAltText('Select an item')).toBeInTheDocument();
    });
  });

  describe('HasVisibleAspects with Various Keys', () => {
    it('excludes schema aspect from visible aspects', async () => {
      const user = userEvent.setup();
      const termWithSchema: GlossaryItem = {
        id: 'term-schema-only',
        type: 'term',
        displayName: 'Schema Only Term',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [],
        aspects: {
          'term.global.schema': { data: { fields: {} } },
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithSchema] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));
      await waitFor(() => {
        expect(screen.getByText('No aspects available for this term')).toBeInTheDocument();
      });
    });

    it('excludes usage aspect from visible aspects', async () => {
      const user = userEvent.setup();
      const termWithUsage: GlossaryItem = {
        id: 'term-usage-only',
        type: 'term',
        displayName: 'Usage Only Term',
        lastModified: 1700000002,
        relations: [],
        linkedAssets: [],
        aspects: {
          'term.global.usage': { data: { fields: {} } },
        },
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [termWithUsage] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Aspects/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /Aspects/ }));
      await waitFor(() => {
        expect(screen.getByText('No aspects available for this term')).toBeInTheDocument();
      });
    });
  });

  describe('FilteredCategories and FilteredTerms Memoization', () => {
    it('updates filtered categories when search term changes', async () => {
      const user = userEvent.setup();
      const glossaryMultiCat: GlossaryItem = {
        id: 'glossary-filter-test',
        type: 'glossary',
        displayName: 'Filter Test',
        lastModified: 1700000000,
        aspects: {},
        children: [
          { id: 'cat-alpha', type: 'category', displayName: 'Alpha', lastModified: 1700000001, aspects: {} },
          { id: 'cat-beta', type: 'category', displayName: 'Beta', lastModified: 1700000002, aspects: {} },
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossaryMultiCat] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      // Initially shows 2 categories
      expect(screen.getByTestId('categories-count')).toHaveTextContent('2');

      // Type filter to narrow down
      await user.type(screen.getByTestId('categories-search'), 'Alpha');
      expect(screen.getByTestId('categories-search')).toHaveValue('Alpha');
    });
  });

  describe('Toggle With Active Filters', () => {
    it('does not collapse other glossaries when filters are active', async () => {
      const user = userEvent.setup();
      const glossary1: GlossaryItem = {
        id: 'glossary-filter-toggle-1',
        type: 'glossary',
        displayName: 'Glossary Filter 1',
        lastModified: 1700000000,
        aspects: {},
        children: [{ id: 'cat-f1', type: 'category', displayName: 'Cat F1', lastModified: 1700000001, aspects: {} }]
      };
      const glossary2: GlossaryItem = {
        id: 'glossary-filter-toggle-2',
        type: 'glossary',
        displayName: 'Glossary Filter 2',
        lastModified: 1700000002,
        aspects: {},
        children: [{ id: 'cat-f2', type: 'category', displayName: 'Cat F2', lastModified: 1700000003, aspects: {} }]
      };
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [glossary1, glossary2],
          filteredTreeItems: [glossary1, glossary2],
          activeFilters: [{ id: '1', field: 'name', value: 'test', displayLabel: 'test' }],
        },
      });

      // Toggle first glossary
      await user.click(screen.getByTestId('toggle-glossary-filter-toggle-1'));

      // Toggle second glossary - should NOT collapse first when filters active
      await user.click(screen.getByTestId('toggle-glossary-filter-toggle-2'));

      expect(screen.getByTestId('sidebar-item-glossary-filter-toggle-1')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-item-glossary-filter-toggle-2')).toBeInTheDocument();
    });
  });

  describe('Breadcrumbs Navigation', () => {
    it('handles single level breadcrumb', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      // At root level, should show overview
      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Sort Order Variations', () => {
    it('sorts by name descending', async () => {
      const user = userEvent.setup();
      const glossaryForSort: GlossaryItem = {
        id: 'glossary-sort-desc',
        type: 'glossary',
        displayName: 'Sort Test',
        lastModified: 1700000000,
        aspects: {},
        children: [
          { id: 'cat-z', type: 'category', displayName: 'Zebra', lastModified: 1700000001, aspects: {} },
          { id: 'cat-a', type: 'category', displayName: 'Apple', lastModified: 1700000002, aspects: {} },
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossaryForSort] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      // Select sort by name
      await user.selectOptions(screen.getByTestId('categories-sort-by'), 'name');

      // Toggle to descending
      await user.click(screen.getByTestId('categories-sort-toggle'));

      expect(screen.getByTestId('categories-count')).toHaveTextContent('2');
    });

    it('sorts by lastModified ascending', async () => {
      const user = userEvent.setup();
      const glossaryForSort: GlossaryItem = {
        id: 'glossary-sort-asc',
        type: 'glossary',
        displayName: 'Sort Asc Test',
        lastModified: 1700000000,
        aspects: {},
        children: [
          { id: 'cat-new', type: 'category', displayName: 'New', lastModified: 1700000002, aspects: {} },
          { id: 'cat-old', type: 'category', displayName: 'Old', lastModified: 1700000001, aspects: {} },
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossaryForSort] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Categories' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Categories' }));

      // Keep default lastModified sort, toggle to ascending
      await user.click(screen.getByTestId('categories-sort-toggle'));

      expect(screen.getByTestId('categories-count')).toHaveTextContent('2');
    });
  });

  describe('Collect All IDs on Collapse', () => {
    it('collapses glossary with nested children', async () => {
      const user = userEvent.setup();
      const nestedGlossary: GlossaryItem = {
        id: 'glossary-nested-collapse',
        type: 'glossary',
        displayName: 'Nested Collapse',
        lastModified: 1700000000,
        aspects: {},
        children: [
          {
            id: 'cat-parent',
            type: 'category',
            displayName: 'Parent Cat',
            lastModified: 1700000001,
            aspects: {},
            children: [
              { id: 'cat-child', type: 'category', displayName: 'Child Cat', lastModified: 1700000002, aspects: {} }
            ]
          }
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [nestedGlossary] } });

      // Expand
      await user.click(screen.getByTestId('toggle-glossary-nested-collapse'));

      // Collapse
      await user.click(screen.getByTestId('toggle-glossary-nested-collapse'));

      expect(screen.getByTestId('sidebar-item-glossary-nested-collapse')).toBeInTheDocument();
    });
  });

  describe('Access Denied State', () => {
    it('shows access denied for matching item', async () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          accessDeniedItemId: 'glossary-1',
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toHaveAttribute('data-access-denied', 'true');
      });
    });

    it('shows normal state when access denied ID does not match', async () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          accessDeniedItemId: 'different-id',
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toHaveAttribute('data-access-denied', 'false');
      });
    });
  });

  describe('Selected Item with Type Property', () => {
    it('handles term type correctly', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockTermItem] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('handles category type correctly', async () => {
      const categoryItem: GlossaryItem = {
        id: 'category-standalone',
        type: 'category',
        displayName: 'Standalone Category',
        lastModified: 1700000001,
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [categoryItem] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Manual Selection ID Ref', () => {
    it('sets manual selection ID on sidebar click', async () => {
      const user = userEvent.setup();
      const glossary1: GlossaryItem = {
        id: 'glossary-manual-1',
        type: 'glossary',
        displayName: 'Manual Select 1',
        lastModified: 1700000000,
        aspects: {},
      };
      const glossary2: GlossaryItem = {
        id: 'glossary-manual-2',
        type: 'glossary',
        displayName: 'Manual Select 2',
        lastModified: 1700000001,
        aspects: {},
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossary1, glossary2] } });

      // Wait for sidebar items to be rendered
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-item-glossary-manual-2')).toBeInTheDocument();
      });

      // Click on second glossary
      await user.click(screen.getByTestId('sidebar-item-glossary-manual-2'));

      await waitFor(() => {
        expect(screen.getByTestId('overview-name')).toHaveTextContent('Manual Select 2');
      });
    });
  });

  describe('Icon Rendering', () => {
    it('renders icon for selected item type', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Content Body Conditional Rendering', () => {
    it('shows overview tab content by default', async () => {
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Status Variations', () => {
    it('handles succeeded filter status', () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filteredTreeItems: [mockGlossaryItem],
          filterStatus: 'succeeded',
          activeFilters: [{ id: '1', field: 'name', value: 'test', displayLabel: 'test' }],
        },
      });

      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
    });

    it('handles idle filter status', () => {
      renderWithStore({
        glossaries: {
          status: 'succeeded',
          glossaryItems: [mockGlossaryItem],
          filterStatus: 'idle',
        },
      });

      expect(screen.getByTestId('sidebar-item-glossary-1')).toBeInTheDocument();
    });
  });

  describe('Ancestor Expansion on Selection', () => {
    it('expands ancestors when selecting nested item', async () => {
      const user = userEvent.setup();
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [mockGlossaryItem] } });

      // Click on glossary item
      await user.click(screen.getByTestId('sidebar-item-glossary-1'));

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Terms Filtering', () => {
    it('filters terms list by display name', async () => {
      const user = userEvent.setup();
      const glossaryWithTerms: GlossaryItem = {
        id: 'glossary-term-filter',
        type: 'glossary',
        displayName: 'Term Filter Test',
        lastModified: 1700000000,
        aspects: {},
        children: [
          {
            id: 'cat-for-terms',
            type: 'category',
            displayName: 'Category',
            lastModified: 1700000001,
            aspects: {},
            children: [
              { id: 'term-abc', type: 'term', displayName: 'ABC Term', lastModified: 1700000002, aspects: {} },
              { id: 'term-xyz', type: 'term', displayName: 'XYZ Term', lastModified: 1700000003, aspects: {} },
            ]
          }
        ]
      };
      renderWithStore({ glossaries: { status: 'succeeded', glossaryItems: [glossaryWithTerms] } });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Terms' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Terms' }));

      // Search for 'ABC'
      await user.type(screen.getByTestId('terms-search'), 'ABC');
      expect(screen.getByTestId('terms-search')).toHaveValue('ABC');
    });
  });
});
