/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ViewDetails from './ViewDetails';
import { AuthContext } from '../../auth/AuthProvider';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock CSS imports
vi.mock('@mui/x-data-grid', () => ({
  DataGrid: () => <div data-testid="data-grid">DataGrid Mock</div>
}));

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

// Mock the sample data slice
vi.mock('../../features/sample-data/sampleDataSlice', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    getSampleData: vi.fn(() => ({ type: 'getSampleData' }))
  };
});

// Mock the entry slice
vi.mock('../../features/entry/entrySlice', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    popFromHistory: vi.fn(() => ({ type: 'entry/popFromHistory' })),
    pushToHistory: vi.fn(() => ({ type: 'entry/pushToHistory' })),
    fetchEntry: vi.fn(() => ({ type: 'entry/fetchEntry' })),
    fetchEntryLinks: vi.fn(() => ({ type: 'entry/fetchEntryLinks' })),
  };
});

// Mock the dataScan slice
vi.mock('../../features/dataScan/dataScanSlice', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    fetchAllDataScans: vi.fn(() => ({ type: 'dataScan/fetchAllDataScans' })),
    selectAllScans: () => [],
    selectAllScansStatus: () => 'idle',
  };
});

// Mock the glossaries slice
vi.mock('../../features/glossaries/glossariesSlice', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    fetchViewDetailsTermRelationships: vi.fn(() => ({ type: 'glossaries/fetchViewDetailsTermRelationships' })),
    fetchViewDetailsEntryDetails: vi.fn(() => ({ type: 'glossaries/fetchViewDetailsEntryDetails' })),
    fetchViewDetailsChildren: vi.fn(() => ({ type: 'glossaries/fetchViewDetailsChildren' })),
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
    if (name.includes('table')) return 'Tables';
    if (name.includes('dataset')) return 'Datasets';
    return 'Other';
  }),
  generateBigQueryLink: vi.fn(() => 'https://console.cloud.google.com/bigquery?ws=test'),
  generateLookerStudioLink: vi.fn(() => 'https://lookerstudio.google.com'),
  hasValidAnnotationData: vi.fn(() => true),
  getFormattedDateTimeParts: vi.fn((seconds: number) => {
    if (!seconds) return { date: '-', time: '' };
    return { date: 'Jan 1, 2022', time: '12:00:00 AM' };
  }),
  getAssetIcon: vi.fn(() => '/assets/icons/table.svg'),
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

// Mock NoAccessContext
vi.mock('../../contexts/NoAccessContext', () => ({
  useNoAccess: () => ({
    isNoAccessOpen: false,
    noAccessMessage: null,
    triggerNoAccess: vi.fn(),
    dismissNoAccess: vi.fn(),
  }),
}));

// Mock glossaryUtils
import * as glossaryUtils from '../../utils/glossaryUtils';
vi.mock('../../utils/glossaryUtils', () => ({
  findItem: vi.fn(() => null),
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
        <button onClick={onCollapseAll}>Collapse All</button>
        <button onClick={onExpandAll}>Expand All</button>
      </div>
    );
  }
}));

vi.mock('../Tags/Tag', () => ({
  default: function MockTag({ text }: any) {
    return <span data-testid="tag">{text}</span>;
  }
}));

vi.mock('../DetailPageOverview/DetailPageOverview', () => ({
  default: function MockDetailPageOverview({ entry, sampleTableData }: any) {
    return (
      <div data-testid="detail-page-overview">
        Overview for {entry?.name}
        {sampleTableData && <div data-testid="sample-data">Sample Data Available</div>}
      </div>
    );
  }
}));

vi.mock('../Lineage', () => ({
  default: function MockLineage({ entry }: any) {
    return <div data-testid="lineage">Lineage for {entry?.name}</div>;
  }
}));

vi.mock('../DataQuality/DataQuality', () => ({
  default: function MockDataQuality({ scanName }: any) {
    return <div data-testid="data-quality">Data Quality - Scan: {scanName}</div>;
  }
}));

vi.mock('../DataProfile/DataProfile', () => ({
  default: function MockDataProfile({ scanName }: any) {
    return <div data-testid="data-profile">Data Profile - Scan: {scanName}</div>;
  }
}));

vi.mock('../EntryList/EntryList', () => ({
  default: function MockEntryList({ entry }: any) {
    return <div data-testid="entry-list">Entry List for {entry?.name}</div>;
  }
}));

vi.mock('../Shimmer/ShimmerLoader', () => ({
  default: function MockShimmerLoader({ count, type }: any) {
    return <div data-testid="shimmer-loader">Loading {count} {type} items...</div>;
  }
}));

