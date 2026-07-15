import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TableInsightsQueryItem from './TableInsightsQueryItem';

// Mock prism-react-renderer
vi.mock('prism-react-renderer', () => ({
  Highlight: ({ children, code }: any) => {
    const result = children({
      className: 'prism-code',
      style: {},
      tokens: [[{ content: code, types: ['plain'] }]],
      getLineProps: ({ key }: any) => ({ key }),
      getTokenProps: ({ token, key }: any) => ({ key, children: token.content }),
    });
    return result;
  },
  themes: { nightOwlLight: {} },
}));

// Mock NotificationContext
const mockShowNotification = vi.fn();
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  ExpandMore: () => <span data-testid="expand-more-icon">ExpandMore</span>,
  ExpandLess: () => <span data-testid="expand-less-icon">ExpandLess</span>,
  ContentCopy: () => <span data-testid="content-copy-icon">ContentCopy</span>,
}));

// Mock navigator.clipboard at module level
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
    readText: vi.fn(),
  },
  writable: true,
  configurable: true,
});

describe('TableInsightsQueryItem', () => {
  const defaultQuery = {
    sql: 'SELECT * FROM users WHERE active = true',
    description: 'Get all active users from the database',
  };

  // The clickable header is the Box wrapping the chevron, sparkle icon and
  // description. The description Typography is a direct child of that header,
  // so its parent element is the element carrying the toggle onClick handler.
  const getHeader = (description: string) =>
    screen.getByText(description).parentElement as HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockClear();
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('renders query description', () => {
      render(<TableInsightsQueryItem query={defaultQuery} />);

      expect(screen.getByText(defaultQuery.description)).toBeInTheDocument();
    });

    it('renders sparkle icon (SVG)', () => {
      render(<TableInsightsQueryItem query={defaultQuery} />);

      const svgIcon = document.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });

    it('renders expand/collapse icon button', () => {
      render(<TableInsightsQueryItem query={defaultQuery} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('starts collapsed by default', () => {
      render(<TableInsightsQueryItem query={defaultQuery} />);

      // ExpandMore icon should be shown when collapsed
      expect(screen.getByTestId('expand-more-icon')).toBeInTheDocument();
    });

    it('does not show SQL code when collapsed', () => {
      render(<TableInsightsQueryItem query={defaultQuery} />);

      // SQL code lives inside a MUI Collapse that is hidden (height 0) while collapsed.
      const collapse = document.querySelector('.MuiCollapse-root');
      expect(collapse).toHaveClass('MuiCollapse-hidden');
    });
  });

  // ==========================================================================
  // Expand/Collapse Interaction Tests
  // ==========================================================================

  describe('Expand/Collapse Interactions', () => {
    it('expands when header clicked', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      await user.click(getHeader(defaultQuery.description));

      // Should now show ExpandLess icon (expanded state)
      expect(screen.getByTestId('expand-less-icon')).toBeInTheDocument();
    });

    it('shows SQL code when expanded', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      await user.click(getHeader(defaultQuery.description));

      // SQL code should now be visible
      expect(screen.getByText(defaultQuery.sql)).toBeInTheDocument();
    });

    it('collapses when header clicked again', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      const header = getHeader(defaultQuery.description);

      // Expand
      await user.click(header);
      expect(screen.getByTestId('expand-less-icon')).toBeInTheDocument();

      // Collapse
      await user.click(header);
      expect(screen.getByTestId('expand-more-icon')).toBeInTheDocument();
    });

    it('shows ExpandMore icon when collapsed', () => {
      render(<TableInsightsQueryItem query={defaultQuery} />);

      expect(screen.getByTestId('expand-more-icon')).toBeInTheDocument();
    });

    it('shows ExpandLess icon when expanded', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      await user.click(getHeader(defaultQuery.description));

      expect(screen.getByTestId('expand-less-icon')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SQL Syntax Highlighting Tests
  // ==========================================================================

  describe('SQL Syntax Highlighting', () => {
    it('renders SQL with prism-react-renderer', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      await user.click(getHeader(defaultQuery.description));

      // The SQL should be rendered through Highlight component
      expect(screen.getByText(defaultQuery.sql)).toBeInTheDocument();
    });

    it('applies correct styling to code block', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      await user.click(getHeader(defaultQuery.description));

      const preElement = document.querySelector('pre');
      expect(preElement).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Copy to Clipboard Tests
  // ==========================================================================

  describe('Copy to Clipboard', () => {
    it('renders copy button when expanded', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      // Expand first
      await user.click(getHeader(defaultQuery.description));

      // Copy button should be present (the button wrapping the ContentCopy icon)
      const copyButton = screen.getByTestId('content-copy-icon').closest('button');
      expect(copyButton).toBeInTheDocument();
    });

    it('has copy button with content copy icon', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      // Expand first
      await user.click(getHeader(defaultQuery.description));

      // The ContentCopy icon should be visible
      expect(screen.getByTestId('content-copy-icon')).toBeInTheDocument();
    });

    it('clicking copy button stops event propagation', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={defaultQuery} />);

      // Expand first
      await user.click(getHeader(defaultQuery.description));

      // Verify expanded
      expect(screen.getByTestId('expand-less-icon')).toBeInTheDocument();

      // Click copy button - it has stopPropagation so component should stay expanded
      const copyButton = screen.getByTestId('content-copy-icon').closest('button')!;
      await user.click(copyButton);

      // Should still be expanded (propagation was stopped)
      expect(screen.getByTestId('expand-less-icon')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles empty SQL string', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={{ sql: '', description: 'Empty query' }} />);

      await user.click(getHeader('Empty query'));

      // Should not crash
      expect(screen.getByText('Empty query')).toBeInTheDocument();
    });

    it('handles SQL with special characters', async () => {
      const user = userEvent.setup();
      const specialQuery = {
        sql: "SELECT * FROM users WHERE name = 'O''Brien' AND status <> 'inactive'",
        description: 'Query with special characters',
      };

      render(<TableInsightsQueryItem query={specialQuery} />);

      await user.click(getHeader(specialQuery.description));

      expect(screen.getByText(specialQuery.sql)).toBeInTheDocument();
    });

    it('handles very long SQL queries', async () => {
      const user = userEvent.setup();
      const longSql = 'SELECT ' + 'column, '.repeat(100) + 'final_column FROM table';
      const longQuery = {
        sql: longSql,
        description: 'Very long query',
      };

      render(<TableInsightsQueryItem query={longQuery} />);

      await user.click(getHeader(longQuery.description));

      expect(screen.getByText(longSql)).toBeInTheDocument();
    });

    it('handles query with undefined sql gracefully', async () => {
      const user = userEvent.setup();
      render(<TableInsightsQueryItem query={{ sql: undefined as any, description: 'Test' }} />);

      await user.click(getHeader('Test'));

      // Should not crash - the Highlight component handles this with || ''
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});
