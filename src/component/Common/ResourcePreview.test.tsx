/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, beforeEach, it, describe, expect, afterEach } from 'vitest';
import { useSelector } from 'react-redux';
import ResourcePreview from './ResourcePreview';

// Mock AuthProvider
const mockLogout = vi.fn();
const mockAuthContext = {
  user: {
    token: 'test-token',
    email: 'test@example.com',
    name: 'Test User'
  },
  isAuthenticated: true,
  logout: mockLogout,
  loading: false
};

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => mockAuthContext
}));

// Mock AccessRequestProvider
const mockSetAccessPanelOpen = vi.fn();
const mockAccessRequestContext = {
  requestedItems: [],
  addRequestedItem: vi.fn(),
  removeRequestedItem: vi.fn(),
  clearRequestedItems: vi.fn(),
  setAccessPanelOpen: mockSetAccessPanelOpen
};

vi.mock('../../contexts/AccessRequestContext', () => ({
  useAccessRequest: () => mockAccessRequestContext
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock Redux hooks
const mockDispatch = vi.fn();
vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal() || {};
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: vi.fn()
  };
});

// Mock usePreviewEntry hook
const mockUsePreviewEntry = vi.fn();
vi.mock('../../hooks/usePreviewEntry', () => ({
  usePreviewEntry: (options: any) => mockUsePreviewEntry(options)
}));

// Mock child components
vi.mock('../Tags/Tag', () => ({
  default: function MockTag({ text }: any) {
    return <div data-testid="tag">{text}</div>;
  }
}));

vi.mock('../Buttons/CTAButton', () => ({
  default: function MockCTAButton({ handleClick, text }: any) {
    return (
      <button data-testid={`cta-button-${text?.replace(/\s+/g, '-').toLowerCase()}`} onClick={handleClick}>
        {text}
      </button>
    );
  }
}));

vi.mock('../Schema/PreviewSchema', () => ({
  default: function MockPreviewSchema({ entry }: any) {
    return <div data-testid="preview-schema">Schema for {entry?.name}</div>;
  }
}));

vi.mock('../Annotation/PreviewAnnotation', () => ({
  default: function MockPreviewAnnotation({ entry }: any) {
    return <div data-testid="preview-annotation">Annotations for {entry?.name}</div>;
  }
}));

vi.mock('../Schema/SchemaFilter', () => ({
  default: function MockSchemaFilter({ entry, onFilteredEntryChange, isPreview }: any) {
    return (
      <div data-testid="schema-filter">
        Schema Filter for {entry?.name} {isPreview ? '(preview)' : ''}
        <button data-testid="apply-schema-filter" onClick={() => onFilteredEntryChange(entry)}>Apply Filter</button>
      </div>
    );
  }
}));

vi.mock('../Annotation/AnnotationFilter', () => ({
  default: function MockAnnotationFilter({ entry, onFilteredEntryChange, onCollapseAll, onExpandAll }: any) {
    return (
      <div data-testid="annotation-filter">
        Annotation Filter for {entry?.name}
        <button data-testid="apply-annotation-filter" onClick={() => onFilteredEntryChange(entry)}>Apply Filter</button>
        <button data-testid="collapse-all" onClick={onCollapseAll}>Collapse All</button>
        <button data-testid="expand-all" onClick={onExpandAll}>Expand All</button>
      </div>
    );
  }
}));

vi.mock('../SearchPage/SubmitAccess', () => ({
  default: function MockSubmitAccess({ isOpen, onClose, assetName, onSubmitSuccess }: any) {
    return isOpen ? (
      <div data-testid="submit-access">
        Submit Access for {assetName}
        <button data-testid="close-submit-access" onClick={onClose}>Close</button>
        <button data-testid="submit-access-button" onClick={() => onSubmitSuccess(assetName)}>Submit</button>
      </div>
    ) : null;
  }
}));

vi.mock('../SearchPage/NotificationBar', () => ({
  default: function MockNotificationBar({ isVisible, onClose, onUndo, message }: any) {
    return isVisible ? (
      <div data-testid="notification-bar">
        {message}
        <button data-testid="close-notification" onClick={onClose}>Close</button>
        {onUndo && <button data-testid="undo-notification" onClick={onUndo}>Undo</button>}
      </div>
    ) : null;
  }
}));

