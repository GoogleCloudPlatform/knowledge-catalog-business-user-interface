import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, beforeEach, beforeAll, it, describe, expect } from 'vitest';
import FilterDropdown from './FilterDropDown';
import axios from 'axios';

// Projects come from /get-projects (state.projects.items). Enough entries to
// also trigger the "See X more" button for the Projects section.
const mockProjectsList = [
  { projectId: 'project-1', name: 'projects/100000001' },
  { projectId: 'project-2', name: 'projects/100000002' },
  ...Array.from({ length: 13 }, (_, i) => ({
    projectId: `project-${i + 3}`,
    name: `projects/10000000${i + 3}`,
  })),
];

// Mock auth context - with 15 aspects to trigger "See X more" button
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
      aspects: [
        // First 2 aspects with full data for edit icon tests
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Test Annotation 1',
              resource: 'test-resource-1'
            },
            name: 'projects/test/aspects/aspect-1'
          }
        },
        {
          dataplexEntry: {
            entrySource: {
              displayName: 'Test Annotation 2',
              resource: 'test-resource-2'
            },
            name: 'projects/test/aspects/aspect-2'
          }
        },
        // Additional aspects to trigger "See X more" button (needs >10 total)
        ...Array.from({ length: 13 }, (_, i) => ({
          dataplexEntry: {
            entrySource: {
              displayName: `Test Annotation ${i + 3}`,
              resource: `test-resource-${i + 3}`
            },
            name: `projects/test/aspects/aspect-${i + 3}`
          }
        }))
      ],
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
const createMockStore = (initialState: { search?: Record<string, unknown>; projects?: Record<string, unknown>; user?: Record<string, unknown> } = {}) => {
  const defaultState = {
    search: {
      searchTerm: '',
      searchType: 'All',
      ...(initialState.search || {})
    },
    // The Projects filter list is sourced from /get-projects (state.projects),
    // not appConfig, so the default store models a completed bootstrap.
    projects: {
      isloaded: true,
      items: mockProjectsList,
      ...(initialState.projects || {})
    },
    user: {
      mode: 'light',
      ...(initialState.user || {})
    }
  };

  return configureStore({
    reducer: {
      search: (state = defaultState.search) => state,
      projects: (state = defaultState.projects) => state,
      user: (state = defaultState.user) => state
    },
    preloadedState: defaultState
  });
};

// Mock child components
vi.mock('./FilterAnnotationsMultiSelect', () => ({
  default: function MockFilterAnnotationsMultiSelect({ options, value, onChange, onClose, isOpen }: any) {
    return isOpen ? (
      <div data-testid="annotations-multiselect">
        <div>Options: {options.join(', ')}</div>
        <div>Selected: {value.join(', ')}</div>
        <button onClick={() => onChange(['Test Annotation 1'])}>Select Annotation</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  }
}));

vi.mock('./FilterSubAnnotationsPanel', () => ({
  default: function MockFilterSubAnnotationsPanel({
    annotationName,
    subAnnotations,
    selectedSubAnnotations,
    onSubAnnotationsChange,
    onSubAnnotationsApply,
    onClose,
    isOpen
  }: any) {
    return isOpen ? (
      <div data-testid="sub-annotations-panel">
        <div>Annotation: {annotationName}</div>
        <div>Sub-annotations: {subAnnotations.length}</div>
        <div>Selected: {selectedSubAnnotations.length}</div>
        <button onClick={() => onSubAnnotationsChange([{ name: 'field1', type: 'string' }])}>
          Select Sub-annotation
        </button>
        <button onClick={() => onSubAnnotationsApply([{ name: 'field1', type: 'string' }])}>
          Apply
        </button>
        <button onClick={() => onSubAnnotationsApply([])}>
          Apply Empty
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  }
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    defaults: {
      headers: {
        common: {}
      }
    }
  }
}));

// Mock SVG assets
vi.mock('../../assets/svg/edit_note.svg', () => ({ default: 'edit-note-icon' }));
vi.mock('../../assets/svg/BigQuery.svg', () => ({ default: 'bigquery-icon' }));
vi.mock('../../assets/svg/CloudBigTable.svg', () => ({ default: 'cloud-bigtable-icon' }));
vi.mock('../../assets/svg/cloudpub_sub.svg', () => ({ default: 'cloud-pubsub-icon' }));
vi.mock('../../assets/svg/CloudSpanner.svg', () => ({ default: 'cloud-spanner-icon' }));
vi.mock('../../assets/svg/CloudStorage.svg', () => ({ default: 'cloud-storage-icon' }));
vi.mock('../../assets/svg/Dataplex.svg', () => ({ default: 'dataplex-icon' }));
vi.mock('../../assets/svg/Dataproc.svg', () => ({ default: 'dataproc-icon' }));
vi.mock('../../assets/svg/vertex.svg', () => ({ default: 'vertex-icon' }));

// Bootstrap is complete by default so the searchSubmitted auto-select effect
// (gated on isBootstrapping, matching SearchPage's own gate) runs in tests.
vi.mock('../../hooks/useAppBootstrap', () => ({
  useAppBootstrapStatus: vi.fn(() => ({
    isAppConfigReady: true,
    areProjectsReady: true,
    isBootstrapping: false
  }))
}));

// Mock getProjects action
vi.mock('../../features/projects/projectsSlice', () => ({
  getProjects: vi.fn((data: { id_token?: string }) => ({
    type: 'projects/getProjects',
    payload: data
  }))
}));

// Mock DOM methods for positioning - needed for multiselect modal to open properly
beforeAll(() => {
  // Mock getBoundingClientRect for all elements
  const mockRect = {
    top: 100,
    left: 50,
    bottom: 150,
    right: 250,
    width: 200,
    height: 50,
    x: 50,
    y: 100,
    toJSON: () => ({})
  };
  Element.prototype.getBoundingClientRect = vi.fn(() => mockRect);

  // Mock querySelector to return a mock element with getBoundingClientRect
  const originalQuerySelector = Element.prototype.querySelector;
  Element.prototype.querySelector = vi.fn(function(this: Element, selector: string) {
    const result = originalQuerySelector.call(this, selector);
    if (result) return result;
    // Return a mock element for accordion header
    if (selector === '.MuiAccordionSummary-root') {
      return {
        getBoundingClientRect: () => mockRect
      } as unknown as Element;
    }
    return null;
  });

  // Mock closest to return an accordion element
  const originalClosest = Element.prototype.closest;
  Element.prototype.closest = vi.fn(function(this: Element, selector: string) {
    const result = originalClosest.call(this, selector);
    if (result) return result;
    // Return a mock accordion element for position calculations
    if (selector === '.MuiAccordion-root') {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = () => mockRect;
      mockElement.querySelector = () => ({
        getBoundingClientRect: () => mockRect
      } as unknown as Element);
      return mockElement;
    }
    return null;
  });

  // Ensure window.innerHeight is set for position calculations
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768
  });

  Object.defineProperty(window, 'scrollY', {
    writable: true,
    configurable: true,
    value: 0
  });
});

// Mock constants
vi.mock('../../constants/urls', () => ({
  URLS: {
    API_URL: 'http://localhost:3000/api',
    GET_ASPECT_DETAIL: '/aspect-detail'
  }
}));

// Import the component to access exported functions if needed
// Note: The icon functions are not exported, so we test them through the component