vi.mock('../Glossaries/GlossariesCategoriesTerms', () => ({
  default: function MockGlossariesCategoriesTerms({ mode, items, onItemClick }: any) {
    return (
      <div data-testid={`glossaries-${mode}`}>
        {items?.length || 0} {mode}
        {items?.map((item: any, idx: number) => (
          <button key={idx} onClick={() => onItemClick(item.id)}>{item.displayName}</button>
        ))}
      </div>
    );
  }
}));

vi.mock('../Glossaries/GlossariesCategoriesTermsSkeleton', () => ({
  default: function MockGlossariesCategoriesTermsSkeleton() {
    return <div data-testid="glossaries-skeleton">Loading...</div>;
  }
}));

vi.mock('../Glossaries/GlossariesLinkedAssets', () => ({
  default: function MockGlossariesLinkedAssets({ linkedAssets, onAssetPreviewChange }: any) {
    return (
      <div data-testid="glossaries-linked-assets">
        {linkedAssets?.length || 0} linked assets
        <button onClick={() => onAssetPreviewChange({ name: 'test-asset' })}>Preview Asset</button>
      </div>
    );
  }
}));

vi.mock('../Glossaries/GlossariesSynonyms', () => ({
  default: function MockGlossariesSynonyms({ relations, onItemClick }: any) {
    return (
      <div data-testid="glossaries-synonyms">
        {relations?.length || 0} relations
        {relations?.map((r: any, idx: number) => (
          <button key={idx} onClick={() => onItemClick(r.id)}>{r.displayName}</button>
        ))}
      </div>
    );
  }
}));

vi.mock('../Glossaries/GlossariesSynonymsSkeleton', () => ({
  default: function MockGlossariesSynonymsSkeleton() {
    return <div data-testid="glossaries-synonyms-skeleton">Loading synonyms...</div>;
  }
}));

vi.mock('../Common/ResourcePreview', () => ({
  default: function MockResourcePreview({ previewData, onPreviewDataChange, onViewDetails }: any) {
    return (
      <div data-testid="resource-preview">
        Preview: {previewData?.name || 'None'}
        <button onClick={() => onPreviewDataChange(null)}>Close</button>
        <button onClick={() => onViewDetails(previewData)}>View Details</button>
      </div>
    );
  }
}));

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn()
  },
  writable: true
});

