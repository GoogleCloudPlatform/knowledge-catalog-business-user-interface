import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TableInsightsGeneratedQueries from './TableInsightsGeneratedQueries';
import type { GroupedQueries } from '../../utils/insightsUtils';

// Mock TableInsightsQueryItem
vi.mock('./TableInsightsQueryItem', () => ({
  default: ({ query }: { query: { sql: string; description: string } }) => (
    <div data-testid="query-item">{query.description}</div>
  ),
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  ExpandMore: () => <span data-testid="expand-more-icon">ExpandMore</span>,
  ExpandLess: () => <span data-testid="expand-less-icon">ExpandLess</span>,
  HelpOutline: () => <span data-testid="help-icon">HelpOutline</span>,
  FilterList: () => <span data-testid="filter-icon">FilterList</span>,
  AutoFixHighOutlined: () => <span data-testid="auto-fix-icon">AutoFixHighOutlined</span>,
  Close: () => <span data-testid="close-icon">Close</span>,
}));

describe('TableInsightsGeneratedQueries', () => {
  const createMockGroupedQueries = (): GroupedQueries[] => [
    {
      date: '2026-02-05',
      formattedDate: 'February 5, 2026 at 12:11:36 PM UTC+5:30',
      jobUid: 'job-1',
      queries: [
        { sql: 'SELECT * FROM users', description: 'Get all users' },
        { sql: 'SELECT COUNT(*) FROM users', description: 'Count users' },
      ],
    },
    {
      date: '2026-02-04',
      formattedDate: 'February 4, 2026 at 10:00:00 AM UTC+5:30',
      jobUid: 'job-2',
      queries: [
        { sql: 'SELECT * FROM orders', description: 'Get all orders' },
      ],
    },
  ];

  const defaultProps = {
    groupedQueries: createMockGroupedQueries(),
    searchTerm: '',
    onSearchTermChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('renders section title "Generated Queries"', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      expect(screen.getByText('Generated Queries')).toBeInTheDocument();
    });

    it('renders help tooltip icon', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      expect(screen.getByTestId('help-icon')).toBeInTheDocument();
    });

    it('renders filter bar with search input', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search query description')).toBeInTheDocument();
    });

    it('renders date groups for each grouped query', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      expect(screen.getByText(/February 5, 2026/)).toBeInTheDocument();
      expect(screen.getByText(/February 4, 2026/)).toBeInTheDocument();
    });

    it('shows formatted date in group headers', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      expect(screen.getByText('Generated date: February 5, 2026 at 12:11:36 PM UTC+5:30')).toBeInTheDocument();
    });

    it('starts with main section expanded', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      // Filter bar should be visible when main section is expanded
      expect(screen.getByPlaceholderText('Search query description')).toBeVisible();
    });

    it('starts with date groups collapsed (no expanded class)', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      // Date groups should not have expanded class initially
      const dateGroups = document.querySelectorAll('.insights-date-group');
      dateGroups.forEach(group => {
        expect(group.classList.contains('insights-date-group--expanded')).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Main Section Tests
  //
  // The main section is no longer collapsible (the redesign removed the
  // collapsible wrapper / main toggle button). The header, filter bar and
  // query groups are always rendered. These tests assert that always-visible
  // structure instead of the removed collapse/expand behavior.
  // ==========================================================================

  describe('Main Section', () => {
    it('keeps the header, filter bar and groups visible (section is always expanded)', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      expect(screen.getByText('Generated Queries')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search query description')).toBeVisible();
      expect(screen.getAllByText(/Generated date:/).length).toBeGreaterThan(0);
    });

    it('renders the filter bar', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      // Filter bar is rendered via QueryFilterBar (filter icon + search input)
      expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search query description')).toBeInTheDocument();
    });

    it('renders query groups', () => {
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      // Date groups should be present
      expect(screen.getAllByText(/Generated date:/).length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Date Group Expand/Collapse Tests
  // ==========================================================================

  describe('Date Group Expand/Collapse', () => {
    it('expands date group when header clicked', async () => {
      const user = userEvent.setup();
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      const dateHeader = screen.getByText('Generated date: February 5, 2026 at 12:11:36 PM UTC+5:30');
      await user.click(dateHeader.closest('.insights-date-group__header')!);

      // Query items should now be visible - at least some
      expect(screen.getAllByTestId('query-item').length).toBeGreaterThan(0);
    });

    it('shows queries for expanded date group', async () => {
      const user = userEvent.setup();
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      const dateHeader = screen.getByText('Generated date: February 5, 2026 at 12:11:36 PM UTC+5:30');
      await user.click(dateHeader.closest('.insights-date-group__header')!);

      expect(screen.getByText('Get all users')).toBeInTheDocument();
      expect(screen.getByText('Count users')).toBeInTheDocument();
    });

    it('toggles expanded class on date group when clicked', async () => {
      const user = userEvent.setup();
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      const dateGroupHeader = screen.getByText('Generated date: February 5, 2026 at 12:11:36 PM UTC+5:30')
        .closest('.insights-date-group__header');
      const dateGroup = dateGroupHeader?.closest('.insights-date-group');

      // Initially collapsed - no expanded class
      expect(dateGroup?.classList.contains('insights-date-group--expanded')).toBe(false);

      // Expand
      await user.click(dateGroupHeader!);
      expect(dateGroup?.classList.contains('insights-date-group--expanded')).toBe(true);

      // Collapse
      await user.click(dateGroupHeader!);
      expect(dateGroup?.classList.contains('insights-date-group--expanded')).toBe(false);
    });

    it('multiple groups can be expanded simultaneously', async () => {
      const user = userEvent.setup();
      render(<TableInsightsGeneratedQueries {...defaultProps} />);

      const firstDateHeader = screen.getByText('Generated date: February 5, 2026 at 12:11:36 PM UTC+5:30')
        .closest('.insights-date-group__header');
      const secondDateHeader = screen.getByText('Generated date: February 4, 2026 at 10:00:00 AM UTC+5:30')
        .closest('.insights-date-group__header');

      // Expand first group
      await user.click(firstDateHeader!);
      // Expand second group
      await user.click(secondDateHeader!);

      // All query items from both groups should be visible
      expect(screen.getAllByTestId('query-item')).toHaveLength(3);
    });
  });

  // ==========================================================================
  // Search Filtering Tests
  // ==========================================================================

  describe('Search Filtering', () => {
    it('calls onSearchTermChange when typing', async () => {
      const user = userEvent.setup();
      const mockOnSearchTermChange = vi.fn();

      render(
        <TableInsightsGeneratedQueries
          {...defaultProps}
          onSearchTermChange={mockOnSearchTermChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search query description');
      await user.type(searchInput, 'users');

      expect(mockOnSearchTermChange).toHaveBeenCalled();
    });

    it('displays search term value', () => {
      render(
        <TableInsightsGeneratedQueries
          {...defaultProps}
          searchTerm="test search"
        />
      );

      const searchInput = screen.getByPlaceholderText('Search query description') as HTMLInputElement;
      expect(searchInput.value).toBe('test search');
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    it('shows "No queries match" when filter has no results', () => {
      render(
        <TableInsightsGeneratedQueries
          groupedQueries={[]}
          searchTerm="nonexistent"
          onSearchTermChange={vi.fn()}
        />
      );

      expect(screen.getByText('No queries match your search criteria.')).toBeInTheDocument();
    });

    it('shows empty message when groupedQueries is empty', () => {
      render(
        <TableInsightsGeneratedQueries
          groupedQueries={[]}
          searchTerm=""
          onSearchTermChange={vi.fn()}
        />
      );

      expect(screen.getByText('No queries match your search criteria.')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles single query group', () => {
      const singleGroup: GroupedQueries[] = [
        {
          date: '2026-02-05',
          formattedDate: 'February 5, 2026',
          jobUid: 'job-1',
          queries: [{ sql: 'SELECT 1', description: 'Simple query' }],
        },
      ];

      render(
        <TableInsightsGeneratedQueries
          groupedQueries={singleGroup}
          searchTerm=""
          onSearchTermChange={vi.fn()}
        />
      );

      expect(screen.getByText('Generated date: February 5, 2026')).toBeInTheDocument();
    });

    it('handles group with many queries', async () => {
      const user = userEvent.setup();
      const manyQueries = Array.from({ length: 20 }, (_, i) => ({
        sql: `SELECT ${i}`,
        description: `Query number ${i}`,
      }));

      const groupWithManyQueries: GroupedQueries[] = [
        {
          date: '2026-02-05',
          formattedDate: 'February 5, 2026',
          jobUid: 'job-1',
          queries: manyQueries,
        },
      ];

      render(
        <TableInsightsGeneratedQueries
          groupedQueries={groupWithManyQueries}
          searchTerm=""
          onSearchTermChange={vi.fn()}
        />
      );

      const dateHeader = screen.getByText('Generated date: February 5, 2026')
        .closest('.insights-date-group__header');
      await user.click(dateHeader!);

      expect(screen.getAllByTestId('query-item')).toHaveLength(20);
    });
  });
});