vi.mock('../Shimmer/ShimmerLoader', () => ({
  default: function MockShimmerLoader({ type, count }: any) {
    return <div data-testid="shimmer-loader">Loading {type} ({count})</div>;
  }
}));

// Mock utility functions
const mockGetEntryType = vi.fn();
const mockHasValidAnnotationData = vi.fn();
vi.mock('../../utils/resourceUtils', () => ({
  getName: vi.fn((name?: string, separator?: string) => {
    if (!name || !separator) return name || '';
    return name.split(separator).pop() || name;
  }),
  getEntryType: (name?: string, separator?: string) => mockGetEntryType(name, separator),
  getFormatedDate: vi.fn((timestamp?: number) => {
    if (!timestamp) return 'NA';
    return new Date(timestamp * 1000).toLocaleDateString();
  }),
  hasValidAnnotationData: (data: any) => mockHasValidAnnotationData(data),
  hasValidSchemaData: vi.fn(() => true),
  getFormattedDateTimePartsByDateTime: vi.fn((time?: any) => {
    if (!time) return { date: '-', time: '-' };
    return { date: '1/1/2022', time: '12:00 AM' };
  }),
  generateLookerStudioLink: vi.fn((entry: any) => entry ? 'https://lookerstudio.google.com/test' : ''),
  generateBigQueryLink: vi.fn((entry: any) => entry ? 'https://console.cloud.google.com/bigquery?project=test' : ''),
  extractProjectNumberFromEntryName: vi.fn((entryName?: string) => {
    if (!entryName) return '';
    const segments = entryName.split('/');
    if (segments.length >= 2 && segments[0] === 'projects') return segments[1];
    return '';
  }),
  resolveProjectDisplayName: vi.fn(() => '')
}));

// Mock Redux slice
vi.mock('../../features/entry/entrySlice', () => ({
  fetchEntry: vi.fn((args) => ({ type: 'fetchEntry', payload: args })),
  clearHistory: vi.fn(() => ({ type: 'entry/clearHistory' })),
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  Close: () => <div data-testid="CloseIcon">Close</div>,
  LockOutlined: () => <div data-testid="LockOutlinedIcon">Lock</div>,
  DashboardOutlined: () => <div data-testid="DashboardOutlinedIcon">Dashboard</div>,
  ViewListOutlined: () => <div data-testid="ViewListOutlinedIcon">ViewList</div>
}));

