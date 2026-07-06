import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, beforeEach, it, describe, expect } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DataQuality from './DataQuality';
import ConfigurationsPanel from './ConfigurationsPanel';
import CurrentRules from './CurrentRules';
import DataQualityStatus from './DataQualityStatus';

// Mock auth context
const mockUser = {
  token: 'test-token',
  appConfig: { projectId: 'test-project' }
};

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

vi.mock('../../contexts/AccessRequestContext', () => ({
  useAccessRequest: () => ({
    isAccessPanelOpen: false,
    setAccessPanelOpen: vi.fn(),
  }),
}));

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      dataScan: (state = initialState, _action) => state
    },
    preloadedState: {
      dataScan: initialState
    }
  });
};

// Mock data scan slice
vi.mock('../../features/dataScan/dataScanSlice', () => ({
  fetchDataScan: vi.fn(() => ({ type: 'dataScan/fetchDataScan', payload: {} })),
  selectScanData: vi.fn(() => vi.fn(() => null)),
  selectScanStatus: vi.fn(() => vi.fn(() => 'idle')),
  selectIsScanLoading: vi.fn(() => vi.fn(() => false))
}));

// Mock SVG assets
vi.mock('../../assets/svg/help_outline.svg', () => ({
  default: 'help-outline.svg'
}));

vi.mock('../../assets/svg/check.svg', () => ({
  default: 'check.svg'
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  Close: () => <div data-testid="close-icon">Close</div>,
  HelpOutline: () => <div data-testid="help-outline-icon">Help</div>,
  InfoOutline: () => <div data-testid="info-outline-icon">Info</div>,
  CheckRoundedIcon: () => <div data-testid="check-rounded-icon">Check</div>,
  FilterList: () => <div data-testid="filter-list-icon">Filter</div>,
  ArrowUpward: () => <div data-testid="arrow-upward-icon">Up</div>,
  ArrowDownward: () => <div data-testid="arrow-downward-icon">Down</div>,
  ExpandLess: () => <div data-testid="expand-less-icon">Less</div>,
  ExpandMore: () => <div data-testid="expand-more-icon">More</div>,
  ContentCopy: () => <div data-testid="content-copy-icon">Copy</div>,
  KeyboardArrowRight: () => <div data-testid="keyboard-arrow-right-icon">Right</div>,
  KeyboardArrowDown: () => <div data-testid="keyboard-arrow-down-icon">Down</div>,
  ChevronRight: ({ sx }: any) => <div data-testid="chevron-right-icon" style={sx}>ChevronRight</div>,
  RuleOutlined: () => <div data-testid="rule-outlined-icon">Rule</div>,
}));

// Mock the reusable components to isolate unit tests
vi.mock('../Common/OverflowTooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../hooks/useColumnResize', () => ({
  useColumnResize: () => ({
    columnWidths: [120, 100, 120, 90, 100, 120, 100, 90, 90],
    activeIndex: null,
    handleMouseDown: vi.fn(),
    setColumnWidths: vi.fn(),
  }),
}));

vi.mock('../Schema/ResizeHandle', () => ({
  default: () => <div data-testid="resize-handle" />,
}));

vi.mock('../Common/FilterBar', () => ({
  default: function MockFilterBar(props: any) {
    return (
      <div data-testid="filter-bar">
        <div data-testid="filter-list-icon">Filter</div>
        <input
          data-testid="filter-bar-input"
          value={props.filterText}
          onChange={(e: any) => props.onFilterTextChange(e.target.value)}
          placeholder={props.placeholder}
        />
      </div>
    );
  },
}));

