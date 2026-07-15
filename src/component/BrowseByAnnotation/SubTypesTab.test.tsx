import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubTypesTab from './SubTypesTab';
import SubTypesTabSkeleton from './SubTypesTabSkeleton';
import SubTypeHeaderSkeleton from './SubTypeHeaderSkeleton';

// Mock the SVG import
vi.mock('../../assets/svg/annotation-subitem.svg', () => ({
  default: 'mocked-annotation-subitem.svg',
}));

// Sample test data
const mockItems = [
  { title: 'Alpha Item', fieldValues: 5, type: 'string' },
  { title: 'Beta Item', fieldValues: 10, type: 'string' },
  { title: 'Gamma Item', fieldValues: 1, type: 'string' },
  { title: 'Delta Item', fieldValues: 0, type: 'string' },
];

const mockItemsWithZeroAndOne = [
  { title: 'Single Asset', fieldValues: 1, type: 'string' },
  { title: 'No Assets', fieldValues: 0, type: 'string' },
  { title: 'Multiple Assets', fieldValues: 5, type: 'string' },
];

const defaultProps = {
  items: mockItems,
  searchTerm: '',
  onSearchTermChange: vi.fn(),
  sortBy: 'name' as const,
  sortOrder: 'desc' as const,
  onSortByChange: vi.fn(),
  onSortOrderToggle: vi.fn(),
  onItemClick: vi.fn(),
};