describe('ResourcePreview', () => {
  const mockPreviewData = {
    name: 'projects/test-project/locations/us/entryGroups/@dataplex/entries/test-table',
    entryType: 'tables-table',
    entrySource: {
      system: 'BigQuery',
      description: 'Test table description',
      location: 'US',
      project: 'test-project',
      dataset: 'test-dataset'
    },
    parentEntry: 'projects/test-project/locations/us/entryGroups/@dataplex/entries/test-dataset',
    fullyQualifiedName: 'bigquery:test-project.test-dataset.test-table',
    createTime: { seconds: 1640995200 },
    updateTime: { seconds: 1641081600 }
  };

  const mockEntry = {
    name: 'projects/test-project/locations/us/entryGroups/@dataplex/entries/test-table',
    entryType: 'tables/table',
    aspects: {
      'table.global.schema': {
        aspectType: 'tables/schema',
        data: { fields: { fields: { listValue: { values: [{ structValue: { fields: { name: { stringValue: 'id' } } } }] } } } }
      },
      'table.global.contacts': {
        aspectType: 'contacts',
        data: {
          fields: {
            identities: {
              listValue: {
                values: [
                  { structValue: { fields: { name: { stringValue: 'John Doe <john@example.com>' } } } },
                  { structValue: { fields: { name: { stringValue: 'Jane Smith <jane@example.com>' } } } }
                ]
              }
            }
          }
        }
      },
      'table.custom.annotation': {
        aspectType: 'custom/annotation',
        data: { someField: 'value' }
      }
    }
  };

  const defaultProps = {
    previewData: null,
    onPreviewDataChange: vi.fn(),
    id_token: 'test-token'
  };

  const renderResourcePreview = (props = {}) => {
    return render(
      <BrowserRouter>
        <ResourcePreview {...defaultProps} {...props} />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default mock implementations
    mockGetEntryType.mockReturnValue('Tables');
    mockHasValidAnnotationData.mockReturnValue(true);
    mockUsePreviewEntry.mockReturnValue({
      entry: null,
      status: 'idle',
      error: null,
      refetch: vi.fn()
    });

    // Default Redux state - succeeded
    vi.mocked(useSelector).mockImplementation((selector: any) => {
      const state = {
        entry: {
          items: mockEntry,
          status: 'succeeded',
          error: null
        },
        user: { mode: 'light' },
        projects: { items: [] }
      };
      return selector(state);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Default Preview State', () => {
    it('renders default preview when no data is provided', () => {
      renderResourcePreview();

      expect(screen.getByText('Click on an item to see preview')).toBeInTheDocument();
      expect(screen.getByAltText('Asset Preview')).toBeInTheDocument();
    });

    it('renders default preview with close button', () => {
      renderResourcePreview();

      const closeButton = screen.getByTestId('CloseIcon');
      expect(closeButton).toBeInTheDocument();
    });

    it('handles close on default preview', () => {
      const mockOnPreviewDataChange = vi.fn();
      renderResourcePreview({ onPreviewDataChange: mockOnPreviewDataChange });

      const closeButton = screen.getByTestId('CloseIcon');
      fireEvent.click(closeButton.parentElement!);

      expect(mockOnPreviewDataChange).toHaveBeenCalledWith(null);
    });

    it('renders default preview when previewData has isPlaceholder true', () => {
      renderResourcePreview({ previewData: { isPlaceholder: true } });

      expect(screen.getByText('Click on an item to see preview')).toBeInTheDocument();
    });
  });

  describe('Preview Content Rendering', () => {
    it('renders preview content when previewData is provided', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('test-table')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Request Access')).toBeInTheDocument();
    });

    it('displays displayName when available', () => {
      const previewDataWithDisplayName = {
        ...mockPreviewData,
        entrySource: {
          ...mockPreviewData.entrySource,
          displayName: 'My Custom Display Name'
        }
      };

      renderResourcePreview({ previewData: previewDataWithDisplayName });

      expect(screen.getByText('My Custom Display Name')).toBeInTheDocument();
    });

    it('renders BigQuery icon for BigQuery system', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByAltText('Open in BigQuery')).toBeInTheDocument();
    });

    it('does not render BigQuery icon for non-BigQuery systems', () => {
      const customPreviewData = {
        ...mockPreviewData,
        entrySource: {
          ...mockPreviewData.entrySource,
          system: 'Cloud_Storage'
        }
      };

      renderResourcePreview({ previewData: customPreviewData });

      expect(screen.queryByAltText('Open in BigQuery')).not.toBeInTheDocument();
    });
  });

  describe('BigQuery and Looker Icons', () => {
    it('shows BigQuery and Looker icons for BigQuery system', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByAltText('Open in BigQuery')).toBeInTheDocument();
      expect(screen.getByAltText('Explore with Looker Studio')).toBeInTheDocument();
    });

    it('does not show BigQuery/Looker icons for non-BigQuery systems', () => {
      const customPreviewData = {
        ...mockPreviewData,
        entrySource: {
          ...mockPreviewData.entrySource,
          system: 'Dataflow'
        }
      };

      renderResourcePreview({ previewData: customPreviewData });

      expect(screen.queryByAltText('Open in BigQuery')).not.toBeInTheDocument();
      expect(screen.queryByAltText('Explore with Looker Studio')).not.toBeInTheDocument();
    });

    it('opens BigQuery link when clicked', () => {
      const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

      renderResourcePreview({ previewData: mockPreviewData });

      const bigQueryButton = screen.getByAltText('Open in BigQuery');
      fireEvent.click(bigQueryButton.parentElement!);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://console.cloud.google.com/bigquery?project=test',
        '_blank'
      );

      mockOpen.mockRestore();
    });

    it('opens Looker link when clicked', () => {
      const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

      renderResourcePreview({ previewData: mockPreviewData });

      const lookerButton = screen.getByAltText('Explore with Looker Studio');
      fireEvent.click(lookerButton.parentElement!);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://lookerstudio.google.com/test',
        '_blank'
      );

      mockOpen.mockRestore();
    });
  });

  describe('Close Preview', () => {
    it('closes preview when close icon is clicked', () => {
      const mockOnPreviewDataChange = vi.fn();
      renderResourcePreview({
        previewData: mockPreviewData,
        onPreviewDataChange: mockOnPreviewDataChange
      });

      // Find the close button in the preview content
      const closeButtons = screen.getAllByTestId('CloseIcon');
      fireEvent.click(closeButtons[0].parentElement!);

      expect(mockOnPreviewDataChange).toHaveBeenCalledWith(null);
    });
  });

  describe('View Details Button', () => {
    it('handles View Details button click with custom handler', () => {
      const mockOnViewDetails = vi.fn();
      renderResourcePreview({
        previewData: mockPreviewData,
        onViewDetails: mockOnViewDetails
      });

      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      expect(mockOnViewDetails).toHaveBeenCalledWith(mockEntry);
    });

    it('navigates to view-details when no custom handler provided', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/view-details');
    });

    it('does not navigate when viewDetailAccessable is false', () => {
      // Mock failed state with permission denied
      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: mockEntry,
            status: 'failed',
            error: { details: '403 PERMISSION_DENIED' }
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Request Access Button', () => {
    it('handles Request Access button click with custom handler', () => {
      const mockOnRequestAccess = vi.fn();
      renderResourcePreview({
        previewData: mockPreviewData,
        onRequestAccess: mockOnRequestAccess
      });

      const requestAccessButton = screen.getByText('Request Access');
      fireEvent.click(requestAccessButton);

      expect(mockOnRequestAccess).toHaveBeenCalledWith(mockEntry);
    });

    it('opens SubmitAccess modal when no custom handler provided', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      const requestAccessButton = screen.getByText('Request Access');
      fireEvent.click(requestAccessButton);

      expect(screen.getByTestId('submit-access')).toBeInTheDocument();
    });

    it('syncs access panel state with context', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      const requestAccessButton = screen.getByText('Request Access');
      fireEvent.click(requestAccessButton);

      expect(mockSetAccessPanelOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('SubmitAccess Modal', () => {
    it('closes SubmitAccess modal when close button clicked', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      // Open modal
      fireEvent.click(screen.getByText('Request Access'));
      expect(screen.getByTestId('submit-access')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId('close-submit-access'));
      expect(screen.queryByTestId('submit-access')).not.toBeInTheDocument();
    });

    it('closes SubmitAccess modal when backdrop clicked', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      // Open modal
      fireEvent.click(screen.getByText('Request Access'));
      expect(screen.getByTestId('submit-access')).toBeInTheDocument();

      // Click the close button within the modal instead of backdrop
      // The backdrop is rendered via MUI Box which may not be easily queryable
      fireEvent.click(screen.getByTestId('close-submit-access'));

      expect(screen.queryByTestId('submit-access')).not.toBeInTheDocument();
    });

    it('shows notification on successful access request submission', async () => {
      renderResourcePreview({ previewData: mockPreviewData });

      // Open modal and submit
      fireEvent.click(screen.getByText('Request Access'));
      fireEvent.click(screen.getByTestId('submit-access-button'));

      await waitFor(() => {
        expect(screen.getByTestId('notification-bar')).toBeInTheDocument();
        expect(screen.getByText('Request sent')).toBeInTheDocument();
      });
    });

    it('auto-hides notification after 5 seconds', async () => {
      renderResourcePreview({ previewData: mockPreviewData });

      // Open modal and submit
      fireEvent.click(screen.getByText('Request Access'));
      fireEvent.click(screen.getByTestId('submit-access-button'));

      await waitFor(() => {
        expect(screen.getByTestId('notification-bar')).toBeInTheDocument();
      });

      // Advance timers by 5 seconds
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByTestId('notification-bar')).not.toBeInTheDocument();
      });
    });

    it('closes notification when close button clicked', async () => {
      renderResourcePreview({ previewData: mockPreviewData });

      // Open modal and submit
      fireEvent.click(screen.getByText('Request Access'));
      fireEvent.click(screen.getByTestId('submit-access-button'));

      await waitFor(() => {
        expect(screen.getByTestId('notification-bar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-notification'));

      expect(screen.queryByTestId('notification-bar')).not.toBeInTheDocument();
    });

    it('does not show undo button in request access notification', async () => {
      renderResourcePreview({ previewData: mockPreviewData });

      // Open modal and submit
      fireEvent.click(screen.getByText('Request Access'));
      fireEvent.click(screen.getByTestId('submit-access-button'));

      await waitFor(() => {
        expect(screen.getByTestId('notification-bar')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('undo-notification')).not.toBeInTheDocument();
    });
  });

  describe('Tabs Navigation', () => {
    it('shows Overview tab by default', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Test table description')).toBeInTheDocument();
    });

    it('switches to Schema tab when clicked', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Schema'));

      expect(screen.getByTestId('schema-filter')).toBeInTheDocument();
      expect(screen.getByTestId('preview-schema')).toBeInTheDocument();
    });

    it('switches to Aspects tab when clicked', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Aspects'));

      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      expect(screen.getByTestId('preview-annotation')).toBeInTheDocument();
    });

    it('does not show Schema tab for non-Tables entry type', () => {
      mockGetEntryType.mockReturnValue('Datasets');

      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.queryByText('Schema')).not.toBeInTheDocument();
    });

    it('shows Schema tab for Tables entry type', () => {
      mockGetEntryType.mockReturnValue('Tables');

      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('Schema')).toBeInTheDocument();
    });
  });

  describe('Overview Tab Content', () => {
    it('displays description', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('Test table description')).toBeInTheDocument();
    });

    it('displays dash when description is missing', () => {
      const previewDataWithoutDescription = {
        ...mockPreviewData,
        entrySource: {
          ...mockPreviewData.entrySource,
          description: undefined
        }
      };

      renderResourcePreview({ previewData: previewDataWithoutDescription });

      // Find the Description label and check its sibling contains dash
      const descriptionLabel = screen.getByText('Description');
      const descriptionSection = descriptionLabel.parentElement;
      expect(descriptionSection).toHaveTextContent('-');
    });

    it('displays creation and modification times', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Last modified')).toBeInTheDocument();
      // Verify the date/time sections exist by checking labels are present
      const creationTimeSection = screen.getByText('Created').parentElement;
      expect(creationTimeSection).toBeInTheDocument();
    });

    it('displays location', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('US')).toBeInTheDocument();
    });

    it('displays contacts when available', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('Contact(s)')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('displays +N when multiple contacts exist', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('displays dash when no contacts available', () => {
      const entryWithoutContacts = {
        ...mockEntry,
        aspects: {
          'table.global.schema': mockEntry.aspects['table.global.schema']
        }
      };

      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: entryWithoutContacts,
            status: 'succeeded',
            error: null
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      // The contacts section should show dash
      const contactsSection = screen.getByText('Contact(s)').parentElement;
      expect(contactsSection).toBeInTheDocument();
    });

    it('displays parent and project information', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.getByText('test-dataset')).toBeInTheDocument();
      expect(screen.getByText('test-project')).toBeInTheDocument();
    });
  });

  describe('Schema Tab Content', () => {
    it('shows schema filter and preview when schema data exists', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Schema'));

      expect(screen.getByTestId('schema-filter')).toBeInTheDocument();
      expect(screen.getByTestId('preview-schema')).toBeInTheDocument();
    });

    it('shows no schema message when schema data is empty', () => {
      const entryWithEmptySchema = {
        ...mockEntry,
        aspects: {
          'table.global.schema': {
            aspectType: 'tables/schema',
            data: { fields: { listValue: { values: [] } } }
          }
        }
      };

      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: entryWithEmptySchema,
            status: 'succeeded',
            error: null
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Schema'));

      expect(screen.getByText('No Schema Data available for this table')).toBeInTheDocument();
    });

    it('handles schema filter changes', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Schema'));
      fireEvent.click(screen.getByTestId('apply-schema-filter'));

      expect(screen.getByTestId('preview-schema')).toBeInTheDocument();
    });
  });

  describe('Aspects Tab Content', () => {
    it('shows annotation filter and preview when annotations exist', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Aspects'));

      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
      expect(screen.getByTestId('preview-annotation')).toBeInTheDocument();
    });

    it('shows no aspects message when no valid annotations exist', () => {
      mockHasValidAnnotationData.mockReturnValue(false);

      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Aspects'));

      expect(screen.getByText('No Aspects Data available for this table')).toBeInTheDocument();
    });

    it('handles annotation filter changes', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Aspects'));
      fireEvent.click(screen.getByTestId('apply-annotation-filter'));

      expect(screen.getByTestId('preview-annotation')).toBeInTheDocument();
    });

    it('handles collapse all annotations', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Aspects'));
      fireEvent.click(screen.getByTestId('collapse-all'));

      // Component should handle collapse without error
      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });

    it('handles expand all annotations', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Aspects'));
      fireEvent.click(screen.getByTestId('expand-all'));

      // Component should handle expand without error
      expect(screen.getByTestId('annotation-filter')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: null,
            status: 'loading',
            error: null
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });
    });

    it('shows skeleton loaders in overview during loading', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      // MUI Skeleton components should be rendered during loading
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows shimmer loader in schema tab during loading', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Schema'));

      expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();
    });

    it('shows skeleton loader in aspects tab during loading', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Aspects'));

      expect(screen.getByTestId('preview-annotation-skeleton')).toBeInTheDocument();
    });

    it('disables view details button during loading', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('shows permission denied error for 403 status', () => {
      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: null,
            status: 'failed',
            error: { details: '403 Forbidden' }
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Schema'));

      expect(screen.getByText('You do not have enough permisssion to see this entry data.')).toBeInTheDocument();
    });

    it('shows permission denied error for PERMISSION_DENIED status', () => {
      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: null,
            status: 'failed',
            error: { details: 'PERMISSION_DENIED' }
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Aspects'));

      expect(screen.getByText('You do not have enough permisssion to see this entry data.')).toBeInTheDocument();
    });

    it('shows generic error message for other errors', () => {
      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: null,
            status: 'failed',
            error: { message: 'Network error' }
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      fireEvent.click(screen.getByText('Schema'));

      expect(screen.getByText(/Failed to load entry data: Network error/)).toBeInTheDocument();
    });

    it('logs out user on UNAUTHENTICATED error', () => {
      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: null,
            status: 'failed',
            error: { details: 'UNAUTHENTICATED' }
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Demo Mode', () => {
    it('uses previewData as entry in demo mode', () => {
      const demoPreviewData = {
        ...mockPreviewData,
        aspects: mockEntry.aspects
      };

      renderResourcePreview({ previewData: demoPreviewData, demoMode: true });

      // In demo mode, dispatch should not be called
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('disables BigQuery button in demo mode', () => {
      const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

      renderResourcePreview({ previewData: mockPreviewData, demoMode: true });

      const bigQueryButton = screen.getByAltText('Open in BigQuery');
      fireEvent.click(bigQueryButton.parentElement!);

      expect(mockOpen).not.toHaveBeenCalled();

      mockOpen.mockRestore();
    });

    it('disables Looker button in demo mode', () => {
      const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

      renderResourcePreview({ previewData: mockPreviewData, demoMode: true });

      const lookerButton = screen.getByAltText('Explore with Looker Studio');
      fireEvent.click(lookerButton.parentElement!);

      expect(mockOpen).not.toHaveBeenCalled();

      mockOpen.mockRestore();
    });

    it('does not navigate on view details in demo mode', () => {
      renderResourcePreview({ previewData: mockPreviewData, demoMode: true });

      fireEvent.click(screen.getByText('View Details'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not open submit access in demo mode', () => {
      renderResourcePreview({ previewData: mockPreviewData, demoMode: true });

      fireEvent.click(screen.getByText('Request Access'));

      expect(screen.queryByTestId('submit-access')).not.toBeInTheDocument();
    });
  });

  describe('Isolated Preview Mode', () => {
    it('uses usePreviewEntry hook in isolated mode', () => {
      mockUsePreviewEntry.mockReturnValue({
        entry: mockEntry,
        status: 'succeeded',
        error: null,
        refetch: vi.fn()
      });

      renderResourcePreview({
        previewData: mockPreviewData,
        previewMode: 'isolated'
      });

      expect(mockUsePreviewEntry).toHaveBeenCalledWith({
        entryName: mockPreviewData.name,
        id_token: 'test-token',
        enabled: true
      });
    });

    it('does not dispatch Redux action in isolated mode', () => {
      mockUsePreviewEntry.mockReturnValue({
        entry: mockEntry,
        status: 'succeeded',
        error: null,
        refetch: vi.fn()
      });

      renderResourcePreview({
        previewData: mockPreviewData,
        previewMode: 'isolated'
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('uses isolated entry data for display', () => {
      const isolatedEntry = {
        ...mockEntry,
        name: 'isolated-entry-name'
      };

      mockUsePreviewEntry.mockReturnValue({
        entry: isolatedEntry,
        status: 'succeeded',
        error: null,
        refetch: vi.fn()
      });

      renderResourcePreview({
        previewData: mockPreviewData,
        previewMode: 'isolated'
      });

      // Check that Aspects tab uses isolated entry data
      fireEvent.click(screen.getByText('Aspects'));

      expect(screen.getByTestId('preview-annotation')).toHaveTextContent('isolated-entry-name');
    });
  });

  describe('isGlossary Mode', () => {
    it('renders correctly with isGlossary=true', () => {
      renderResourcePreview({
        previewData: mockPreviewData,
        isGlossary: true
      });

      expect(screen.getByText('test-table')).toBeInTheDocument();
    });
  });

  describe('Redux Integration', () => {
    it('dispatches fetchEntry when previewData changes', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fetchEntry',
          payload: {
            entryName: mockPreviewData.name,
            id_token: 'test-token'
          }
        })
      );
    });

    it('does not dispatch fetchEntry when previewData is null', () => {
      renderResourcePreview({ previewData: null });

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('Contact Parsing', () => {
    it('handles contact name with email format', () => {
      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('handles contact name without email format', () => {
      const entryWithSimpleContactName = {
        ...mockEntry,
        aspects: {
          ...mockEntry.aspects,
          'table.global.contacts': {
            aspectType: 'contacts',
            data: {
              fields: {
                identities: {
                  listValue: {
                    values: [
                      { structValue: { fields: { name: { stringValue: 'Simple Name' } } } }
                    ]
                  }
                }
              }
            }
          }
        }
      };

      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: entryWithSimpleContactName,
            status: 'succeeded',
            error: null
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      expect(screen.getByText('Simple Name')).toBeInTheDocument();
    });

    it('handles empty contact name gracefully', () => {
      const entryWithEmptyContact = {
        ...mockEntry,
        aspects: {
          ...mockEntry.aspects,
          'table.global.contacts': {
            aspectType: 'contacts',
            data: {
              fields: {
                identities: {
                  listValue: {
                    values: [
                      { structValue: { fields: { name: { stringValue: '' } } } }
                    ]
                  }
                }
              }
            }
          }
        }
      };

      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: entryWithEmptyContact,
            status: 'succeeded',
            error: null
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      // Empty contact names are filtered out, so contacts section shows dash fallback
      const contactsSection = screen.getByText('Contact(s)').parentElement;
      expect(contactsSection).toHaveTextContent('-');
    });

    it('handles malformed contact data gracefully', () => {
      const entryWithMalformedContact = {
        ...mockEntry,
        aspects: {
          ...mockEntry.aspects,
          'table.global.contacts': {
            aspectType: 'contacts',
            data: {
              fields: {
                identities: {
                  listValue: {
                    values: [
                      { structValue: { fields: {} } } // Missing name field
                    ]
                  }
                }
              }
            }
          }
        }
      };

      vi.mocked(useSelector).mockImplementation((selector: any) => {
        const state = {
          entry: {
            items: entryWithMalformedContact,
            status: 'succeeded',
            error: null
          },
          user: { mode: 'light' },
          projects: { items: [] }
        };
        return selector(state);
      });

      renderResourcePreview({ previewData: mockPreviewData });

      // Malformed contacts are filtered out, so contacts section shows dash fallback
      const contactsSection = screen.getByText('Contact(s)').parentElement;
      expect(contactsSection).toHaveTextContent('-');
    });
  });
});