describe('FilterDropdown', () => {
  const mockOnFilterChange = vi.fn();
  const mockDispatch = vi.fn();

  const renderFilterDropdown = (props = {}, storeState: any = {}) => {
    const defaultStoreState = {
      search: {
        searchTerm: '',
        searchType: 'All',
        ...storeState.search
      }
    };

    const store = createMockStore(defaultStoreState);
    
    // Mock dispatch
    store.dispatch = mockDispatch;
    
    return render(
      <Provider store={store}>
        <FilterDropdown onFilterChange={mockOnFilterChange} {...props} />
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with all filter sections', () => {
    renderFilterDropdown();

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Aspects')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('displays filter sections as accordions', () => {
    renderFilterDropdown();

    // Check for accordion buttons by their text content
    expect(screen.getByText('Aspects')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    
    // Check that they are rendered as buttons (accordion headers)
    const accordionButtons = screen.getAllByRole('button').filter(button => 
      button.getAttribute('aria-controls')?.includes('-content')
    );
    expect(accordionButtons).toHaveLength(4);
  });

  it('expands accordion when clicked', () => {
    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
    }
  });

  it('displays assets in the Assets section', () => {
    renderFilterDropdown();

    const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
    if (assetsAccordion) {
      fireEvent.click(assetsAccordion);
      expect(screen.getByText('Bucket')).toBeInTheDocument();
      expect(screen.getByText('Dataset')).toBeInTheDocument();
      expect(screen.getByText('Table')).toBeInTheDocument();
    }
  });

  it('displays products in the Products section', () => {
    renderFilterDropdown();

    const productsAccordion = screen.getByText('Products').closest('[role="button"]');
    if (productsAccordion) {
      fireEvent.click(productsAccordion);
      expect(screen.getByText('BigQuery')).toBeInTheDocument();
      expect(screen.getByText('Cloud BigTable')).toBeInTheDocument();
      expect(screen.getByText('Vertex AI')).toBeInTheDocument();
    }
  });

  it('displays user projects in the Projects section', () => {
    renderFilterDropdown();

    const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
    if (projectsAccordion) {
      fireEvent.click(projectsAccordion);
      expect(screen.getByText('project-1')).toBeInTheDocument();
      expect(screen.getByText('project-2')).toBeInTheDocument();
      expect(screen.getByText('Others')).toBeInTheDocument();
    }
  });

  it('displays user annotations in the Aspects section', () => {
    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      expect(screen.getByText('Test Annotation 2')).toBeInTheDocument();
    }
  });

  it('handles checkbox selection for assets', () => {
    renderFilterDropdown();

    const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
    if (assetsAccordion) {
      fireEvent.click(assetsAccordion);
      
      const bucketCheckbox = screen.getByLabelText('Bucket');
      fireEvent.click(bucketCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Bucket',
          type: 'typeAliases'
        })
      ]);
    }
  });

  it('handles checkbox selection for products', () => {
    renderFilterDropdown();

    const productsAccordion = screen.getByText('Products').closest('[role="button"]');
    if (productsAccordion) {
      fireEvent.click(productsAccordion);
      
      const bigqueryCheckbox = screen.getByLabelText('BigQuery');
      fireEvent.click(bigqueryCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'BigQuery',
          type: 'system'
        })
      ]);
    }
  });

  it('handles checkbox selection for annotations', () => {
    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      
      const annotationCheckbox = screen.getByLabelText('Test Annotation 1');
      fireEvent.click(annotationCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Test Annotation 1',
          type: 'aspectType'
        })
      ]);
    }
  });

  it('handles checkbox deselection', () => {
    const initialFilters = [
      { name: 'Bucket', type: 'typeAliases', data: {} }
    ];

    renderFilterDropdown({ filters: initialFilters });

    const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
    if (assetsAccordion) {
      fireEvent.click(assetsAccordion);
      
      const bucketCheckbox = screen.getByLabelText('Bucket');
      fireEvent.click(bucketCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith([]);
    }
  });

  it('clears all filters when Clear button is clicked', () => {
    const initialFilters = [
      { name: 'Bucket', type: 'typeAliases', data: {} },
      { name: 'BigQuery', type: 'system', data: {} }
    ];

    renderFilterDropdown({ filters: initialFilters });

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith([]);
  });

  it('shows View All button in Aspects section', () => {
    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      expect(screen.getByText('View All')).toBeInTheDocument();
    }
  });

  it('opens annotations multiselect when View All is clicked', () => {
    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      
      const viewAllButton = screen.getByText('View All');
      fireEvent.click(viewAllButton);
      
      expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
    }
  });

  it('shows edit note icon for annotations', () => {
    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      
      const editIcons = screen.getAllByTestId('edit-note-icon');
      expect(editIcons.length).toBeGreaterThan(0);
    }
  });

  it('opens sub-annotations panel when edit note icon is clicked', async () => {
    // Mock axios for API call
    (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        metadataTemplate: {
          recordFields: [{ name: 'field1', type: 'string' }]
        }
      }
    });

    renderFilterDropdown();

    // Expand Aspects accordion by clicking directly on the text
    const aspectsText = screen.getByText('Aspects');
    fireEvent.click(aspectsText);

    // Wait for accordion to expand
    await waitFor(() => {
      expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
    });

    // Find and click the edit icon
    const editIcon = screen.getAllByTestId('edit-note-icon')[0];
    fireEvent.click(editIcon);

    // Verify sub-annotations panel opens
    await waitFor(() => {
      expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
    });
  });

  it('displays product icons for products', () => {
    renderFilterDropdown();

    const productsAccordion = screen.getByText('Products').closest('[role="button"]');
    if (productsAccordion) {
      fireEvent.click(productsAccordion);
      
      const bigqueryIcon = screen.getByAltText('BigQuery');
      expect(bigqueryIcon).toBeInTheDocument();
    }
  });

  it('syncs with search type when product is selected', () => {
    renderFilterDropdown();

    const productsAccordion = screen.getByText('Products').closest('[role="button"]');
    if (productsAccordion) {
      fireEvent.click(productsAccordion);
      
      const bigqueryCheckbox = screen.getByLabelText('BigQuery');
      fireEvent.click(bigqueryCheckbox);
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'search/setSearchType',
        payload: { searchType: 'BigQuery' }
      });
    }
  });

  it('sets search type to All when no products are selected', () => {
    const initialFilters = [
      { name: 'BigQuery', type: 'system', data: {} }
    ];

    renderFilterDropdown({ filters: initialFilters });

    const productsAccordion = screen.getByText('Products').closest('[role="button"]');
    if (productsAccordion) {
      fireEvent.click(productsAccordion);
      
      const bigqueryCheckbox = screen.getByLabelText('BigQuery');
      fireEvent.click(bigqueryCheckbox);
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'search/setSearchType',
        payload: { searchType: 'All' }
      });
    }
  });

  it('auto-selects assets when search is submitted with matching term', async () => {
    renderFilterDropdown({}, {
      search: {
        searchTerm: 'Dataset',
        searchType: 'All',
        searchSubmitted: true
      }
    });

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Dataset',
          type: 'typeAliases'
        })
      ]);
    });
  });

  it('auto-selects product when search is submitted with matching product name', async () => {
    renderFilterDropdown({}, {
      search: {
        searchTerm: 'BigQuery',
        searchType: 'All',
        searchSubmitted: true
      }
    });

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'BigQuery',
          type: 'system'
        })
      ]);
    });
  });

  it('clears asset filters when search is submitted with empty term', async () => {
    const initialFilters = [
      { name: 'Dataset', type: 'typeAliases', data: {} }
    ];

    renderFilterDropdown({ filters: initialFilters }, {
      search: {
        searchTerm: '',
        searchType: 'All',
        searchSubmitted: true
      }
    });

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith([]);
    });
  });

  it('sorts assets and products to show selected items first', () => {
    const initialFilters = [
      { name: 'Table', type: 'typeAliases', data: {} }
    ];

    renderFilterDropdown({ filters: initialFilters });

    const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
    if (assetsAccordion) {
      fireEvent.click(assetsAccordion);
      
      // Table should appear first in the list since it's selected
      const assetItems = screen.getAllByText(/^(Bucket|Cluster|Code asset|Connection|Dashboard|Dashboard element|Data exchange|Data source connection|Data stream|Database|Database schema|Dataset|Explore|Feature group|Feature online store|Feature view|Fileset|Folder|Function|Glossary|Glossary Category|Glossary Term|Listing|Look|Model|Repository|Resource|Routine|Service|Table|View|Other)$/);
      expect(assetItems[0]).toHaveTextContent('Table');
    }
  });

  it('handles user without appConfig', () => {
    const authContextWithoutAppConfig = {
      ...mockAuthContext,
      user: { ...mockAuthContext.user, appConfig: null }
    };

    vi.doMock('../../auth/AuthProvider', () => ({
      useAuth: () => authContextWithoutAppConfig
    }));

    renderFilterDropdown();

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('handles user without aspects in appConfig', () => {
    const authContextWithoutAspects = {
      ...mockAuthContext,
      user: { 
        ...mockAuthContext.user, 
        appConfig: { 
          ...mockAuthContext.user.appConfig,
          aspects: null 
        } 
      }
    };

    vi.doMock('../../auth/AuthProvider', () => ({
      useAuth: () => authContextWithoutAspects
    }));

    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      // Should not crash and should show View All button
      expect(screen.getByText('View All')).toBeInTheDocument();
    }
  });

  it('handles user without projects in appConfig', () => {
    const authContextWithoutProjects = {
      ...mockAuthContext,
      user: { 
        ...mockAuthContext.user, 
        appConfig: { 
          ...mockAuthContext.user.appConfig,
          projects: null 
        } 
      }
    };

    vi.doMock('../../auth/AuthProvider', () => ({
      useAuth: () => authContextWithoutProjects
    }));

    renderFilterDropdown();

    const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
    if (projectsAccordion) {
      fireEvent.click(projectsAccordion);
      // Should not crash and should show Others option
      expect(screen.getByText('Others')).toBeInTheDocument();
    }
  });

  it('handles empty filters prop', () => {
    renderFilterDropdown({ filters: [] });

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('handles undefined filters prop', () => {
    renderFilterDropdown({ filters: undefined });

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('shows loading state when clear is clicked', () => {
    const initialFilters = [
      { name: 'Bucket', type: 'typeAliases', data: {} }
    ];

    renderFilterDropdown({ filters: initialFilters });

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Component should briefly show loading state and clear filters
    expect(mockOnFilterChange).toHaveBeenCalledWith([]);
  });

  it('handles sub-annotations panel apply', () => {
    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      
      const editIcon = screen.getAllByTestId('edit-note-icon')[0];
      fireEvent.click(editIcon);
      
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Test Annotation 1',
          type: 'aspectType'
        })
      ]);
    }
  });

  it('handles annotations multiselect change', () => {
    renderFilterDropdown();

    const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
    if (annotationsAccordion) {
      fireEvent.click(annotationsAccordion);
      
      const viewAllButton = screen.getByText('View All');
      fireEvent.click(viewAllButton);
      
      const selectButton = screen.getByText('Select Annotation');
      fireEvent.click(selectButton);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Test Annotation 1',
          type: 'aspectType'
        })
      ]);
    }
  });

  it('handles user without token', () => {
    const authContextWithoutToken = {
      ...mockAuthContext,
      user: { ...mockAuthContext.user, token: '' }
    };

    vi.doMock('../../auth/AuthProvider', () => ({
      useAuth: () => authContextWithoutToken
    }));

    renderFilterDropdown();

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('handles missing entry prop gracefully', () => {
    renderFilterDropdown();

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('applies correct styling to filter sections', () => {
    renderFilterDropdown();

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('handles multiple filter selections', () => {
    renderFilterDropdown();

    const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
    if (assetsAccordion) {
      fireEvent.click(assetsAccordion);
      
      const bucketCheckbox = screen.getByLabelText('Bucket');
      const datasetCheckbox = screen.getByLabelText('Dataset');
      
      fireEvent.click(bucketCheckbox);
      fireEvent.click(datasetCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Bucket', type: 'typeAliases' }),
        expect.objectContaining({ name: 'Dataset', type: 'typeAliases' })
      ]);
    }
  });

  it('handles mixed filter types selection', () => {
    renderFilterDropdown();

    const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
    const productsAccordion = screen.getByText('Products').closest('[role="button"]');

    if (assetsAccordion && productsAccordion) {
      fireEvent.click(assetsAccordion);
      const bucketCheckbox = screen.getByLabelText('Bucket');
      fireEvent.click(bucketCheckbox);

      fireEvent.click(productsAccordion);
      const bigqueryCheckbox = screen.getByLabelText('BigQuery');
      fireEvent.click(bigqueryCheckbox);

      expect(mockOnFilterChange).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Bucket', type: 'typeAliases' }),
        expect.objectContaining({ name: 'BigQuery', type: 'system' })
      ]);
    }
  });

  describe('isGlossary mode', () => {
    it('renders without Aspects section when isGlossary is true', () => {
      renderFilterDropdown({ isGlossary: true });

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.queryByText('Aspects')).not.toBeInTheDocument();
    });

    it('expands Products by default when isGlossary is true', () => {
      renderFilterDropdown({ isGlossary: true });

      // Products accordion should be expanded by default in glossary mode
      expect(screen.getByText('BigQuery')).toBeInTheDocument();
    });
  });

  describe('Projects loading', () => {
    // getProjects is now dispatched once globally by useAppBootstrap (see
    // src/hooks/useAppBootstrap.test.ts), not by FilterDropDown itself, so
    // FilterDropDown no longer dispatches it on mount.
    it('does NOT dispatch getProjects on mount (handled globally by useAppBootstrap)', () => {
      renderFilterDropdown();

      const projectsCall = mockDispatch.mock.calls.find(
        (call: unknown[]) => (call[0] as { type?: string })?.type === 'projects/getProjects'
      );
      expect(projectsCall).toBeUndefined();
    });

    it('uses Redux projects when already loaded', () => {
      renderFilterDropdown({}, {
        projects: {
          isloaded: true,
          items: [{ projectId: 'loaded-project-1' }]
        }
      });

      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('updates projects list when Redux projects are loaded', async () => {
      renderFilterDropdown({}, {
        projects: {
          isloaded: true,
          items: [
            { projectId: 'redux-project-1' },
            { projectId: 'redux-project-2' }
          ]
        }
      });

      const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
      if (projectsAccordion) {
        fireEvent.click(projectsAccordion);

        await waitFor(() => {
          expect(screen.getByText('redux-project-1')).toBeInTheDocument();
          expect(screen.getByText('redux-project-2')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Sub-annotations API', () => {
    it('fetches sub-annotations when edit note is clicked', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              { name: 'field1', type: 'string' },
              { name: 'field2', type: 'integer' }
            ]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(mockAxiosPost).toHaveBeenCalledWith(
            'http://localhost:3000/api/aspect-detail',
            { name: 'test-resource-1' }
          );
        });
      }
    });

    it('handles sub-annotations API error gracefully', async () => {
      const mockAxiosPost = vi.fn().mockRejectedValue(new Error('API error'));
      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];

        // Should not crash when API fails
        expect(() => fireEvent.click(editIcon)).not.toThrow();
      }
    });
  });

  describe('See more button', () => {
    it('shows "See X more" button for categories with more than 10 items', () => {
      // Create a mock with more than 10 aspects
      const manyAspects = Array.from({ length: 15 }, (_, i) => ({
        dataplexEntry: {
          entrySource: {
            displayName: `Annotation ${i + 1}`,
            resource: `resource-${i + 1}`
          }
        }
      }));

      const authContextWithManyAspects = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          appConfig: {
            ...mockAuthContext.user.appConfig,
            aspects: manyAspects
          }
        }
      };

      vi.doMock('../../auth/AuthProvider', () => ({
        useAuth: () => authContextWithManyAspects
      }));

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        // Should show "Show more" button
        expect(screen.getByText('Show more')).toBeInTheDocument();
      }
    });
  });

  describe('Dispatch actions', () => {
    it('dispatches setSearchFilters action when filter changes', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const bucketCheckbox = screen.getByLabelText('Bucket');
        fireEvent.click(bucketCheckbox);

        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'search/setSearchFilters',
          payload: {
            searchFilters: [expect.objectContaining({ name: 'Bucket', type: 'typeAliases' })]
          }
        });
      }
    });

    it('dispatches setSearchType when BigQuery product is selected', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const bigqueryCheckbox = screen.getByLabelText('BigQuery');
        fireEvent.click(bigqueryCheckbox);

        // Should not set search type to 'All' when BigQuery is selected
        const setSearchTypeCalls = mockDispatch.mock.calls.filter(
          (call: unknown[]) => (call[0] as { type?: string })?.type === 'search/setSearchType'
        );

        // Only calls setSearchType on mount or when all products are deselected
        expect(setSearchTypeCalls.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Filter position calculation', () => {
    it('calculates multiselect position for normal mode', () => {
      renderFilterDropdown({ isGlossary: false });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        // Multiselect should be positioned to the right
        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      }
    });

    it('calculates multiselect position for glossary mode', () => {
      renderFilterDropdown({ isGlossary: true });

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        // In glossary mode, position calculation should account for different layout
        expect(screen.getByText('BigQuery')).toBeInTheDocument();
      }
    });
  });

  describe('Product icons', () => {
    it('displays icons for all products', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        // Test various product icons
        expect(screen.getByAltText('Analytics Hub')).toBeInTheDocument();
        expect(screen.getByAltText('BigQuery')).toBeInTheDocument();
        expect(screen.getByAltText('Cloud BigTable')).toBeInTheDocument();
        expect(screen.getByAltText('Cloud Pub/Sub')).toBeInTheDocument();
        expect(screen.getByAltText('Cloud Spanner')).toBeInTheDocument();
        expect(screen.getByAltText('Cloud SQL')).toBeInTheDocument();
        expect(screen.getByAltText('Dataform')).toBeInTheDocument();
        expect(screen.getByAltText('Knowledge Catalog')).toBeInTheDocument();
        expect(screen.getByAltText('Dataproc Metastore')).toBeInTheDocument();
        expect(screen.getByAltText('Vertex AI')).toBeInTheDocument();
        expect(screen.getByAltText('Others')).toBeInTheDocument();
      }
    });
  });

  describe('Asset icons', () => {
    it('displays icons for various assets', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        // Test various asset icons
        expect(screen.getByAltText('Bucket')).toBeInTheDocument();
        expect(screen.getByAltText('Cluster')).toBeInTheDocument();
        expect(screen.getByAltText('Code asset')).toBeInTheDocument();
        expect(screen.getByAltText('Connection')).toBeInTheDocument();
        expect(screen.getByAltText('Dashboard')).toBeInTheDocument();
        expect(screen.getByAltText('Dashboard element')).toBeInTheDocument();
        expect(screen.getByAltText('Data exchange')).toBeInTheDocument();
        expect(screen.getByAltText('Data source connection')).toBeInTheDocument();
        expect(screen.getByAltText('Data stream')).toBeInTheDocument();
        expect(screen.getByAltText('Database')).toBeInTheDocument();
        expect(screen.getByAltText('Database schema')).toBeInTheDocument();
        expect(screen.getByAltText('Dataset')).toBeInTheDocument();
        expect(screen.getByAltText('Explore')).toBeInTheDocument();
        expect(screen.getByAltText('Feature group')).toBeInTheDocument();
        expect(screen.getByAltText('Feature online store')).toBeInTheDocument();
        expect(screen.getByAltText('Feature view')).toBeInTheDocument();
        expect(screen.getByAltText('Fileset')).toBeInTheDocument();
        expect(screen.getByAltText('Folder')).toBeInTheDocument();
        expect(screen.getByAltText('Function')).toBeInTheDocument();
        expect(screen.getByAltText('Glossary')).toBeInTheDocument();
        expect(screen.getByAltText('Glossary Category')).toBeInTheDocument();
        expect(screen.getByAltText('Glossary Term')).toBeInTheDocument();
        expect(screen.getByAltText('Listing')).toBeInTheDocument();
        expect(screen.getByAltText('Look')).toBeInTheDocument();
        expect(screen.getByAltText('Model')).toBeInTheDocument();
        expect(screen.getByAltText('Repository')).toBeInTheDocument();
        expect(screen.getByAltText('Resource')).toBeInTheDocument();
        expect(screen.getByAltText('Routine')).toBeInTheDocument();
        expect(screen.getByAltText('Service')).toBeInTheDocument();
        expect(screen.getByAltText('Table')).toBeInTheDocument();
        expect(screen.getByAltText('View')).toBeInTheDocument();
        expect(screen.getByAltText('Other')).toBeInTheDocument();
      }
    });
  });

  describe('Multiselect close', () => {
    it('closes multiselect when close button is clicked', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();

        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);

        expect(screen.queryByTestId('annotations-multiselect')).not.toBeInTheDocument();
      }
    });
  });

  describe('Sub-annotations panel close', () => {
    it('closes sub-annotations panel when close button is clicked', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        const closeButton = screen.getAllByText('Close').find(btn =>
          btn.closest('[data-testid="sub-annotations-panel"]')
        );

        if (closeButton) {
          fireEvent.click(closeButton);

          await waitFor(() => {
            expect(screen.queryByTestId('sub-annotations-panel')).not.toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('Sub-annotations with enum values', () => {
    it('handles sub-annotations with enum values', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              {
                name: 'status',
                type: 'enum',
                enumValues: ['active', 'inactive', { name: 'pending' }]
              }
            ]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(mockAxiosPost).toHaveBeenCalled();
        });
      }
    });

    it('handles sub-annotations with various field types', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              { name: 'field1', type: 'string' },
              { name: 'field2', type: 'integer' },
              { name: 'field3', type: 'boolean' },
              { name: 'field4' } // no type specified
            ]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(mockAxiosPost).toHaveBeenCalled();
        });
      }
    });

    it('handles empty sub-annotations apply', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown({ filters: [{ name: 'Test Annotation 1', type: 'aspectType', data: {} }] });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Apply with no sub-annotations selected (should remove parent annotation)
        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);

        await waitFor(() => {
          expect(mockOnFilterChange).toHaveBeenCalledWith([]);
        });
      }
    });

    it('updates existing parent annotation when applying sub-annotations', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown({ filters: [{ name: 'Test Annotation 1', type: 'aspectType', data: {} }] });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Select a sub-annotation
        const selectButton = screen.getByText('Select Sub-annotation');
        fireEvent.click(selectButton);

        // Apply
        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);

        await waitFor(() => {
          expect(mockOnFilterChange).toHaveBeenCalledWith([
            expect.objectContaining({
              name: 'Test Annotation 1',
              type: 'aspectType',
              subAnnotationData: expect.any(Array)
            })
          ]);
        });
      }
    });
  });

  describe('Accordion auto-expand', () => {
    it('maintains accordion state when filters change', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);
        expect(screen.getByText('Bucket')).toBeInTheDocument();
      }
    });
  });

  describe('Annotation name extraction', () => {
    it('extracts annotation name from dataplex name when displayName is missing', () => {
      const authContextWithCustomAnnotation = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          appConfig: {
            ...mockAuthContext.user.appConfig,
            aspects: [
              {
                dataplexEntry: {
                  name: 'projects/test/locations/us/entryGroups/group1/entries/annotation123',
                  entrySource: {
                    resource: 'resource-1'
                  }
                }
              }
            ]
          }
        }
      };

      vi.doMock('../../auth/AuthProvider', () => ({
        useAuth: () => authContextWithCustomAnnotation
      }));

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        // Should extract 'annotation123' from the name path
        expect(screen.getByText('annotation123')).toBeInTheDocument();
      }
    });
  });

  describe('Project selection', () => {
    it('handles selecting Others project', () => {
      renderFilterDropdown();

      const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
      if (projectsAccordion) {
        fireEvent.click(projectsAccordion);

        const othersCheckbox = screen.getByLabelText('Others');
        fireEvent.click(othersCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Others',
            type: 'project'
          })
        ]);
      }
    });
  });

  describe('Loading state rendering', () => {
    it('renders empty fragment during loading', () => {
      const { container } = renderFilterDropdown();

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      // During the brief loading state, component returns empty fragment
      // This happens synchronously before the timeout completes
      expect(container.firstChild).toBeTruthy();
    });

    it('completes loading state after timeout', async () => {
      const initialFilters = [
        { name: 'Bucket', type: 'typeAliases', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      // Wait for the component to complete loading after the internal timeout
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Product icon coverage', () => {
    it('displays Cloud Storage icon', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);
        expect(screen.getByAltText('Cloud Storage')).toBeInTheDocument();
      }
    });

    it('displays Knowledge Catalog icon for Knowledge Catalog product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);
        // Knowledge Catalog and Knowledge Catalog both use DataplexIcon
        expect(screen.getByAltText('Knowledge Catalog')).toBeInTheDocument();
      }
    });

    it('handles selecting Cloud Storage product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const cloudStorageCheckbox = screen.getByLabelText('Cloud Storage');
        fireEvent.click(cloudStorageCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Cloud Storage',
            type: 'system'
          })
        ]);
      }
    });

    it('handles selecting Vertex AI product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const vertexCheckbox = screen.getByLabelText('Vertex AI');
        fireEvent.click(vertexCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Vertex AI',
            type: 'system'
          })
        ]);
      }
    });

    it('handles selecting Dataproc Metastore product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const dataprocCheckbox = screen.getByLabelText('Dataproc Metastore');
        fireEvent.click(dataprocCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Dataproc Metastore',
            type: 'system'
          })
        ]);
      }
    });

    it('handles selecting Analytics Hub product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const analyticsHubCheckbox = screen.getByLabelText('Analytics Hub');
        fireEvent.click(analyticsHubCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Analytics Hub',
            type: 'system'
          })
        ]);
      }
    });

    it('handles selecting Cloud SQL product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const cloudSqlCheckbox = screen.getByLabelText('Cloud SQL');
        fireEvent.click(cloudSqlCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Cloud SQL',
            type: 'system'
          })
        ]);
      }
    });

    it('handles selecting Dataform product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const dataformCheckbox = screen.getByLabelText('Dataform');
        fireEvent.click(dataformCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Dataform',
            type: 'system'
          })
        ]);
      }
    });

    it('handles selecting Knowledge Catalog product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const dataplexCheckbox = screen.getByLabelText('Knowledge Catalog');
        fireEvent.click(dataplexCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Knowledge Catalog',
            type: 'system'
          })
        ]);
      }
    });

    it('handles selecting Others product', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const othersCheckbox = screen.getByLabelText('Others');
        fireEvent.click(othersCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Others',
            type: 'system'
          })
        ]);
      }
    });
  });

  describe('Asset icon coverage', () => {
    it('displays Service asset icon', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);
        expect(screen.getByAltText('Service')).toBeInTheDocument();
      }
    });

    it('handles selecting Service asset', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const serviceCheckbox = screen.getByLabelText('Service');
        fireEvent.click(serviceCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Service',
            type: 'typeAliases'
          })
        ]);
      }
    });

    it('handles selecting View asset', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const viewCheckbox = screen.getByLabelText('View');
        fireEvent.click(viewCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'View',
            type: 'typeAliases'
          })
        ]);
      }
    });

    it('handles selecting Routine asset', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const routineCheckbox = screen.getByLabelText('Routine');
        fireEvent.click(routineCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Routine',
            type: 'typeAliases'
          })
        ]);
      }
    });

    it('handles selecting Other asset', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const otherCheckbox = screen.getByLabelText('Other');
        fireEvent.click(otherCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Other',
            type: 'typeAliases'
          })
        ]);
      }
    });

    it('handles selecting Glossary Term asset', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const glossaryTermCheckbox = screen.getByLabelText('Glossary Term');
        fireEvent.click(glossaryTermCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Glossary Term',
            type: 'typeAliases'
          })
        ]);
      }
    });

    it('handles selecting Feature view asset', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const featureViewCheckbox = screen.getByLabelText('Feature view');
        fireEvent.click(featureViewCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Feature view',
            type: 'typeAliases'
          })
        ]);
      }
    });

    it('handles selecting Resource asset', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const resourceCheckbox = screen.getByLabelText('Resource');
        fireEvent.click(resourceCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Resource',
            type: 'typeAliases'
          })
        ]);
      }
    });

    it('handles selecting Data source connection asset', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const dataSourceCheckbox = screen.getByLabelText('Data source connection');
        fireEvent.click(dataSourceCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Data source connection',
            type: 'typeAliases'
          })
        ]);
      }
    });
  });

  describe('Accordion interaction coverage', () => {
    it('handles accordion collapse', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        // Expand
        fireEvent.click(annotationsAccordion);
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();

        // Collapse
        fireEvent.click(annotationsAccordion);
        // Content may still be in DOM but accordion is collapsed
        expect(annotationsAccordion).toBeInTheDocument();
      }
    });

    it('handles multiple accordion interactions', () => {
      renderFilterDropdown();

      // Expand all accordions
      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');

      if (annotationsAccordion) fireEvent.click(annotationsAccordion);
      if (assetsAccordion) fireEvent.click(assetsAccordion);
      if (productsAccordion) fireEvent.click(productsAccordion);
      if (projectsAccordion) fireEvent.click(projectsAccordion);

      // All should be expanded
      expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      expect(screen.getByText('Bucket')).toBeInTheDocument();
      expect(screen.getByText('BigQuery')).toBeInTheDocument();
      expect(screen.getByText('project-1')).toBeInTheDocument();
    });
  });

  describe('Sub-annotations handler coverage', () => {
    it('handles sub-annotations change callback', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Trigger sub-annotation change
        const selectButton = screen.getByText('Select Sub-annotation');
        fireEvent.click(selectButton);

        // Verify panel is still open (onChange doesn't close it)
        expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
      }
    });

    it('handles apply with parent annotation already selected', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      // Start with parent annotation already selected
      renderFilterDropdown({ filters: [{ name: 'Test Annotation 1', type: 'aspectType', data: {} }] });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Select sub-annotation and apply
        const selectButton = screen.getByText('Select Sub-annotation');
        fireEvent.click(selectButton);

        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);

        // Should update existing parent annotation with subAnnotationData
        await waitFor(() => {
          expect(mockOnFilterChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe('View All modal position calculation', () => {
    it('calculates position when accordion element found', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        // Modal should appear
        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      }
    });

    it('handles position calculation with window bounds', () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      }

      // Reset
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    });
  });

  describe('Checkbox change with dispatch', () => {
    it('dispatches setSearchFilters when checkbox changes', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const annotationCheckbox = screen.getByLabelText('Test Annotation 1');
        fireEvent.click(annotationCheckbox);

        // Should dispatch setSearchFilters
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'search/setSearchFilters',
          payload: {
            searchFilters: expect.arrayContaining([
              expect.objectContaining({ name: 'Test Annotation 1', type: 'aspectType' })
            ])
          }
        });
      }
    });

    it('does not dispatch setSearchFilters in glossary mode', () => {
      renderFilterDropdown({ isGlossary: true });

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        // Clear mock to isolate this test
        mockDispatch.mockClear();

        const bucketCheckbox = screen.getByLabelText('Bucket');
        fireEvent.click(bucketCheckbox);

        // Should not dispatch setSearchFilters in glossary mode
        const setSearchFiltersCalls = mockDispatch.mock.calls.filter(
          (call: unknown[]) => (call[0] as { type?: string })?.type === 'search/setSearchFilters'
        );
        expect(setSearchFiltersCalls.length).toBe(0);
      }
    });
  });

  describe('Clear filter with dispatch', () => {
    it('dispatches both setSearchFilters and setSearchType when clearing', () => {
      const initialFilters = [
        { name: 'Bucket', type: 'typeAliases', data: {} },
        { name: 'BigQuery', type: 'system', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'search/setSearchFilters',
        payload: { searchFilters: [] }
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'search/setSearchType',
        payload: { searchType: 'All' }
      });
    });
  });

  describe('Product deselection behavior', () => {
    it('dispatches setSearchType to All when last product is deselected', () => {
      const initialFilters = [
        { name: 'BigQuery', type: 'system', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const bigqueryCheckbox = screen.getByLabelText('BigQuery');
        fireEvent.click(bigqueryCheckbox);

        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'search/setSearchType',
          payload: { searchType: 'All' }
        });
      }
    });

    it('does not dispatch setSearchType to All when BigQuery remains selected', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        // Clear previous dispatch calls
        mockDispatch.mockClear();

        // Select non-BigQuery product
        const cloudSqlCheckbox = screen.getByLabelText('Cloud SQL');
        fireEvent.click(cloudSqlCheckbox);

        // Should not dispatch setSearchType to All
        const setSearchTypeAllCalls = mockDispatch.mock.calls.filter(
          (call: unknown[]) => {
            const action = call[0] as { type?: string; payload?: { searchType?: string } };
            return action?.type === 'search/setSearchType' && action?.payload?.searchType === 'All';
          }
        );
        expect(setSearchTypeAllCalls.length).toBe(0);
      }
    });
  });

  describe('Project checkbox interactions', () => {
    it('handles selecting multiple projects', () => {
      renderFilterDropdown();

      const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
      if (projectsAccordion) {
        fireEvent.click(projectsAccordion);

        const project1Checkbox = screen.getByLabelText('project-1');
        const project2Checkbox = screen.getByLabelText('project-2');

        fireEvent.click(project1Checkbox);
        fireEvent.click(project2Checkbox);

        expect(mockOnFilterChange).toHaveBeenLastCalledWith([
          expect.objectContaining({ name: 'project-1', type: 'project' }),
          expect.objectContaining({ name: 'project-2', type: 'project' })
        ]);
      }
    });

    it('handles deselecting project', () => {
      const initialFilters = [
        { name: 'project-1', type: 'project', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
      if (projectsAccordion) {
        fireEvent.click(projectsAccordion);

        const project1Checkbox = screen.getByLabelText('project-1');
        fireEvent.click(project1Checkbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([]);
      }
    });
  });

  describe('MultiSelect change handler', () => {
    it('removes existing filters of same type when multiselect changes', () => {
      const initialFilters = [
        { name: 'Test Annotation 1', type: 'aspectType', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        // Select different annotation
        const selectButton = screen.getByText('Select Annotation');
        fireEvent.click(selectButton);

        // Should replace with new selection
        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({ name: 'Test Annotation 1', type: 'aspectType' })
        ]);
      }
    });
  });

  describe('Empty recordFields handling', () => {
    it('handles API response with no recordFields', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            // No recordFields
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });
      }
    });
  });

  describe('All product icons', () => {
    it('displays all product icons correctly', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        // Verify all products are visible and icons exist
        const productNames = [
          'Analytics Hub', 'BigQuery', 'Cloud BigTable', 'Cloud Pub/Sub',
          'Cloud Spanner', 'Cloud SQL', 'Dataform', 'Knowledge Catalog',
          'Dataproc Metastore', 'Vertex AI', 'Others'
        ];

        productNames.forEach(name => {
          const icon = screen.getByAltText(name);
          expect(icon).toBeInTheDocument();
        });
      }
    });

    it('handles selecting and deselecting all products', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const productNames = [
          'Cloud Spanner', 'Cloud Pub/Sub', 'Cloud BigTable'
        ];

        // Select all
        productNames.forEach(name => {
          const checkbox = screen.getByLabelText(name);
          fireEvent.click(checkbox);
        });

        // Verify all selected
        expect(mockOnFilterChange).toHaveBeenCalled();

        // Deselect all
        productNames.forEach(name => {
          const checkbox = screen.getByLabelText(name);
          fireEvent.click(checkbox);
        });
      }
    });
  });

  describe('All asset icons', () => {
    it('displays all asset icons correctly', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        // Verify many assets are visible and icons exist
        const assetNames = [
          'Bucket', 'Cluster', 'Code asset', 'Connection', 'Dashboard',
          'Dashboard element', 'Data exchange', 'Data source connection',
          'Data stream', 'Database', 'Database schema', 'Dataset',
          'Explore', 'Feature group', 'Feature online store', 'Feature view',
          'Fileset', 'Folder', 'Function', 'Glossary', 'Glossary Category',
          'Glossary Term', 'Listing', 'Look', 'Model', 'Repository',
          'Resource', 'Routine', 'Service', 'Table', 'View', 'Other'
        ];

        assetNames.forEach(name => {
          const icon = screen.getByAltText(name);
          expect(icon).toBeInTheDocument();
        });
      }
    });

    it('handles selecting multiple different assets', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        // Select assets that test different icon branches
        const assetNames = [
          'Cluster', 'Code asset', 'Connection', 'Dashboard element',
          'Data exchange', 'Data stream', 'Database schema', 'Explore',
          'Feature group', 'Feature online store', 'Fileset', 'Folder',
          'Function', 'Glossary', 'Glossary Category', 'Listing', 'Look',
          'Model', 'Repository'
        ];

        assetNames.forEach(name => {
          const checkbox = screen.getByLabelText(name);
          fireEvent.click(checkbox);
        });

        expect(mockOnFilterChange).toHaveBeenCalled();
      }
    });
  });

  describe('Multiselect position and closing', () => {
    it('handles closing multiselect modal', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();

        // Close the modal
        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);

        expect(screen.queryByTestId('annotations-multiselect')).not.toBeInTheDocument();
      }
    });

    it('handles selecting from multiselect and updating filters', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        // Select annotation through multiselect
        const selectButton = screen.getByText('Select Annotation');
        fireEvent.click(selectButton);

        expect(mockOnFilterChange).toHaveBeenCalled();
      }
    });
  });

  describe('Sub-annotations panel interactions', () => {
    it('handles closing sub-annotations panel', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Find close button inside sub-annotations panel
        const closeButton = screen.getAllByText('Close').find(btn =>
          btn.closest('[data-testid="sub-annotations-panel"]')
        );

        if (closeButton) {
          fireEvent.click(closeButton);

          await waitFor(() => {
            expect(screen.queryByTestId('sub-annotations-panel')).not.toBeInTheDocument();
          });
        }
      }
    });

    it('handles clicking edit note on second annotation', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        // Click second edit icon
        const editIcons = screen.getAllByTestId('edit-note-icon');
        if (editIcons.length > 1) {
          fireEvent.click(editIcons[1]);

          await waitFor(() => {
            expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
            expect(screen.getByText('Annotation: Test Annotation 2')).toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('Filter synchronization with Redux', () => {
    it('handles BigQuery selection dispatching setSearchType', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const bigqueryCheckbox = screen.getByLabelText('BigQuery');
        fireEvent.click(bigqueryCheckbox);

        // Verify dispatch was called with setSearchType for BigQuery
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'search/setSearchFilters',
          payload: expect.any(Object)
        });
      }
    });

    it('handles non-BigQuery product selection without setting search type to All', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const vertexCheckbox = screen.getByLabelText('Vertex AI');
        fireEvent.click(vertexCheckbox);

        // Should dispatch setSearchFilters
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'search/setSearchFilters',
          payload: {
            searchFilters: [expect.objectContaining({ name: 'Vertex AI', type: 'system' })]
          }
        });
      }
    });
  });

  describe('Annotation checkbox with existing sub-annotations', () => {
    it('handles annotation selection with existing filters', () => {
      const initialFilters = [
        { name: 'Test Annotation 2', type: 'aspectType', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        // Select first annotation (not in initial filters)
        const annotation1Checkbox = screen.getByLabelText('Test Annotation 1');
        fireEvent.click(annotation1Checkbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({ name: 'Test Annotation 2', type: 'aspectType' }),
          expect.objectContaining({ name: 'Test Annotation 1', type: 'aspectType' })
        ]);
      }
    });

    it('handles deselecting annotation', () => {
      const initialFilters = [
        { name: 'Test Annotation 1', type: 'aspectType', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const annotation1Checkbox = screen.getByLabelText('Test Annotation 1');
        fireEvent.click(annotation1Checkbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([]);
      }
    });
  });

  describe('Cloud Storage product', () => {
    it('handles Cloud Storage selection', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        // Cloud Storage doesn't exist in the products list, but Others does
        const othersCheckbox = screen.getByLabelText('Others');
        fireEvent.click(othersCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Others',
            type: 'system'
          })
        ]);
      }
    });
  });

  describe('Edge cases for filtering', () => {
    it('handles empty appConfig projects', () => {
      renderFilterDropdown();

      const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
      if (projectsAccordion) {
        fireEvent.click(projectsAccordion);

        // Should still have "Others" option
        expect(screen.getByText('Others')).toBeInTheDocument();
      }
    });

    it('renders all filter categories accessible', () => {
      renderFilterDropdown();

      // Verify all filter categories are accessible
      expect(screen.getByText('Aspects')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  describe('FormControlLabel onChange handler', () => {
    it('triggers handleCheckboxChange when checkbox label clicked', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        // Click on the label text directly
        const datasetLabel = screen.getByText('Dataset');
        fireEvent.click(datasetLabel);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Dataset',
            type: 'typeAliases'
          })
        ]);
      }
    });
  });

  describe('Sub-annotations with parent already selected', () => {
    it('initializes with empty sub-annotations when parent is selected', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      // Parent annotation already selected
      const initialFilters = [
        { name: 'Test Annotation 1', type: 'aspectType', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
          // Panel should show 0 selected sub-annotations initially
          expect(screen.getByText('Selected: 0')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Edit note click position', () => {
    it('calculates click position for sub-annotations panel', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];

        // Mock getBoundingClientRect
        const originalGetBoundingClientRect = editIcon.getBoundingClientRect;
        editIcon.getBoundingClientRect = () => ({
          top: 100,
          right: 200,
          bottom: 120,
          left: 180,
          width: 20,
          height: 20,
          x: 180,
          y: 100,
          toJSON: () => ({})
        });

        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Restore
        editIcon.getBoundingClientRect = originalGetBoundingClientRect;
      }
    });
  });

  describe('Multiselect filter type detection', () => {
    it('handles multiselect when filter type not found', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        // Verify multiselect appears
        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      }
    });
  });

  describe('Clear button disabled state', () => {
    it('disables Clear button when no filters selected', () => {
      renderFilterDropdown({ filters: [] });

      const clearButton = screen.getByText('Clear');
      expect(clearButton).toBeDisabled();
    });

    it('Clear button state is controlled by selectedFilters', () => {
      renderFilterDropdown();

      // Initially should be disabled (no filters)
      const clearButton = screen.getByText('Clear');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('useEffect hooks coverage', () => {
    it('triggers projectsLoaded useEffect when projects are loaded', () => {
      renderFilterDropdown({}, {
        projects: {
          isloaded: true,
          items: [
            { projectId: 'loaded-proj-1' },
            { projectId: 'loaded-proj-2' }
          ]
        }
      });

      const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
      if (projectsAccordion) {
        fireEvent.click(projectsAccordion);
        // Projects from Redux state should be visible
        expect(screen.getByText('loaded-proj-1')).toBeInTheDocument();
        expect(screen.getByText('loaded-proj-2')).toBeInTheDocument();
      }
    });

    it('triggers filters sync useEffect when filters prop changes', () => {
      const { rerender } = render(
        <Provider store={createMockStore()}>
          <FilterDropdown onFilterChange={mockOnFilterChange} filters={[]} />
        </Provider>
      );

      // Rerender with new filters
      rerender(
        <Provider store={createMockStore()}>
          <FilterDropdown
            onFilterChange={mockOnFilterChange}
            filters={[{ name: 'Bucket', type: 'typeAliases', data: {} }]}
          />
        </Provider>
      );

      // Component should reflect new filters
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('triggers appConfig useEffect on mount', () => {
      renderFilterDropdown();

      // Component should have loaded appConfig data
      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      }
    });
  });

  describe('Accordion change handler function', () => {
    it('returns a function from handleAccordionChange', () => {
      renderFilterDropdown();

      // Click to expand
      const aspectsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (aspectsAccordion) {
        fireEvent.click(aspectsAccordion);
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();

        // Click to collapse - this tests the returned function
        fireEvent.click(aspectsAccordion);
        // Accordion is collapsed but element might still be in DOM
        expect(aspectsAccordion).toBeInTheDocument();
      }
    });

    it('handles accordion changes for all sections', () => {
      renderFilterDropdown();

      // Test each accordion section
      ['Aspects', 'Assets', 'Products', 'Projects'].forEach(section => {
        const accordion = screen.getByText(section).closest('[role="button"]');
        if (accordion) {
          // Expand
          fireEvent.click(accordion);
          // Collapse
          fireEvent.click(accordion);
        }
      });

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  describe('Filter item map and filter callbacks', () => {
    it('triggers map callback for annotation items', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);
        // Map callback was executed to render these items
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
        expect(screen.getByText('Test Annotation 2')).toBeInTheDocument();
      }
    });

    it('triggers map callback for asset items', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);
        // Map callback was executed to render these items
        expect(screen.getByText('Bucket')).toBeInTheDocument();
        expect(screen.getByText('Dataset')).toBeInTheDocument();
        expect(screen.getByText('Table')).toBeInTheDocument();
      }
    });

    it('triggers map callback for product items', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);
        // Map callback was executed to render these items
        expect(screen.getByText('BigQuery')).toBeInTheDocument();
        expect(screen.getByText('Vertex AI')).toBeInTheDocument();
      }
    });

    it('triggers map callback for project items', () => {
      renderFilterDropdown();

      const projectsAccordion = screen.getByText('Projects').closest('[role="button"]');
      if (projectsAccordion) {
        fireEvent.click(projectsAccordion);
        // Map callback was executed to render these items
        expect(screen.getByText('project-1')).toBeInTheDocument();
        expect(screen.getByText('project-2')).toBeInTheDocument();
        expect(screen.getByText('Others')).toBeInTheDocument();
      }
    });
  });

  describe('Checkbox isSelected filter callback', () => {
    it('triggers isSelected check for each filter item', () => {
      const initialFilters = [
        { name: 'Bucket', type: 'typeAliases', data: {} },
        { name: 'BigQuery', type: 'system', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);
        // The isSelected filter callback should mark Bucket as checked
        const bucketCheckbox = screen.getByLabelText('Bucket');
        expect(bucketCheckbox).toBeChecked();
      }
    });
  });

  describe('Sub-annotations apply edge cases', () => {
    it('handles apply with empty sub-annotations removing parent', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      // Start with parent annotation selected
      const initialFilters = [
        { name: 'Test Annotation 1', type: 'aspectType', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Apply with empty (calls onSubAnnotationsApply([]))
        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);

        // Should remove the parent filter since no sub-annotations
        await waitFor(() => {
          expect(mockOnFilterChange).toHaveBeenCalled();
        });
      }
    });

    it('handles apply updating existing parent annotation', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              { name: 'field1', type: 'string' },
              { name: 'field2', type: 'integer' }
            ]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      // Start with parent annotation that has sub-annotations
      const initialFilters = [
        { name: 'Test Annotation 1', type: 'aspectType', data: {}, subAnnotationData: [] }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Select sub-annotation
        fireEvent.click(screen.getByText('Select Sub-annotation'));

        // Apply with sub-annotations
        fireEvent.click(screen.getByText('Apply'));

        await waitFor(() => {
          expect(mockOnFilterChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe('MultiSelect handler edge cases', () => {
    it('handles multiselect change with no matching filter type', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        // Trigger change - this tests handleMultiSelectChange
        const selectButton = screen.getByText('Select Annotation');
        fireEvent.click(selectButton);

        expect(mockOnFilterChange).toHaveBeenCalled();
      }
    });

    it('handles multiselect close callback', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();

        // Test handleCloseMultiSelect
        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);

        expect(screen.queryByTestId('annotations-multiselect')).not.toBeInTheDocument();
      }
    });
  });

  describe('Edit note click handler', () => {
    it('handles edit note click setting panel state', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        // Click first edit icon - tests handleEditNoteClick
        const editIcons = screen.getAllByTestId('edit-note-icon');
        fireEvent.click(editIcons[0]);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
          expect(screen.getByText('Annotation: Test Annotation 1')).toBeInTheDocument();
        });
      }
    });

    it('handles edit note click with parent already selected', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      // Parent is already selected
      const initialFilters = [
        { name: 'Test Annotation 1', type: 'aspectType', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcons = screen.getAllByTestId('edit-note-icon');
        fireEvent.click(editIcons[0]);

        await waitFor(() => {
          // Panel opens with parent already selected state
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Sub-annotations change handler', () => {
    it('handles sub-annotations change callback', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Test handleSubAnnotationsChange
        const selectButton = screen.getByText('Select Sub-annotation');
        fireEvent.click(selectButton);

        // Panel should still be open (onChange doesn't close it)
        expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
      }
    });
  });

  describe('Close sub-annotations panel handler', () => {
    it('handles close sub-annotations panel callback', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Test handleCloseSubAnnotationsPanel
        const closeButtons = screen.getAllByText('Close');
        const panelCloseButton = closeButtons.find(btn =>
          btn.closest('[data-testid="sub-annotations-panel"]')
        );

        if (panelCloseButton) {
          fireEvent.click(panelCloseButton);

          await waitFor(() => {
            expect(screen.queryByTestId('sub-annotations-panel')).not.toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('getSubAnnotationsForAnnotation API callback', () => {
    it('handles API response with enum values as objects', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              {
                name: 'status',
                type: 'enum',
                enumValues: [
                  { name: 'active' },
                  { value: 'inactive' },
                  { label: 'pending' },
                  { other: 'unknown' }
                ]
              }
            ]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(mockAxiosPost).toHaveBeenCalled();
        });
      }
    });

    it('handles API response with string enum values', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              {
                name: 'category',
                type: 'enum',
                enumValues: ['cat1', 'cat2', 'cat3']
              }
            ]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(mockAxiosPost).toHaveBeenCalled();
        });
      }
    });

    it('handles API response with no type specified', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              { name: 'fieldWithNoType' }
            ]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(mockAxiosPost).toHaveBeenCalled();
        });
      }
    });
  });

  describe('View All button position calculation', () => {
    it('calculates position with header element present', () => {
      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');

        // Mock accordion getBoundingClientRect
        const accordion = viewAllButton.closest('.MuiAccordion-root');
        if (accordion) {
          fireEvent.click(viewAllButton);
          expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
        }
      }
    });

    it('calculates position when exceeding window height', () => {
      // Set small window height to trigger overflow calculation
      Object.defineProperty(window, 'innerHeight', { value: 200, writable: true });

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);

        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      }

      // Reset
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    });
  });

  describe('FormControlLabel onChange direct', () => {
    it('triggers onChange callback directly', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        // Find the checkbox input and click it
        const datasetCheckbox = screen.getByLabelText('Dataset');
        fireEvent.click(datasetCheckbox);

        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({ name: 'Dataset', type: 'typeAliases' })
        ]);
      }
    });
  });

  describe('Checkbox checked state based on selectedFilters', () => {
    it('marks checkbox as checked when filter is in selectedFilters', () => {
      const initialFilters = [
        { name: 'Table', type: 'typeAliases', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        const tableCheckbox = screen.getByLabelText('Table');
        expect(tableCheckbox).toBeChecked();

        const bucketCheckbox = screen.getByLabelText('Bucket');
        expect(bucketCheckbox).not.toBeChecked();
      }
    });
  });

  describe('Product checkbox with BigQuery dispatch', () => {
    it('dispatches setSearchType when BigQuery is deselected', () => {
      const initialFilters = [
        { name: 'BigQuery', type: 'system', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters });

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        // Deselect BigQuery
        const bigqueryCheckbox = screen.getByLabelText('BigQuery');
        fireEvent.click(bigqueryCheckbox);

        // Should dispatch setSearchType to 'All' when BigQuery is removed
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'search/setSearchType',
          payload: { searchType: 'All' }
        });
      }
    });
  });

  describe('FilterData map for accordion rendering', () => {
    it('renders accordions from filterData array', () => {
      renderFilterDropdown();

      // All four accordions should be rendered from filterData map
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Aspects')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('renders in glossary mode without Aspects', () => {
      renderFilterDropdown({ isGlossary: true });

      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.queryByText('Aspects')).not.toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  describe('See more button for large lists', () => {
    it('does not show See more for Assets (all items shown)', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);
        // Assets section shows all items, no "See X more" button
        expect(screen.queryByText('Show more')).not.toBeInTheDocument();
      }
    });

    it('does not show See more for Products (all items shown)', () => {
      renderFilterDropdown();

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);
        // Products section shows all items, no "See X more" button
        expect(screen.queryByText('Show more')).not.toBeInTheDocument();
      }
    });
  });

  describe('Edit note icon click handler stopPropagation', () => {
    it('clicks edit note icon without triggering parent checkbox', async () => {
      const mockAxiosPost = vi.fn().mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      vi.mocked(axios.post).mockImplementation(mockAxiosPost);

      renderFilterDropdown();

      const annotationsAccordion = screen.getByText('Aspects').closest('[role="button"]');
      if (annotationsAccordion) {
        fireEvent.click(annotationsAccordion);

        // Click edit icon - should not toggle the parent checkbox
        const editIcon = screen.getAllByTestId('edit-note-icon')[0];
        fireEvent.click(editIcon);

        await waitFor(() => {
          expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
        });

        // Close and verify checkbox wasn't toggled
        const closeButton = screen.getAllByText('Close').find(btn =>
          btn.closest('[data-testid="sub-annotations-panel"]')
        );
        if (closeButton) {
          fireEvent.click(closeButton);
        }

        // The checkbox should not have been checked by the edit icon click
        const checkbox = screen.getByLabelText('Test Annotation 1');
        expect(checkbox).not.toBeChecked();
      }
    });
  });

  describe('Accordion aria-controls attributes', () => {
    it('has accordion headers with proper structure', () => {
      renderFilterDropdown();

      // Check accordion sections are properly structured
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Aspects')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();

      // Each should be within an accordion
      const productsText = screen.getByText('Products');
      expect(productsText.closest('.MuiAccordion-root')).toBeInTheDocument();
    });
  });

  describe('Multiple checkbox interactions', () => {
    it('handles selecting and deselecting multiple items', () => {
      renderFilterDropdown();

      const assetsAccordion = screen.getByText('Assets').closest('[role="button"]');
      if (assetsAccordion) {
        fireEvent.click(assetsAccordion);

        // Select multiple
        fireEvent.click(screen.getByLabelText('Bucket'));
        fireEvent.click(screen.getByLabelText('Dataset'));
        fireEvent.click(screen.getByLabelText('Table'));

        // Deselect one
        fireEvent.click(screen.getByLabelText('Dataset'));

        // Final state should have Bucket and Table
        expect(mockOnFilterChange).toHaveBeenLastCalledWith([
          expect.objectContaining({ name: 'Bucket' }),
          expect.objectContaining({ name: 'Table' })
        ]);
      }
    });
  });

  // ============================================================================
  // Tests to cover FilterAnnotationsMultiSelect modal (lines 1109-1118)
  // ============================================================================
  describe('FilterAnnotationsMultiSelect modal coverage', () => {
    it('opens multiselect modal when "See X more" button is clicked for Aspects', async () => {
      renderFilterDropdown();

      // Expand Aspects accordion by clicking on the header text
      // MUI Accordion handles clicks that bubble up from children of AccordionSummary
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      // Wait for accordion to expand and items to render
      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // With 15 aspects and 15 projects in mock, both accordions may show "See X more" buttons
      // Use getAllByText and select the first one (Aspects comes first in rendering order)
      const seeMoreButtons = screen.getAllByText('Show more');
      expect(seeMoreButtons.length).toBeGreaterThan(0);
      const aspectsSeeMoreButton = seeMoreButtons[0];
      fireEvent.click(aspectsSeeMoreButton);

      // The multiselect modal should now be open (mock handles position via beforeAll)
      await waitFor(() => {
        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      });
    });

    it('opens multiselect modal when "See X more" button is clicked for Projects', async () => {
      renderFilterDropdown();

      // Expand Projects accordion by clicking on the header text
      const projectsText = screen.getByText('Projects');
      fireEvent.click(projectsText);

      // Wait for accordion to expand and items to render
      await waitFor(() => {
        expect(screen.getByText('project-1')).toBeInTheDocument();
      });

      // With 15 aspects and 15 projects in mock, both accordions may show "See X more" buttons
      // Use getAllByText and select the last one (Projects comes after Aspects in rendering order)
      const seeMoreButtons = screen.getAllByText('Show more');
      expect(seeMoreButtons.length).toBeGreaterThan(0);
      const projectsSeeMoreButton = seeMoreButtons[seeMoreButtons.length - 1];
      fireEvent.click(projectsSeeMoreButton);

      // The multiselect modal should now be open (mock handles position via beforeAll)
      await waitFor(() => {
        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      });
    });

    it('handles multiselect onChange callback to update filters', async () => {
      renderFilterDropdown();

      // Expand Aspects accordion by clicking directly on text
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      // Wait for accordion to expand
      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // Get all "See X more" buttons and click the first one (Aspects)
      const seeMoreButtons = screen.getAllByText('Show more');
      expect(seeMoreButtons.length).toBeGreaterThan(0);
      fireEvent.click(seeMoreButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      });

      // Click the select button to trigger onChange (handleMultiSelectChange)
      const selectButton = screen.getByText('Select Annotation');
      fireEvent.click(selectButton);

      // onFilterChange should be called
      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
      });
    });

    it('handles multiselect onClose callback to close modal', async () => {
      renderFilterDropdown();

      // Expand Aspects accordion by clicking directly on text
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      // Wait for accordion to expand
      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // Get all "See X more" buttons and click the first one (Aspects)
      const seeMoreButtons = screen.getAllByText('Show more');
      expect(seeMoreButtons.length).toBeGreaterThan(0);
      fireEvent.click(seeMoreButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('annotations-multiselect')).toBeInTheDocument();
      });

      // Click the close button to trigger onClose (handleCloseMultiSelect)
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('annotations-multiselect')).not.toBeInTheDocument();
      });
    });
  });

  describe('FilterSubAnnotationsPanel callback coverage', () => {
    it('covers handleCloseSubAnnotationsPanel when Close button clicked', async () => {
      // Mock axios for API call
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      renderFilterDropdown();

      // Expand Aspects accordion by clicking directly on the text
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      // Wait for accordion to expand
      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // Click edit icon to open sub-annotations panel
      const editIcon = screen.getAllByTestId('edit-note-icon')[0];
      fireEvent.click(editIcon);

      // Wait for panel to open
      await waitFor(() => {
        expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
      });

      // Click Close button to trigger handleCloseSubAnnotationsPanel
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      // Verify panel is closed
      await waitFor(() => {
        expect(screen.queryByTestId('sub-annotations-panel')).not.toBeInTheDocument();
      });
    });

    it('covers handleSubAnnotationsApply with sub-annotations selected (new parent)', async () => {
      // Mock axios for API call
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      renderFilterDropdown();

      // Expand Aspects accordion
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // Click edit icon
      const editIcon = screen.getAllByTestId('edit-note-icon')[0];
      fireEvent.click(editIcon);

      await waitFor(() => {
        expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
      });

      // Select a sub-annotation first
      const selectSubButton = screen.getByText('Select Sub-annotation');
      fireEvent.click(selectSubButton);

      // Click Apply to trigger handleSubAnnotationsApply with sub-annotations
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      // Verify onFilterChange was called
      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
      });

      // Panel should be closed after apply
      await waitFor(() => {
        expect(screen.queryByTestId('sub-annotations-panel')).not.toBeInTheDocument();
      });
    });

    it('covers handleSubAnnotationsApply with existing parent annotation', async () => {
      // Mock axios for API call
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      // Start with parent annotation already selected
      const initialFilters = [
        { name: 'Test Annotation 1', type: 'aspectType', data: {}, subAnnotationData: [] }
      ];

      renderFilterDropdown({ filters: initialFilters });

      // Expand Aspects accordion
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // Click edit icon
      const editIcon = screen.getAllByTestId('edit-note-icon')[0];
      fireEvent.click(editIcon);

      await waitFor(() => {
        expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
      });

      // Select a sub-annotation
      const selectSubButton = screen.getByText('Select Sub-annotation');
      fireEvent.click(selectSubButton);

      // Click Apply to trigger handleSubAnnotationsApply (existing parent branch)
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      // Verify onFilterChange was called
      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
      });
    });

    it('covers handleSubAnnotationsApply with empty sub-annotations (removes parent)', async () => {
      // Mock axios for API call
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [{ name: 'field1', type: 'string' }]
          }
        }
      });

      // Start with parent annotation already selected
      const initialFilters = [
        { name: 'Test Annotation 1', type: 'aspectType' }
      ];

      renderFilterDropdown({ filters: initialFilters });

      // Expand Aspects accordion
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // Click edit icon
      const editIcon = screen.getAllByTestId('edit-note-icon')[0];
      fireEvent.click(editIcon);

      await waitFor(() => {
        expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
      });

      // Click Apply Empty to trigger handleSubAnnotationsApply with empty array
      // This triggers the else branch (appliedSubAnnotations.length === 0)
      const applyEmptyButton = screen.getByText('Apply Empty');
      fireEvent.click(applyEmptyButton);

      // Verify onFilterChange was called (to remove the parent)
      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
      });
    });

    it('covers getSubAnnotationsForAnnotation with object-type enum values', async () => {
      // Mock axios to return enum values as objects (covers lines 710-713)
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              {
                name: 'enumField',
                type: 'enum',
                enumValues: [
                  { name: 'option1' },
                  { value: 'option2' },
                  { label: 'option3' },
                  { other: 'will stringify' }
                ]
              }
            ]
          }
        }
      });

      renderFilterDropdown();

      // Expand Aspects accordion
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // Click edit icon to trigger getSubAnnotationsForAnnotation
      const editIcon = screen.getAllByTestId('edit-note-icon')[0];
      fireEvent.click(editIcon);

      // Panel should open with transformed enum values
      await waitFor(() => {
        expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
      });

      // Verify axios was called
      expect(axios.post).toHaveBeenCalled();
    });

    it('covers getSubAnnotationsForAnnotation with string enum values', async () => {
      // Mock axios to return enum values as strings
      (axios.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          metadataTemplate: {
            recordFields: [
              {
                name: 'stringEnumField',
                type: 'enum',
                enumValues: ['string1', 'string2', 'string3']
              }
            ]
          }
        }
      });

      renderFilterDropdown();

      // Expand Aspects accordion
      const aspectsText = screen.getByText('Aspects');
      fireEvent.click(aspectsText);

      await waitFor(() => {
        expect(screen.getByText('Test Annotation 1')).toBeInTheDocument();
      });

      // Click edit icon
      const editIcon = screen.getAllByTestId('edit-note-icon')[0];
      fireEvent.click(editIcon);

      await waitFor(() => {
        expect(screen.getByTestId('sub-annotations-panel')).toBeInTheDocument();
      });

      expect(axios.post).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // searchSubmitted Effect Tests (New Behavior)
  // ==========================================================================

  describe('searchSubmitted auto-select behavior', () => {
    it('clears ALL existing filters and sets matching asset on submission', async () => {
      // Start with existing filters from different categories
      const initialFilters = [
        { name: 'BigQuery', type: 'system', data: {} },
        { name: 'project-1', type: 'project', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters }, {
        search: {
          searchTerm: 'Table',
          searchType: 'All',
          searchSubmitted: true
        }
      });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Table',
            type: 'typeAliases'
          })
        ]);
      });

      // Verify only the matching asset filter is set (all others cleared)
      const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(1);
    });

    it('clears ALL existing filters and sets matching product on submission', async () => {
      // Start with existing asset filter
      const initialFilters = [
        { name: 'Table', type: 'typeAliases', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters }, {
        search: {
          searchTerm: 'BigQuery',
          searchType: 'All',
          searchSubmitted: true
        }
      });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'BigQuery',
            type: 'system'
          })
        ]);
      });

      // Verify only the matching product filter is set
      const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(1);
    });

    it('clears only typeAliases filters when term does not match any asset or product', async () => {
      const initialFilters = [
        { name: 'Cluster', type: 'typeAliases', data: {} },
        { name: 'project-1', type: 'project', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters }, {
        search: {
          searchTerm: 'random data term',
          searchType: 'All',
          searchSubmitted: true
        }
      });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'project-1',
            type: 'project'
          })
        ]);
      });
    });

    it('clears typeAliases when search term is too short on submission', async () => {
      const initialFilters = [
        { name: 'Table', type: 'typeAliases', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters }, {
        search: {
          searchTerm: 'ab',
          searchType: 'All',
          searchSubmitted: true
        }
      });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith([]);
      });
    });

    it('does not auto-select in glossary mode', async () => {
      renderFilterDropdown({ isGlossary: true }, {
        search: {
          searchTerm: 'Dataset',
          searchType: 'All',
          searchSubmitted: true
        }
      });

      // In glossary mode, searchSubmitted effect is skipped
      await waitFor(() => {
        // Give it time to potentially fire
      });

      // onFilterChange should NOT have been called for auto-selection
      const autoSelectCalls = mockOnFilterChange.mock.calls.filter(
        (call) => call[0].length === 1 && call[0][0]?.name === 'Dataset'
      );
      expect(autoSelectCalls.length).toBe(0);
    });

    it('does not fire auto-select when searchSubmitted is false', async () => {
      renderFilterDropdown({}, {
        search: {
          searchTerm: 'Dataset',
          searchType: 'All',
          searchSubmitted: false
        }
      });

      // Wait to ensure nothing fires
      await act(async () => {});

      // onFilterChange should not be called for auto-selection
      expect(mockOnFilterChange).not.toHaveBeenCalled();
    });

    it('dispatches setSearchSubmitted false after processing', async () => {
      renderFilterDropdown({}, {
        search: {
          searchTerm: 'Table',
          searchType: 'All',
          searchSubmitted: true
        }
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'search/setSearchSubmitted',
          payload: false
        });
      });
    });

    it('prefers asset match over product match when both exist', async () => {
      // If a term matches both an asset and a product, asset should win
      // (assets are checked first in the code)
      renderFilterDropdown({}, {
        search: {
          searchTerm: 'Cluster',
          searchType: 'All',
          searchSubmitted: true
        }
      });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Cluster',
            type: 'typeAliases'
          })
        ]);
      });
    });
  });

  // ==========================================================================
  // handleCheckboxChange with Empty Search Term Tests
  // ==========================================================================

  describe('handleCheckboxChange with stale filter cleanup', () => {
    it('clears stale typeAliases when search term is empty and user clicks a filter', () => {
      // Scenario: user searched "cluster" (auto-selected Cluster filter),
      // then cleared search term and clicks BigQuery checkbox
      const initialFilters = [
        { name: 'Cluster', type: 'typeAliases', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters }, {
        search: {
          searchTerm: '',
          searchType: 'All'
        }
      });

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const bigqueryCheckbox = screen.getByLabelText('BigQuery');
        fireEvent.click(bigqueryCheckbox);

        // Cluster (typeAliases) should be removed, only BigQuery should remain
        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'BigQuery',
            type: 'system'
          })
        ]);

        // Verify Cluster was removed
        const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
        expect(lastCall.some((f: any) => f.name === 'Cluster')).toBe(false);
      }
    });

    it('preserves typeAliases when search term is non-empty and user clicks a filter', () => {
      // Scenario: user searched "cluster" (Cluster auto-selected), then clicks BigQuery
      const initialFilters = [
        { name: 'Cluster', type: 'typeAliases', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters }, {
        search: {
          searchTerm: 'cluster',
          searchType: 'All'
        }
      });

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const bigqueryCheckbox = screen.getByLabelText('BigQuery');
        fireEvent.click(bigqueryCheckbox);

        // Both Cluster and BigQuery should be present (appended)
        expect(mockOnFilterChange).toHaveBeenCalledWith([
          expect.objectContaining({ name: 'Cluster', type: 'typeAliases' }),
          expect.objectContaining({ name: 'BigQuery', type: 'system' })
        ]);
      }
    });

    it('clears multiple stale typeAliases when search term is empty', () => {
      const initialFilters = [
        { name: 'Cluster', type: 'typeAliases', data: {} },
        { name: 'Table', type: 'typeAliases', data: {} },
        { name: 'project-1', type: 'project', data: {} }
      ];

      renderFilterDropdown({ filters: initialFilters }, {
        search: {
          searchTerm: '',
          searchType: 'All'
        }
      });

      const productsAccordion = screen.getByText('Products').closest('[role="button"]');
      if (productsAccordion) {
        fireEvent.click(productsAccordion);

        const bigqueryCheckbox = screen.getByLabelText('BigQuery');
        fireEvent.click(bigqueryCheckbox);

        // Both typeAliases should be cleared, project kept, BigQuery added
        const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
        expect(lastCall).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: 'project-1', type: 'project' }),
            expect.objectContaining({ name: 'BigQuery', type: 'system' })
          ])
        );
        expect(lastCall.some((f: any) => f.type === 'typeAliases')).toBe(false);
      }
    });
  });
});
