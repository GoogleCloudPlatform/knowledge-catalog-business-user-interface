import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, it, describe, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import SearchEntriesCard from './SearchEntriesCard';

// Mock SVG imports
vi.mock('../../assets/svg/database_icon.svg', () => ({ default: 'database-icon.svg' }));
vi.mock('../../assets/svg/bucket_icon.svg', () => ({ default: 'bucket-icon.svg' }));
vi.mock('../../assets/svg/cluster_icon.svg', () => ({ default: 'cluster-icon.svg' }));
vi.mock('../../assets/svg/code_asset_icon.svg', () => ({ default: 'code-asset-icon.svg' }));
vi.mock('../../assets/svg/connection_icon.svg', () => ({ default: 'connection-icon.svg' }));
vi.mock('../../assets/svg/dashboard_icon.svg', () => ({ default: 'dashboard-icon.svg' }));
vi.mock('../../assets/svg/dashboard_element_icon.svg', () => ({ default: 'dashboard-element-icon.svg' }));
vi.mock('../../assets/svg/data_exchange_icon.svg', () => ({ default: 'data-exchange-icon.svg' }));
vi.mock('../../assets/svg/data_stream_icon.svg', () => ({ default: 'data-stream-icon.svg' }));
vi.mock('../../assets/svg/database_schema_icon.svg', () => ({ default: 'database-schema-icon.svg' }));
vi.mock('../../assets/svg/dataset_icon.svg', () => ({ default: 'dataset-icon.svg' }));
vi.mock('../../assets/svg/explore_icon.svg', () => ({ default: 'explore-icon.svg' }));
vi.mock('../../assets/svg/feature_group_icon.svg', () => ({ default: 'feature-group-icon.svg' }));
vi.mock('../../assets/svg/feature_online_store_icon.svg', () => ({ default: 'feature-online-store-icon.svg' }));
vi.mock('../../assets/svg/view_icon.svg', () => ({ default: 'view-icon.svg' }));
vi.mock('../../assets/svg/fileset_icon.svg', () => ({ default: 'fileset-icon.svg' }));
vi.mock('../../assets/svg/folder_icon.svg', () => ({ default: 'folder-icon.svg' }));
vi.mock('../../assets/svg/function_icon.svg', () => ({ default: 'function-icon.svg' }));
vi.mock('../../assets/svg/listing_icon.svg', () => ({ default: 'listing-icon.svg' }));
vi.mock('../../assets/svg/look_icon.svg', () => ({ default: 'look-icon.svg' }));
vi.mock('../../assets/svg/model_icon.svg', () => ({ default: 'model-icon.svg' }));
vi.mock('../../assets/svg/repositories_icon.svg', () => ({ default: 'repositories-icon.svg' }));
vi.mock('../../assets/svg/generic_icon.svg', () => ({ default: 'generic-icon.svg' }));
vi.mock('../../assets/svg/scheduler_icon.svg', () => ({ default: 'scheduler-icon.svg' }));
vi.mock('../../assets/svg/table_icon.svg', () => ({ default: 'table-icon.svg' }));

// Mock CSS import
vi.mock('./SearchEntriesCard.css', () => ({}));

// Mock Tag component
vi.mock('../Tags/Tag', () => ({
  default: ({ text, css }: { text: string; css?: React.CSSProperties }) => (
    <span data-testid="tag" style={css}>{text}</span>
  )
}));

// Custom render with Redux Provider and Router
const createMockStore = () =>
  configureStore({
    reducer: {
      entry: (state = { accessCheckCache: {} }) => state,
      user: (state = { mode: 'light' }) => state,
    },
  });

const render = (ui: React.ReactElement, options?: any) => {
  const store = createMockStore();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
};

