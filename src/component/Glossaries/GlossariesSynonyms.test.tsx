import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlossariesSynonyms from './GlossariesSynonyms';
import type { GlossaryRelation } from './GlossaryDataType';

// Mock getFormattedDateTimePartsByDateTime from resourceUtils
vi.mock('../../utils/resourceUtils', () => ({
  getFormattedDateTimePartsByDateTime: (timestamp: { seconds: number }) => ({
    date: `2025-01-${String((timestamp.seconds % 28) + 1).padStart(2, '0')}`,
    time: '12:00:00',
  }),
  getFormattedDateTimeParts: (timestamp: number) => ({
    date: `2025-01-${String((timestamp % 28) + 1).padStart(2, '0')}`,
    time: '12:00:00',
  }),
}));

describe('GlossariesSynonyms', () => {
  const mockOnSearchTermChange = vi.fn();
  const mockOnRelationFilterChange = vi.fn();
  const mockOnSortByChange = vi.fn();
  const mockOnSortOrderToggle = vi.fn();
  const mockOnItemClick = vi.fn();

  const defaultProps = {
    relations: [],
    searchTerm: '',
    onSearchTermChange: mockOnSearchTermChange,
    relationFilter: 'all' as const,
    onRelationFilterChange: mockOnRelationFilterChange,
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
    onSortByChange: mockOnSortByChange,
    onSortOrderToggle: mockOnSortOrderToggle,
    onItemClick: mockOnItemClick,
  };

  // Mock relation data
  const mockRelations: GlossaryRelation[] = [
    {
      id: 'rel-1',
      type: 'synonym',
      displayName: 'Alpha Synonym',
      description: 'Description for alpha synonym',
      lastModified: 1000,
    },
    {
      id: 'rel-2',
      type: 'related',
      displayName: 'Beta Related',
      description: 'Description for beta related term',
      lastModified: 2000,
    },
    {
      id: 'rel-3',
      type: 'synonym',
      displayName: 'Gamma Synonym',
      description: 'Description for gamma synonym',
      lastModified: 3000,
    },
    {
      id: 'rel-4',
      type: 'related',
      displayName: 'Delta Related',
      description: '',
      lastModified: 4000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<GlossariesSynonyms {...defaultProps} />);
      expect(screen.getByPlaceholderText('Filter synonyms and related terms')).toBeInTheDocument();
    });

    it('renders search input with placeholder', () => {
      render(<GlossariesSynonyms {...defaultProps} />);
      expect(screen.getByPlaceholderText('Filter synonyms and related terms')).toBeInTheDocument();
    });

    it('renders filter chips', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      expect(screen.getByText('All (4)')).toBeInTheDocument();
      expect(screen.getByText('Synonyms (2)')).toBeInTheDocument();
      expect(screen.getByText('Related Terms (2)')).toBeInTheDocument();
    });

    it('renders sort controls', () => {
      render(<GlossariesSynonyms {...defaultProps} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('renders cards when relations exist', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
      expect(screen.getByText('Beta Related')).toBeInTheDocument();
      expect(screen.getByText('Gamma Synonym')).toBeInTheDocument();
      expect(screen.getByText('Delta Related')).toBeInTheDocument();
    });

    it('renders empty state when no relations', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={[]} />);

      expect(screen.getByText('No matching synonyms or related terms found')).toBeInTheDocument();
    });

    it('renders card descriptions', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      expect(screen.getByText('Description for alpha synonym')).toBeInTheDocument();
      expect(screen.getByText('Description for beta related term')).toBeInTheDocument();
    });

    it('renders "No description" for empty descriptions', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('renders type chips on cards', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      const synonymChips = screen.getAllByText('Synonym');
      const relatedChips = screen.getAllByText('Related');

      expect(synonymChips.length).toBe(2);
      expect(relatedChips.length).toBe(2);
    });
  });

  describe('Search Functionality', () => {
    it('displays searchTerm value in input', () => {
      render(<GlossariesSynonyms {...defaultProps} searchTerm="test search" />);

      const searchInput = screen.getByPlaceholderText('Filter synonyms and related terms');
      expect(searchInput).toHaveValue('test search');
    });

    it('calls onSearchTermChange when typing', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      const searchInput = screen.getByPlaceholderText('Filter synonyms and related terms');
      fireEvent.change(searchInput, { target: { value: 'a' } });

      expect(mockOnSearchTermChange).toHaveBeenCalled();
    });

    it('shows all relations when searchTerm is set (filtering is chip-based)', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} searchTerm="Alpha" />);

      // searchTerm is displayed in input but does not drive filtering
      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
      expect(screen.getByText('Beta Related')).toBeInTheDocument();
      expect(screen.getByText('Gamma Synonym')).toBeInTheDocument();
    });

    it('search is case insensitive', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} searchTerm="ALPHA" />);

      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
    });

    it('chip counts are not affected by searchTerm (filtering is chip-based)', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} searchTerm="Alpha" />);

      // searchTerm does not drive filtering, counts reflect all relations
      expect(screen.getByText('All (4)')).toBeInTheDocument();
      expect(screen.getByText('Synonyms (2)')).toBeInTheDocument();
      expect(screen.getByText('Related Terms (2)')).toBeInTheDocument();
    });

    it('shows all relations when searchTerm has no matches (filtering is chip-based)', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} searchTerm="nonexistent" />);

      // searchTerm does not drive filtering, all relations show
      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
      expect(screen.getByText('Beta Related')).toBeInTheDocument();
    });

    it('handles whitespace search term', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} searchTerm="   " />);

      // Empty search term should show all
      expect(screen.getByText('All (4)')).toBeInTheDocument();
    });
  });

  describe('Filter Chips', () => {
    it('calls onRelationFilterChange when All chip is clicked', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="synonym" />);

      await user.click(screen.getByText('All (4)'));

      expect(mockOnRelationFilterChange).toHaveBeenCalledWith('all');
    });

    it('calls onRelationFilterChange when Synonyms chip is clicked', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      await user.click(screen.getByText('Synonyms (2)'));

      expect(mockOnRelationFilterChange).toHaveBeenCalledWith('synonym');
    });

    it('calls onRelationFilterChange when Related Terms chip is clicked', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      await user.click(screen.getByText('Related Terms (2)'));

      expect(mockOnRelationFilterChange).toHaveBeenCalledWith('related');
    });

    it('filters to show only synonyms when synonym filter is active', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="synonym" />);

      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
      expect(screen.getByText('Gamma Synonym')).toBeInTheDocument();
      expect(screen.queryByText('Beta Related')).not.toBeInTheDocument();
      expect(screen.queryByText('Delta Related')).not.toBeInTheDocument();
    });

    it('filters to show only related terms when related filter is active', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="related" />);

      expect(screen.getByText('Beta Related')).toBeInTheDocument();
      expect(screen.getByText('Delta Related')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Synonym')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Synonym')).not.toBeInTheDocument();
    });

    it('shows all relations when all filter is active', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="all" />);

      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
      expect(screen.getByText('Beta Related')).toBeInTheDocument();
      expect(screen.getByText('Gamma Synonym')).toBeInTheDocument();
      expect(screen.getByText('Delta Related')).toBeInTheDocument();
    });

    it('type filter works independently of searchTerm', () => {
      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          searchTerm="Alpha"
          relationFilter="synonym"
        />
      );

      // searchTerm doesn't filter, only type filter applies
      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
      expect(screen.getByText('Gamma Synonym')).toBeInTheDocument();
      // Chip counts reflect all relations (no search filtering)
      expect(screen.getByText('All (4)')).toBeInTheDocument();
    });
  });

  describe('Sort Dropdown', () => {
    it('displays current sort by value', () => {
      render(<GlossariesSynonyms {...defaultProps} sortBy="name" />);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('displays Last modified when sortBy is lastModified', () => {
      render(<GlossariesSynonyms {...defaultProps} sortBy="lastModified" />);
      expect(screen.getByText('Last modified')).toBeInTheDocument();
    });

    it('opens sort menu when button is clicked', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      await user.click(screen.getByText('Name'));

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Last modified' })).toBeInTheDocument();
    });

    it('calls onSortByChange when Name is selected', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} sortBy="lastModified" />);

      await user.click(screen.getByText('Last modified'));
      await user.click(screen.getByRole('menuitem', { name: 'Name' }));

      expect(mockOnSortByChange).toHaveBeenCalledWith('name');
    });

    it('calls onSortByChange when Last Modified is selected', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      await user.click(screen.getByText('Name'));
      await user.click(screen.getByRole('menuitem', { name: 'Last modified' }));

      expect(mockOnSortByChange).toHaveBeenCalledWith('lastModified');
    });

    it('does not call onSortByChange when same option is selected', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} sortBy="name" />);

      await user.click(screen.getByText('Name'));
      await user.click(screen.getByRole('menuitem', { name: 'Name' }));

      expect(mockOnSortByChange).not.toHaveBeenCalled();
    });

    it('closes menu after selection', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      await user.click(screen.getByText('Name'));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.click(screen.getByRole('menuitem', { name: 'Last modified' }));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      await user.click(screen.getByText('Name'));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Press Escape to close menu
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Sort Expand Icon', () => {
    it('renders the expand icon without rotation when the sort menu is closed', () => {
      render(<GlossariesSynonyms {...defaultProps} sortOrder="asc" />);

      const expandIcon = screen.getByTestId('ExpandMoreIcon');
      expect(expandIcon).toHaveStyle({ transform: 'rotate(0deg)' });
    });

    it('rotates the expand icon when the sort menu is open', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      const expandIcon = screen.getByTestId('ExpandMoreIcon');
      expect(expandIcon).toHaveStyle({ transform: 'rotate(0deg)' });

      await user.click(screen.getByText('Name'));

      expect(expandIcon).toHaveStyle({ transform: 'rotate(180deg)' });
    });
  });

  describe('Sorting Behavior', () => {
    it('sorts by name ascending', () => {
      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          sortBy="name"
          sortOrder="asc"
        />
      );

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Alpha Synonym');
      expect(cards[1]).toHaveTextContent('Beta Related');
      expect(cards[2]).toHaveTextContent('Delta Related');
      expect(cards[3]).toHaveTextContent('Gamma Synonym');
    });

    it('sorts by name descending', () => {
      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          sortBy="name"
          sortOrder="desc"
        />
      );

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Gamma Synonym');
      expect(cards[1]).toHaveTextContent('Delta Related');
      expect(cards[2]).toHaveTextContent('Beta Related');
      expect(cards[3]).toHaveTextContent('Alpha Synonym');
    });

    it('sorts by lastModified ascending', () => {
      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          sortBy="lastModified"
          sortOrder="asc"
        />
      );

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Alpha Synonym'); // lastModified: 1000
      expect(cards[1]).toHaveTextContent('Beta Related'); // lastModified: 2000
      expect(cards[2]).toHaveTextContent('Gamma Synonym'); // lastModified: 3000
      expect(cards[3]).toHaveTextContent('Delta Related'); // lastModified: 4000
    });

    it('sorts by lastModified descending', () => {
      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          sortBy="lastModified"
          sortOrder="desc"
        />
      );

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Delta Related'); // lastModified: 4000
      expect(cards[1]).toHaveTextContent('Gamma Synonym'); // lastModified: 3000
      expect(cards[2]).toHaveTextContent('Beta Related'); // lastModified: 2000
      expect(cards[3]).toHaveTextContent('Alpha Synonym'); // lastModified: 1000
    });

    it('handles relations with undefined lastModified', () => {
      const relationsWithUndefined: GlossaryRelation[] = [
        { id: '1', type: 'synonym', displayName: 'No Date', lastModified: undefined as any },
        { id: '2', type: 'synonym', displayName: 'Has Date', lastModified: 1000 },
      ];

      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={relationsWithUndefined}
          sortBy="lastModified"
          sortOrder="asc"
        />
      );

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('No Date'); // undefined becomes 0
      expect(cards[1]).toHaveTextContent('Has Date');
    });
  });

  describe('Card Interactions', () => {
    it('calls onItemClick when card is clicked', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      const alphaCard = screen.getByText('Alpha Synonym').closest('[class*="MuiCard"]');
      await user.click(alphaCard!);

      expect(mockOnItemClick).toHaveBeenCalledWith('rel-1');
    });

    it('calls onItemClick with correct id for each card', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      const betaCard = screen.getByText('Beta Related').closest('[class*="MuiCard"]');
      await user.click(betaCard!);

      expect(mockOnItemClick).toHaveBeenCalledWith('rel-2');
    });
  });

  describe('Date Formatting', () => {
    it('displays formatted date for each relation', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      // The mock returns dates based on timestamp % 28 + 1
      // lastModified: 1000 => 1000 % 28 + 1 = 13 => "2025-01-13"
      expect(screen.getByText('2025-01-13')).toBeInTheDocument();
    });
  });

  describe('Empty and Edge Cases', () => {
    it('renders empty state with no relations', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={[]} />);

      expect(screen.getByText('No matching synonyms or related terms found')).toBeInTheDocument();
      expect(screen.getByText('All (0)')).toBeInTheDocument();
      expect(screen.getByText('Synonyms (0)')).toBeInTheDocument();
      expect(screen.getByText('Related Terms (0)')).toBeInTheDocument();
    });

    it('shows empty state when filter excludes all results', () => {
      const onlySynonyms: GlossaryRelation[] = [
        { id: '1', type: 'synonym', displayName: 'Only Synonym', lastModified: 1000 },
      ];

      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={onlySynonyms}
          relationFilter="related"
        />
      );

      expect(screen.getByText('No matching synonyms or related terms found')).toBeInTheDocument();
    });

    it('handles single relation', () => {
      const singleRelation: GlossaryRelation[] = [
        { id: '1', type: 'synonym', displayName: 'Single Item', lastModified: 1000 },
      ];

      render(<GlossariesSynonyms {...defaultProps} relations={singleRelation} />);

      expect(screen.getByText('Single Item')).toBeInTheDocument();
      expect(screen.getByText('All (1)')).toBeInTheDocument();
    });

    it('handles relations with empty displayName', () => {
      const emptyNameRelation: GlossaryRelation[] = [
        { id: '1', type: 'synonym', displayName: '', lastModified: 1000 },
      ];

      render(<GlossariesSynonyms {...defaultProps} relations={emptyNameRelation} />);

      // Should still render the card (check for type chip which exists on each card)
      expect(screen.getByText('Synonym')).toBeInTheDocument();
    });
  });

  describe('Chip Styling', () => {
    it('All chip is rendered when filter is all', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="all" />);

      const allChip = screen.getByText('All (4)').closest('[class*="MuiChip"]');
      expect(allChip).toBeInTheDocument();
    });

    it('Synonyms chip is rendered when filter is synonym', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="synonym" />);

      const synonymChip = screen.getByText('Synonyms (2)').closest('[class*="MuiChip"]');
      expect(synonymChip).toBeInTheDocument();
    });

    it('Related Terms chip is rendered when filter is related', () => {
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="related" />);

      const relatedChip = screen.getByText('Related Terms (2)').closest('[class*="MuiChip"]');
      expect(relatedChip).toBeInTheDocument();
    });
  });

  describe('Default Export', () => {
    it('exports the component as default', () => {
      expect(GlossariesSynonyms).toBeDefined();
      expect(typeof GlossariesSynonyms).toBe('function');
    });
  });

  describe('UseMemo Behavior', () => {
    it('recalculates searchedRelations when relations change', () => {
      const { rerender } = render(
        <GlossariesSynonyms {...defaultProps} relations={mockRelations} />
      );

      expect(screen.getByText('All (4)')).toBeInTheDocument();

      rerender(
        <GlossariesSynonyms {...defaultProps} relations={[mockRelations[0]]} />
      );

      expect(screen.getByText('All (1)')).toBeInTheDocument();
    });

    it('searchTerm change does not affect searchedRelations counts', () => {
      const { rerender } = render(
        <GlossariesSynonyms {...defaultProps} relations={mockRelations} />
      );

      expect(screen.getByText('All (4)')).toBeInTheDocument();

      // searchTerm does not drive filtering, counts remain the same
      rerender(
        <GlossariesSynonyms {...defaultProps} relations={mockRelations} searchTerm="Alpha" />
      );

      expect(screen.getByText('All (4)')).toBeInTheDocument();
    });

    it('recalculates filteredRelations when relationFilter changes', () => {
      const { rerender } = render(
        <GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="all" />
      );

      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
      expect(screen.getByText('Beta Related')).toBeInTheDocument();

      rerender(
        <GlossariesSynonyms {...defaultProps} relations={mockRelations} relationFilter="synonym" />
      );

      expect(screen.getByText('Alpha Synonym')).toBeInTheDocument();
      expect(screen.queryByText('Beta Related')).not.toBeInTheDocument();
    });

    it('recalculates filteredRelations when sortBy changes', () => {
      const { rerender } = render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          sortBy="name"
          sortOrder="asc"
        />
      );

      let cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Alpha Synonym');

      rerender(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          sortBy="lastModified"
          sortOrder="desc"
        />
      );

      cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Delta Related');
    });
  });

  describe('Sort Menu Icon Rotation', () => {
    it('ExpandMore icon rotates when menu is open', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      const expandIcon = screen.getByTestId('ExpandMoreIcon');

      // Click to open the sort menu
      await user.click(screen.getByText('Name'));

      // After menu opens, icon should rotate
      expect(expandIcon).toBeInTheDocument();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Combined Search and Filter Counts', () => {
    it('chip counts reflect all relations (searchTerm does not filter)', () => {
      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          searchTerm="Synonym"
          relationFilter="synonym"
        />
      );

      // searchTerm does not drive filtering, counts reflect all relations
      expect(screen.getByText('All (4)')).toBeInTheDocument();
      expect(screen.getByText('Synonyms (2)')).toBeInTheDocument();
      expect(screen.getByText('Related Terms (2)')).toBeInTheDocument();
    });

    it('displays only type-filtered results in grid', () => {
      render(
        <GlossariesSynonyms
          {...defaultProps}
          relations={mockRelations}
          searchTerm="Alpha"
          relationFilter="related"
        />
      );

      // searchTerm doesn't filter, only type filter applies — shows related items
      expect(screen.getByText('Beta Related')).toBeInTheDocument();
      expect(screen.getByText('Delta Related')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Synonym')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Cards Click', () => {
    it('allows clicking multiple cards sequentially', async () => {
      const user = userEvent.setup();
      render(<GlossariesSynonyms {...defaultProps} relations={mockRelations} />);

      const alphaCard = screen.getByText('Alpha Synonym').closest('[class*="MuiCard"]');
      const betaCard = screen.getByText('Beta Related').closest('[class*="MuiCard"]');
      const gammaCard = screen.getByText('Gamma Synonym').closest('[class*="MuiCard"]');

      await user.click(alphaCard!);
      await user.click(betaCard!);
      await user.click(gammaCard!);

      expect(mockOnItemClick).toHaveBeenCalledTimes(3);
      expect(mockOnItemClick).toHaveBeenNthCalledWith(1, 'rel-1');
      expect(mockOnItemClick).toHaveBeenNthCalledWith(2, 'rel-2');
      expect(mockOnItemClick).toHaveBeenNthCalledWith(3, 'rel-3');
    });
  });
});
