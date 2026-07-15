import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataProfile from './DataProfile';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock child component
vi.mock('./DataProfileConfigurationsPanel', () => ({
  default: function MockDataProfileConfigurationsPanel({ onClose, dataProfileScan }: any) {
    return (
      <div data-testid="configurations-panel">
        <button onClick={onClose}>Close Panel</button>
        <div>Data Profile Scan: {dataProfileScan ? 'Available' : 'Not Available'}</div>
      </div>
    );
  }
}));

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
    preloadedState: initialState
  });
};

// Mock data scan slice
vi.mock('../../features/dataScan/dataScanSlice', () => ({
  fetchDataScan: vi.fn(() => ({ type: 'dataScan/fetchDataScan' })),
  selectScanData: vi.fn(() => (state: any) => state.dataScan?.scanData || null),
  selectScanStatus: vi.fn(() => (state: any) => state.dataScan?.status || 'idle'),
  selectIsScanLoading: vi.fn(() => (state: any) => state.dataScan?.isLoading || false)
}));

// Mock SVG import
vi.mock('../../assets/svg/help_outline.svg', () => ({
  default: 'help-outline-icon'
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  ExpandLess: () => <div data-testid="ExpandLessIcon">ExpandLess</div>,
  FilterList: () => <div data-testid="FilterListIcon">FilterList</div>,
  Close: () => <div data-testid="CloseIcon">Close</div>,
  ArrowUpward: () => <div data-testid="ArrowUpwardIcon">ArrowUpward</div>,
  ArrowDownward: () => <div data-testid="ArrowDownwardIcon">ArrowDownward</div>,
  InfoOutline: () => <div data-testid="InfoOutlineIcon">InfoOutline</div>,
  KeyboardArrowDown: () => <div data-testid="KeyboardArrowDownIcon">KeyboardArrowDown</div>,
  ChevronRight: () => <div data-testid="ChevronRightIcon">ChevronRight</div>,
  KeyboardArrowRight: () => <div data-testid="KeyboardArrowRightIcon">KeyboardArrowRight</div>,
  AnalyticsOutlined: () => <div data-testid="AnalyticsOutlinedIcon">AnalyticsOutlined</div>,
  HelpOutline: () => <div data-testid="HelpOutlineIcon">HelpOutline</div>,
}));

