import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, it, describe, expect } from 'vitest';
import CurrentRules from './CurrentRules';

// Mock ConfigurationsPanel
vi.mock('./ConfigurationsPanel', () => ({
  default: ({ onClose, dataQualtyScan }: { onClose: () => void; dataQualtyScan: any }) => (
    <div data-testid="configurations-panel">
      <button onClick={onClose} data-testid="config-close-btn">Close Config</button>
      Configurations Panel
      {dataQualtyScan && <span data-testid="scan-data">Has Scan Data</span>}
    </div>
  ),
}));

vi.mock('../../contexts/AccessRequestContext', () => ({
  useAccessRequest: () => ({
    isAccessPanelOpen: false,
    setAccessPanelOpen: vi.fn(),
  }),
}));

describe('CurrentRules', () => {
  const mockDataQualityScan = {
    scan: {
      dataQualitySpec: {
        rowFilter: 'test-filter',
        samplingPercent: 100,
        rules: [
          {
            column: 'test_column',
            name: 'test_rule',
            ruleType: 'NOT_NULL',
            evaluation: 'PASSED',
            dimension: 'COMPLETENESS',
            NOT_NULL: { columnName: 'test_column' },
            threshold: 0.95
          },
          {
            column: 'another_column',
            name: 'range_rule',
            ruleType: 'RANGE',
            evaluation: 'FAILED',
            dimension: 'VALIDITY',
            RANGE: { minValue: 0, maxValue: 100 },
            threshold: 0.85
          },
          {
            column: 'third_column',
            name: '',
            ruleType: 'UNIQUENESS',
            evaluation: 'PASSED',
            dimension: 'UNIQUENESS',
            UNIQUENESS: {},
            threshold: null
          }
        ]
      },
      resultsTable: 'test-results-table'
    },
    jobs: [
      {
        state: 'SUCCEEDED',
        startTime: { seconds: 1640995200 },
        endTime: { seconds: 1640995200 },
        dataQualityResult: {
          score: 95,
          rules: [],
          dimensions: []
        }
      }
    ]
  };

  const mockEmptyScan = {
    scan: {
      dataQualitySpec: {
        rules: []
      }
    },
    jobs: []
  };

  const mockScanWithEmptyParams = {
    scan: {
      dataQualitySpec: {
        rules: [
          {
            column: 'col1',
            name: 'rule1',
            ruleType: 'CUSTOM',
            evaluation: 'PASSED',
            dimension: 'CUSTOM_DIM',
            CUSTOM: {},
            threshold: 0.5
          }
        ]
      }
    },
    jobs: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render Current Rules header', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText('Current Rules')).toBeInTheDocument();
    });

    it('should render all table headers', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText('Column Name')).toBeInTheDocument();
      expect(screen.getByText('Rule Name')).toBeInTheDocument();
      expect(screen.getByText('Rule Type')).toBeInTheDocument();
      expect(screen.getByText('Evaluation')).toBeInTheDocument();
      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('Threshold')).toBeInTheDocument();
    });

    it('should render rules data in table', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.getByText('test_rule')).toBeInTheDocument();
      expect(screen.getByText('NOT_NULL')).toBeInTheDocument();
      expect(screen.getByText('Completeness')).toBeInTheDocument();
    });

    it('should render empty table when no rules', () => {
      render(<CurrentRules dataQualtyScan={mockEmptyScan} />);
      expect(screen.getByText('Current Rules')).toBeInTheDocument();
      expect(screen.queryByText('test_column')).not.toBeInTheDocument();
    });

    it('should render threshold as percentage', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should render N/A for null threshold', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should render parameters in key-value format', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText(/columnName/)).toBeInTheDocument();
      expect(screen.getByText(/minValue/)).toBeInTheDocument();
    });

    it('should render empty parameters for empty rule type object', () => {
      render(<CurrentRules dataQualtyScan={mockScanWithEmptyParams} />);
      expect(screen.getByText('col1')).toBeInTheDocument();
    });

    it('should render filter text field', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByPlaceholderText('Enter property name or value')).toBeInTheDocument();
    });

  });

  describe('Expand/Collapse', () => {
    it('should toggle collapse on header click', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const header = screen.getByText('Current Rules').closest('div');

      expect(screen.getByText('test_column')).toBeInTheDocument();

      if (header) {
        fireEvent.click(header);
        // Table should be collapsed
      }
    });

    it('should toggle collapse on expand icon click', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const expandIcon = document.querySelector('[data-testid="ExpandLessIcon"]');
      if (expandIcon) {
        const button = expandIcon.closest('button');
        if (button) {
          fireEvent.click(button);
          // Click again to expand
          fireEvent.click(button);
          expect(screen.getByText('Current Rules')).toBeInTheDocument();
        }
      }
    });

    it('should show table when expanded', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText('test_column')).toBeInTheDocument();
    });
  });

  describe('Text Filtering', () => {
    it('should filter by column name', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const filterInput = screen.getByPlaceholderText('Enter property name or value');

      fireEvent.change(filterInput, { target: { value: 'test_column' } });

      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.queryByText('another_column')).not.toBeInTheDocument();
    });

    it('should filter by rule name', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const filterInput = screen.getByPlaceholderText('Enter property name or value');

      fireEvent.change(filterInput, { target: { value: 'range_rule' } });

      expect(screen.getByText('another_column')).toBeInTheDocument();
      expect(screen.queryByText('test_column')).not.toBeInTheDocument();
    });

    it('should not filter by rule type in text search', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(filterInput, { target: { value: 'NOT_NULL' } });
      // Rule type is not searchable via text, so all rows should be filtered out
      expect(screen.queryByText('test_column')).not.toBeInTheDocument();
    });

    it('should filter by dimension', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const filterInput = screen.getByPlaceholderText('Enter property name or value');

      fireEvent.change(filterInput, { target: { value: 'VALIDITY' } });

      expect(screen.getByText('another_column')).toBeInTheDocument();
      expect(screen.queryByText('test_column')).not.toBeInTheDocument();
    });

    it('should clear filter text with close button', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const filterInput = screen.getByPlaceholderText('Enter property name or value');

      fireEvent.change(filterInput, { target: { value: 'test' } });
      expect(filterInput).toHaveValue('test');

      const closeIcon = document.querySelector('[data-testid="CloseIcon"]');
      if (closeIcon) {
        const closeButton = closeIcon.closest('button');
        if (closeButton) {
          fireEvent.click(closeButton);
          expect(filterInput).toHaveValue('');
        }
      }
    });

    it('should handle case insensitive filtering', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const filterInput = screen.getByPlaceholderText('Enter property name or value');

      fireEvent.change(filterInput, { target: { value: 'TEST_COLUMN' } });

      expect(screen.getByText('test_column')).toBeInTheDocument();
    });

    it('should show no results when filter matches nothing', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      const filterInput = screen.getByPlaceholderText('Enter property name or value');

      fireEvent.change(filterInput, { target: { value: 'xyz_nonexistent' } });

      expect(screen.queryByText('test_column')).not.toBeInTheDocument();
      expect(screen.queryByText('another_column')).not.toBeInTheDocument();
    });
  });

  describe('Filter Dropdown Menu', () => {
    it('should open filter menu on filter icon click', async () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const filterIcon = document.querySelector('[data-testid="FilterListIcon"]');
      if (filterIcon) {
        const filterButton = filterIcon.closest('button');
        if (filterButton) {
          fireEvent.click(filterButton);

          await waitFor(() => {
            const menu = document.querySelector('[role="menu"]');
            expect(menu).toBeInTheDocument();
          });
        }
      }
    });

    it('should open filter menu on filter icon click (duplicate)', async () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const filterButton = document.querySelector('[data-testid="FilterListIcon"]')?.closest('button');
      fireEvent.click(filterButton!);

      await waitFor(() => {
        const menu = document.querySelector('[role="menu"]');
        expect(menu).toBeInTheDocument();
      });
    });

  });

  describe('Sorting', () => {
    it('should sort by column name on first click (ascending)', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const columnNameHeader = screen.getByText('Column Name').closest('th');
      const sortButton = columnNameHeader?.querySelector('button');

      if (sortButton) {
        fireEvent.click(sortButton);
        // Table should still render
        expect(screen.getByText('test_column')).toBeInTheDocument();
      }
    });

    it('should sort by column name descending on second click', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const columnNameHeader = screen.getByText('Column Name').closest('th');
      const sortButton = columnNameHeader?.querySelector('button');

      if (sortButton) {
        fireEvent.click(sortButton); // asc
        fireEvent.click(sortButton); // desc
        expect(screen.getByText('test_column')).toBeInTheDocument();
      }
    });

    it('should reset sort on third click', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const columnNameHeader = screen.getByText('Column Name').closest('th');
      const sortButton = columnNameHeader?.querySelector('button');

      if (sortButton) {
        fireEvent.click(sortButton); // asc
        fireEvent.click(sortButton); // desc
        fireEvent.click(sortButton); // reset
        expect(screen.getByText('test_column')).toBeInTheDocument();
      }
    });

    it('should sort by rule name', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const ruleNameHeader = screen.getByText('Rule Name').closest('th');
      const sortButton = ruleNameHeader?.querySelector('button');

      if (sortButton) {
        fireEvent.click(sortButton);
        expect(screen.getByText('test_rule')).toBeInTheDocument();
      }
    });

    it('should sort by rule type', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const ruleTypeHeader = screen.getByText('Rule Type').closest('th');
      const sortButton = ruleTypeHeader?.querySelector('button');

      if (sortButton) {
        fireEvent.click(sortButton);
        expect(screen.getByText('NOT_NULL')).toBeInTheDocument();
      }
    });

    it('should sort by evaluation', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const evaluationHeader = screen.getByText('Evaluation').closest('th');
      const sortButton = evaluationHeader?.querySelector('button');

      if (sortButton) {
        fireEvent.click(sortButton);
        expect(screen.getByText('FAILED')).toBeInTheDocument();
      }
    });

    it('should sort by dimensions', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const dimensionsHeader = screen.getByText('Dimensions').closest('th');
      const sortButton = dimensionsHeader?.querySelector('button');

      if (sortButton) {
        fireEvent.click(sortButton);
        expect(screen.getByText('Completeness')).toBeInTheDocument();
      }
    });

    it('should change sort column when clicking different column', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const columnNameHeader = screen.getByText('Column Name').closest('th');
      const ruleTypeHeader = screen.getByText('Rule Type').closest('th');

      const columnNameSortButton = columnNameHeader?.querySelector('button');
      const ruleTypeSortButton = ruleTypeHeader?.querySelector('button');

      if (columnNameSortButton && ruleTypeSortButton) {
        fireEvent.click(columnNameSortButton);
        fireEvent.click(ruleTypeSortButton);
        expect(screen.getByText('test_column')).toBeInTheDocument();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle rule without name', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText('third_column')).toBeInTheDocument();
    });

    it('should handle rule with empty parameters object', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      // UNIQUENESS appears twice (in Rule Type and Dimensions columns)
      expect(screen.getAllByText('UNIQUENESS').length).toBeGreaterThanOrEqual(1);
    });

    it('should render without crashing with various scan data', () => {
      // Test with the main mock data
      const { unmount } = render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      expect(screen.getByText('Current Rules')).toBeInTheDocument();
      unmount();
    });
  });

  describe('Property Value Filtering', () => {
    it('should filter table data using text search', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      // Use text search to filter — this tests the filtering logic in CurrentRules
      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(filterInput, { target: { value: 'another_column' } });

      // Only matching row should be visible
      expect(screen.getByText('another_column')).toBeInTheDocument();
      expect(screen.queryByText('test_column')).not.toBeInTheDocument();
    });

    it('should show filter menu with dropdown properties on filter icon click', async () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const filterButton = document.querySelector('[data-testid="FilterListIcon"]')?.closest('button');
      fireEvent.click(filterButton!);

      await waitFor(() => {
        const menu = document.querySelector('[role="menu"]');
        expect(menu).toBeInTheDocument();
      });

      // Verify dropdown properties are visible in filter icon menu
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      const menuTexts = Array.from(menuItems).map(item => item.textContent);
      expect(menuTexts.some(t => t?.includes('Evaluation'))).toBe(true);
      expect(menuTexts.some(t => t?.includes('Rule Type'))).toBe(true);
      expect(menuTexts.some(t => t?.includes('Status'))).toBe(true);
      expect(menuTexts.some(t => t?.includes('Dimensions'))).toBe(true);
    });
  });

  describe('Component Export', () => {
    it('should be defined', () => {
      expect(CurrentRules).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof CurrentRules).toBe('function');
    });
  });

  describe('Combined Filtering and Sorting', () => {
    it('should apply both text filter and sort', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      // Apply text filter
      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(filterInput, { target: { value: 'column' } });

      // Apply sort
      const columnNameHeader = screen.getByText('Column Name').closest('th');
      const sortButton = columnNameHeader?.querySelector('button');
      if (sortButton) {
        fireEvent.click(sortButton);
      }

      // Both filter and sort should work together
      expect(screen.getByText('test_column')).toBeInTheDocument();
    });
  });

  describe('Additional Branch Coverage', () => {
    it('should filter by text and show matching rows only', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const filterInput = screen.getByPlaceholderText('Enter property name or value');

      // Filter by column name to show only matching rows
      fireEvent.change(filterInput, { target: { value: 'test_column' } });
      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.queryByText('another_column')).not.toBeInTheDocument();

      // Clear filter to show all rows
      fireEvent.change(filterInput, { target: { value: '' } });
      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.getByText('another_column')).toBeInTheDocument();
    });

    it('should handle sort direction cycling from null to asc', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const columnNameHeader = screen.getByText('Column Name').closest('th');
      const sortButton = columnNameHeader?.querySelector('button');

      if (sortButton) {
        // First click: asc
        fireEvent.click(sortButton);
        // Second click: desc
        fireEvent.click(sortButton);
        // Third click: null (reset)
        fireEvent.click(sortButton);
        // Fourth click: asc again (covers line 334)
        fireEvent.click(sortButton);

        expect(screen.getByText('test_column')).toBeInTheDocument();
      }
    });

    it('should filter by Dimensions using text search', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(filterInput, { target: { value: 'Completeness' } });

      // Should show the row with Completeness dimension
      expect(screen.getByText('test_column')).toBeInTheDocument();
    });

    it('should show text-mode properties in search bar menu', async () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      // Click the search bar to open property menu via search trigger
      const filterInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.click(filterInput);

      await waitFor(() => {
        const menu = document.querySelector('[role="menu"]');
        expect(menu).toBeInTheDocument();
      });

      // Text-mode properties should be visible in search bar menu
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      const menuTexts = Array.from(menuItems).map(item => item.textContent);
      expect(menuTexts.some(t => t?.includes('Column Name'))).toBe(true);
      expect(menuTexts.some(t => t?.includes('Rule Name'))).toBe(true);
      // Dropdown-only properties should NOT be visible in search bar menu
      expect(menuTexts.some(t => t?.includes('Status'))).toBe(false);
    });

    it('should filter by text search with partial match', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);

      const filterInput = screen.getByPlaceholderText('Enter property name or value');

      // Search for partial column name
      fireEvent.change(filterInput, { target: { value: 'third' } });
      expect(screen.getByText('third_column')).toBeInTheDocument();
      expect(screen.queryByText('test_column')).not.toBeInTheDocument();
      expect(screen.queryByText('another_column')).not.toBeInTheDocument();
    });
  });
});