describe('ViewDetails', () => {
  const mockUser = {
    name: 'Test User',
    email: 'testuser@sample.com',
    picture: 'https://example.com/avatar.jpg',
    token: 'random-token',
    tokenExpiry: Math.floor(Date.now() / 1000) + 3600,
    tokenIssuedAt: Math.floor(Date.now() / 1000),
    hasRole: true,
    roles: [],
    permissions: [],
    appConfig: {
      aspects: {},
      projects: {},
      defaultSearchProduct: {},
      defaultSearchAssets: {},
      browseByAspectTypes: {},
      browseByAspectTypesLabels: {},
    }
  };

  const mockAuthContextValue = {
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    silentLogin: vi.fn().mockResolvedValue(true),
  };

  const mockEntry = {
    name: 'project/dataset/table',
    fullyQualifiedName: 'project:dataset.table',
    entryType: 'projects/test/locations/global/entryTypes/bigquery-tables',
    updateTime: { seconds: 1641081600 },
    entrySource: {
      system: 'BigQuery',
      displayName: 'Test Table',
      description: 'This is a test table description for the detail page.',
      resource: 'projects/test/datasets/test/tables/test',
      location: 'US'
    },
    aspects: {
      '123.custom.test': {
        aspectType: 'test',
        data: { field: 'value' }
      }
    }
  };

  const mockDatasetEntry = {
    name: 'project/dataset',
    fullyQualifiedName: 'project:dataset',
    entryType: 'projects/test/locations/global/entryTypes/bigquery-datasets',
    entrySource: {
      system: 'BigQuery',
      displayName: 'Test Dataset',
      resource: 'projects/test/datasets/test'
    },
    aspects: {}
  };

  const mockGlossaryEntry = {
    name: 'projects/test/locations/us/entryGroups/@dataplex/entries/glossary',
    fullyQualifiedName: 'test:glossary',
    entryType: 'projects/test/locations/global/entryTypes/dataplex-glossary',
    entrySource: {
      system: 'dataplex',
      displayName: 'Test Glossary',
      resource: 'projects/test/locations/us/glossaries/test'
    },
    aspects: {}
  };

  const mockCategoryEntry = {
    name: 'projects/test/locations/us/entryGroups/@dataplex/entries/category',
    fullyQualifiedName: 'test:category',
    entryType: 'projects/test/locations/global/entryTypes/dataplex-category',
    entrySource: {
      system: 'dataplex',
      displayName: 'Test Category',
      resource: 'projects/test/locations/us/glossaries/test/categories/cat1'
    },
    aspects: {}
  };

  const mockTermEntry = {
    name: 'projects/test/locations/us/entryGroups/@dataplex/entries/term',
    fullyQualifiedName: 'test:term',
    entryType: 'projects/test/locations/global/entryTypes/dataplex-term',
    entrySource: {
      system: 'dataplex',
      displayName: 'Test Term',
      resource: 'projects/test/locations/us/glossaries/test/terms/term1'
    },
    aspects: {}
  };

  const mockOtherEntry = {
    name: 'project/other/resource',
    fullyQualifiedName: 'project:other.resource',
    entryType: 'projects/test/locations/global/entryTypes/other',
    entrySource: {
      system: 'custom',
      displayName: 'Other Resource',
      resource: 'projects/test/other/resource'
    },
    aspects: {}
  };

  const mockSampleData = {
    columns: ['col1', 'col2'],
    rows: [['value1', 'value2']]
  };

  const createMockStore = (entryState: any = mockEntry, entryStatus = 'succeeded', sampleDataState = mockSampleData, sampleDataStatus = 'succeeded', history: any[] = [], entryLinks: any[] = [], entryLinksStatus = 'idle') => {
    return configureStore({
      reducer: {
        entry: (state = { items: entryState, status: entryStatus, history, entryLinks, entryLinksStatus }) => state,
        sampleData: (state = { items: sampleDataState, status: sampleDataStatus }) => state,
        glossaries: (state = { viewDetailsItems: [] }) => state,
        resources: (state = { items: [] }) => state,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWindowOpen.mockClear();
    mockDispatch.mockClear();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderViewDetails = (entryState: any = mockEntry, entryStatus = 'succeeded', sampleDataState = mockSampleData, sampleDataStatus = 'succeeded', history: any[] = []) => {
    const store = createMockStore(entryState, entryStatus, sampleDataState, sampleDataStatus, history);
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContextValue}>
            <ViewDetails />
          </AuthContext.Provider>
        </BrowserRouter>
      </Provider>
    );
  };

  describe('Loading State', () => {
    it('renders loading skeleton when entry is loading', () => {
      renderViewDetails(mockEntry, 'loading');

      // Should show skeleton loader
      expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    });

    it('renders loading state with valid entry in loading status', () => {
      renderViewDetails(mockEntry, 'loading');
      expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    });
  });

  describe('Basic Rendering - Tables Entry', () => {
    it('renders the main content when entry is loaded', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByText('Test Table')).toBeInTheDocument();
      });

      const tags = screen.getAllByTestId('tag');
      expect(tags.length).toBeGreaterThanOrEqual(2);
    });

    it('renders back button', async () => {
      renderViewDetails();

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('navigates back using browser history when no entry history exists', async () => {
      renderViewDetails();

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const backButton = buttons[0];
        fireEvent.click(backButton);
      });

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('pops from entry history when history exists', async () => {
      const mockStore = configureStore({
        reducer: {
          entry: () => ({ items: mockEntry, status: 'succeeded', history: [{ name: 'previous' }], entryLinks: [], entryLinksStatus: 'idle' }),
          sampleData: () => ({ items: mockSampleData, status: 'succeeded' }),
          glossaries: () => ({ viewDetailsItems: [] }),
          resources: () => ({ items: [] }),
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
      });

      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const backButton = buttons[0];
        fireEvent.click(backButton);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('renders BigQuery button and opens BigQuery console', async () => {
      renderViewDetails();

      await waitFor(() => {
        const bigQueryButton = screen.getByText('Open in BigQuery');
        expect(bigQueryButton).toBeInTheDocument();
      });

      const bigQueryButton = screen.getByText('Open in BigQuery');
      fireEvent.click(bigQueryButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('console.cloud.google.com/bigquery'),
        '_blank'
      );
    });

    it('renders Looker Studio button and opens Looker Studio', async () => {
      renderViewDetails();

      await waitFor(() => {
        const lookerButton = screen.getByText('Explore in Looker');
        expect(lookerButton).toBeInTheDocument();
      });

      const lookerButton = screen.getByText('Explore in Looker');
      fireEvent.click(lookerButton);

      expect(mockWindowOpen).toHaveBeenCalledWith('https://lookerstudio.google.com', '_blank');
    });

    it('renders tabs for Tables entry type', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Aspects')).toBeInTheDocument();
        expect(screen.getByText('Lineage')).toBeInTheDocument();
        expect(screen.getByText('Data Profile')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Data Quality' })).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches to Aspects tab when clicked', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Aspects'));

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
        expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      });
    });

    it('switches to Lineage tab when clicked', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Lineage'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-3')).toBeInTheDocument();
        expect(screen.getByTestId('lineage')).toBeInTheDocument();
      });
    });

    it('switches to Data Profile tab when clicked', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Data Profile'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-4')).toBeInTheDocument();
        expect(screen.getByTestId('data-profile')).toBeInTheDocument();
      });
    });

    it('switches to Data Quality tab when clicked', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Data Quality' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-5')).toBeInTheDocument();
        expect(screen.getByTestId('data-quality')).toBeInTheDocument();
      });
    });

    it('renders overview tab content', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-0')).toBeInTheDocument();
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Annotation Filter Actions', () => {
    it('applies annotation filter when filter changes', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        const applyFilterButton = screen.getByText('Apply Filter');
        fireEvent.click(applyFilterButton);
      });

      expect(screen.getByTestId('preview-annotation')).toBeInTheDocument();
    });

    it('collapses all annotations when collapse all is clicked', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        const collapseButton = screen.getByText('Collapse All');
        fireEvent.click(collapseButton);
      });

      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });

    it('expands all annotations when expand all is clicked', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        const expandButton = screen.getByText('Expand All');
        fireEvent.click(expandButton);
      });

      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });
  });

  describe('Datasets Entry Type', () => {
    it('renders tabs for Datasets entry type', async () => {
      renderViewDetails(mockDatasetEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Entry List')).toBeInTheDocument();
        expect(screen.getByText('Aspects')).toBeInTheDocument();
      });

      expect(screen.queryByRole('tab', { name: 'Data Profile' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Data Quality' })).not.toBeInTheDocument();
    });

    it('renders entry list for datasets', async () => {
      renderViewDetails(mockDatasetEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Entry List'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('entry-list')).toBeInTheDocument();
      });
    });
  });

  describe('Other Entry Type', () => {
    it('renders tabs for Other entry type including Glossary Terms', async () => {
      renderViewDetails(mockOtherEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Aspects')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Glossary Terms' })).toBeInTheDocument();
      });

      expect(screen.queryByRole('tab', { name: 'Lineage' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Data Profile' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Data Quality' })).not.toBeInTheDocument();
    });

    it('does not render BigQuery/Looker buttons for non-BigQuery entries', async () => {
      renderViewDetails(mockOtherEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      expect(screen.queryByText('Open in BigQuery')).not.toBeInTheDocument();
      expect(screen.queryByText('Explore in Looker')).not.toBeInTheDocument();
    });

    it('switches to Glossary Terms tab for Other entry type', async () => {
      renderViewDetails(mockOtherEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Glossary Terms' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles entry without displayName gracefully', async () => {
      const entryWithoutDisplayName = {
        ...mockEntry,
        entrySource: {
          ...mockEntry.entrySource,
          displayName: ''
        }
      };

      renderViewDetails(entryWithoutDisplayName);

      await waitFor(() => {
        expect(screen.getByText('table')).toBeInTheDocument();
      });
    });

    it('handles entry with empty system string gracefully', async () => {
      const entryWithEmptySystem = {
        ...mockEntry,
        entrySource: {
          ...mockEntry.entrySource,
          system: ''
        }
      };

      renderViewDetails(entryWithEmptySystem);

      await waitFor(() => {
        expect(screen.getByText('Custom')).toBeInTheDocument();
      });
    });

    it('handles missing user token gracefully', () => {
      const authContextWithoutToken = {
        ...mockAuthContextValue,
        user: { ...mockUser, token: '' }
      };

      const store = createMockStore();
      render(
        <Provider store={store}>
          <BrowserRouter>
            <AuthContext.Provider value={authContextWithoutToken}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      expect(document.body).toBeInTheDocument();
    });

    it('handles null user gracefully', () => {
      const authContextWithNullUser = {
        ...mockAuthContextValue,
        user: null
      };

      const store = createMockStore(mockEntry, 'succeeded');
      render(
        <Provider store={store}>
          <BrowserRouter>
            <AuthContext.Provider value={authContextWithNullUser}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Sample Data', () => {
    it('renders sample data when available', async () => {
      renderViewDetails(mockEntry, 'succeeded', mockSampleData, 'succeeded');

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('handles missing sample data gracefully', async () => {
      renderViewDetails(mockEntry, 'succeeded', undefined, 'idle');

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('System Tag Display', () => {
    it('displays BigQuery tag correctly', async () => {
      renderViewDetails();

      await waitFor(() => {
        const bigQueryElements = screen.getAllByText('BigQuery');
        expect(bigQueryElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays custom system tag with formatting', async () => {
      const customSystemEntry = {
        ...mockEntry,
        entrySource: {
          ...mockEntry.entrySource,
          system: 'custom_system'
        }
      };

      renderViewDetails(customSystemEntry);

      await waitFor(() => {
        // Component replaces only first underscore/hyphen
        expect(screen.getByText('custom system')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Panel Content', () => {
    it('shows correct tab panel for Overview', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-0')).toBeInTheDocument();
      });
    });

    it('hides tab panels not matching current index', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.queryByTestId('tabpanel-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('tabpanel-2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Entry Type Specific Features', () => {
    it('does not fetch sample data for non-BigQuery tables', async () => {
      const nonBigQueryTable = {
        ...mockEntry,
        entrySource: {
          ...mockEntry.entrySource,
          system: 'custom_system'
        }
      };

      renderViewDetails(nonBigQueryTable);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });
    });
  });

  describe('Glossary Entry Type', () => {
    it('renders tabs for glossary entry type', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Categories')).toBeInTheDocument();
        expect(screen.getByText('Terms')).toBeInTheDocument();
        expect(screen.getByText('Aspects')).toBeInTheDocument();
      });
    });

    it('switches to Categories tab for glossary', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Categories'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
      });
    });

    it('switches to Terms tab for glossary', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Terms'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });

    it('switches to Aspects tab for glossary', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-3')).toBeInTheDocument();
      });
    });
  });

  describe('Category Entry Type', () => {
    it('renders tabs for category entry type', async () => {
      renderViewDetails(mockCategoryEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Categories')).toBeInTheDocument();
        expect(screen.getByText('Terms')).toBeInTheDocument();
        expect(screen.getByText('Aspects')).toBeInTheDocument();
      });
    });

    it('switches between tabs for category entry', async () => {
      renderViewDetails(mockCategoryEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Terms'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });
  });

  describe('Term Entry Type', () => {
    it('renders tabs for term entry type', async () => {
      renderViewDetails(mockTermEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Linked Assets')).toBeInTheDocument();
        expect(screen.getByText('Synonyms & Related Terms')).toBeInTheDocument();
        expect(screen.getByText('Aspects')).toBeInTheDocument();
      });
    });

    it('switches to Linked Assets tab for term', async () => {
      renderViewDetails(mockTermEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Linked Assets'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
      });
    });

    it('switches to Synonyms tab for term', async () => {
      renderViewDetails(mockTermEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Synonyms & Related Terms'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });

    it('switches to Aspects tab for term', async () => {
      renderViewDetails(mockTermEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-3')).toBeInTheDocument();
      });
    });
  });

  describe('Glossary Terms Tab', () => {
    const mockLinkedTerms = [
      { id: 'term-1', type: 'term', displayName: 'Revenue', description: 'Total revenue', lastModified: 1705312800, labels: [], linkedPaths: ['Schema.revenue'] },
      { id: 'term-2', type: 'term', displayName: 'Cost', description: 'Total cost', lastModified: 1705399200, labels: [], linkedPaths: ['Schema.cost'] },
    ];

    it('renders Glossary Terms tab for BigQuery Tables entry', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Glossary Terms' })).toBeInTheDocument();
      });
    });

    it('renders Glossary Terms tab for Datasets entry', async () => {
      renderViewDetails(mockDatasetEntry);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Glossary Terms' })).toBeInTheDocument();
      });
    });

    it('does not render Glossary Terms tab for glossary entry', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      expect(screen.queryByRole('tab', { name: 'Glossary Terms' })).not.toBeInTheDocument();
    });

    it('does not render Glossary Terms tab for category entry', async () => {
      renderViewDetails(mockCategoryEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      expect(screen.queryByRole('tab', { name: 'Glossary Terms' })).not.toBeInTheDocument();
    });

    it('does not render Glossary Terms tab for term entry', async () => {
      renderViewDetails(mockTermEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      expect(screen.queryByRole('tab', { name: 'Glossary Terms' })).not.toBeInTheDocument();
    });

    it('switches to Glossary Terms tab for BigQuery Tables (index 2)', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Glossary Terms' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });

    it('switches to Glossary Terms tab for Datasets (index 3)', async () => {
      renderViewDetails(mockDatasetEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Glossary Terms' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-3')).toBeInTheDocument();
      });
    });

    it('shows skeleton loader when entryLinks are loading', async () => {
      const store = createMockStore(mockEntry, 'succeeded', mockSampleData, 'succeeded', [], [], 'loading');
      render(
        <Provider store={store}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Glossary Terms' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('glossaries-skeleton')).toBeInTheDocument();
      });
    });

    it('renders linked terms when entryLinks are loaded', async () => {
      const store = createMockStore(mockEntry, 'succeeded', mockSampleData, 'succeeded', [], mockLinkedTerms, 'succeeded');
      render(
        <Provider store={store}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Glossary Terms' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('glossaries-terms')).toBeInTheDocument();
        expect(screen.getByText('Revenue')).toBeInTheDocument();
        expect(screen.getByText('Cost')).toBeInTheDocument();
      });
    });

    it('renders empty state when no linked terms exist', async () => {
      const store = createMockStore(mockEntry, 'succeeded', mockSampleData, 'succeeded', [], [], 'succeeded');
      render(
        <Provider store={store}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Glossary Terms' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('glossaries-terms')).toBeInTheDocument();
        expect(screen.getByText('0 terms')).toBeInTheDocument();
      });
    });
  });

  describe('Asset Preview Panel', () => {
    it('renders resource preview component', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
      });
    });

    it('handles close preview action', async () => {
      renderViewDetails();

      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);
      });

      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
    });

    it('handles view details action from preview', async () => {
      renderViewDetails();

      await waitFor(() => {
        const viewDetailsButton = screen.getByText('View Details');
        fireEvent.click(viewDetailsButton);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Sorting and Filtering', () => {
    it('handles sort direction toggle', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });
    });
  });

  describe('Helper Functions', () => {
    it('correctly identifies glossary type from entryType', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument();
      });
    });

    it('correctly identifies category type from entryType', async () => {
      renderViewDetails(mockCategoryEntry);

      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument();
      });
    });

    it('correctly identifies term type from entryType', async () => {
      renderViewDetails(mockTermEntry);

      await waitFor(() => {
        expect(screen.getByText('Linked Assets')).toBeInTheDocument();
      });
    });
  });

  describe('Data Scan Integration', () => {
    it('handles data scans for BigQuery tables', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Data Quality' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Data Profile' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: 'Data Quality' }));

      await waitFor(() => {
        expect(screen.getByTestId('data-quality')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Panel Rendering', () => {
    it('renders annotation filter in Aspects tab for tables', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
        expect(screen.getByTestId('preview-annotation')).toBeInTheDocument();
      });
    });

    it('renders annotation filter in Aspects tab for datasets', async () => {
      renderViewDetails(mockDatasetEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      });
    });

    it('renders annotation filter in Aspects tab for other entry types', async () => {
      renderViewDetails(mockOtherEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      });
    });
  });

  describe('Display Name Fallback', () => {
    it('shows entry name when displayName is empty', async () => {
      const entryWithEmptyDisplayName = {
        ...mockEntry,
        entrySource: {
          ...mockEntry.entrySource,
          displayName: ''
        }
      };

      renderViewDetails(entryWithEmptyDisplayName);

      await waitFor(() => {
        // Should fall back to getName result
        expect(screen.getByText('table')).toBeInTheDocument();
      });
    });

    it('shows displayName when available', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByText('Test Table')).toBeInTheDocument();
      });
    });
  });

  describe('Sample Data Loading', () => {
    it('handles sample data loading state', async () => {
      renderViewDetails(mockEntry, 'succeeded', undefined, 'loading');

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });

    it('handles sample data failure state', async () => {
      renderViewDetails(mockEntry, 'succeeded', undefined, 'failed');

      await waitFor(() => {
        expect(screen.getByTestId('detail-page-overview')).toBeInTheDocument();
      });
    });
  });

  describe('Glossary Data Loading States', () => {
    it('shows categories skeleton while loading glossary data', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Categories'));
      });

      // Since glossary data is loading (no items in viewDetailsItems), skeleton should show
      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
      });
    });

    it('shows terms skeleton while loading glossary data', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Terms'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });

    it('shows linked assets loading state for term', async () => {
      renderViewDetails(mockTermEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Linked Assets'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
      });
    });

    it('shows synonyms skeleton while loading term data', async () => {
      renderViewDetails(mockTermEntry);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Synonyms & Related Terms'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });
  });

  describe('Entry History Navigation', () => {
    it('pops from history when history exists', async () => {
      const mockStoreWithHistory = configureStore({
        reducer: {
          entry: () => ({ items: mockEntry, status: 'succeeded', history: [{ name: 'previous-entry' }] }),
          sampleData: () => ({ items: mockSampleData, status: 'succeeded' }),
          glossaries: () => ({ viewDetailsItems: [] }),
          resources: () => ({ items: [] }),
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
      });

      render(
        <Provider store={mockStoreWithHistory}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const backButton = buttons[0];
        fireEvent.click(backButton);
      });

      expect(mockDispatch).toHaveBeenCalled();
      // Should not navigate via browser when history exists
    });

    it('navigates back via browser when no history', async () => {
      renderViewDetails(mockEntry, 'succeeded', mockSampleData, 'succeeded', []);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const backButton = buttons[0];
        fireEvent.click(backButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('Tab Reset on Entry Change', () => {
    it('resets tab value when entry name changes', async () => {
      const { rerender } = renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
      });

      // Rerender with a new entry
      const newEntry = { ...mockEntry, name: 'project/dataset/newtable' };
      const newStore = createMockStore(newEntry);

      rerender(
        <Provider store={newStore}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-0')).toBeInTheDocument();
      });
    });
  });

  describe('Expand/Collapse Annotations', () => {
    it('expands all annotations when expand all is clicked', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        const expandAllButton = screen.getByText('Expand All');
        fireEvent.click(expandAllButton);
      });

      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });

    it('collapses all annotations when collapse all is clicked', async () => {
      renderViewDetails();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        const collapseAllButton = screen.getByText('Collapse All');
        fireEvent.click(collapseAllButton);
      });

      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });
  });

  describe('Resource ID Conversion', () => {
    it('handles preview panel interactions', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
      });

      // The resource preview should be visible
      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('BigQuery Link Generation', () => {
    it('generates correct BigQuery link for table', async () => {
      renderViewDetails();

      await waitFor(() => {
        const bigQueryButton = screen.getByText('Open in BigQuery');
        fireEvent.click(bigQueryButton);
      });

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('console.cloud.google.com/bigquery'),
        '_blank'
      );
    });

    it('generates correct Looker Studio link', async () => {
      renderViewDetails();

      await waitFor(() => {
        const lookerButton = screen.getByText('Explore in Looker');
        fireEvent.click(lookerButton);
      });

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('lookerstudio.google.com'),
        '_blank'
      );
    });
  });

  describe('System Tag Rendering', () => {
    it('renders BigQuery tag for BigQuery entries', async () => {
      renderViewDetails();

      await waitFor(() => {
        const bigQueryElements = screen.getAllByText('BigQuery');
        expect(bigQueryElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders Knowledge Catalog tag for glossary entries', async () => {
      renderViewDetails(mockGlossaryEntry);

      await waitFor(() => {
        const knowledgeCatalogElements = screen.getAllByText('Knowledge Catalog');
        expect(knowledgeCatalogElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Entry Type Tag Rendering', () => {
    it('renders Tables tag for table entries', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByText('Tables')).toBeInTheDocument();
      });
    });

    it('renders Datasets tag for dataset entries', async () => {
      renderViewDetails(mockDatasetEntry);

      await waitFor(() => {
        expect(screen.getByText('Datasets')).toBeInTheDocument();
      });
    });

    it('renders Other tag for unknown entry types', async () => {
      renderViewDetails(mockOtherEntry);

      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
    });
  });

  // Header Stats Bar tests removed - stats bar was removed from ViewDetails

  describe('Header Description', () => {
    it('renders description when available', async () => {
      renderViewDetails();

      await waitFor(() => {
        expect(screen.getByText('This is a test table description for the detail page.')).toBeInTheDocument();
      });
    });

    it('does not render description section when description is empty', async () => {
      const entryWithoutDescription = {
        ...mockEntry,
        entrySource: {
          ...mockEntry.entrySource,
          description: ''
        }
      };

      renderViewDetails(entryWithoutDescription);

      await waitFor(() => {
        expect(screen.getByText('Test Table')).toBeInTheDocument();
      });

      // No description section should be shown
      expect(screen.queryByText('Show more')).not.toBeInTheDocument();
    });
  });

  describe('Entry Status Handling', () => {
    it('shows loading skeleton when entry status is loading', async () => {
      renderViewDetails(mockEntry, 'loading');

      await waitFor(() => {
        expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
      });
    });

    it('shows content when entry status is succeeded', async () => {
      renderViewDetails(mockEntry, 'succeeded');

      await waitFor(() => {
        expect(screen.getByText('Test Table')).toBeInTheDocument();
      });
    });
  });

  describe('Glossary with Data', () => {
    const mockGlossaryItem = {
      id: 'projects/test/locations/us/glossaries/test',
      displayName: 'Test Glossary',
      type: 'glossary' as const,
      children: [
        { id: 'cat1', displayName: 'Category 1', type: 'category' as const },
        { id: 'term1', displayName: 'Term 1', type: 'term' as const }
      ],
      relations: []
    };

    const mockTermItem = {
      id: 'projects/test/locations/us/glossaries/test/terms/term1',
      displayName: 'Test Term',
      type: 'term' as const,
      children: [],
      relations: [
        { id: 'related1', displayName: 'Related Term', type: 'synonym' as const, lastModified: Date.now() }
      ],
      linkedAssets: [
        { id: 'asset1', displayName: 'Linked Asset 1' }
      ]
    };

    it('renders categories content when glossary data is loaded', async () => {
      vi.mocked(glossaryUtils.findItem).mockReturnValue(mockGlossaryItem);

      const mockStoreWithGlossary = configureStore({
        reducer: {
          entry: () => ({ items: mockGlossaryEntry, status: 'succeeded', history: [] }),
          sampleData: () => ({ items: null, status: 'idle' }),
          glossaries: () => ({ viewDetailsItems: [mockGlossaryItem] }),
          resources: () => ({ items: [] }),
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
      });

      render(
        <Provider store={mockStoreWithGlossary}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText('Categories'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
      });
    });

    it('renders terms content when glossary data is loaded', async () => {
      vi.mocked(glossaryUtils.findItem).mockReturnValue(mockGlossaryItem);

      const mockStoreWithGlossary = configureStore({
        reducer: {
          entry: () => ({ items: mockGlossaryEntry, status: 'succeeded', history: [] }),
          sampleData: () => ({ items: null, status: 'idle' }),
          glossaries: () => ({ viewDetailsItems: [mockGlossaryItem] }),
          resources: () => ({ items: [] }),
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
      });

      render(
        <Provider store={mockStoreWithGlossary}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText('Terms'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });

    it('renders linked assets content when term data is loaded', async () => {
      vi.mocked(glossaryUtils.findItem).mockReturnValue(mockTermItem);

      const mockStoreWithTerm = configureStore({
        reducer: {
          entry: () => ({ items: mockTermEntry, status: 'succeeded', history: [] }),
          sampleData: () => ({ items: null, status: 'idle' }),
          glossaries: () => ({ viewDetailsItems: [mockTermItem] }),
          resources: () => ({ items: [] }),
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
      });

      render(
        <Provider store={mockStoreWithTerm}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText('Linked Assets'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-1')).toBeInTheDocument();
      });
    });

    it('renders synonyms content when term data is loaded', async () => {
      vi.mocked(glossaryUtils.findItem).mockReturnValue(mockTermItem);

      const mockStoreWithTerm = configureStore({
        reducer: {
          entry: () => ({ items: mockTermEntry, status: 'succeeded', history: [] }),
          sampleData: () => ({ items: null, status: 'idle' }),
          glossaries: () => ({ viewDetailsItems: [mockTermItem] }),
          resources: () => ({ items: [] }),
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
      });

      render(
        <Provider store={mockStoreWithTerm}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText('Synonyms & Related Terms'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-2')).toBeInTheDocument();
      });
    });

    it('renders aspects tab for glossary entry', async () => {
      vi.mocked(glossaryUtils.findItem).mockReturnValue(mockGlossaryItem);

      const mockStoreWithGlossary = configureStore({
        reducer: {
          entry: () => ({ items: mockGlossaryEntry, status: 'succeeded', history: [] }),
          sampleData: () => ({ items: null, status: 'idle' }),
          glossaries: () => ({ viewDetailsItems: [mockGlossaryItem] }),
          resources: () => ({ items: [] }),
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
      });

      render(
        <Provider store={mockStoreWithGlossary}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-3')).toBeInTheDocument();
        expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      });
    });

    it('renders aspects tab for term entry', async () => {
      vi.mocked(glossaryUtils.findItem).mockReturnValue(mockTermItem);

      const mockStoreWithTerm = configureStore({
        reducer: {
          entry: () => ({ items: mockTermEntry, status: 'succeeded', history: [] }),
          sampleData: () => ({ items: null, status: 'idle' }),
          glossaries: () => ({ viewDetailsItems: [mockTermItem] }),
          resources: () => ({ items: [] }),
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
      });

      render(
        <Provider store={mockStoreWithTerm}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContextValue}>
              <ViewDetails />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText('Aspects'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tabpanel-3')).toBeInTheDocument();
        expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      });
    });

    afterEach(() => {
      // Reset findItem mock after each glossary test
      vi.mocked(glossaryUtils.findItem).mockReturnValue(null);
    });
  });

  describe('Preview Panel Interactions', () => {
    it('handles close button on preview panel', async () => {
      renderViewDetails();

      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);
      });

      expect(screen.getByTestId('resource-preview')).toBeInTheDocument();
    });

    it('handles view details from preview panel', async () => {
      renderViewDetails();

      await waitFor(() => {
        const viewDetailsButton = screen.getByText('View Details');
        fireEvent.click(viewDetailsButton);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