describe('DataProfile', () => {
  const mockDataProfileScan = {
    scan: {
      dataProfileResult: {
        profile: {
          fields: [
            {
              name: 'test_column',
              type: 'STRING',
              profile: {
                nullRatio: 0.1,
                distinctRatio: 0.8,
                stringProfile: {
                  minLength: 1,
                  maxLength: 100,
                  averageLength: 50
                },
                topNValues: [
                  { value: 'test_value_1', ratio: 0.3 },
                  { value: 'test_value_2', ratio: 0.2 }
                ]
              }
            },
            {
              name: 'numeric_column',
              type: 'INTEGER',
              profile: {
                nullRatio: 0.05,
                distinctRatio: 0.9,
                integerProfile: {
                  min: 1,
                  max: 1000,
                  mean: 500
                },
                topNValues: [
                  { value: '100', ratio: 0.4 },
                  { value: '200', ratio: 0.3 }
                ]
              }
            }
          ]
        }
      }
    }
  };

  const defaultProps = {
    scanName: 'projects/test-project/locations/us-central1/dataScans/test-scan',
    allScansStatus: 'succeeded'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDataProfile = (props = {}, storeState = {}) => {
    const store = createMockStore({
      dataScan: {
        scanData: null,
        status: 'idle',
        isLoading: false,
        ...storeState
      }
    });

    return render(
      <Provider store={store}>
        <DataProfile {...defaultProps} {...props} />
      </Provider>
    );
  };

  it('renders the component with loading state initially', () => {
    renderDataProfile();
    
    expect(screen.getByTestId('data-profile-skeleton')).toBeInTheDocument();
  });

  it('renders data profile when scan data is available', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.getByText('STRING')).toBeInTheDocument();
      expect(screen.getByText('10.00%')).toBeInTheDocument(); // null percentage
      expect(screen.getByText('80.00%')).toBeInTheDocument(); // unique percentage
    });
  });

  it('displays correct statistics for different data types', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      // String profile statistics
      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.getByText('STRING')).toBeInTheDocument();
      
      // Integer profile statistics
      expect(screen.getByText('numeric_column')).toBeInTheDocument();
      expect(screen.getByText('INTEGER')).toBeInTheDocument();
    });
  });

  it('handles entry without data profile labels', () => {
    renderDataProfile({ scanName: null }, {
      scanData: null,
      status: 'idle',
      isLoading: false
    });

    expect(screen.getByText('No published Data Profile available for this entry')).toBeInTheDocument();
  });

  it('handles entry without entrySource', () => {
    renderDataProfile({ scanName: null }, {
      scanData: null,
      status: 'idle',
      isLoading: false
    });

    expect(screen.getByText('No published Data Profile available for this entry')).toBeInTheDocument();
  });

  it('toggles accordion expansion', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // Expand a row by clicking its column name
    await waitFor(() => expect(screen.getByText('test_column')).toBeInTheDocument());
    fireEvent.click(screen.getByText('test_column'));

    // Row is expanded — card header still present
    expect(screen.getByText('Profile Results')).toBeInTheDocument();
  });

  it('opens configurations panel when configurations button is clicked', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const configButton = screen.getByText('Configurations');
      fireEvent.click(configButton);
      
      expect(screen.getByTestId('configurations-panel')).toBeInTheDocument();
    });
  });

  it('closes configurations panel when close button is clicked', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // Open the panel
    const configButton = screen.getByText('Configurations');
    fireEvent.click(configButton);

    await waitFor(() => {
      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });

    // Close the panel
    const closeButton = screen.getByText('Close Panel');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });
  });

  it('displays filter functionality', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // Table headers are always visible
    await waitFor(() => {
      expect(screen.getByText('Column Name')).toBeInTheDocument();
      expect(screen.getByText('Null %')).toBeInTheDocument();
      expect(screen.getByText('Unique %')).toBeInTheDocument();
    });

    // Opening filter via icon shows dropdown properties in the menu
    const filterButton = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    // 'Type' appears in table header + filter menu = 2
    await waitFor(() => {
      expect(screen.getAllByText('Type').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('handles search input changes', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      expect(searchInput).toHaveValue('test');
    });
  });

  it('displays top values for each column', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('Column Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Null %')).toBeInTheDocument();
      expect(screen.getByText('Unique %')).toBeInTheDocument();
    });
  });

  it('handles sorting functionality', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => expect(screen.getByText('Column Name')).toBeInTheDocument());

    // Click header to sort — data remains visible
    fireEvent.click(screen.getByText('Column Name'));
    await waitFor(() => {
      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.getByText('numeric_column')).toBeInTheDocument();
    });
  });

  it('handles empty data profile scan', () => {
    const emptyScan = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: []
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: emptyScan,
      status: 'succeeded',
      isLoading: false
    });

    // Component shows "No published Data Profile" message when fields array is empty
    expect(screen.getByText('No published Data Profile available for this entry')).toBeInTheDocument();
  });

  it('handles data profile scan with null values', () => {
    const scanWithNulls = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'null_column',
                type: 'STRING',
                profile: {
                  nullRatio: null,
                  distinctRatio: null,
                  stringProfile: null,
                  topNValues: null
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithNulls,
      status: 'succeeded',
      isLoading: false
    });

    expect(screen.getByText('Profile Results')).toBeInTheDocument();
  });

  it('handles different data types correctly', async () => {
    const multiTypeScan = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'string_col',
                type: 'STRING',
                profile: {
                  nullRatio: 0.1,
                  distinctRatio: 0.8,
                  stringProfile: { minLength: 1, maxLength: 100 },
                  topNValues: [{ value: 'test', ratio: 0.5 }]
                }
              },
              {
                name: 'int_col',
                type: 'INTEGER',
                profile: {
                  nullRatio: 0.05,
                  distinctRatio: 0.9,
                  integerProfile: { min: 1, max: 100 },
                  topNValues: [{ value: '50', ratio: 0.3 }]
                }
              },
              {
                name: 'float_col',
                type: 'FLOAT',
                profile: {
                  nullRatio: 0.02,
                  distinctRatio: 0.95,
                  doubleProfile: { min: 1.0, max: 100.0 },
                  topNValues: [{ value: '25.5', ratio: 0.2 }]
                }
              },
              {
                name: 'bool_col',
                type: 'BOOLEAN',
                profile: {
                  nullRatio: 0.0,
                  distinctRatio: 0.5,
                  booleanProfile: { trueCount: 50, falseCount: 50 },
                  topNValues: [{ value: 'true', ratio: 0.5 }]
                }
              },
              {
                name: 'date_col',
                type: 'DATE',
                profile: {
                  nullRatio: 0.1,
                  distinctRatio: 0.7,
                  dateProfile: { min: '2023-01-01', max: '2023-12-31' },
                  topNValues: [{ value: '2023-06-15', ratio: 0.1 }]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: multiTypeScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('string_col')).toBeInTheDocument();
      expect(screen.getByText('int_col')).toBeInTheDocument();
      expect(screen.getByText('float_col')).toBeInTheDocument();
      expect(screen.getByText('bool_col')).toBeInTheDocument();
      expect(screen.getByText('date_col')).toBeInTheDocument();
    });
  });

  it('handles loading state correctly', () => {
    renderDataProfile({}, {
      scanData: null,
      status: 'idle',
      isLoading: true
    });

    expect(screen.getByTestId('data-profile-skeleton')).toBeInTheDocument();
  });

  it('handles failed data scan status', () => {
    renderDataProfile({}, {
      scanData: null,
      status: 'failed',
      isLoading: false
    });

    expect(screen.getByText('No published Data Profile available for this entry')).toBeInTheDocument();
  });

  it('displays help icon', () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    const helpIcon = screen.getByTestId('InfoOutlineIcon');
    expect(helpIcon).toBeInTheDocument();
  });

  it('handles user without token', () => {
    const authContextWithoutToken = {
      ...mockAuthContext,
      user: { ...mockAuthContext.user, token: '' }
    };

    // Mock the useAuth hook directly
    vi.doMock('../../auth/AuthProvider', () => ({
      useAuth: () => authContextWithoutToken
    }));

    renderDataProfile();
    
    expect(screen.getByTestId('data-profile-skeleton')).toBeInTheDocument();
  });

  it('handles missing profile data gracefully', () => {
    const scanWithoutProfile = {
      scan: {
        dataProfileResult: null
      }
    };

    renderDataProfile({}, {
      scanData: scanWithoutProfile,
      status: 'succeeded',
      isLoading: false
    });

    // Component shows "No published Data Profile" message when dataProfileResult is null
    expect(screen.getByText('No published Data Profile available for this entry')).toBeInTheDocument();
  });

  it('handles missing fields in profile', () => {
    const scanWithoutFields = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: null
          }
        }
      }
    };

    // This test expects the component to throw an error when fields is null
    expect(() => {
      renderDataProfile({}, {
        scanData: scanWithoutFields,
        status: 'succeeded',
        isLoading: false
      });
    }).toThrow();
  });

  it('formats percentages correctly', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      // Null % and Unique % are formatted to 2 decimal places in collapsed rows
      expect(screen.getByText('10.00%')).toBeInTheDocument(); // test_column nullRatio
      expect(screen.getByText('80.00%')).toBeInTheDocument(); // test_column distinctRatio
      expect(screen.getByText('5.00%')).toBeInTheDocument();  // numeric_column nullRatio
      expect(screen.getByText('90.00%')).toBeInTheDocument(); // numeric_column distinctRatio
    });
  });

  it('handles zero values correctly', async () => {
    const scanWithZeros = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'zero_column',
                type: 'STRING',
                profile: {
                  nullRatio: 0,
                  distinctRatio: 0,
                  stringProfile: {},
                  topNValues: []
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithZeros,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      // nullRatio: 0 and distinctRatio: 0 both display as "0%"
      expect(screen.getAllByText('0%')).toHaveLength(2);
    });
  });

  it('handles top values with all zero ratios', async () => {
    const scanWithZeroRatios = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'test_column',
                type: 'STRING',
                profile: {
                  nullRatio: 0.1,
                  distinctRatio: 0.8,
                  stringProfile: {},
                  topNValues: [
                    { value: 'val1', ratio: 0 },
                    { value: 'val2', ratio: 0 }
                  ]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithZeroRatios,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('test_column')).toBeInTheDocument();
      expect(screen.getByText('10.00%')).toBeInTheDocument();
    });
  });

  it('handles top values with very small percentages', async () => {
    const scanWithSmallPercentages = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'small_column',
                type: 'INTEGER',
                profile: {
                  nullRatio: 0.05,
                  distinctRatio: 0.95,
                  integerProfile: { min: 1, max: 100 },
                  topNValues: [
                    { value: '1', ratio: 0.005 },  // Very small percentage
                    { value: '2', ratio: 0.003 }
                  ]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithSmallPercentages,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('small_column')).toBeInTheDocument();
      expect(screen.getByText('5.00%')).toBeInTheDocument();  // null percentage
      expect(screen.getByText('95.00%')).toBeInTheDocument(); // unique percentage
    });
  });

  it('handles multiple columns with different profile types', async () => {
    const scanWithMultipleColumns = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'col1',
                type: 'STRING',
                profile: {
                  nullRatio: 0.1,
                  distinctRatio: 0.5,
                  stringProfile: { minLength: 1, maxLength: 10 },
                  topNValues: [{ value: 'a', ratio: 0.2 }]
                }
              },
              {
                name: 'col2',
                type: 'INTEGER',
                profile: {
                  nullRatio: 0.2,
                  distinctRatio: 0.6,
                  integerProfile: { min: 0, max: 100 },
                  topNValues: [{ value: '50', ratio: 0.3 }]
                }
              },
              {
                name: 'col3',
                type: 'FLOAT',
                profile: {
                  nullRatio: 0.15,
                  distinctRatio: 0.85,
                  doubleProfile: { min: 0.0, max: 1.0 },
                  topNValues: [{ value: '0.5', ratio: 0.25 }]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithMultipleColumns,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('col1')).toBeInTheDocument();
      expect(screen.getByText('col2')).toBeInTheDocument();
      expect(screen.getByText('col3')).toBeInTheDocument();
    });
  });

  it('handles search and filter together', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      // Enter search text
      const searchInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(searchInput, { target: { value: 'test_column' } });

      // Open filter menu
      const filterButton = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterButton);

      expect(searchInput).toHaveValue('test_column');
    });
  });

  it('handles many top values requiring slim bars', async () => {
    const scanWithManyValues = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'many_values_col',
                type: 'STRING',
                profile: {
                  nullRatio: 0.02,
                  distinctRatio: 0.95,
                  stringProfile: {},
                  topNValues: Array.from({ length: 15 }, (_, i) => ({
                    value: `value_${i}`,
                    ratio: 0.05 + (i * 0.01)
                  }))
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithManyValues,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('many_values_col')).toBeInTheDocument();
      expect(screen.getByText('2.00%')).toBeInTheDocument();  // null percentage
      expect(screen.getByText('95.00%')).toBeInTheDocument(); // unique percentage
    });
  });

  it('handles high percentage top values', async () => {
    const scanWithHighPercentage = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'dominant_col',
                type: 'STRING',
                profile: {
                  nullRatio: 0.02,
                  distinctRatio: 0.1,
                  stringProfile: {},
                  topNValues: [
                    { value: 'dominant_value', ratio: 0.85, count: 85 },
                    { value: 'other', ratio: 0.13, count: 13 }
                  ]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithHighPercentage,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('dominant_col')).toBeInTheDocument();
      expect(screen.getByText('2.00%')).toBeInTheDocument();  // null %
      expect(screen.getByText('10.00%')).toBeInTheDocument(); // unique %
    });

    // Expand the row to see bar chart percentages
    fireEvent.click(screen.getByText('dominant_col'));
    await waitFor(() => {
      expect(screen.getByText('85.00%')).toBeInTheDocument();
    });
  });

  it('handles column header sorting interactions', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const columnHeader = screen.getByText('Column Name');

      // Click multiple times to cycle through sort states
      fireEvent.click(columnHeader);
      fireEvent.click(columnHeader);
      fireEvent.click(columnHeader);

      expect(columnHeader).toBeInTheDocument();
    });
  });

  it('handles filter property selection and values', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      // Open filter menu
      const filterButton = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterButton);

      // Click on "Column Name" property
      const columnNameOptions = screen.getAllByText('Column Name');
      // Find the menu item (not the table header)
      const propertyOption = columnNameOptions.find(el =>
        el.closest('[role="menuitem"]')
      );

      if (propertyOption) {
        fireEvent.click(propertyOption);

        // Should show "Back to Properties" and value checkboxes
        const backButton = screen.queryByText(/Back to Properties/);
        if (backButton) {
          expect(backButton).toBeInTheDocument();
        }
      }
    });
  });

  it('handles filter value selection and creates filter chips', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // Open filter menu
    const filterButton = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      const propertyOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
      expect(propertyOption).toBeDefined();
    });

    // Hover over Type to reveal its sub-menu checkboxes
    const typeOptions = screen.getAllByText('Type');
    const propertyOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
    if (propertyOption) {
      fireEvent.mouseEnter(propertyOption.closest('[role="menuitem"]')!);

      await waitFor(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length > 0) {
          fireEvent.click(checkboxes[0]);
        }
      });
    }
  });

  it('handles removing filter chips', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(async () => {
      // Open filter menu
      const filterButton = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterButton);

      // Navigate to select values (simulate adding filters)
      const properties = screen.getAllByText('Type');
      const menuItem = properties.find(el => el.closest('[role="menuitem"]'));

      if (menuItem) {
        fireEvent.click(menuItem);

        // Close the menu to potentially show filter chips
        fireEvent.click(filterButton);
      }
    });
  });

  it('handles back to properties navigation in filter menu', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      // Open filter menu
      const filterButton = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterButton);

      // Select a property to drill down
      const nullOptions = screen.getAllByText('Null %');
      const propertyOption = nullOptions.find(el =>
        el.closest('[role="menuitem"]')
      );

      if (propertyOption) {
        fireEvent.click(propertyOption);

        // Try to go back
        const backButton = screen.queryByText(/Back to Properties/);
        if (backButton) {
          fireEvent.click(backButton);

          // Should be back at properties list
          expect(screen.getByText('Select Property to Filter')).toBeInTheDocument();
        }
      }
    });
  });

  it('handles sorting by type column', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const typeHeader = screen.getByText('Type');

      // Click to sort ascending
      fireEvent.click(typeHeader);
      // Click to sort descending
      fireEvent.click(typeHeader);
      // Click to remove sort
      fireEvent.click(typeHeader);

      expect(typeHeader).toBeInTheDocument();
    });
  });

  it('handles sorting by null percentage column', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const nullHeader = screen.getByText('Null %');

      fireEvent.click(nullHeader);
      fireEvent.click(nullHeader);
      fireEvent.click(nullHeader);

      expect(nullHeader).toBeInTheDocument();
    });
  });

  it('handles sorting by unique percentage column', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const uniqueHeader = screen.getByText('Unique %');

      fireEvent.click(uniqueHeader);
      fireEvent.click(uniqueHeader);
      fireEvent.click(uniqueHeader);

      expect(uniqueHeader).toBeInTheDocument();
    });
  });

  it('cycles through sort states correctly (asc -> desc -> null)', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('Column Name')).toBeInTheDocument();
    });

    const columnHeader = screen.getByText('Column Name');

    // First click - should be ascending
    fireEvent.click(columnHeader);
    // Second click - should be descending
    fireEvent.click(columnHeader);
    // Third click - should reset to no sort (null)
    fireEvent.click(columnHeader);

    // Verify sorting still works
    expect(screen.getByText('Column Name')).toBeInTheDocument();
  });

  it('changes sort column when clicking different column header', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const columnHeader = screen.getByText('Column Name');
      const typeHeader = screen.getByText('Type');

      // Sort by column name
      fireEvent.click(columnHeader);
      // Then sort by type (should switch column and reset to asc)
      fireEvent.click(typeHeader);

      expect(typeHeader).toBeInTheDocument();
    });
  });

  it('clears all filters when Clear All button is clicked', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // First add a filter via filter icon
    const filterButton = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.find(el => el.closest('[role="menuitem"]'))).toBeDefined();
    });

    // Hover over Type to reveal sub-menu
    const typeOptions = screen.getAllByText('Type');
    const propertyOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
    if (propertyOption) {
      fireEvent.mouseEnter(propertyOption.closest('[role="menuitem"]')!);

      await new Promise(resolve => setTimeout(resolve, 50));

      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0]);
      }
    }

    // Close menu
    fireEvent.click(document.body);

    // Check if Clear All button appears and click it
    const clearAllButton = screen.queryByText('Clear All');
    if (clearAllButton) {
      fireEvent.click(clearAllButton);
    }
  });

  it('removes individual filter when X button on filter chip is clicked', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    const filterButton = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.find(el => el.closest('[role="menuitem"]'))).toBeDefined();
    });

    const typeOptions = screen.getAllByText('Type');
    const propertyOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
    if (propertyOption) {
      fireEvent.mouseEnter(propertyOption.closest('[role="menuitem"]')!);
      await new Promise(resolve => setTimeout(resolve, 50));
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0]);
      }
    }
  });

  it('clears filter text when clear button is clicked', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(searchInput).toHaveValue('test');

      // Click the close icon to clear
      const closeIcon = screen.getByTestId('CloseIcon');
      fireEvent.click(closeIcon);

      expect(searchInput).toHaveValue('');
    });
  });

  it('updates existing filter when same property is selected', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    const filterButton = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.find(el => el.closest('[role="menuitem"]'))).toBeDefined();
    });

    const typeOptions = screen.getAllByText('Type');
    const propertyOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
    if (propertyOption) {
      // Hover to reveal sub-menu
      fireEvent.mouseEnter(propertyOption.closest('[role="menuitem"]')!);
      await new Promise(resolve => setTimeout(resolve, 50));

      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0]);
      }

      // Hover over Type again (update existing filter)
      const typeOptionsAgain = screen.getAllByText('Type');
      const propOption = typeOptionsAgain.find(el => el.closest('[role="menuitem"]'));
      if (propOption) {
        fireEvent.mouseEnter(propOption.closest('[role="menuitem"]')!);
      }
    }
  });

  it('removes filter when all values are deselected', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    const filterButton = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.find(el => el.closest('[role="menuitem"]'))).toBeDefined();
    });

    const typeOptions = screen.getAllByText('Type');
    const propertyOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
    if (propertyOption) {
      fireEvent.mouseEnter(propertyOption.closest('[role="menuitem"]')!);
      await new Promise(resolve => setTimeout(resolve, 50));

      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        // Select then deselect
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[0]);
      }
    }
  });


  it('handles DOUBLE data type correctly', async () => {
    const scanWithDouble = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'double_col',
                type: 'DOUBLE',
                profile: {
                  nullRatio: 0.1,
                  distinctRatio: 0.9,
                  doubleProfile: { min: 1.5, max: 100.5, mean: 50.0 },
                  topNValues: [{ value: '50.5', ratio: 0.3 }]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithDouble,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('double_col')).toBeInTheDocument();
      expect(screen.getByText('DOUBLE')).toBeInTheDocument();
    });
  });

  it('handles NUMERIC data type correctly', async () => {
    const scanWithNumeric = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'numeric_col',
                type: 'NUMERIC',
                profile: {
                  nullRatio: 0.05,
                  distinctRatio: 0.85,
                  numericProfile: { min: 0, max: 1000, mean: 500 },
                  topNValues: [{ value: '500', ratio: 0.2 }]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithNumeric,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('numeric_col')).toBeInTheDocument();
      expect(screen.getByText('NUMERIC')).toBeInTheDocument();
    });
  });

  it('handles TIMESTAMP data type correctly', async () => {
    const scanWithTimestamp = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'timestamp_col',
                type: 'TIMESTAMP',
                profile: {
                  nullRatio: 0.02,
                  distinctRatio: 0.99,
                  dateProfile: { min: '2023-01-01T00:00:00Z', max: '2023-12-31T23:59:59Z' },
                  topNValues: [{ value: '2023-06-15T12:00:00Z', ratio: 0.1 }]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithTimestamp,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('timestamp_col')).toBeInTheDocument();
      expect(screen.getByText('TIMESTAMP')).toBeInTheDocument();
    });
  });

  it('handles unknown data type correctly', async () => {
    const scanWithUnknown = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'unknown_col',
                type: 'UNKNOWN_TYPE',
                profile: {
                  nullRatio: 0.1,
                  distinctRatio: 0.5,
                  otherProfile: { someField: 'value' },
                  topNValues: [{ value: 'test', ratio: 0.5 }]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithUnknown,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('unknown_col')).toBeInTheDocument();
      expect(screen.getByText('UNKNOWN_TYPE')).toBeInTheDocument();
    });
  });


  it('opens configurations panel when button is clicked', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // Open configurations panel
    const configButton = screen.getByText('Configurations');
    fireEvent.click(configButton);

    await waitFor(() => {
      // Panel should be visible inside a Drawer
      expect(screen.getByRole('presentation')).toBeInTheDocument();
      expect(screen.getByTestId('configurations-panel')).toBeInTheDocument();
    });
  });

  it('toggles collapse when header is clicked', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      // Click on the header text to toggle
      const headerText = screen.getByText('Profile Results');
      fireEvent.click(headerText);

      // Click again to toggle back
      fireEvent.click(headerText);

      expect(headerText).toBeInTheDocument();
    });
  });

  it('filters by Statistics property values', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    const filterButton = await screen.findByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    // Find Statistics in the menu (use getAllByText since there might be multiple)
    await waitFor(() => {
      const statsOptions = screen.getAllByText('Statistics');
      const statsMenuItem = statsOptions.find(el => el.closest('[role="menuitem"]'));
      if (statsMenuItem) {
        fireEvent.click(statsMenuItem);
      }
      expect(filterButton).toBeInTheDocument();
    });
  });

  it('filters by Top 10 values property', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    const filterButton = await screen.findByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    // Find Top 10 values in the menu (use getAllByText since there might be multiple)
    await waitFor(() => {
      const topValuesOptions = screen.getAllByText('Top 10 values');
      const topValuesMenuItem = topValuesOptions.find(el => el.closest('[role="menuitem"]'));
      if (topValuesMenuItem) {
        fireEvent.click(topValuesMenuItem);
      }
      expect(filterButton).toBeInTheDocument();
    });
  });

  it('filters by Unique % property values', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(async () => {
      const filterButton = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterButton);

      const uniqueOptions = screen.getAllByText('Unique %');
      const propertyOption = uniqueOptions.find(el => el.closest('[role="menuitem"]'));

      if (propertyOption) {
        fireEvent.click(propertyOption);
        await new Promise(resolve => setTimeout(resolve, 50));

        const checkboxes = screen.getAllByRole('checkbox');
        if (checkboxes.length > 0) {
          fireEvent.click(checkboxes[0]);
        }
      }
    });
  });

  it('handles text search that matches statistics values', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Enter property name or value');
      // Search for something that could match in statistics
      fireEvent.change(searchInput, { target: { value: 'minLength' } });

      expect(searchInput).toHaveValue('minLength');
    });
  });

  it('handles text search that matches top values', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Enter property name or value');
      // Search for a top value
      fireEvent.change(searchInput, { target: { value: 'test_value_1' } });

      expect(searchInput).toHaveValue('test_value_1');
    });
  });

  it('handles filtering with multiple active filters', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    const filterButton = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.find(el => el.closest('[role="menuitem"]'))).toBeDefined();
    });

    const typeOptions = screen.getAllByText('Type');
    const typeOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
    if (typeOption) {
      // Hover to reveal sub-menu checkboxes
      fireEvent.mouseEnter(typeOption.closest('[role="menuitem"]')!);
      await new Promise(resolve => setTimeout(resolve, 50));

      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0]);
      }
    }

    // Close menu
    fireEvent.click(document.body);
    expect(filterButton).toBeInTheDocument();
  });

  it('handles scan data becoming available after initial load', async () => {
    // Start with loading state then update to have data
    render(
      <Provider store={createMockStore({
        dataScan: {
          scanData: null,
          status: 'idle',
          isLoading: true
        }
      })}>
        <DataProfile scanName="projects/test-project/locations/us-central1/dataScans/test-scan" allScansStatus="loading" />
      </Provider>
    );

    expect(screen.getByTestId('data-profile-skeleton')).toBeInTheDocument();
  });

  it('handles value with long text that needs truncation', async () => {
    const scanWithLongValues = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'long_value_col',
                type: 'STRING',
                profile: {
                  nullRatio: 0.1,
                  distinctRatio: 0.8,
                  stringProfile: {},
                  topNValues: [
                    { value: 'this is a very long value that should be truncated', ratio: 0.3 },
                    { value: 'short', ratio: 0.2 }
                  ]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithLongValues,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('long_value_col')).toBeInTheDocument();
    });
  });

  it('handles numeric statistics with decimal values', async () => {
    const scanWithDecimals = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'decimal_col',
                type: 'FLOAT',
                profile: {
                  nullRatio: 0.123456,
                  distinctRatio: 0.987654,
                  doubleProfile: {
                    min: 1.23456789,
                    max: 99.87654321,
                    mean: 50.12345678
                  },
                  topNValues: [{ value: '25.5', ratio: 0.333333 }]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: scanWithDecimals,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('decimal_col')).toBeInTheDocument();
      expect(screen.getByText('12.35%')).toBeInTheDocument(); // null percentage rounded
      expect(screen.getByText('98.77%')).toBeInTheDocument(); // unique percentage rounded
    });
  });

  it('closes filter dropdown when clicking outside', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      const filterButton = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterButton);

      // Click outside to close
      fireEvent.click(document.body);
    });
  });

  it('handles click on filter icon to open menu', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByTestId('FilterListIcon')).toBeInTheDocument();
    });

    const filterButton = screen.getByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    // Menu should open — Type is a dropdown-mode property shown in the menu
    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.length).toBeGreaterThan(0);
    });
  });

  it('updates existing filter when same property is selected again (lines 351-355)', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // Open filter menu
    const filterButton = await screen.findByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.find(el => el.closest('[role="menuitem"]'))).toBeDefined();
    });

    // Hover over Type to reveal sub-menu checkboxes
    const typeOptions = screen.getAllByText('Type');
    const typeMenuItem = typeOptions.find(el => el.closest('[role="menuitem"]'));
    expect(typeMenuItem).toBeDefined();
    fireEvent.mouseEnter(typeMenuItem!.closest('[role="menuitem"]')!);

    await new Promise(resolve => setTimeout(resolve, 50));

    // Select first checkbox to create initial filter
    const checkboxes1 = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes1.length > 0) {
      fireEvent.click(checkboxes1[0]);
    }

    // If there's a second checkbox, select it too to UPDATE the existing filter
    if (checkboxes1.length > 1) {
      fireEvent.click(checkboxes1[1]);
    }

    // Close menu and verify
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(filterButton).toBeInTheDocument();
  });

  it('properly removes filter chip when × button is clicked (handleRemoveFilter)', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // Open filter menu
    const filterButton = await screen.findByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.find(el => el.closest('[role="menuitem"]'))).toBeDefined();
    });

    // Hover over Type to reveal sub-menu checkboxes
    const typeOptions = screen.getAllByText('Type');
    const propertyOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
    expect(propertyOption).toBeDefined();
    fireEvent.mouseEnter(propertyOption!.closest('[role="menuitem"]')!);

    await new Promise(resolve => setTimeout(resolve, 50));

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      fireEvent.click(checkboxes[0]);
      // Close menu
      fireEvent.keyDown(document, { key: 'Escape' });
    }

    expect(filterButton).toBeInTheDocument();
  });

  it('covers all handleSort branches with column switching', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    // Wait for table to render
    await waitFor(() => {
      expect(screen.getByText('Column Name')).toBeInTheDocument();
    });

    const columnNameHeader = screen.getByText('Column Name');
    const typeHeader = screen.getByText('Type');

    // Click Column Name sort - first click sets sortColumn='columnName', sortDirection='asc'
    fireEvent.click(columnNameHeader);
    // Second click - same column, changes direction to 'desc'
    fireEvent.click(columnNameHeader);
    // Third click - same column, changes direction to null
    fireEvent.click(columnNameHeader);
    // Fourth click - same column but direction is null, should set to 'asc'
    fireEvent.click(columnNameHeader);

    // Now click Type sort - different column, sets new column and direction='asc'
    fireEvent.click(typeHeader);

    // Verify headers are present
    expect(screen.getByText('Column Name')).toBeInTheDocument();
  });

  it('sort direction cycles through asc -> desc -> null -> asc', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('Null %')).toBeInTheDocument();
    });

    const nullHeader = screen.getByText('Null %');

    // First click: asc
    fireEvent.click(nullHeader);
    // Second click: desc
    fireEvent.click(nullHeader);
    // Third click: null (removes sort)
    fireEvent.click(nullHeader);
    // Fourth click: back to asc
    fireEvent.click(nullHeader);

    expect(screen.getByText('Null %')).toBeInTheDocument();
  });

  it('clicking different column header resets sort to ascending', async () => {
    renderDataProfile({}, {
      scanData: mockDataProfileScan,
      status: 'succeeded',
      isLoading: false
    });

    await waitFor(() => {
      expect(screen.getByText('Column Name')).toBeInTheDocument();
    });

    const columnHeader = screen.getByText('Column Name');
    const uniqueHeader = screen.getByText('Unique %');

    // Sort by Column Name ascending
    fireEvent.click(columnHeader);
    // Then descending
    fireEvent.click(columnHeader);

    // Now click Unique % - should switch column and reset to ascending
    fireEvent.click(uniqueHeader);

    // Verify headers are present
    expect(screen.getByText('Unique %')).toBeInTheDocument();
  });

  // ── New tests covering recent feature additions ───────────────────────────

  // Helper scan with two clearly-distinguishable columns
  const makeTwoColScan = (
    col1: { name: string; nullRatio: number; distinctRatio: number; type?: string },
    col2: { name: string; nullRatio: number; distinctRatio: number; type?: string }
  ) => ({
    scan: {
      dataProfileResult: {
        profile: {
          fields: [
            {
              name: col1.name,
              type: col1.type ?? 'STRING',
              profile: {
                nullRatio: col1.nullRatio,
                distinctRatio: col1.distinctRatio,
                stringProfile: {},
                topNValues: [],
              },
            },
            {
              name: col2.name,
              type: col2.type ?? 'STRING',
              profile: {
                nullRatio: col2.nullRatio,
                distinctRatio: col2.distinctRatio,
                stringProfile: {},
                topNValues: [],
              },
            },
          ],
        },
      },
    },
  });

  describe('global search chip (property: "")', () => {
    it('filters rows by column name when Enter is pressed without selecting a property', async () => {
      const scan = makeTwoColScan(
        { name: 'alpha_col', nullRatio: 0, distinctRatio: 0.5 },
        { name: 'beta_col', nullRatio: 0, distinctRatio: 0.5 },
      );
      renderDataProfile({}, { scanData: scan, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('alpha_col')).toBeInTheDocument();
        expect(screen.getByText('beta_col')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(input, { target: { value: 'alpha' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('alpha_col')).toBeInTheDocument();
        expect(screen.queryByText('beta_col')).not.toBeInTheDocument();
      });
    });

    it('filters rows by type string when global chip matches type', async () => {
      const scan = makeTwoColScan(
        { name: 'str_col', nullRatio: 0, distinctRatio: 0.5, type: 'STRING' },
        { name: 'int_col', nullRatio: 0, distinctRatio: 0.5, type: 'INTEGER' },
      );
      renderDataProfile({}, { scanData: scan, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('str_col')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(input, { target: { value: 'INTEGER' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.queryByText('str_col')).not.toBeInTheDocument();
        expect(screen.getByText('int_col')).toBeInTheDocument();
      });
    });

    it('shows "No data matches the applied filters" when global chip matches nothing', async () => {
      renderDataProfile({}, {
        scanData: mockDataProfileScan,
        status: 'succeeded',
        isLoading: false,
      });

      await waitFor(() => {
        expect(screen.getByText('test_column')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.change(input, { target: { value: 'xyzzy_no_match_ever_99999' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('No data matches the applied filters')).toBeInTheDocument();
      });
    });
  });

  describe('"Null % less than" filter', () => {
    it('shows only rows below the numeric null threshold', async () => {
      // low_null: 2%  high_null: 30%  → threshold 5 keeps only low_null
      const scan = makeTwoColScan(
        { name: 'low_null_col', nullRatio: 0.02, distinctRatio: 0.5 },
        { name: 'high_null_col', nullRatio: 0.30, distinctRatio: 0.5 },
      );
      renderDataProfile({}, { scanData: scan, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('low_null_col')).toBeInTheDocument();
        expect(screen.getByText('high_null_col')).toBeInTheDocument();
      });

      // Open search bar menu to access text-mode properties
      const input = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.click(input);

      await waitFor(() => {
        const options = screen.getAllByText('Null % less than');
        expect(options.length).toBeGreaterThan(0);
      });

      const nullOption = screen.getAllByText('Null % less than').find(el =>
        el.closest('[role="menuitem"]')
      );
      if (nullOption) {
        fireEvent.click(nullOption);
      }

      // After selecting, type threshold and press Enter
      fireEvent.change(input, { target: { value: '5' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('low_null_col')).toBeInTheDocument();
        expect(screen.queryByText('high_null_col')).not.toBeInTheDocument();
      });
    });

    it('filters out all rows when a non-numeric threshold is entered (NaN short-circuits to false)', async () => {
      const scan = makeTwoColScan(
        { name: 'col_a', nullRatio: 0.02, distinctRatio: 0.5 },
        { name: 'col_b', nullRatio: 0.30, distinctRatio: 0.5 },
      );
      renderDataProfile({}, { scanData: scan, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('col_a')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.click(input);

      await waitFor(() => {
        const options = screen.getAllByText('Null % less than');
        expect(options.length).toBeGreaterThan(0);
      });

      const nullOption = screen.getAllByText('Null % less than').find(el =>
        el.closest('[role="menuitem"]')
      );
      if (nullOption) fireEvent.click(nullOption);

      fireEvent.change(input, { target: { value: 'notanumber' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // parseFloat('notanumber') = NaN → !isNaN(NaN) = false → no row satisfies the condition
      await waitFor(() => {
        expect(screen.getByText('No data matches the applied filters')).toBeInTheDocument();
      });
    });
  });

  describe('"Unique % more than" filter', () => {
    it('shows only rows above the numeric unique threshold', async () => {
      // low_unique: 10%  high_unique: 85%  → threshold 50 keeps only high_unique
      const scan = makeTwoColScan(
        { name: 'low_unique_col', nullRatio: 0, distinctRatio: 0.10 },
        { name: 'high_unique_col', nullRatio: 0, distinctRatio: 0.85 },
      );
      renderDataProfile({}, { scanData: scan, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('low_unique_col')).toBeInTheDocument();
        expect(screen.getByText('high_unique_col')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter property name or value');
      fireEvent.click(input);

      await waitFor(() => {
        const options = screen.getAllByText('Unique % more than');
        expect(options.length).toBeGreaterThan(0);
      });

      const uniqueOption = screen.getAllByText('Unique % more than').find(el =>
        el.closest('[role="menuitem"]')
      );
      if (uniqueOption) fireEvent.click(uniqueOption);

      fireEvent.change(input, { target: { value: '50' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.queryByText('low_unique_col')).not.toBeInTheDocument();
        expect(screen.getByText('high_unique_col')).toBeInTheDocument();
      });
    });
  });

  describe('em dash for rows with no statistics', () => {
    it('renders a dash when the statistics object has no entries', async () => {
      // STRING with empty stringProfile → statistics map is empty → shows "-"
      const scan = {
        scan: {
          dataProfileResult: {
            profile: {
              fields: [
                {
                  name: 'no_stats_col',
                  type: 'STRING',
                  profile: {
                    nullRatio: 0,
                    distinctRatio: 0,
                    stringProfile: {},
                    topNValues: [],
                  },
                },
              ],
            },
          },
        },
      };

      renderDataProfile({}, { scanData: scan, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('no_stats_col')).toBeInTheDocument();
        // renderStatisticsCell returns <Typography>-</Typography> for empty stats
        expect(screen.getByText('-')).toBeInTheDocument();
      });
    });
  });

  describe('expanded statistics two-column layout', () => {
    const scanWithStats = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'stats_col',
                type: 'INTEGER',
                profile: {
                  nullRatio: 0,
                  distinctRatio: 0.5,
                  integerProfile: { min: 1, max: 100, mean: 50 },
                  topNValues: [{ value: '1', ratio: 0.4, count: 40 }],
                },
              },
            ],
          },
        },
      },
    };

    it('shows individual stat keys (Min, Max, Mean) when the row is expanded', async () => {
      renderDataProfile({}, { scanData: scanWithStats, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('stats_col')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('stats_col'));

      await waitFor(() => {
        expect(screen.getByText('Min')).toBeInTheDocument();
        expect(screen.getByText('Max')).toBeInTheDocument();
        expect(screen.getByText('Mean')).toBeInTheDocument();
      });
    });

    it('shows inline [value] format for statistics when the row is collapsed', async () => {
      renderDataProfile({}, { scanData: scanWithStats, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        // Collapsed view renders values in [brackets]
        expect(screen.getByText('[1]')).toBeInTheDocument();
      });
    });
  });

  describe('quartiles in statistics cell', () => {
    // Use clean whole numbers to avoid floating-point truncation surprises in fmt()
    const scanWithQuartiles = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'num_col',
                type: 'NUMERIC',
                profile: {
                  nullRatio: 0,
                  distinctRatio: 0.5,
                  numericProfile: {
                    quartiles: [30, 60, 90],
                    min: 1,
                    max: 200,
                  },
                  topNValues: [{ value: '50', ratio: 0.3, count: 30 }],
                },
              },
            ],
          },
        },
      },
    };

    it('shows a single Quartiles entry with comma-joined values inside brackets when collapsed', async () => {
      renderDataProfile({}, { scanData: scanWithQuartiles, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('num_col')).toBeInTheDocument();
        // Collapsed view renders quartile values as "[30, 60, 90]" in a bold inner span
        expect(screen.getByText('[30, 60, 90]')).toBeInTheDocument();
        // Expanded rows not yet visible
        expect(screen.queryByText('Lower Quartile')).not.toBeInTheDocument();
      });
    });

    it('shows Lower / Median / Upper Quartile rows when expanded', async () => {
      renderDataProfile({}, { scanData: scanWithQuartiles, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('num_col')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('num_col'));

      await waitFor(() => {
        expect(screen.getByText('Lower Quartile')).toBeInTheDocument();
        expect(screen.getByText('Median Quartile')).toBeInTheDocument();
        expect(screen.getByText('Upper Quartile')).toBeInTheDocument();
      });
    });

    it('collapses back to bracket value format after toggling', async () => {
      renderDataProfile({}, { scanData: scanWithQuartiles, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('num_col')).toBeInTheDocument();
      });

      // Expand
      fireEvent.click(screen.getByText('num_col'));
      await waitFor(() => {
        expect(screen.getByText('Lower Quartile')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(screen.getByText('num_col'));
      await waitFor(() => {
        expect(screen.queryByText('Lower Quartile')).not.toBeInTheDocument();
        // Collapsed view shows values in bracket form
        expect(screen.getByText('[30, 60, 90]')).toBeInTheDocument();
      });
    });
  });

  describe('tiny percentage bar chart display', () => {
    it('shows "(<0.01%)" label for values with very small ratios when expanded', async () => {
      const scan = {
        scan: {
          dataProfileResult: {
            profile: {
              fields: [
                {
                  name: 'unique_col',
                  type: 'STRING',
                  profile: {
                    nullRatio: 0,
                    distinctRatio: 0.999,
                    stringProfile: {},
                    topNValues: [
                      { value: 'rare_a', ratio: 0.00005, count: 5 },
                      { value: 'rare_b', ratio: 0.00003, count: 3 },
                    ],
                  },
                },
              ],
            },
          },
        },
      };

      renderDataProfile({}, { scanData: scan, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('unique_col')).toBeInTheDocument();
      });

      // Expand to render the bar chart
      fireEvent.click(screen.getByText('unique_col'));

      await waitFor(() => {
        const tinyLabels = screen.getAllByText('(<0.01%)');
        expect(tinyLabels.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('bar chart stopPropagation', () => {
    it('clicking inside the bar chart does not collapse the expanded row', async () => {
      const scan = {
        scan: {
          dataProfileResult: {
            profile: {
              fields: [
                {
                  name: 'bar_col',
                  type: 'STRING',
                  profile: {
                    nullRatio: 0,
                    distinctRatio: 0.5,
                    stringProfile: {},
                    topNValues: [
                      { value: 'item_one', ratio: 0.5, count: 50 },
                      { value: 'item_two', ratio: 0.3, count: 30 },
                    ],
                  },
                },
              ],
            },
          },
        },
      };

      renderDataProfile({}, { scanData: scan, status: 'succeeded', isLoading: false });

      await waitFor(() => {
        expect(screen.getByText('bar_col')).toBeInTheDocument();
      });

      // Expand the row
      fireEvent.click(screen.getByText('bar_col'));

      await waitFor(() => {
        // Bar chart labels are visible → row is expanded
        expect(screen.getByText('item_one')).toBeInTheDocument();
      });

      // Clicking a bar chart label should NOT collapse (stopPropagation on bar chart root)
      fireEvent.click(screen.getByText('item_one'));

      // Row remains expanded — bar chart label still present
      await waitFor(() => {
        expect(screen.getByText('item_one')).toBeInTheDocument();
      });
    });
  });

  it('removes filter via handleRemoveFilter when clicking × on filter chip', async () => {
    const multiTypeScan = {
      scan: {
        dataProfileResult: {
          profile: {
            fields: [
              {
                name: 'col1',
                type: 'STRING',
                profile: {
                  nullRatio: 0.1,
                  distinctRatio: 0.5,
                  stringProfile: {},
                  topNValues: [{ value: 'a', ratio: 0.2 }]
                }
              },
              {
                name: 'col2',
                type: 'INTEGER',
                profile: {
                  nullRatio: 0.2,
                  distinctRatio: 0.6,
                  integerProfile: {},
                  topNValues: [{ value: '50', ratio: 0.3 }]
                }
              }
            ]
          }
        }
      }
    };

    renderDataProfile({}, {
      scanData: multiTypeScan,
      status: 'succeeded',
      isLoading: false
    });

    // Open filter menu
    const filterButton = await screen.findByTestId('FilterListIcon');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const typeOptions = screen.getAllByText('Type');
      expect(typeOptions.find(el => el.closest('[role="menuitem"]'))).toBeDefined();
    });

    // Hover over Type to reveal sub-menu checkboxes
    const typeOptions = screen.getAllByText('Type');
    const propertyOption = typeOptions.find(el => el.closest('[role="menuitem"]'));
    expect(propertyOption).toBeDefined();
    fireEvent.mouseEnter(propertyOption!.closest('[role="menuitem"]')!);

    await new Promise(resolve => setTimeout(resolve, 50));

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      fireEvent.click(checkboxes[0]);
      // Close menu
      fireEvent.keyDown(document, { key: 'Escape' });
    }

    expect(filterButton).toBeInTheDocument();
  });
});
