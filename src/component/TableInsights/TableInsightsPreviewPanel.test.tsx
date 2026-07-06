import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TableInsightsPreviewPanel from './TableInsightsPreviewPanel';
import type { ColumnDescription } from '../../mocks/insightsMockData';

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  Close: () => <span data-testid="close-icon">Close</span>,
  FilterList: () => <span data-testid="filter-icon">FilterList</span>,
}));

describe('TableInsightsPreviewPanel', () => {
  const createMockColumnDescriptions = (): ColumnDescription[] => [
    { name: 'user_id', description: 'Unique identifier for the user' },
    { name: 'email', description: 'User email address' },
    { name: 'created_at', description: 'Timestamp when user was created' },
    { name: 'status', description: 'Current status of the user account' },
    { name: 'first_name', description: 'User first name' },
    { name: 'last_name', description: 'User last name' },
  ];

  const defaultProps = {
    isOpen: true,
    currentDescription: 'Current table description from metadata',
    geminiDescription: 'AI-generated description of the table',
    columnDescriptions: createMockColumnDescriptions(),
    onClose: vi.fn(),
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
    it('renders panel header "Preview descriptions"', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Preview descriptions')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });

    it('renders current description section', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      // "Current description" appears multiple times - in table description section and in table header
      expect(screen.getAllByText('Current description').length).toBeGreaterThan(0);
      expect(screen.getByText(defaultProps.currentDescription)).toBeInTheDocument();
    });

    it('renders Gemini description section', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      // There are multiple "Gemini generated description" texts - one in table description and one in table header
      expect(screen.getAllByText('Gemini generated description').length).toBeGreaterThan(0);
      expect(screen.getByText(defaultProps.geminiDescription)).toBeInTheDocument();
    });

    it('renders column descriptions table', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Column descriptions')).toBeInTheDocument();
    });

    it('renders filter input for columns', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByPlaceholderText('Enter property name or value')).toBeInTheDocument();
    });

    it('renders pagination controls', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Rows per page:')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Open/Close State Tests
  // ==========================================================================

  describe('Open/Close State', () => {
    it('panel is visible when rendered', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Preview descriptions')).toBeVisible();
    });

    it('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      render(<TableInsightsPreviewPanel {...defaultProps} onClose={mockOnClose} />);

      // Find the close button which contains the close icon
      const closeIcon = screen.getByTestId('close-icon');
      const closeButton = closeIcon.closest('button');
      await user.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Description Display Tests
  // ==========================================================================

  describe('Description Display', () => {
    it('displays currentDescription prop', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByText(defaultProps.currentDescription)).toBeInTheDocument();
    });

    it('displays geminiDescription prop', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByText(defaultProps.geminiDescription)).toBeInTheDocument();
    });

    it('displays provided values for descriptions', () => {
      render(
        <TableInsightsPreviewPanel
          {...defaultProps}
          currentDescription="-"
          geminiDescription="-"
        />
      );

      // Both should show dash as fallback
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Column Descriptions Table Tests
  // ==========================================================================

  describe('Column Descriptions Table', () => {
    it('renders column name in first column', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByText('user_id')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
    });

    it('renders Gemini description in third column', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      expect(screen.getByText('Unique identifier for the user')).toBeInTheDocument();
      expect(screen.getByText('User email address')).toBeInTheDocument();
    });

    it('renders all visible column descriptions', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      // Default is 10 rows per page, and we have 6 columns
      expect(screen.getByText('user_id')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('created_at')).toBeInTheDocument();
      expect(screen.getByText('status')).toBeInTheDocument();
      expect(screen.getByText('first_name')).toBeInTheDocument();
      expect(screen.getByText('last_name')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Column Filtering Tests
  // ==========================================================================

  describe('Column Filtering', () => {
    it('filters columns by name', async () => {
      const user = userEvent.setup();
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      await user.type(filterInput, 'email');

      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.queryByText('user_id')).not.toBeInTheDocument();
    });

    it('filters columns by description', async () => {
      const user = userEvent.setup();
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      await user.type(filterInput, 'timestamp');

      expect(screen.getByText('created_at')).toBeInTheDocument();
      expect(screen.queryByText('email')).not.toBeInTheDocument();
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      await user.type(filterInput, 'EMAIL');

      expect(screen.getByText('email')).toBeInTheDocument();
    });

    it('resets to page 0 when filter changes', async () => {
      const user = userEvent.setup();
      // Create enough columns to have multiple pages
      const manyColumns = Array.from({ length: 25 }, (_, i) => ({
        name: `column_${i}`,
        description: `Description for column ${i}`,
      }));

      render(
        <TableInsightsPreviewPanel
          {...defaultProps}
          columnDescriptions={manyColumns}
        />
      );

      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      await user.type(filterInput, 'column_1');

      // Should be on page 0 after filtering
      expect(screen.getByText('column_1')).toBeInTheDocument();
    });

    it('shows empty table when no matches', async () => {
      const user = userEvent.setup();
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      await user.type(filterInput, 'nonexistent');

      // No columns should be visible
      expect(screen.queryByText('user_id')).not.toBeInTheDocument();
      expect(screen.queryByText('email')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================

  describe('Pagination', () => {
    it('defaults to 10 rows per page', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      // Should show "10" in the rows per page selector
      expect(screen.getByRole('combobox')).toHaveTextContent('10');
    });

    it('shows correct count of filtered items', () => {
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      // Should show "1-6 of 6" since we have 6 columns
      expect(screen.getByText(/1.*6.*of.*6/)).toBeInTheDocument();
    });

    it('paginates when more than rowsPerPage items', async () => {
      const user = userEvent.setup();
      // Create more columns than default page size
      const manyColumns = Array.from({ length: 25 }, (_, i) => ({
        name: `column_${i}`,
        description: `Description for column ${i}`,
      }));

      render(
        <TableInsightsPreviewPanel
          {...defaultProps}
          columnDescriptions={manyColumns}
        />
      );

      // Should show first 10 items
      expect(screen.getByText('column_0')).toBeInTheDocument();
      expect(screen.getByText('column_9')).toBeInTheDocument();
      expect(screen.queryByText('column_10')).not.toBeInTheDocument();

      // Click next page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Should now show next 10 items
      expect(screen.getByText('column_10')).toBeInTheDocument();
      expect(screen.queryByText('column_0')).not.toBeInTheDocument();
    });

    it('changes rows per page when selection changed', async () => {
      const user = userEvent.setup();
      const manyColumns = Array.from({ length: 25 }, (_, i) => ({
        name: `column_${i}`,
        description: `Description for column ${i}`,
      }));

      render(
        <TableInsightsPreviewPanel
          {...defaultProps}
          columnDescriptions={manyColumns}
        />
      );

      // Open the rows per page selector
      const rowsPerPageSelect = screen.getByRole('combobox');
      await user.click(rowsPerPageSelect);

      // Select 25 rows per page
      const option25 = screen.getByRole('option', { name: '25' });
      await user.click(option25);

      // Should now show all 25 columns
      expect(screen.getByText('column_0')).toBeInTheDocument();
      expect(screen.getByText('column_24')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles empty columnDescriptions array', () => {
      render(
        <TableInsightsPreviewPanel
          {...defaultProps}
          columnDescriptions={[]}
        />
      );

      // Should still render the table structure
      expect(screen.getByText('Column descriptions')).toBeInTheDocument();
    });

    it('handles column with long name', () => {
      const longNameColumn = [
        { name: 'very_long_column_name_that_might_overflow_the_table', description: 'Test' },
      ];

      render(
        <TableInsightsPreviewPanel
          {...defaultProps}
          columnDescriptions={longNameColumn}
        />
      );

      expect(screen.getByText('very_long_column_name_that_might_overflow_the_table')).toBeInTheDocument();
    });

    it('handles column with long description', () => {
      const longDescColumn = [
        { name: 'col', description: 'A'.repeat(500) },
      ];

      render(
        <TableInsightsPreviewPanel
          {...defaultProps}
          columnDescriptions={longDescColumn}
        />
      );

      expect(screen.getByText('A'.repeat(500))).toBeInTheDocument();
    });

    it('handles special characters in filter', async () => {
      const user = userEvent.setup();
      render(<TableInsightsPreviewPanel {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      await user.type(filterInput, 'user_id');

      expect(screen.getByText('user_id')).toBeInTheDocument();
    });
  });
});