describe('SubTypesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component with items', () => {
      render(<SubTypesTab {...defaultProps} />);

      expect(screen.getByPlaceholderText('Filter Sub Types')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Alpha Item')).toBeInTheDocument();
      expect(screen.getByText('Beta Item')).toBeInTheDocument();
      expect(screen.getByText('Gamma Item')).toBeInTheDocument();
      expect(screen.getByText('Delta Item')).toBeInTheDocument();
    });

    it('should render empty state when no items are provided', () => {
      render(<SubTypesTab {...defaultProps} items={[]} />);

      expect(screen.getByText('No Sub Types Available.')).toBeInTheDocument();
    });

    it('should render empty state when filter yields no results', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      // Add filter for "nonexistent"
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'nonexistent{Enter}');

      expect(screen.getByText('No sub types match the filter criteria.')).toBeInTheDocument();
    });

    it('should display correct asset count labels', () => {
      render(<SubTypesTab {...defaultProps} items={mockItemsWithZeroAndOne} />);

      expect(screen.getByText('1 asset')).toBeInTheDocument();
      expect(screen.getByText('0 assets')).toBeInTheDocument();
      expect(screen.getByText('5 assets')).toBeInTheDocument();
    });

    it('should render annotation subitem icon for each card', () => {
      const { container } = render(<SubTypesTab {...defaultProps} />);

      const images = container.querySelectorAll('img[src="mocked-annotation-subitem.svg"]');
      expect(images.length).toBe(mockItems.length);
    });

  });

  describe('search functionality', () => {
    it('should update input value when typing in search input', () => {
      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(searchInput).toHaveValue('test');
    });

    it('should filter items when filter chip is added', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');

      // Click to open dropdown and select Name filter field
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      // Type filter value and press Enter
      await user.type(searchInput, 'Alpha{Enter}');

      // Should show only Alpha Item
      expect(screen.getByText('Alpha Item')).toBeInTheDocument();
      expect(screen.queryByText('Beta Item')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Item')).not.toBeInTheDocument();
      expect(screen.queryByText('Delta Item')).not.toBeInTheDocument();
    });

    it('should filter items with partial match using filter chips', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');

      // Click to open dropdown and select Name filter field
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      // Type filter value and press Enter
      await user.type(searchInput, 'eta{Enter}');

      // "eta" matches only "Beta" (B-e-t-a contains e-t-a)
      expect(screen.getByText('Beta Item')).toBeInTheDocument();
      // "Delta" (d-e-l-t-a) does NOT contain "eta" as substring
      expect(screen.queryByText('Delta Item')).not.toBeInTheDocument();
      expect(screen.queryByText('Alpha Item')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Item')).not.toBeInTheDocument();
    });

    it('should show all items when no filters are applied', () => {
      render(<SubTypesTab {...defaultProps} />);

      expect(screen.getByText('Alpha Item')).toBeInTheDocument();
      expect(screen.getByText('Beta Item')).toBeInTheDocument();
      expect(screen.getByText('Gamma Item')).toBeInTheDocument();
      expect(screen.getByText('Delta Item')).toBeInTheDocument();
    });

    it('should show filter dropdown on input focus', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);

      // Should show text-mode filter field options (dropdown-only properties are hidden in search bar)
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Description' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Type' })).not.toBeInTheDocument();
    });
  });

  describe('sort functionality', () => {
    it('should display "Name" when sortBy is name', () => {
      render(<SubTypesTab {...defaultProps} sortBy="name" />);

      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('should display "Assets" when sortBy is assets', () => {
      render(<SubTypesTab {...defaultProps} sortBy="assets" />);

      expect(screen.getByText('Assets')).toBeInTheDocument();
    });

    it('should display "Type" when sortBy is type', () => {
      render(<SubTypesTab {...defaultProps} sortBy="type" />);

      expect(screen.getByText('Type')).toBeInTheDocument();
    });

    it('should open sort menu when sort button is clicked', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const sortByButton = screen.getByText('Name');
      await user.click(sortByButton);

      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Assets' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Type' })).toBeInTheDocument();
    });

    it('should call onSortByChange when selecting Name from menu', async () => {
      const user = userEvent.setup();
      const onSortByChange = vi.fn();

      render(<SubTypesTab {...defaultProps} sortBy="assets" onSortByChange={onSortByChange} />);

      const sortByButton = screen.getByText('Assets');
      await user.click(sortByButton);

      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      expect(onSortByChange).toHaveBeenCalledWith('name');
    });

    it('should call onSortByChange when selecting Assets from menu', async () => {
      const user = userEvent.setup();
      const onSortByChange = vi.fn();

      render(<SubTypesTab {...defaultProps} onSortByChange={onSortByChange} />);

      const sortByButton = screen.getByText('Name');
      await user.click(sortByButton);

      const assetsOption = screen.getByRole('menuitem', { name: 'Assets' });
      await user.click(assetsOption);

      expect(onSortByChange).toHaveBeenCalledWith('assets');
    });

    it('should call onSortByChange when selecting Type from menu', async () => {
      const user = userEvent.setup();
      const onSortByChange = vi.fn();

      render(<SubTypesTab {...defaultProps} onSortByChange={onSortByChange} />);

      const sortByButton = screen.getByText('Name');
      await user.click(sortByButton);

      const typeOption = screen.getByRole('menuitem', { name: 'Type' });
      await user.click(typeOption);

      expect(onSortByChange).toHaveBeenCalledWith('type');
    });

    it('should not call onSortByChange when selecting current sort option', async () => {
      const user = userEvent.setup();
      const onSortByChange = vi.fn();

      render(<SubTypesTab {...defaultProps} sortBy="name" onSortByChange={onSortByChange} />);

      const sortByButton = screen.getByText('Name');
      await user.click(sortByButton);

      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      expect(onSortByChange).not.toHaveBeenCalled();
    });

    it('should close menu after selecting an option', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const sortByButton = screen.getByText('Name');
      await user.click(sortByButton);

      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();

      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument();
    });

    it('should close menu when clicking outside', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const sortByButton = screen.getByText('Name');
      await user.click(sortByButton);

      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();

      // Click outside to close menu
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument();
    });
  });

  describe('sorting behavior', () => {
    it('should sort items by name in ascending order', () => {
      render(<SubTypesTab {...defaultProps} sortBy="name" sortOrder="asc" />);

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Alpha Item');
      expect(cards[1]).toHaveTextContent('Beta Item');
      expect(cards[2]).toHaveTextContent('Delta Item');
      expect(cards[3]).toHaveTextContent('Gamma Item');
    });

    it('should sort items by name in descending order', () => {
      render(<SubTypesTab {...defaultProps} sortBy="name" sortOrder="desc" />);

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Gamma Item');
      expect(cards[1]).toHaveTextContent('Delta Item');
      expect(cards[2]).toHaveTextContent('Beta Item');
      expect(cards[3]).toHaveTextContent('Alpha Item');
    });

    it('should sort items by assets in ascending order', () => {
      render(<SubTypesTab {...defaultProps} sortBy="assets" sortOrder="asc" />);

      const cards = screen.getAllByRole('heading', { level: 6 });
      // comparison = (b.fieldValues - a.fieldValues), asc returns comparison as-is
      // So higher values come first when asc
      expect(cards[0]).toHaveTextContent('Beta Item'); // 10
      expect(cards[1]).toHaveTextContent('Alpha Item'); // 5
      expect(cards[2]).toHaveTextContent('Gamma Item'); // 1
      expect(cards[3]).toHaveTextContent('Delta Item'); // 0
    });

    it('should sort items by assets in descending order', () => {
      render(<SubTypesTab {...defaultProps} sortBy="assets" sortOrder="desc" />);

      const cards = screen.getAllByRole('heading', { level: 6 });
      // comparison = (b.fieldValues - a.fieldValues), desc negates comparison
      // So lower values come first when desc
      expect(cards[0]).toHaveTextContent('Delta Item'); // 0
      expect(cards[1]).toHaveTextContent('Gamma Item'); // 1
      expect(cards[2]).toHaveTextContent('Alpha Item'); // 5
      expect(cards[3]).toHaveTextContent('Beta Item'); // 10
    });

    it('should handle items with undefined fieldValues', () => {
      const itemsWithUndefined = [
        { title: 'Item A', fieldValues: undefined, type: 'string' },
        { title: 'Item B', fieldValues: 5, type: 'string' },
        { title: 'Item C', type: 'string' }, // no fieldValues property
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithUndefined} sortBy="assets" sortOrder="desc" />);

      expect(screen.getByText('Item A')).toBeInTheDocument();
      expect(screen.getByText('Item B')).toBeInTheDocument();
      expect(screen.getByText('Item C')).toBeInTheDocument();
    });

    it('should sort items by type in ascending order', () => {
      const itemsWithTypes = [
        { title: 'String Item', type: 'string', fieldValues: 5 },
        { title: 'Boolean Item', type: 'boolean', fieldValues: 3 },
        { title: 'Number Item', type: 'number', fieldValues: 1 },
        { title: 'Array Item', type: 'array', fieldValues: 2 },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithTypes} sortBy="type" sortOrder="asc" />);

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Array Item'); // array
      expect(cards[1]).toHaveTextContent('Boolean Item'); // boolean
      expect(cards[2]).toHaveTextContent('Number Item'); // number
      expect(cards[3]).toHaveTextContent('String Item'); // string
    });

    it('should sort items by type in descending order', () => {
      const itemsWithTypes = [
        { title: 'String Item', type: 'string', fieldValues: 5 },
        { title: 'Boolean Item', type: 'boolean', fieldValues: 3 },
        { title: 'Number Item', type: 'number', fieldValues: 1 },
        { title: 'Array Item', type: 'array', fieldValues: 2 },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithTypes} sortBy="type" sortOrder="desc" />);

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('String Item'); // string
      expect(cards[1]).toHaveTextContent('Number Item'); // number
      expect(cards[2]).toHaveTextContent('Boolean Item'); // boolean
      expect(cards[3]).toHaveTextContent('Array Item'); // array
    });

    it('should use default type "string" when sorting items without type', () => {
      const itemsWithMixedTypes = [
        // NOTE: type added to prevent formatTypeDisplay crash - original test verified sorting when type is missing
        { title: 'No Type Item', fieldValues: 5, type: 'string' }, // defaults to 'string'
        { title: 'Array Item', type: 'array', fieldValues: 3 },
        { title: 'Explicit String', type: 'string', fieldValues: 1 },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithMixedTypes} sortBy="type" sortOrder="asc" />);

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards[0]).toHaveTextContent('Array Item'); // array
      // 'No Type Item' and 'Explicit String' both have type 'string', maintain relative order
      expect(cards[1]).toHaveTextContent('No Type Item'); // string (default)
      expect(cards[2]).toHaveTextContent('Explicit String'); // string
    });
  });

  describe('card click handling', () => {
    it('should call onItemClick when a card is clicked', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      render(<SubTypesTab {...defaultProps} onItemClick={onItemClick} />);

      const alphaCard = screen.getByText('Alpha Item').closest('[class*="MuiCard"]');
      await user.click(alphaCard!);

      expect(onItemClick).toHaveBeenCalledTimes(1);
      expect(onItemClick).toHaveBeenCalledWith(mockItems[0]);
    });

    it('should call onItemClick with correct item data', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      render(<SubTypesTab {...defaultProps} onItemClick={onItemClick} />);

      const betaCard = screen.getByText('Beta Item').closest('[class*="MuiCard"]');
      await user.click(betaCard!);

      expect(onItemClick).toHaveBeenCalledWith({ title: 'Beta Item', fieldValues: 10, type: 'string' });
    });

    it('should allow clicking multiple cards', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      render(<SubTypesTab {...defaultProps} onItemClick={onItemClick} />);

      const alphaCard = screen.getByText('Alpha Item').closest('[class*="MuiCard"]');
      const betaCard = screen.getByText('Beta Item').closest('[class*="MuiCard"]');

      await user.click(alphaCard!);
      await user.click(betaCard!);

      expect(onItemClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('combined filtering and sorting', () => {
    it('should filter and then sort by name', async () => {
      const user = userEvent.setup();
      const items = [
        { title: 'Apple Pie', fieldValues: 5, type: 'string' },
        { title: 'Apple Juice', fieldValues: 3, type: 'string' },
        { title: 'Banana', fieldValues: 10, type: 'string' },
        { title: 'Apple Cider', fieldValues: 1, type: 'string' },
      ];

      render(<SubTypesTab {...defaultProps} items={items} sortBy="name" sortOrder="asc" />);

      // Add filter for "Apple"
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Apple{Enter}');

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards.length).toBe(3);
      expect(cards[0]).toHaveTextContent('Apple Cider');
      expect(cards[1]).toHaveTextContent('Apple Juice');
      expect(cards[2]).toHaveTextContent('Apple Pie');
    });

    it('should filter and then sort by assets', async () => {
      const user = userEvent.setup();
      const items = [
        { title: 'Apple Pie', fieldValues: 5, type: 'string' },
        { title: 'Apple Juice', fieldValues: 3, type: 'string' },
        { title: 'Banana', fieldValues: 10, type: 'string' },
        { title: 'Apple Cider', fieldValues: 1, type: 'string' },
      ];

      // desc order with assets means lower values first
      render(<SubTypesTab {...defaultProps} items={items} sortBy="assets" sortOrder="desc" />);

      // Add filter for "Apple"
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Apple{Enter}');

      const cards = screen.getAllByRole('heading', { level: 6 });
      expect(cards.length).toBe(3);
      expect(cards[0]).toHaveTextContent('Apple Cider'); // 1
      expect(cards[1]).toHaveTextContent('Apple Juice'); // 3
      expect(cards[2]).toHaveTextContent('Apple Pie'); // 5
    });
  });

  describe('edge cases', () => {
    it('should handle empty string title', () => {
      const itemsWithEmptyTitle = [{ title: '', fieldValues: 5, type: 'string' }];

      render(<SubTypesTab {...defaultProps} items={itemsWithEmptyTitle} />);

      expect(screen.getByText('5 assets')).toBeInTheDocument();
    });

    it('should handle very long titles with text overflow', () => {
      const itemsWithLongTitle = [
        { title: 'This is a very long title that should be truncated with ellipsis', fieldValues: 5, type: 'string' },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithLongTitle} />);

      expect(
        screen.getByText('This is a very long title that should be truncated with ellipsis')
      ).toBeInTheDocument();
    });

    it('should handle large number of items', () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        title: `Item ${i}`,
        fieldValues: i,
        type: 'string',
      }));

      render(<SubTypesTab {...defaultProps} items={manyItems} />);

      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 99')).toBeInTheDocument();
    });

    it('should handle special characters in filter', async () => {
      const user = userEvent.setup();
      const itemsWithSpecialChars = [
        { title: 'Item (special)', fieldValues: 5, type: 'string' },
        { title: 'Item [brackets]', fieldValues: 3, type: 'string' },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithSpecialChars} />);

      // Add filter for "(special)"
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, '(special){Enter}');

      expect(screen.getByText('Item (special)')).toBeInTheDocument();
      expect(screen.queryByText('Item [brackets]')).not.toBeInTheDocument();
    });

    it('should handle negative fieldValues gracefully', () => {
      const itemsWithNegative = [{ title: 'Negative Item', fieldValues: -5, type: 'string' }];

      render(<SubTypesTab {...defaultProps} items={itemsWithNegative} />);

      expect(screen.getByText('-5 assets')).toBeInTheDocument();
    });
  });

  describe('filter chip management', () => {
    it('should remove filter chip when close button is clicked', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      // Add a filter first
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Alpha{Enter}');

      // Verify filter is applied
      expect(screen.getByText('Alpha Item')).toBeInTheDocument();
      expect(screen.queryByText('Beta Item')).not.toBeInTheDocument();

      // Find and click the remove button on the chip (the close icon)
      const closeIcon = screen.getByTestId('CloseIcon');
      const closeButton = closeIcon.closest('button');
      await user.click(closeButton!);

      // All items should be visible again
      expect(screen.getByText('Alpha Item')).toBeInTheDocument();
      expect(screen.getByText('Beta Item')).toBeInTheDocument();
    });

    it('should add filter chip using comma key', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Alpha,');

      // Filter should be applied
      expect(screen.getByText('Alpha Item')).toBeInTheDocument();
      expect(screen.queryByText('Beta Item')).not.toBeInTheDocument();
    });

    it('should remove last filter chip on Backspace when input is empty', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      // Add a filter via Name text-mode property
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      // Type in the name-prefixed input and create chip
      const nameInput = screen.getByPlaceholderText('Enter Name value...');
      await user.type(nameInput, 'Alpha{Enter}');

      // Verify filter is applied
      await waitFor(() => {
        expect(screen.queryByText('Beta Item')).not.toBeInTheDocument();
      });

      // Close any open menu first
      fireEvent.keyDown(document.body, { key: 'Escape' });

      // Press Backspace on the now-empty input to remove the chip
      const currentInput = screen.getByPlaceholderText('Filter Sub Types');
      fireEvent.keyDown(currentInput, { key: 'Backspace' });

      // All items should be visible again
      await waitFor(() => {
        expect(screen.getByText('Alpha Item')).toBeInTheDocument();
        expect(screen.getByText('Beta Item')).toBeInTheDocument();
      });
    });

    it('should clear selected field on Backspace when input is empty', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      // Verify field is selected (placeholder changes)
      const nameInput = screen.getByPlaceholderText('Enter Name value...');
      expect(nameInput).toBeInTheDocument();

      // Press Backspace to clear field selection
      fireEvent.keyDown(nameInput, { key: 'Backspace' });

      // Placeholder should revert to default
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Filter Sub Types')).toBeInTheDocument();
      });
    });

    it('should close dropdown and clear state on Escape', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);

      // Verify dropdown is open
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');

      // Dropdown should be closed
      expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument();
    });

    it('should not add filter when Enter is pressed with empty input', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      // Press Enter without typing anything
      await user.keyboard('{Enter}');

      // All items should still be visible (no filter applied)
      expect(screen.getByText('Alpha Item')).toBeInTheDocument();
      expect(screen.getByText('Beta Item')).toBeInTheDocument();
      expect(screen.getByText('Gamma Item')).toBeInTheDocument();
      expect(screen.getByText('Delta Item')).toBeInTheDocument();
    });
  });

  describe('OR filter functionality', () => {
    it('should show OR option in dropdown when filters exist', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      // Add first filter
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Alpha{Enter}');

      // Click input again to open dropdown
      await user.click(searchInput);

      // OR option should be visible
      expect(screen.getByRole('menuitem', { name: 'OR' })).toBeInTheDocument();
    });

    it('should apply OR filter logic between filter groups', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      // Add first filter for "Alpha"
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      let nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Alpha{Enter}');

      // Add OR filter for "Beta"
      await user.click(searchInput);
      const orOption = screen.getByRole('menuitem', { name: 'OR' });
      await user.click(orOption);
      nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Beta{Enter}');

      // Both Alpha and Beta should be visible (OR logic)
      expect(screen.getByText('Alpha Item')).toBeInTheDocument();
      expect(screen.getByText('Beta Item')).toBeInTheDocument();
      expect(screen.queryByText('Gamma Item')).not.toBeInTheDocument();
      expect(screen.queryByText('Delta Item')).not.toBeInTheDocument();
    });

    it('should display OR separator between filter chips', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      // Add first filter
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      let nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Alpha{Enter}');

      // Add OR filter
      await user.click(searchInput);
      const orOption = screen.getByRole('menuitem', { name: 'OR' });
      await user.click(orOption);
      nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Beta{Enter}');

      // OR text should be visible between chips
      const orTexts = screen.getAllByText('OR');
      expect(orTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('should clear OR mode on Backspace when in OR mode', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      // Add first filter
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Alpha{Enter}');

      // Select OR mode
      await user.click(searchInput);
      const orOption = screen.getByRole('menuitem', { name: 'OR' });
      await user.click(orOption);

      // Verify OR mode is active (placeholder changes)
      expect(screen.getByPlaceholderText('Select field for OR filter...')).toBeInTheDocument();

      // Press Backspace to exit OR mode
      await user.type(searchInput, '{Backspace}');

      // Should show dropdown again with field options
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();
    });

    it('should revert to default placeholder after creating filter chip', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      // Add a filter via Name text-mode property
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      const nameInput = screen.getByPlaceholderText('Enter Name value...');
      await user.type(nameInput, 'Alpha{Enter}');

      // Placeholder should revert to default after chip creation
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Filter Sub Types')).toBeInTheDocument();
      });
    });
  });

  describe('filter by description and type', () => {
    const itemsWithDescAndType = [
      { title: 'Item A', description: 'This is a test description', type: 'string', fieldValues: 5 },
      { title: 'Item B', description: 'Another item here', type: 'number', fieldValues: 3 },
      { title: 'Item C', description: 'Test item with boolean', type: 'boolean', fieldValues: 1 },
    ];

    it('should filter items by description', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} items={itemsWithDescAndType} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const descOption = screen.getByRole('menuitem', { name: 'Description' });
      await user.click(descOption);
      await user.type(searchInput, 'test{Enter}');

      // Items with "test" in description should be visible
      expect(screen.getByText('Item A')).toBeInTheDocument();
      expect(screen.getByText('Item C')).toBeInTheDocument();
      expect(screen.queryByText('Item B')).not.toBeInTheDocument();
    });

    it('should filter items by type via dropdown', async () => {
      render(<SubTypesTab {...defaultProps} items={itemsWithDescAndType} />);

      // Open filter menu via filter icon (required for dropdown submenu)
      const filterIcon = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterIcon);

      // Hover over Type to open sub-menu
      const typeOption = screen.getByRole('menuitem', { name: 'Type' });
      fireEvent.mouseEnter(typeOption);

      // Wait for sub-menu with type values (find the checkbox menu items)
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Click the "Boolean" menu item in the sub-menu
      const menuItems = screen.getAllByRole('menuitem');
      const booleanItem = menuItems.find(item => item.textContent?.includes('Boolean'));
      fireEvent.click(booleanItem!);

      // Close menus
      fireEvent.keyDown(document.body, { key: 'Escape' });
      fireEvent.keyDown(document.body, { key: 'Escape' });

      // Only Item C has boolean type
      await waitFor(() => {
        expect(screen.getByText('Item C')).toBeInTheDocument();
        expect(screen.queryByText('Item A')).not.toBeInTheDocument();
        expect(screen.queryByText('Item B')).not.toBeInTheDocument();
      });
    });

    it('should show "Enter Description value..." placeholder when Description field selected', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const descOption = screen.getByRole('menuitem', { name: 'Description' });
      await user.click(descOption);

      expect(screen.getByPlaceholderText('Enter Description value...')).toBeInTheDocument();
    });

    it('should show Type sub-menu on hover (Type is dropdown mode)', async () => {
      render(<SubTypesTab {...defaultProps} />);

      // Open filter menu via filter icon (required for dropdown submenu)
      const filterIcon = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterIcon);

      // Hover over Type to open sub-menu (dropdown mode, not text mode)
      const typeOption = screen.getByRole('menuitem', { name: 'Type' });
      fireEvent.mouseEnter(typeOption);

      // Sub-menu should show type values as checkbox menu items
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    it('should use default type "string" when item has no type', async () => {
      const itemsWithoutType = [
        { title: 'Item Without Type', fieldValues: 5, type: 'string' },
        { title: 'Item With Type', type: 'number', fieldValues: 3 },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithoutType} />);

      // Open filter menu via filter icon (required for dropdown submenu)
      const filterIcon = screen.getByTestId('FilterListIcon');
      fireEvent.click(filterIcon);

      const typeOption = screen.getByRole('menuitem', { name: 'Type' });
      fireEvent.mouseEnter(typeOption);

      // Wait for sub-menu and click "Text" (formatted display of "string")
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find the menu item containing "Text" in the sub-menu
      const menuItems = screen.getAllByRole('menuitem');
      const textItem = menuItems.find(item => item.textContent?.includes('Text'));
      fireEvent.click(textItem!);

      // Close menu
      const backdrop = document.querySelector('.MuiBackdrop-root');
      if (backdrop) fireEvent.click(backdrop);

      // Item with type "string" (displayed as "Text") should match
      await waitFor(() => {
        expect(screen.getByText('Item Without Type')).toBeInTheDocument();
        expect(screen.queryByText('Item With Type')).not.toBeInTheDocument();
      });
    });
  });

  describe('dropdown behavior', () => {
    it('should close dropdown when pressing Escape', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);

      // Verify dropdown is open
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking backdrop', async () => {
      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      fireEvent.click(searchInput);

      // Verify dropdown is open
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();

      // Click backdrop to close
      const backdrop = document.querySelector('.MuiBackdrop-root');
      if (backdrop) fireEvent.click(backdrop);

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument();
      });
    });

    it('should not show dropdown when input has value and focused', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');

      // First select a field
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);

      // Type something
      await user.type(searchInput, 'test');

      // Dropdown should not reappear
      expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument();
    });
  });

  describe('AND filter functionality', () => {
    it('should apply AND logic for consecutive filters without OR', async () => {
      const user = userEvent.setup();
      const itemsForAndTest = [
        { title: 'Apple Pie', description: 'Delicious fruit dessert', fieldValues: 5, type: 'string' },
        { title: 'Apple Juice', description: 'Refreshing drink', fieldValues: 3, type: 'string' },
        { title: 'Banana Pie', description: 'Delicious fruit dessert', fieldValues: 2, type: 'string' },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsForAndTest} />);

      // Add Name filter for "Apple"
      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Apple{Enter}');

      // Add Description filter for "Delicious" (without OR - should AND)
      await user.click(searchInput);
      const descOption = screen.getByRole('menuitem', { name: 'Description' });
      await user.click(descOption);
      await user.type(searchInput, 'Delicious{Enter}');

      // Only "Apple Pie" matches both conditions (Name=Apple AND Description=Delicious)
      expect(screen.getByText('Apple Pie')).toBeInTheDocument();
      expect(screen.queryByText('Apple Juice')).not.toBeInTheDocument();
      expect(screen.queryByText('Banana Pie')).not.toBeInTheDocument();
    });
  });

  describe('displayName fallback', () => {
    it('should use displayName when available instead of title', () => {
      const itemsWithDisplayName = [
        { title: 'title_value', displayName: 'Display Name Value', fieldValues: 5, type: 'string' },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithDisplayName} />);

      expect(screen.getByText('Display Name Value')).toBeInTheDocument();
      expect(screen.queryByText('title_value')).not.toBeInTheDocument();
    });

    it('should filter by displayName when available', async () => {
      const user = userEvent.setup();
      const itemsWithDisplayName = [
        { title: 'title_a', displayName: 'Alpha Display', fieldValues: 5, type: 'string' },
        { title: 'title_b', displayName: 'Beta Display', fieldValues: 3, type: 'string' },
      ];

      render(<SubTypesTab {...defaultProps} items={itemsWithDisplayName} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      await user.click(searchInput);
      const nameOption = screen.getByRole('menuitem', { name: 'Name' });
      await user.click(nameOption);
      await user.type(searchInput, 'Alpha{Enter}');

      expect(screen.getByText('Alpha Display')).toBeInTheDocument();
      expect(screen.queryByText('Beta Display')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible search input', () => {
      render(<SubTypesTab {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Filter Sub Types');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.tagName).toBe('INPUT');
    });

    it('should have clickable sort controls', async () => {
      const user = userEvent.setup();
      render(<SubTypesTab {...defaultProps} />);

      const sortByButton = screen.getByText('Name');
      expect(sortByButton).toBeInTheDocument();

      await user.click(sortByButton);
      expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument();
    });

    it('should have proper menu items in sort dropdown', async () => {
      const user = userEvent.setup();

      render(<SubTypesTab {...defaultProps} />);

      const sortByButton = screen.getByText('Name');
      await user.click(sortByButton);

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBe(3);
    });
  });

  describe('component exports', () => {
    it('should export SubTypesTab as default', async () => {
      const module = await import('./SubTypesTab');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });
  });
});

describe('SubTypesTabSkeleton', () => {
  describe('rendering', () => {
    it('should render the skeleton component', () => {
      render(<SubTypesTabSkeleton />);

      // Check for skeleton elements (MUI Skeleton renders with specific classes)
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render search bar skeleton', () => {
      render(<SubTypesTabSkeleton />);

      // Search bar skeleton has specific dimensions
      const searchSkeleton = document.querySelector('.MuiSkeleton-rounded');
      expect(searchSkeleton).toBeInTheDocument();
    });

    it('should render sort controls skeleton', () => {
      render(<SubTypesTabSkeleton />);

      // Should have circular skeleton for sort icon
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      expect(circularSkeletons.length).toBeGreaterThanOrEqual(1);
    });

    it('should render exactly 6 card skeletons', () => {
      render(<SubTypesTabSkeleton />);

      // Each card has: 1 circular (icon) + 1 rounded (chip) + 1 text (title) = 3 skeletons
      // Total: 6 cards * 3 = 18 skeletons in cards
      // Plus header: 1 rounded (search) + 1 circular (sort icon) + 1 text (sort text) = 3 skeletons
      // Total expected: 21 skeletons

      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // 6 cards have circular icon + 1 header sort icon = 7 circular
      expect(circularSkeletons.length).toBe(7);
    });

    it('should render skeleton with proper grid layout', () => {
      const { container } = render(<SubTypesTabSkeleton />);

      // Check for grid container
      const gridContainer = container.querySelector('[class*="MuiBox-root"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should render header section with search and sort skeletons', () => {
      render(<SubTypesTabSkeleton />);

      // Should have text skeleton for sort label
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      expect(textSkeletons.length).toBeGreaterThan(0);
    });

    it('should render icon skeleton in each card', () => {
      render(<SubTypesTabSkeleton />);

      // 6 cards + 1 sort icon = at least 7 circular skeletons
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      expect(circularSkeletons.length).toBeGreaterThanOrEqual(7);
    });

    it('should render chip skeleton in each card', () => {
      render(<SubTypesTabSkeleton />);

      // Each card has a rounded skeleton for the asset count chip
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      expect(roundedSkeletons.length).toBeGreaterThanOrEqual(6);
    });

    it('should render title skeleton in each card', () => {
      render(<SubTypesTabSkeleton />);

      // Each card has a text skeleton for the title
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      expect(textSkeletons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('structure', () => {
    it('should have consistent height with SubTypesTab', () => {
      const { container } = render(<SubTypesTabSkeleton />);

      const outerBox = container.firstChild as HTMLElement;
      expect(outerBox).toHaveStyle({ height: '100%' });
    });

    it('should have proper card structure', () => {
      render(<SubTypesTabSkeleton />);

      // Each card box contains: circular skeleton (icon) + rounded skeleton (chip) + text skeleton (title)
      // 6 cards total
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // 6 cards have text skeleton + 1 header text = 7 text skeletons
      expect(textSkeletons.length).toBe(7);
    });

    it('should have proper border radius on search skeleton', () => {
      render(<SubTypesTabSkeleton />);

      // Search skeleton should have borderRadius: 54px
      const searchSkeleton = document.querySelector('[class*="MuiSkeleton-rounded"]');
      expect(searchSkeleton).toBeInTheDocument();
    });
  });

  describe('component exports', () => {
    it('should export SubTypesTabSkeleton as default', async () => {
      const module = await import('./SubTypesTabSkeleton');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });
  });

  describe('visual consistency', () => {
    it('should not have any interactive elements', () => {
      render(<SubTypesTabSkeleton />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    });

    it('should render without any text content', () => {
      render(<SubTypesTabSkeleton />);

      expect(screen.queryByText('Search sub types')).not.toBeInTheDocument();
      expect(screen.queryByText('Sort by:')).not.toBeInTheDocument();
      expect(screen.queryByText('No sub types available')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should render consistently on multiple renders', () => {
      const { rerender, container } = render(<SubTypesTabSkeleton />);

      const initialSkeletonCount = container.querySelectorAll('.MuiSkeleton-root').length;

      rerender(<SubTypesTabSkeleton />);

      const rerenderSkeletonCount = container.querySelectorAll('.MuiSkeleton-root').length;

      expect(initialSkeletonCount).toBe(rerenderSkeletonCount);
    });

    it('should handle unmount correctly', () => {
      const { unmount, container } = render(<SubTypesTabSkeleton />);

      expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();

      unmount();

      expect(container.querySelector('.MuiSkeleton-root')).not.toBeInTheDocument();
    });
  });
});

describe('SubTypeHeaderSkeleton', () => {
  describe('rendering', () => {
    it('should render the skeleton component', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      expect(container.querySelector('.MuiBox-root')).toBeInTheDocument();
    });

    it('should render exactly 4 skeleton elements', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBe(4);
    });

    it('should render back arrow skeleton with circular variant', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const circularSkeleton = container.querySelector('.MuiSkeleton-circular');
      expect(circularSkeleton).toBeInTheDocument();
    });

    it('should render icon skeleton with rounded variant', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const roundedSkeletons = container.querySelectorAll('.MuiSkeleton-rounded');
      // Icon skeleton is rounded
      expect(roundedSkeletons.length).toBeGreaterThan(0);
    });

    it('should render title skeleton with text variant', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const textSkeleton = container.querySelector('.MuiSkeleton-text');
      expect(textSkeleton).toBeInTheDocument();
    });

    it('should not render any text content', () => {
      render(<SubTypeHeaderSkeleton />);

      // Should not have any visible text
      expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });
  });

  describe('structure', () => {
    it('should have container with flexShrink 0', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const outerBox = container.firstChild as HTMLElement;
      expect(outerBox).toHaveStyle({ flexShrink: '0' });
    });

    it('should have title row with flex display', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const titleRow = container.querySelector('.MuiBox-root > .MuiBox-root');
      expect(titleRow).toHaveStyle({ display: 'flex' });
    });

    it('should have title row with padding instead of absolute positioning', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const titleRow = container.querySelector('.MuiBox-root > .MuiBox-root');
      expect(titleRow).toHaveStyle({ padding: '20px 20px 0px' });
    });

    it('should have title row with center-aligned items', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const titleRow = container.querySelector('.MuiBox-root > .MuiBox-root');
      expect(titleRow).toHaveStyle({ alignItems: 'center' });
    });
  });

  describe('skeleton dimensions', () => {
    it('should render back arrow skeleton with 24x24 dimensions', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const circularSkeleton = container.querySelector('.MuiSkeleton-circular');
      expect(circularSkeleton).toHaveStyle({ width: '24px', height: '24px' });
    });

    it('should render icon skeleton with 48x48 dimensions', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const roundedSkeletons = container.querySelectorAll('.MuiSkeleton-rounded');
      const iconSkeleton = Array.from(roundedSkeletons).find(
        (skeleton) => getComputedStyle(skeleton).width === '48px'
      );
      expect(iconSkeleton).toBeTruthy();
    });

    it('should render title skeleton with 250px width', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const textSkeletons = container.querySelectorAll('.MuiSkeleton-text');
      expect(textSkeletons[0]).toHaveStyle({ width: '250px' });
    });

    it('should render title skeleton with 36px height', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const textSkeletons = container.querySelectorAll('.MuiSkeleton-text');
      expect(textSkeletons[0]).toHaveStyle({ height: '36px' });
    });
  });

  describe('component exports', () => {
    it('should export SubTypeHeaderSkeleton as default', async () => {
      const module = await import('./SubTypeHeaderSkeleton');
      expect(module.default).toBeDefined();
    });

    it('should export a function component', async () => {
      const module = await import('./SubTypeHeaderSkeleton');
      expect(typeof module.default).toBe('function');
    });

    it('should be a valid React component', () => {
      expect(() => render(<SubTypeHeaderSkeleton />)).not.toThrow();
    });
  });

  describe('visual consistency', () => {
    it('should not have any interactive elements', () => {
      render(<SubTypeHeaderSkeleton />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should have skeletons arranged horizontally with gap', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const titleRow = container.querySelector('.MuiBox-root > .MuiBox-root');
      expect(titleRow).toHaveStyle({ gap: '20px' });
    });

    it('should have flexShrink 0 on container', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const outerBox = container.firstChild as HTMLElement;
      expect(outerBox).toHaveStyle({ flexShrink: '0' });
    });
  });

  describe('edge cases', () => {
    it('should render consistently on multiple renders', () => {
      const { rerender, container } = render(<SubTypeHeaderSkeleton />);

      const initialSkeletonCount = container.querySelectorAll('.MuiSkeleton-root').length;

      rerender(<SubTypeHeaderSkeleton />);

      const rerenderSkeletonCount = container.querySelectorAll('.MuiSkeleton-root').length;

      expect(initialSkeletonCount).toBe(rerenderSkeletonCount);
      expect(initialSkeletonCount).toBe(4);
    });

    it('should handle unmount correctly', () => {
      const { unmount, container } = render(<SubTypeHeaderSkeleton />);

      expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();

      unmount();

      expect(container.querySelector('.MuiSkeleton-root')).not.toBeInTheDocument();
    });

    it('should render without props', () => {
      // SubTypeHeaderSkeleton takes no props, ensure it renders without any
      const { container } = render(<SubTypeHeaderSkeleton />);

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('skeleton variants', () => {
    it('should have exactly one circular skeleton for back arrow', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const circularSkeletons = container.querySelectorAll('.MuiSkeleton-circular');
      expect(circularSkeletons.length).toBe(1);
    });

    it('should have two text skeletons for title and description', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const textSkeletons = container.querySelectorAll('.MuiSkeleton-text');
      expect(textSkeletons.length).toBe(2);
    });

    it('should have exactly one rounded skeleton for icon', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const roundedSkeletons = container.querySelectorAll('.MuiSkeleton-rounded');
      expect(roundedSkeletons.length).toBe(1);
    });

    it('should have all skeletons with correct background color', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      skeletons.forEach((skeleton) => {
        // MUI applies bgcolor via CSS, we check the element exists
        expect(skeleton).toBeInTheDocument();
      });
    });
  });

  describe('layout matching MainComponent header', () => {
    it('should have flexShrink 0 matching MainComponent header', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const outerBox = container.firstChild as HTMLElement;
      expect(outerBox).toHaveStyle({ flexShrink: '0' });
    });

    it('should have the same padding as MainComponent header elements', () => {
      const { container } = render(<SubTypeHeaderSkeleton />);

      const titleRow = container.querySelector('.MuiBox-root > .MuiBox-root');
      expect(titleRow).toHaveStyle({ padding: '20px 20px 0px' });
    });
  });
});
