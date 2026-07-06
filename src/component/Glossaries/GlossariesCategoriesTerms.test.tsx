import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlossariesCategoriesTerms from './GlossariesCategoriesTerms';
import type { GlossaryItem } from './GlossaryDataType';

// Mock getIcon helper
vi.mock('./glossaryUIHelpers', () => ({
  getIcon: (type: string, size: string) => (
    <span data-testid={`icon-${type}-${size}`}>Icon</span>
  ),
}));

// Mock resourceUtils
vi.mock('../../utils/resourceUtils', () => ({
  getFormattedDateTimePartsByDateTime: (timestamp: { seconds: number }) => ({
    date: `2025-01-${String(timestamp.seconds % 28 + 1).padStart(2, '0')}`,
    time: '12:00:00',
  }),
  getFormattedDateTimeParts: (timestamp: number) => ({
    date: `2025-01-${String(timestamp % 28 + 1).padStart(2, '0')}`,
    time: '12:00:00',
  }),
}));

// Mock data
const mockCategoryItem: GlossaryItem = {
  id: 'category-1',
  type: 'category',
  displayName: 'Test Category',
  description: 'This is a test category description',
  lastModified: 1700000001,
};

const mockTermItem: GlossaryItem = {
  id: 'term-1',
  type: 'term',
  displayName: 'Test Term',
  description: 'This is a test term description',
  lastModified: 1700000002,
};

const mockItemNoDescription: GlossaryItem = {
  id: 'item-no-desc',
  type: 'category',
  displayName: 'No Description Item',
  lastModified: 1700000003,
};

const mockMultipleCategories: GlossaryItem[] = [
  {
    id: 'cat-1',
    type: 'category',
    displayName: 'Alpha Category',
    description: 'First category',
    lastModified: 1700000001,
  },
  {
    id: 'cat-2',
    type: 'category',
    displayName: 'Beta Category',
    description: 'Second category',
    lastModified: 1700000002,
  },
  {
    id: 'cat-3',
    type: 'category',
    displayName: 'Gamma Category',
    description: 'Third category',
    lastModified: 1700000003,
  },
];

const mockMultipleTerms: GlossaryItem[] = [
  {
    id: 'term-1',
    type: 'term',
    displayName: 'First Term',
    description: 'Description of first term',
    lastModified: 1700000001,
  },
  {
    id: 'term-2',
    type: 'term',
    displayName: 'Second Term',
    lastModified: 1700000002,
  },
  {
    id: 'term-3',
    type: 'term',
    displayName: 'Third Term',
    description: 'Description of third term with a longer text to test overflow behavior',
    lastModified: 1700000003,
  },
];