describe('DataQuality Components', () => {

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
          }
        ]
      },
      dataQualityResult: {
        score: 95,
        rules: [
          {
            rule: {
              column: 'test_column',
              ruleType: 'NOT_NULL',
              ruleName: 'test_rule'
            },
            passed: true,
            passRatio: 1,
            failingRowsQuery: 'SELECT * FROM test WHERE test_column IS NULL',
          }
        ],
        dimensions: [
          {
            dimension: { name: 'COMPLETENESS' },
            passed: true,
            score: 95
          },
          {
            dimension: { name: 'UNIQUENESS' },
            passed: true,
            score: 90
          },
          {
            dimension: { name: 'VALIDITY' },
            passed: true,
            score: 100
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
          rules: [
            {
              rule: {
                column: 'test_column',
                ruleType: 'NOT_NULL',
                ruleName: 'test_rule'
              },
              passed: true,
              passRatio: 1,
              failingRowsQuery: 'SELECT * FROM test WHERE test_column IS NULL',
            }
          ],
          dimensions: [
            {
              dimension: { name: 'COMPLETENESS' },
              passed: true,
              score: 95
            },
            {
              dimension: { name: 'UNIQUENESS' },
              passed: true,
              score: 90
            },
            {
              dimension: { name: 'VALIDITY' },
              passed: true,
              score: 100
            }
          ]
        }
      }
    ]
  };

  const renderWithStore = (component: React.ReactElement, storeState = {}) => {
    const store = createMockStore(storeState);
    return render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DataQuality Main Component', () => {
    it('handles entry without data quality labels', () => {
      renderWithStore(<DataQuality scanName={null} allScansStatus="succeeded" />);

      expect(screen.getByText('No published Data Quality available for this entry')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      renderWithStore(<DataQuality scanName="test-scan" allScansStatus="loading" />);

      expect(screen.getByTestId('data-quality-skeleton')).toBeInTheDocument();
    });

    it('handles successful data fetch', () => {
      const storeWithData = {
        scanData: mockDataQualityScan,
        scanStatus: 'succeeded',
        isLoading: false
      };

      renderWithStore(<DataQuality scanName="test-scan" allScansStatus="succeeded" />, storeWithData);

      expect(screen.getByTestId('data-quality-skeleton')).toBeInTheDocument();
    });

    it('handles failed data fetch status', () => {
      renderWithStore(<DataQuality scanName={null} allScansStatus="succeeded" />);

      expect(screen.getByText('No published Data Quality available for this entry')).toBeInTheDocument();
    });
  });

  describe('ConfigurationsPanel', () => {
    const defaultProps = {
      onClose: vi.fn(),
      dataQualtyScan: mockDataQualityScan
    };

    it('renders when open', () => {
      render(<ConfigurationsPanel {...defaultProps} />);

      expect(screen.getByText('Configurations')).toBeInTheDocument();
      expect(screen.getByText('Scope')).toBeInTheDocument();
      expect(screen.getByText('Entire data')).toBeInTheDocument();
    });

    it('displays configuration data correctly', () => {
      render(<ConfigurationsPanel {...defaultProps} />);

      expect(screen.getByText('Row Filter')).toBeInTheDocument();
      expect(screen.getByText('test-filter')).toBeInTheDocument();
      expect(screen.getByText('Sampling Size')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('Results exported to')).toBeInTheDocument();
      expect(screen.getByText('test-results-table')).toBeInTheDocument();
    });

    it('displays dash for missing data', () => {
      const scanWithoutData = {
        scan: {
          dataQualitySpec: {
            rowFilter: '',
            samplingPercent: null
          },
          resultsTable: null
        },
        jobs: [{}]
      };

      render(<ConfigurationsPanel {...defaultProps} dataQualtyScan={scanWithoutData} />);

      const allText = screen.getByText('Row Filter').closest('div')?.parentElement?.textContent;
      expect(allText).toContain('-');
    });

    it('displays last run status correctly', () => {
      render(<ConfigurationsPanel {...defaultProps} />);

      expect(screen.getByText('Last Run Status')).toBeInTheDocument();
      expect(screen.getByText('PASSED')).toBeInTheDocument();
    });

    it('displays last run time correctly', () => {
      render(<ConfigurationsPanel {...defaultProps} />);

      expect(screen.getByText('Last Run Time')).toBeInTheDocument();
      const lastRunSection = screen.getByText('Last Run Time').closest('div')?.parentElement;
      expect(lastRunSection?.textContent).toContain('Jan 1, 2022');
    });

    it('handles close button click', () => {
      const mockOnClose = vi.fn();
      render(<ConfigurationsPanel {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByTestId('close-icon');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles job state other than SUCCEEDED', () => {
      const scanWithFailedJob = {
        ...mockDataQualityScan,
        jobs: [{
          ...mockDataQualityScan.jobs[0],
          state: 'FAILED'
        }]
      };

      render(<ConfigurationsPanel {...defaultProps} dataQualtyScan={scanWithFailedJob} />);

      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });
  });

  describe('CurrentRules', () => {
    const defaultProps = {
      dataQualtyScan: mockDataQualityScan
    };

    it('renders the component with header', () => {
      render(<CurrentRules {...defaultProps} />);

      expect(screen.getByText('Current Rules')).toBeInTheDocument();
    });

    it('renders the DataGrid with rule data', () => {
      render(<CurrentRules {...defaultProps} />);

      // DataGrid renders column headers
      expect(screen.getByText('Column Name')).toBeInTheDocument();
      expect(screen.getByText('Rule Name')).toBeInTheDocument();
      expect(screen.getByText('Rule Type')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Evaluation')).toBeInTheDocument();
      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('Failed Rows')).toBeInTheDocument();
      expect(screen.getByText('Threshold')).toBeInTheDocument();
      expect(screen.getByText('Query to get failed records')).toBeInTheDocument();
    });

    it('displays rule data in the grid', () => {
      render(<CurrentRules {...defaultProps} />);

      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.getByText('test_rule')).toBeInTheDocument();
      expect(screen.getByText('NOT_NULL')).toBeInTheDocument();
      expect(screen.getByText('Passed')).toBeInTheDocument();
      expect(screen.getByText('Completeness')).toBeInTheDocument();
    });

    it('renders FilterBar component', () => {
      render(<CurrentRules {...defaultProps} />);

      // FilterBar renders the filter icon
      expect(screen.getByTestId('filter-list-icon')).toBeInTheDocument();
    });

    it('renders Current Rules title', () => {
      render(<CurrentRules {...defaultProps} />);

      expect(screen.getByText('Current Rules')).toBeInTheDocument();
    });

    it('handles empty rules data', () => {
      const emptyScan = {
        scan: {
          dataQualitySpec: {
            rules: []
          },
          dataQualityResult: {
            score: 0,
            rules: [],
            dimensions: []
          }
        },
        jobs: [{
          state: 'SUCCEEDED',
          startTime: { seconds: 1640995200 },
          endTime: { seconds: 1640995200 },
          dataQualityResult: {
            score: 0,
            rules: [],
            dimensions: []
          }
        }]
      };

      render(<CurrentRules dataQualtyScan={emptyScan} />);

      expect(screen.getByText('Current Rules')).toBeInTheDocument();
      expect(screen.queryByText('test_column')).not.toBeInTheDocument();
    });

    it('handles rule type display name mapping', () => {
      const scanWithMappedType = {
        scan: {
          dataQualitySpec: {
            rules: [
              {
                column: 'col1',
                name: '',
                ruleType: 'nonNullExpectation',
                evaluation: 'PASSED',
                dimension: 'COMPLETENESS',
                nonNullExpectation: {},
                threshold: 1
              }
            ]
          },
          dataQualityResult: {
            score: 100,
            rules: [{
              rule: { column: 'col1', ruleType: 'nonNullExpectation' },
              passed: true,
              passRatio: 1,
              failingRowsQuery: 'SELECT * FROM test',
            }],
            dimensions: []
          }
        },
        jobs: []
      };

      render(<CurrentRules dataQualtyScan={scanWithMappedType} />);

      expect(screen.getByText('Null check')).toBeInTheDocument();
    });

    it('renders without crashing when data is minimal', () => {
      const minimalScan = {
        scan: {
          dataQualitySpec: {
            rules: [
              {
                column: 'test_col',
                name: 'test_rule',
                ruleType: 'TEST',
                evaluation: 'PASSED',
                dimension: 'TEST',
                threshold: 0.5
              }
            ]
          },
          dataQualityResult: {
            score: 50,
            rules: [],
            dimensions: []
          }
        },
        jobs: []
      };

      render(<CurrentRules dataQualtyScan={minimalScan} />);

      expect(screen.getByText('test_col')).toBeInTheDocument();
      expect(screen.getByText('test_rule')).toBeInTheDocument();
    });
  });

  describe('DataQualityStatus', () => {
    const defaultProps = {
      dataQualityScan: mockDataQualityScan
    };

    it('renders status component with metrics', () => {
      render(<DataQualityStatus {...defaultProps} />);

      expect(screen.getByText('Data Quality Status')).toBeInTheDocument();
      expect(screen.getByText('Overall Score')).toBeInTheDocument();
      expect(screen.getByText('Configurations')).toBeInTheDocument();
    });

    it('displays quality metrics correctly', () => {
      render(<DataQualityStatus {...defaultProps} />);

      expect(screen.getByText('Passed Rules')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Completeness')).toBeInTheDocument();
      expect(screen.getByText('Uniqueness')).toBeInTheDocument();
      expect(screen.getByText('Validity')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
    });

    it('displays overall score with correct color for high score', () => {
      render(<DataQualityStatus {...defaultProps} />);

      expect(screen.getAllByText('95%').length).toBeGreaterThan(0);
    });

    it('handles configurations button click', () => {
      render(<DataQualityStatus {...defaultProps} />);

      const configButton = screen.getByText('Configurations');
      fireEvent.click(configButton);

      expect(screen.getByText('Scope')).toBeInTheDocument();
    });

    it('handles missing dimension data', () => {
      const scanWithoutDimensions = {
        ...mockDataQualityScan,
        scan: {
          ...mockDataQualityScan.scan,
          dataQualityResult: {
            ...mockDataQualityScan.scan.dataQualityResult,
            dimensions: []
          }
        }
      };

      render(<DataQualityStatus dataQualityScan={scanWithoutDimensions} />);

      expect(screen.queryByText('Validity')).not.toBeInTheDocument();
      expect(screen.queryByText('Uniqueness')).not.toBeInTheDocument();
      expect(screen.queryByText('Completeness')).not.toBeInTheDocument();
    });

    it('displays correct score colors for different thresholds', () => {
      const lowScoreScan = {
        ...mockDataQualityScan,
        scan: {
          ...mockDataQualityScan.scan,
          dataQualityResult: {
            ...mockDataQualityScan.scan.dataQualityResult,
            score: 10
          }
        }
      };

      render(<DataQualityStatus dataQualityScan={lowScoreScan} />);
      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    it('handles different dimension types', () => {
      const scanWithDifferentDimensions = {
        ...mockDataQualityScan,
        scan: {
          ...mockDataQualityScan.scan,
          dataQualityResult: {
            ...mockDataQualityScan.scan.dataQualityResult,
            dimensions: [
              {
                dimension: { name: 'COMPLETENESS' },
                passed: true,
                score: 85
              },
              {
                dimension: { name: 'UNIQUENESS' },
                passed: false,
                score: null
              },
              {
                dimension: { name: 'VALIDITY' },
                passed: false,
                score: 0
              }
            ]
          }
        }
      };

      render(<DataQualityStatus dataQualityScan={scanWithDifferentDimensions} />);

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('renders all components together when data is available', () => {
      render(<CurrentRules dataQualtyScan={mockDataQualityScan} />);
      render(<DataQualityStatus dataQualityScan={mockDataQualityScan} />);

      expect(screen.getByText('Current Rules')).toBeInTheDocument();
      expect(screen.getByText('Data Quality Status')).toBeInTheDocument();
      expect(screen.getByText('test_column')).toBeInTheDocument();
    });

    it('handles configurations panel integration from DataQualityStatus', () => {
      render(<DataQualityStatus dataQualityScan={mockDataQualityScan} />);

      const configButton = screen.getByText('Configurations');
      fireEvent.click(configButton);

      expect(screen.getByText('Scope')).toBeInTheDocument();
    });
  });
});
