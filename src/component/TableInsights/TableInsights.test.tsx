import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TableInsights from './TableInsights';
import type { InsightJob } from '../../mocks/insightsMockData';

// ============================================================================
// Mock Setup
// ============================================================================

const mockDispatch = vi.fn();
let mockSelectorResults: Record<string, any> = {};

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => {
    // Call the selector factory with resourceId and then with state
    if (typeof selector === 'function') {
      const result = selector({ insights: mockSelectorResults });
      return result;
    }
    return mockSelectorResults;
  },
}));

let mockAuthUser: any = { token: 'test-token-123' };
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

const mockSetAccessPanelOpen = vi.fn();
vi.mock('../../contexts/AccessRequestContext', () => ({
  useAccessRequest: () => ({ setAccessPanelOpen: mockSetAccessPanelOpen }),
}));

vi.mock('../../features/tableInsights/tableInsightsSlice', () => ({
  fetchInsights: vi.fn((args) => ({ type: 'insights/fetchInsights', payload: args })),
  selectInsightsData: (resourceId: string) => (state: any) =>
    state.insights.insightsByResource?.[resourceId]?.jobs,
  selectInsightsStatus: (resourceId: string) => (state: any) =>
    state.insights.insightsByResource?.[resourceId]?.status || 'idle',
}));

// Mock child components
vi.mock('./InsightsTableDescription', () => ({
  default: ({ description, onViewColumnDescriptions }: any) => (
    <div data-testid="insights-table-description">
      <span data-testid="description-text">{description}</span>
      <button data-testid="view-columns-btn" onClick={onViewColumnDescriptions}>
        View column descriptions
      </button>
    </div>
  ),
}));

vi.mock('./TableInsightsGeneratedQueries', () => ({
  default: ({ groupedQueries, searchTerm, onSearchTermChange }: any) => (
    <div data-testid="generated-queries">
      <span data-testid="queries-count">{groupedQueries.length} groups</span>
      <input
        data-testid="search-input"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        placeholder="Search"
      />
    </div>
  ),
}));