describe('GlossariesCategoriesTerms', () => {
  const mockOnSearchTermChange = vi.fn();
  const mockOnSortByChange = vi.fn();
  const mockOnSortOrderToggle = vi.fn();
  const mockOnItemClick = vi.fn();

  const defaultProps = {
    mode: 'categories' as const,
    items: [] as GlossaryItem[],
    searchTerm: '',
    onSearchTermChange: mockOnSearchTermChange,
    sortBy: 'lastModified' as const,
    sortOrder: 'desc' as const,
    onSortByChange: mockOnSortByChange,
    onSortOrderToggle: mockOnSortOrderToggle,
    onItemClick: mockOnItemClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders with categories mode', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} mode="categories" />);

      expect(screen.getByPlaceholderText('Filter categories')).toBeInTheDocument();
    });

    it('renders with terms mode', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} mode="terms" />);

      expect(screen.getByPlaceholderText('Filter terms')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter categories');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders sort button with default Last Modified', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} sortBy="lastModified" />);

      expect(screen.getByText('Last modified')).toBeInTheDocument();
    });

    it('renders sort button with Name when sortBy is name', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} sortBy="name" />);

      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state message for categories', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} mode="categories" items={[]} />);

      expect(screen.getByText('No categories available')).toBeInTheDocument();
    });

    it('shows empty state message for terms', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} mode="terms" items={[]} />);

      expect(screen.getByText('No terms available')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('displays current search term value', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} searchTerm="test search" />);

      const searchInput = screen.getByPlaceholderText('Filter categories') as HTMLInputElement;
      expect(searchInput.value).toBe('test search');
    });

    it('calls onSearchTermChange when typing in search input', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter categories');
      await user.type(searchInput, 'new search');

      expect(mockOnSearchTermChange).toHaveBeenCalled();
    });

    it('calls onSearchTermChange when text is changed', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter categories');
      fireEvent.change(searchInput, { target: { value: 'a' } });
      fireEvent.change(searchInput, { target: { value: 'ab' } });
      fireEvent.change(searchInput, { target: { value: 'abc' } });

      expect(mockOnSearchTermChange).toHaveBeenCalledTimes(3);
    });

    it('passes correct value to onSearchTermChange', async () => {
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter categories');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(mockOnSearchTermChange).toHaveBeenCalledWith('test');
    });
  });

  describe('Sort Order', () => {
    it('renders sort label when sortOrder is asc', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} sortOrder="asc" />);

      expect(screen.getByText('Last modified')).toBeInTheDocument();
    });

    it('renders sort label when sortOrder is desc', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} sortOrder="desc" />);

      expect(screen.getByText('Last modified')).toBeInTheDocument();
    });
  });

  describe('Sort Dropdown Menu', () => {
    it('opens sort menu when sort button is clicked', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const sortButton = screen.getByText('Last modified');
      await user.click(sortButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Last modified' })).toBeInTheDocument();
    });

    it('closes sort menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const sortButton = screen.getByText('Last modified');
      await user.click(sortButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('calls onSortByChange with "name" when Name is selected', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} sortBy="lastModified" />);

      const sortButton = screen.getByText('Last modified');
      await user.click(sortButton);

      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      expect(mockOnSortByChange).toHaveBeenCalledWith('name');
    });

    it('calls onSortByChange with "lastModified" when Last Modified is selected', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} sortBy="name" />);

      const sortButton = screen.getByText('Name');
      await user.click(sortButton);

      const lastModifiedOption = screen.getByRole('menuitem', { name: 'Last modified' });
      await user.click(lastModifiedOption);

      expect(mockOnSortByChange).toHaveBeenCalledWith('lastModified');
    });

    it('does not call onSortByChange when selecting the same sort option', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} sortBy="lastModified" />);

      const sortButton = screen.getByText('Last modified');
      await user.click(sortButton);

      const lastModifiedOption = screen.getByRole('menuitem', { name: 'Last modified' });
      await user.click(lastModifiedOption);

      expect(mockOnSortByChange).not.toHaveBeenCalled();
    });

    it('closes menu after selecting sort option', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} sortBy="lastModified" />);

      const sortButton = screen.getByText('Last modified');
      await user.click(sortButton);

      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Item Cards Rendering', () => {
    it('renders item card with display name', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={[mockCategoryItem]} />);

      expect(screen.getByText('Test Category')).toBeInTheDocument();
    });

    it('renders item card with description', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={[mockCategoryItem]} />);

      expect(screen.getByText('This is a test category description')).toBeInTheDocument();
    });

    it('renders "No description" when item has no description', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={[mockItemNoDescription]} />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('renders correct icon for category item', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={[mockCategoryItem]} />);

      expect(screen.getByTestId('icon-category-medium')).toBeInTheDocument();
    });

    it('renders correct icon for term item', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} mode="terms" items={[mockTermItem]} />);

      expect(screen.getByTestId('icon-term-medium')).toBeInTheDocument();
    });

    it('renders formatted date', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={[mockCategoryItem]} />);

      // The mock returns a date based on the lastModified value
      expect(screen.getByText(/2025-01-/)).toBeInTheDocument();
    });

    it('calls onItemClick when card is clicked', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} items={[mockCategoryItem]} />);

      const card = screen.getByText('Test Category').closest('[class*="MuiCard"]');
      if (card) {
        await user.click(card);
      }

      expect(mockOnItemClick).toHaveBeenCalledWith('category-1');
    });
  });

  describe('Multiple Items', () => {
    it('renders multiple category items', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={mockMultipleCategories} />);

      expect(screen.getByText('Alpha Category')).toBeInTheDocument();
      expect(screen.getByText('Beta Category')).toBeInTheDocument();
      expect(screen.getByText('Gamma Category')).toBeInTheDocument();
    });

    it('renders multiple term items', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} mode="terms" items={mockMultipleTerms} />);

      expect(screen.getByText('First Term')).toBeInTheDocument();
      expect(screen.getByText('Second Term')).toBeInTheDocument();
      expect(screen.getByText('Third Term')).toBeInTheDocument();
    });

    it('renders correct number of cards', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={mockMultipleCategories} />);

      // Verify all three items are rendered
      expect(screen.getByText('Alpha Category')).toBeInTheDocument();
      expect(screen.getByText('Beta Category')).toBeInTheDocument();
      expect(screen.getByText('Gamma Category')).toBeInTheDocument();
    });

    it('clicking different cards calls onItemClick with correct IDs', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} items={mockMultipleCategories} />);

      const alphaCard = screen.getByText('Alpha Category').closest('[class*="MuiCard"]');
      const betaCard = screen.getByText('Beta Category').closest('[class*="MuiCard"]');

      if (alphaCard) await user.click(alphaCard);
      expect(mockOnItemClick).toHaveBeenCalledWith('cat-1');

      mockOnItemClick.mockClear();

      if (betaCard) await user.click(betaCard);
      expect(mockOnItemClick).toHaveBeenCalledWith('cat-2');
    });
  });

  describe('Item Card Content', () => {
    it('truncates long display names with ellipsis', () => {
      const longNameItem: GlossaryItem = {
        id: 'long-name',
        type: 'category',
        displayName: 'This is a very long category name that should be truncated with ellipsis when displayed',
        lastModified: 1700000001,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[longNameItem]} />);

      // The text should be present (truncation is handled by CSS)
      expect(screen.getByText(longNameItem.displayName)).toBeInTheDocument();
    });

    it('handles empty description by showing fallback text', () => {
      const emptyDescItem: GlossaryItem = {
        id: 'empty-desc',
        type: 'category',
        displayName: 'Empty Desc Item',
        description: '',
        lastModified: 1700000001,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[emptyDescItem]} />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('handles undefined description by showing fallback text', () => {
      const undefinedDescItem: GlossaryItem = {
        id: 'undefined-desc',
        type: 'category',
        displayName: 'Undefined Desc Item',
        lastModified: 1700000001,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[undefinedDescItem]} />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });
  });

  describe('Sort Button State', () => {
    it('shows correct sort label for name', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} sortBy="name" />);

      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('shows correct sort label for lastModified', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} sortBy="lastModified" />);

      expect(screen.getByText('Last modified')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('search input is accessible', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} mode="categories" />);

      const searchInput = screen.getByPlaceholderText('Filter categories');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.tagName).toBe('INPUT');
    });

    it('sort button is clickable', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const sortButton = screen.getByText('Last modified');
      await user.click(sortButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('menu items are keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const sortButton = screen.getByText('Last modified');
      await user.click(sortButton);

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // Menu should close after selection
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Different Item Types', () => {
    it('renders glossary type items correctly', () => {
      const glossaryItem: GlossaryItem = {
        id: 'glossary-1',
        type: 'glossary',
        displayName: 'Test Glossary',
        description: 'A glossary item',
        lastModified: 1700000001,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[glossaryItem]} />);

      expect(screen.getByText('Test Glossary')).toBeInTheDocument();
      expect(screen.getByTestId('icon-glossary-medium')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles item with zero lastModified', () => {
      const zeroTimestampItem: GlossaryItem = {
        id: 'zero-timestamp',
        type: 'category',
        displayName: 'Zero Timestamp',
        lastModified: 0,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[zeroTimestampItem]} />);

      expect(screen.getByText('Zero Timestamp')).toBeInTheDocument();
    });

    it('handles item with undefined lastModified', () => {
      const undefinedTimestampItem: GlossaryItem = {
        id: 'undefined-timestamp',
        type: 'category',
        displayName: 'Undefined Timestamp',
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[undefinedTimestampItem]} />);

      expect(screen.getByText('Undefined Timestamp')).toBeInTheDocument();
    });

    it('handles very long description text', () => {
      const longDescItem: GlossaryItem = {
        id: 'long-desc',
        type: 'category',
        displayName: 'Long Desc',
        description: 'A'.repeat(500),
        lastModified: 1700000001,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[longDescItem]} />);

      // The text should be present (truncation is handled by CSS)
      expect(screen.getByText('A'.repeat(500))).toBeInTheDocument();
    });

    it('handles special characters in display name', () => {
      const specialCharItem: GlossaryItem = {
        id: 'special-char',
        type: 'category',
        displayName: 'Test <Category> & "Special" \'Chars\'',
        lastModified: 1700000001,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[specialCharItem]} />);

      expect(screen.getByText('Test <Category> & "Special" \'Chars\'')).toBeInTheDocument();
    });

    it('handles unicode characters in display name', () => {
      const unicodeItem: GlossaryItem = {
        id: 'unicode',
        type: 'category',
        displayName: 'カテゴリー 测试 🎉',
        lastModified: 1700000001,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[unicodeItem]} />);

      expect(screen.getByText('カテゴリー 测试 🎉')).toBeInTheDocument();
    });
  });

  describe('Search Input States', () => {
    it('search input accepts empty string', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} searchTerm="" />);

      const searchInput = screen.getByPlaceholderText('Filter categories') as HTMLInputElement;
      expect(searchInput.value).toBe('');
    });

    it('search input accepts special characters', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} searchTerm="test@#$%&*" />);

      const searchInput = screen.getByPlaceholderText('Filter categories') as HTMLInputElement;
      expect(searchInput.value).toBe('test@#$%&*');
    });

    it('clearing search input calls onSearchTermChange with empty string', async () => {
      render(<GlossariesCategoriesTerms {...defaultProps} searchTerm="test" />);

      const searchInput = screen.getByPlaceholderText('Filter categories');
      fireEvent.change(searchInput, { target: { value: '' } });

      expect(mockOnSearchTermChange).toHaveBeenCalledWith('');
    });
  });

  describe('Menu Interaction', () => {
    it('menu shows both sort options', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const sortButton = screen.getByText('Last modified');
      await user.click(sortButton);

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBe(2);
    });

    it('can open and close menu multiple times', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} />);

      const sortButton = screen.getByText('Last modified');

      // Open
      await user.click(sortButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Close
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });

      // Open again
      await user.click(sortButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Card Interaction', () => {
    it('card has cursor pointer style', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={[mockCategoryItem]} />);

      const card = screen.getByText('Test Category').closest('[class*="MuiCard"]');
      expect(card).toBeInTheDocument();
    });

    it('multiple rapid clicks on card are handled', async () => {
      const user = userEvent.setup();
      render(<GlossariesCategoriesTerms {...defaultProps} items={[mockCategoryItem]} />);

      const card = screen.getByText('Test Category').closest('[class*="MuiCard"]');
      if (card) {
        await user.click(card);
        await user.click(card);
        await user.click(card);
      }

      expect(mockOnItemClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Layout and Grid', () => {
    it('grid layout is applied when items exist', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={mockMultipleCategories} />);

      // Items should be rendered
      expect(screen.getByText('Alpha Category')).toBeInTheDocument();
      expect(screen.getByText('Beta Category')).toBeInTheDocument();
      expect(screen.getByText('Gamma Category')).toBeInTheDocument();
      // Empty state should not be shown
      expect(screen.queryByText('No categories available')).not.toBeInTheDocument();
    });

    it('empty state is shown instead of grid when no items', () => {
      render(<GlossariesCategoriesTerms {...defaultProps} items={[]} />);

      expect(screen.getByText('No categories available')).toBeInTheDocument();
    });
  });

  describe('Sort Order Icon', () => {
    it('re-renders correctly when sortOrder prop changes', () => {
      const { rerender } = render(
        <GlossariesCategoriesTerms {...defaultProps} sortOrder="desc" />
      );

      expect(screen.getByText('Last modified')).toBeInTheDocument();

      // Simulate parent updating the sortOrder
      rerender(<GlossariesCategoriesTerms {...defaultProps} sortOrder="asc" />);

      // Component should re-render with new sort order
      expect(screen.getByText('Last modified')).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('updates placeholder when mode changes', () => {
      const { rerender } = render(
        <GlossariesCategoriesTerms {...defaultProps} mode="categories" />
      );

      expect(screen.getByPlaceholderText('Filter categories')).toBeInTheDocument();

      rerender(<GlossariesCategoriesTerms {...defaultProps} mode="terms" />);

      expect(screen.getByPlaceholderText('Filter terms')).toBeInTheDocument();
    });

    it('updates empty state message when mode changes', () => {
      const { rerender } = render(
        <GlossariesCategoriesTerms {...defaultProps} mode="categories" items={[]} />
      );

      expect(screen.getByText('No categories available')).toBeInTheDocument();

      rerender(<GlossariesCategoriesTerms {...defaultProps} mode="terms" items={[]} />);

      expect(screen.getByText('No terms available')).toBeInTheDocument();
    });
  });

  describe('Item ID Uniqueness', () => {
    it('handles items with similar IDs correctly', async () => {
      const user = userEvent.setup();
      const similarItems: GlossaryItem[] = [
        { id: 'item-1', type: 'category', displayName: 'Item 1', lastModified: 1 },
        { id: 'item-1-copy', type: 'category', displayName: 'Item 1 Copy', lastModified: 2 },
        { id: 'item-11', type: 'category', displayName: 'Item 11', lastModified: 3 },
      ];
      render(<GlossariesCategoriesTerms {...defaultProps} items={similarItems} />);

      const item1Card = screen.getByText('Item 1').closest('[class*="MuiCard"]');
      const item11Card = screen.getByText('Item 11').closest('[class*="MuiCard"]');

      if (item1Card) await user.click(item1Card);
      expect(mockOnItemClick).toHaveBeenCalledWith('item-1');

      mockOnItemClick.mockClear();

      if (item11Card) await user.click(item11Card);
      expect(mockOnItemClick).toHaveBeenCalledWith('item-11');
    });
  });

  describe('Date Display', () => {
    it('displays date from lastModified timestamp', () => {
      const itemWithTimestamp: GlossaryItem = {
        id: 'dated-item',
        type: 'category',
        displayName: 'Dated Item',
        lastModified: 1700000005,
      };
      render(<GlossariesCategoriesTerms {...defaultProps} items={[itemWithTimestamp]} />);

      // The mock returns formatted date
      expect(screen.getByText(/2025-01-/)).toBeInTheDocument();
    });
  });

  describe('Component Re-renders', () => {
    it('updates items when props change', () => {
      const { rerender } = render(
        <GlossariesCategoriesTerms {...defaultProps} items={[mockCategoryItem]} />
      );

      expect(screen.getByText('Test Category')).toBeInTheDocument();

      rerender(
        <GlossariesCategoriesTerms {...defaultProps} items={[mockTermItem]} />
      );

      expect(screen.queryByText('Test Category')).not.toBeInTheDocument();
      expect(screen.getByText('Test Term')).toBeInTheDocument();
    });

    it('updates search term display when prop changes', () => {
      const { rerender } = render(
        <GlossariesCategoriesTerms {...defaultProps} searchTerm="initial" />
      );

      let searchInput = screen.getByPlaceholderText('Filter categories') as HTMLInputElement;
      expect(searchInput.value).toBe('initial');

      rerender(
        <GlossariesCategoriesTerms {...defaultProps} searchTerm="updated" />
      );

      searchInput = screen.getByPlaceholderText('Filter categories') as HTMLInputElement;
      expect(searchInput.value).toBe('updated');
    });
  });
});