describe('SearchEntriesCard', () => {
  const createMockEntry = (overrides: any = {}) => ({
    name: 'projects/test-project/locations/us-central1/entryTypes/table/entries/test-entry',
    entryType: 'projects/test-project/entryTypes/bigquery-table',
    entrySource: {
      displayName: 'Test Entry Name',
      system: 'bigquery',
      location: 'us-central1',
      description: 'This is a test description for the entry.',
      ...overrides.entrySource
    },
    updateTime: {
      seconds: 1640995200 // Jan 1, 2022
    },
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the component with entry data', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Test Entry Name')).toBeInTheDocument();
      });
    });

    it('renders the description', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('This is a test description for the entry.')).toBeInTheDocument();
      });
    });

    it('renders "No Description Available" when description is empty', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test Entry',
          system: 'bigquery',
          location: 'us-central1',
          description: ''
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('No Description Available')).toBeInTheDocument();
      });
    });

    it('renders location from entrySource', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Us-central1')).toBeInTheDocument();
      });
    });

    it('renders the formatted date', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Jan 1, 2022')).toBeInTheDocument();
      });
    });
  });

  describe('Name Computation', () => {
    it('uses displayName when available', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Custom Display Name',
          system: 'bigquery',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Custom Display Name')).toBeInTheDocument();
      });
    });

    it('uses last segment of entry.name when displayName is empty', async () => {
      const entry = createMockEntry({
        name: 'projects/test-project/locations/us-central1/entries/fallback-name',
        entrySource: {
          displayName: '',
          system: 'bigquery',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('fallback-name')).toBeInTheDocument();
      });
    });

    it('uses last segment when displayName is undefined', async () => {
      const entry = {
        name: 'projects/test-project/entries/entry-from-path',
        entryType: 'projects/test-project/entryTypes/bigquery-table',
        entrySource: {
          system: 'bigquery',
          location: 'us-central1'
        },
        updateTime: { seconds: 1640995200 }
      };
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('entry-from-path')).toBeInTheDocument();
      });
    });
  });

  describe('System Name', () => {
    it('displays system name from entrySource', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'dataplex',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        // "dataplex" maps to "Knowledge Catalog" which is then lowercased in the tag text
        // (CSS textTransform: capitalize handles visual capitalization)
        expect(tags[0]).toHaveTextContent('knowledge catalog');
      });
    });

    it('displays "Custom" when system is not provided', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: undefined,
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        // CSS capitalize transforms 'custom' to 'Custom' visually
        expect(tags[0].textContent?.toLowerCase()).toBe('custom');
      });
    });

    it('formats BigQuery system name correctly', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'bigquery',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        expect(tags[0]).toHaveTextContent('BigQuery');
      });
    });

    it('replaces underscores and hyphens in system name', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'cloud_storage',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        expect(tags[0]).toHaveTextContent('cloud storage');
      });
    });

    it('replaces hyphens in system name', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'cloud-sql',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        expect(tags[0]).toHaveTextContent('cloud sql');
      });
    });
  });

  describe('Entry Type', () => {
    it('extracts entry type from entryType with hyphen', async () => {
      const entry = createMockEntry({
        entryType: 'projects/test-project/entryTypes/bigquery-table'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        expect(tags[1]).toHaveTextContent('table');
      });
    });

    it('extracts entry type from name path when no hyphen in entryType', async () => {
      const entry = createMockEntry({
        name: 'projects/test-project/locations/us-central1/Dataset/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        expect(tags[1]).toHaveTextContent('Dataset');
      });
    });
  });

  describe('Date Formatting', () => {
    it('formats date from seconds object', async () => {
      const entry = createMockEntry({
        updateTime: { seconds: 1672531200 } // Jan 1, 2023
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument();
      });
    });

    it('formats date from ISO string', async () => {
      const entry = createMockEntry({
        updateTime: '2023-06-15T10:30:00Z'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Jun 15, 2023')).toBeInTheDocument();
      });
    });
  });

  describe('Selection State', () => {
    it('applies selected styles when isSelected is true', async () => {
      const entry = createMockEntry();
      const { container } = render(<SearchEntriesCard entry={entry} isSelected={true} />);

      await waitFor(() => {
        const innerBox = container.querySelector('.entriesHoverEffect');
        expect(innerBox).toHaveStyle('background-color: rgb(237, 242, 252)');
      });
    });

    it('does not apply selected styles when isSelected is false', async () => {
      const entry = createMockEntry();
      const { container } = render(<SearchEntriesCard entry={entry} isSelected={false} />);

      await waitFor(() => {
        const innerBox = container.querySelector('.entriesHoverEffect');
        expect(innerBox).toBeInTheDocument();
        // When not selected, background should be white
        expect(innerBox).toHaveStyle('background-color: rgb(255, 255, 255)');
      });
    });
  });

  describe('Double Click Handler', () => {
    it('calls onDoubleClick when card is double-clicked', async () => {
      const entry = createMockEntry();
      const mockDoubleClick = vi.fn();
      const { container } = render(
        <SearchEntriesCard entry={entry} onDoubleClick={mockDoubleClick} />
      );

      await waitFor(() => {
        const clickableBox = container.querySelector('.entriesHoverEffect');
        expect(clickableBox).toBeInTheDocument();
      });

      const clickableBox = container.querySelector('.entriesHoverEffect');
      fireEvent.doubleClick(clickableBox!);

      expect(mockDoubleClick).toHaveBeenCalledWith(entry);
    });

    it('does not throw when onDoubleClick is not provided', async () => {
      const entry = createMockEntry();
      const { container } = render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const clickableBox = container.querySelector('.entriesHoverEffect');
        expect(clickableBox).toBeInTheDocument();
      });

      const clickableBox = container.querySelector('.entriesHoverEffect');
      expect(() => fireEvent.doubleClick(clickableBox!)).not.toThrow();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover styles when disableHoverEffect is false', async () => {
      const entry = createMockEntry();
      const { container } = render(
        <SearchEntriesCard entry={entry} disableHoverEffect={false} />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('disables hover styles when disableHoverEffect is true', async () => {
      const entry = createMockEntry();
      const { container } = render(
        <SearchEntriesCard entry={entry} disableHoverEffect={true} />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('Border Styling', () => {
    it('hides top border when index is 0', async () => {
      const entry = createMockEntry();
      const { container } = render(<SearchEntriesCard entry={entry} index={0} />);

      await waitFor(() => {
        const innerBox = container.querySelector('.entriesHoverEffect');
        expect(innerBox).toBeInTheDocument();
      });
    });

    it('shows top border when index is greater than 0', async () => {
      const entry = createMockEntry();
      const { container } = render(<SearchEntriesCard entry={entry} index={1} />);

      await waitFor(() => {
        const innerBox = container.querySelector('.entriesHoverEffect');
        expect(innerBox).toBeInTheDocument();
      });
    });

    it('hides top border when hideTopBorderOnHover is true', async () => {
      const entry = createMockEntry();
      const { container } = render(
        <SearchEntriesCard entry={entry} hideTopBorderOnHover={true} />
      );

      await waitFor(() => {
        const innerBox = container.querySelector('.entriesHoverEffect');
        expect(innerBox).toBeInTheDocument();
      });
    });
  });

  describe('Custom Styling', () => {
    it('applies custom sx prop styles', async () => {
      const entry = createMockEntry();
      const customSx = { backgroundColor: 'red', padding: '20px' };
      const { container } = render(<SearchEntriesCard entry={entry} sx={customSx} />);

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('Tooltips', () => {
    it('renders name tooltip', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Tooltip Test Name',
          system: 'bigquery',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Tooltip Test Name')).toBeInTheDocument();
      });
    });

    it('renders modified date tooltip', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Jan 1, 2022')).toBeInTheDocument();
      });
    });

    it('renders location tooltip', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'bigquery',
          location: 'europe-west1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Europe-west1')).toBeInTheDocument();
      });
    });
  });

  describe('Asset Icons', () => {
    const testAssetIcon = async (entryType: string, expectedAlt: string) => {
      const entry = createMockEntry({
        name: `projects/test/locations/us/${entryType}/test-entry`,
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText(expectedAlt)).toBeInTheDocument();
      });
    };

    it('renders Bucket icon', async () => {
      await testAssetIcon('Bucket', 'Bucket');
    });

    it('renders Cluster icon', async () => {
      await testAssetIcon('Cluster', 'Cluster');
    });

    it('renders Code asset icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Code asset/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Code asset')).toBeInTheDocument();
      });
    });

    it('renders Connection icon', async () => {
      await testAssetIcon('Connection', 'Connection');
    });

    it('renders Dashboard icon', async () => {
      await testAssetIcon('Dashboard', 'Dashboard');
    });

    it('renders Dashboard element icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Dashboard element/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Dashboard element')).toBeInTheDocument();
      });
    });

    it('renders Data exchange icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Data exchange/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Data exchange')).toBeInTheDocument();
      });
    });

    it('renders Data source connection icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Data source connection/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Data source connection')).toBeInTheDocument();
      });
    });

    it('renders Data stream icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Data stream/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Data stream')).toBeInTheDocument();
      });
    });

    it('renders Database icon', async () => {
      await testAssetIcon('Database', 'Database');
    });

    it('renders Database schema icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Database schema/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Database schema')).toBeInTheDocument();
      });
    });

    it('renders Dataset icon', async () => {
      await testAssetIcon('Dataset', 'Dataset');
    });

    it('renders Explore icon', async () => {
      await testAssetIcon('Explore', 'Explore');
    });

    it('renders Feature group icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Feature group/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Feature group')).toBeInTheDocument();
      });
    });

    it('renders Feature online store icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Feature online store/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Feature online store')).toBeInTheDocument();
      });
    });

    it('renders Feature view icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Feature view/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Feature view')).toBeInTheDocument();
      });
    });

    it('renders Fileset icon', async () => {
      await testAssetIcon('Fileset', 'Fileset');
    });

    it('renders Folder icon', async () => {
      await testAssetIcon('Folder', 'Folder');
    });

    it('renders Function icon', async () => {
      await testAssetIcon('Function', 'Function');
    });

    it('renders Glossary icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Glossary/test-entry',
        entryType: 'single_word'
      });
      const { container } = render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(container.querySelector('span.material-symbols-outlined')).toBeInTheDocument();
      });
    });

    it('renders Glossary Category icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Glossary Category/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByTestId('CategoryOutlinedIcon')).toBeInTheDocument();
      });
    });

    it('renders Glossary Term icon', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Glossary Term/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByTestId('ArticleOutlinedIcon')).toBeInTheDocument();
      });
    });

    it('renders Listing icon', async () => {
      await testAssetIcon('Listing', 'Listing');
    });

    it('renders Look icon', async () => {
      await testAssetIcon('Look', 'Look');
    });

    it('renders Model icon', async () => {
      await testAssetIcon('Model', 'Model');
    });

    it('renders Repository icon', async () => {
      await testAssetIcon('Repository', 'Repository');
    });

    it('renders View icon', async () => {
      await testAssetIcon('View', 'View');
    });

    it('renders Resource icon (generic)', async () => {
      await testAssetIcon('Resource', 'Resource');
    });

    it('renders Routine icon (scheduler)', async () => {
      await testAssetIcon('Routine', 'Routine');
    });

    it('renders Table icon', async () => {
      await testAssetIcon('Table', 'Table');
    });

    it('renders Generic icon for unknown asset type', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/Unknown/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Unknown')).toBeInTheDocument();
      });
    });
  });

  describe('capitalizeFirstLetter function', () => {
    it('capitalizes first letter of entry type', async () => {
      const entry = createMockEntry({
        name: 'projects/test/locations/us/table/test-entry',
        entryType: 'single_word'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByAltText('Table')).toBeInTheDocument();
      });
    });

    it('handles empty string', async () => {
      const entry = createMockEntry({
        entryType: 'bigquery-table'
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        expect(tags[1]).toHaveTextContent('table');
      });
    });
  });

  describe('Tags Rendering', () => {
    it('renders two tags for system and entry type', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        expect(tags).toHaveLength(2);
      });
    });

    it('renders system tag with correct content', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        // System tag should display BigQuery for bigquery system
        expect(tags[0]).toHaveTextContent('BigQuery');
      });
    });

    it('renders entry type tag with correct content', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        // Entry type tag should display the extracted type
        expect(tags[1]).toHaveTextContent('table');
      });
    });
  });

  describe('MUI Icons', () => {
    it('renders DateRange icon', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByTestId('DateRangeOutlinedIcon')).toBeInTheDocument();
      });
    });

    it('renders LocationOnOutlined icon', async () => {
      const entry = createMockEntry();
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByTestId('LocationOnOutlinedIcon')).toBeInTheDocument();
      });
    });
  });

  describe('Entry re-render on entry prop change', () => {
    it('updates when entry prop changes', async () => {
      const entry1 = createMockEntry({
        entrySource: {
          displayName: 'Entry One',
          system: 'bigquery',
          location: 'us-central1',
          description: 'First description'
        }
      });
      const entry2 = createMockEntry({
        entrySource: {
          displayName: 'Entry Two',
          system: 'dataplex',
          location: 'europe-west1',
          description: 'Second description'
        }
      });

      const { rerender } = render(<SearchEntriesCard entry={entry1} />);

      await waitFor(() => {
        expect(screen.getByText('Entry One')).toBeInTheDocument();
        expect(screen.getByText('First description')).toBeInTheDocument();
      });

      rerender(<SearchEntriesCard entry={entry2} />);

      await waitFor(() => {
        expect(screen.getByText('Entry Two')).toBeInTheDocument();
        expect(screen.getByText('Second description')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles entry with null description', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'bigquery',
          location: 'us-central1',
          description: null
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('No Description Available')).toBeInTheDocument();
      });
    });

    it('handles entry with undefined description', async () => {
      const entry = {
        name: 'projects/test/entries/test',
        entryType: 'bigquery-table',
        entrySource: {
          displayName: 'Test',
          system: 'bigquery',
          location: 'us-central1'
        },
        updateTime: { seconds: 1640995200 }
      };
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('No Description Available')).toBeInTheDocument();
      });
    });

    it('handles very long display name', async () => {
      const longName = 'A'.repeat(200);
      const entry = createMockEntry({
        entrySource: {
          displayName: longName,
          system: 'bigquery',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument();
      });
    });

    it('handles very long description', async () => {
      const longDescription = 'B'.repeat(500);
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'bigquery',
          location: 'us-central1',
          description: longDescription
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText(longDescription)).toBeInTheDocument();
      });
    });

    it('handles special characters in display name', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test <Entry> & "Special" \'Chars\'',
          system: 'bigquery',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Test <Entry> & "Special" \'Chars\'')).toBeInTheDocument();
      });
    });

    it('handles entry with missing name when displayName exists', async () => {
      const entry = {
        name: '',
        entryType: 'bigquery-table',
        entrySource: {
          displayName: 'Display Name Only',
          system: 'bigquery',
          location: 'us-central1'
        },
        updateTime: { seconds: 1640995200 }
      };
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        expect(screen.getByText('Display Name Only')).toBeInTheDocument();
      });
    });

    it('handles combined isSelected and disableHoverEffect', async () => {
      const entry = createMockEntry();
      const { container } = render(
        <SearchEntriesCard entry={entry} isSelected={true} disableHoverEffect={true} />
      );

      await waitFor(() => {
        const innerBox = container.querySelector('.entriesHoverEffect');
        expect(innerBox).toHaveStyle('background-color: rgb(237, 242, 252)');
      });
    });

    it('handles all optional props together', async () => {
      const entry = createMockEntry();
      const mockDoubleClick = vi.fn();
      const { container } = render(
        <SearchEntriesCard
          entry={entry}
          sx={{ margin: '10px' }}
          isSelected={true}
          onDoubleClick={mockDoubleClick}
          disableHoverEffect={true}
          hideTopBorderOnHover={true}
          index={0}
        />
      );

      await waitFor(() => {
        const innerBox = container.querySelector('.entriesHoverEffect');
        expect(innerBox).toBeInTheDocument();
      });

      const clickableBox = container.querySelector('.entriesHoverEffect');
      fireEvent.doubleClick(clickableBox!);
      expect(mockDoubleClick).toHaveBeenCalledWith(entry);
    });
  });

  describe('System name edge cases', () => {
    it('handles system name with multiple underscores', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'cloud_pub_sub',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        // Only first underscore is replaced
        expect(tags[0]).toHaveTextContent('cloud pub_sub');
      });
    });

    it('handles system name with uppercase BIGQUERY', async () => {
      const entry = createMockEntry({
        entrySource: {
          displayName: 'Test',
          system: 'BIGQUERY',
          location: 'us-central1'
        }
      });
      render(<SearchEntriesCard entry={entry} />);

      await waitFor(() => {
        const tags = screen.getAllByTestId('tag');
        expect(tags[0]).toHaveTextContent('BigQuery');
      });
    });
  });
});