vi.mock('./TableInsightsPreviewPanel', () => ({
  default: ({ isOpen, onClose, currentDescription, geminiDescription, columnDescriptions }: any) => (
    <div data-testid="preview-panel" data-open={isOpen}>
      <span data-testid="preview-current">{currentDescription}</span>
      <span data-testid="preview-gemini">{geminiDescription}</span>
      <span data-testid="preview-columns">{columnDescriptions?.length || 0} columns</span>
      <button data-testid="close-preview-btn" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('./TableInsightsSkeleton', () => ({
  default: () => <div data-testid="skeleton">Loading skeleton...</div>,
}));

// ============================================================================
// Test Utilities
// ============================================================================

const createMockInsightJob = (overrides: Partial<InsightJob> = {}): InsightJob => ({
  name: 'projects/test/locations/us-central1/dataScans/scan-id/jobs/job-id',
  uid: 'test-job-uid',
  startTime: '2026-02-05T12:11:36.626112533Z',
  endTime: '2026-02-05T12:12:23.122921884Z',
  state: 'SUCCEEDED',
  type: 'DATA_DOCUMENTATION',
  createTime: '2026-02-05T12:11:36.626050423Z',
  dataDocumentationSpec: { catalogPublishingEnabled: true },
  dataDocumentationResult: {
    tableResult: {
      name: 'test-table',
      overview: 'AI-generated table overview description',
      schema: {
        fields: [
          { name: 'col1', description: 'Column 1 description' },
          { name: 'col2', description: 'Column 2 description' },
        ],
      },
      queries: [
        { sql: 'SELECT * FROM table', description: 'Get all records' },
        { sql: 'SELECT COUNT(*) FROM table', description: 'Count records' },
      ],
    },
  },
  ...overrides,
});

const createMockEntry = (overrides: any = {}) => ({
  entrySource: { resource: 'test-resource-id' },
  aspects: {
    'Tables.global.overview': {
      data: {
        description: { stringValue: 'Current table description from metadata' },
      },
    },
  },
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('TableInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { token: 'test-token-123' };
    mockSelectorResults = {
      insightsByResource: {},
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('renders main insights container with data', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByTestId('insights-table-description')).toBeInTheDocument();
      expect(screen.getByTestId('generated-queries')).toBeInTheDocument();
      // Preview panel is inside MUI Drawer, only rendered when open
      expect(screen.queryByTestId('preview-panel')).not.toBeInTheDocument();
    });

    it('renders InsightsTableDescription component', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByTestId('insights-table-description')).toBeInTheDocument();
    });

    it('renders TableInsightsGeneratedQueries component', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByTestId('generated-queries')).toBeInTheDocument();
    });

    it('renders TableInsightsPreviewPanel component when Drawer is opened', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      // Preview panel is inside MUI Drawer, not rendered until opened
      expect(screen.queryByTestId('preview-panel')).not.toBeInTheDocument();

      // Open the preview panel
      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);

      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('Loading State', () => {
    it('shows skeleton when status is loading and scanName not null', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [],
            status: 'loading',
            lastFetched: 0,
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('does not show skeleton when scanName is null', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [],
            status: 'loading',
            lastFetched: 0,
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName={null} />);

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    it('shows empty state when insightsData is undefined', () => {
      mockSelectorResults = {
        insightsByResource: {},
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByText('No AI-generated insights available')).toBeInTheDocument();
    });

    it('shows empty state when insightsData is empty array', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByText('No AI-generated insights available')).toBeInTheDocument();
    });

    it('shows empty state when no successful job found', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob({ state: 'FAILED' })],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByText('No AI-generated insights available')).toBeInTheDocument();
    });

    it('shows empty state when scanName is null', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName={null} />);

      expect(screen.getByText('No AI-generated insights available')).toBeInTheDocument();
    });

    it('renders correct empty state message', () => {
      mockSelectorResults = {
        insightsByResource: {},
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(
        screen.getByText('Run a Data Documentation scan in Knowledge Catalog to generate insights for this table.')
      ).toBeInTheDocument();
    });

    it('renders empty state icon (SVG)', () => {
      mockSelectorResults = {
        insightsByResource: {},
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      const emptyStateContainer = document.querySelector('.insights-empty-state');
      const svgIcon = emptyStateContainer?.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Redux Integration Tests
  // ==========================================================================

  describe('Redux Integration', () => {
    it('dispatches fetchInsights on mount with valid params', () => {
      mockSelectorResults = {
        insightsByResource: {},
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'insights/fetchInsights',
          payload: expect.objectContaining({
            resourceId: 'test-resource-id',
            id_token: 'test-token-123',
            scanName: 'test-scan',
          }),
        })
      );
    });

    it('extracts resourceId from entry correctly', () => {
      mockSelectorResults = {
        insightsByResource: {},
      };

      render(
        <TableInsights
          entry={{ entrySource: { resource: 'custom-resource-id' } }}
          scanName="test-scan"
        />
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            resourceId: 'custom-resource-id',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Context Integration Tests
  // ==========================================================================

  describe('Context Integration', () => {
    it('syncs preview panel state with AccessRequestContext', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      // Open preview panel
      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);

      // setAccessPanelOpen should be called with true
      expect(mockSetAccessPanelOpen).toHaveBeenCalledWith(true);
    });
  });

  // ==========================================================================
  // Search Functionality Tests
  // ==========================================================================

  describe('Search Functionality', () => {
    it('updates searchTerm state when input changes', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test query');

      expect(searchInput).toHaveValue('test query');
    });
  });

  // ==========================================================================
  // Preview Panel Tests
  // ==========================================================================

  describe('Preview Panel', () => {
    it('opens preview panel when View Column Descriptions clicked', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);

      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    });

    it('sets correct previewData when opening panel', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);

      expect(screen.getByTestId('preview-current')).toHaveTextContent(
        'Current table description from metadata'
      );
      expect(screen.getByTestId('preview-gemini')).toHaveTextContent(
        'AI-generated table overview description'
      );
      expect(screen.getByTestId('preview-columns')).toHaveTextContent('2 columns');
    });

    it('closes preview panel when close button clicked', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      // Open panel
      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);

      // Close panel
      const closeBtn = screen.getByTestId('close-preview-btn');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('preview-panel')).not.toBeInTheDocument();
      });
    });

    it('renders overlay when preview panel open', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);

      // Preview panel should be open
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    });

    it('syncs AccessRequestContext on close', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      // Open panel
      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);
      expect(mockSetAccessPanelOpen).toHaveBeenCalledWith(true);

      // Close panel
      const closeBtn = screen.getByTestId('close-preview-btn');
      await user.click(closeBtn);
      expect(mockSetAccessPanelOpen).toHaveBeenCalledWith(false);
    });

    it('can close panel using close button', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      // Open panel
      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);

      // Verify open
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();

      // Close using the close button
      const closeBtn = screen.getByTestId('close-preview-btn');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('preview-panel')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Data Processing Tests
  // ==========================================================================

  describe('Data Processing', () => {
    it('extracts table description from most recent job', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByTestId('description-text')).toHaveTextContent(
        'AI-generated table overview description'
      );
    });

    it('passes grouped queries to GeneratedQueries component', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      // The mock shows the count of groups
      expect(screen.getByTestId('queries-count')).toHaveTextContent('1 groups');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles missing user token gracefully', () => {
      mockAuthUser = { token: null };
      mockSelectorResults = {
        insightsByResource: {},
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      // Should render without crashing - empty state since no data
      expect(screen.getByText('No AI-generated insights available')).toBeInTheDocument();
      // fetchInsights should not be dispatched when token is falsy
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('handles undefined user gracefully', () => {
      mockAuthUser = null;
      mockSelectorResults = {
        insightsByResource: {},
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      expect(screen.getByText('No AI-generated insights available')).toBeInTheDocument();
    });

    it('handles entry without entrySource', () => {
      mockSelectorResults = {
        insightsByResource: {},
      };

      render(<TableInsights entry={{}} scanName="test-scan" />);

      // Should show empty state
      expect(screen.getByText('No AI-generated insights available')).toBeInTheDocument();
    });

    it('handles entry without aspects', async () => {
      const user = userEvent.setup();
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob()],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(
        <TableInsights
          entry={{ entrySource: { resource: 'test-resource-id' } }}
          scanName="test-scan"
        />
      );

      // Open preview panel
      const viewColumnsBtn = screen.getByTestId('view-columns-btn');
      await user.click(viewColumnsBtn);

      // Current description should be '-' (fallback)
      expect(screen.getByTestId('preview-current')).toHaveTextContent('-');
    });

    it('handles job without dataDocumentationResult', () => {
      mockSelectorResults = {
        insightsByResource: {
          'test-resource-id': {
            jobs: [createMockInsightJob({ dataDocumentationResult: undefined })],
            status: 'succeeded',
            lastFetched: Date.now(),
            error: null,
          },
        },
      };

      render(<TableInsights entry={createMockEntry()} scanName="test-scan" />);

      // Should show empty state since there's no valid result
      expect(screen.getByText('No AI-generated insights available')).toBeInTheDocument();
    });
  });
});
