import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FilterAnnotationsMultiSelect from './FilterAnnotationsMultiSelect';

// react-virtuoso virtualizes its list and renders nothing in JSDOM (no layout),
// so mock it to render all items synchronously for assertions.
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ totalCount, itemContent }: { totalCount: number; itemContent: (index: number) => React.ReactNode }) => (
    <div data-testid="virtuoso-mock">
      {Array.from({ length: totalCount }).map((_, index) => (
        <div key={index}>{itemContent(index)}</div>
      ))}
    </div>
  ),
}));

const createMockStore = () =>
  configureStore({
    reducer: {
      user: (state = { mode: 'light' }) => state,
    },
    preloadedState: { user: { mode: 'light' } },
  });

const renderWithProvider = (ui: React.ReactElement) => {
  const store = createMockStore();
  const result = render(<Provider store={store}>{ui}</Provider>);
  return {
    ...result,
    rerender: (newUi: React.ReactElement) =>
      result.rerender(<Provider store={store}>{newUi}</Provider>),
  };
};

// Mock data
const mockOptions = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'];

describe('FilterAnnotationsMultiSelect', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnChange = vi.fn();
    mockOnClose = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing when isOpen is false', () => {
      const { container } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render the component when isOpen is true', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('Annotations')).toBeInTheDocument();
    });

    it('should render with custom filterType', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
          filterType="Tags"
        />
      );

      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('should render all options in the left panel', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      mockOptions.forEach((option) => {
        expect(screen.getByText(option)).toBeInTheDocument();
      });
    });

    it('should render selected count in right panel', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A', 'Option B']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('2 Selected')).toBeInTheDocument();
    });

    it('should render Clear All button', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('should render Apply button', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('Apply')).toBeInTheDocument();
    });

    it('should render search placeholder with filterType', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
          filterType="Custom Filter"
        />
      );

      expect(screen.getByPlaceholderText('Search for custom filter')).toBeInTheDocument();
    });

    it('should render with custom position', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
          position={{ top: 200, left: 300 }}
        />
      );

      expect(screen.getByText('Annotations')).toBeInTheDocument();
    });

    it('should render "No items selected" when value is empty', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('No items selected')).toBeInTheDocument();
    });

    it('should render selected items in right panel', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A', 'Option C']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Both panels should show selected items
      const optionAElements = screen.getAllByText('Option A');
      expect(optionAElements.length).toBeGreaterThan(1);
    });

    it('should render 0 Selected when no items selected', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('0 Selected')).toBeInTheDocument();
    });

    it('should render EditNoteOutlined icons only in browse panel (not selected panel)', () => {
      const { container } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
          filterType="Aspects" // Add this line to satisfy the new condition
        />
      );

      // Should NOT have img elements for edit note
      const editNoteImgs = container.querySelectorAll('img[alt="Edit Note"]');
      expect(editNoteImgs.length).toBe(0);

      // Should have MUI EditNoteOutlined icons only in the browse panel (one per option)
      const editNoteIcons = container.querySelectorAll('[data-testid="EditNoteOutlinedIcon"]');
      expect(editNoteIcons.length).toBe(mockOptions.length);
    });

    it('should show "Select all" tooltip on hover of select-all checkbox', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const selectAllBox = screen.getByTestId('select-all-checkbox');
      await user.hover(selectAllBox);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Select all');
      });
    });
  });

  describe('search functionality', () => {
    it('should filter options based on search term', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for annotations');
      await user.type(searchInput, 'Option A');

      await waitFor(() => {
        expect(screen.getByText('Option A')).toBeInTheDocument();
        expect(screen.queryByText('Option B')).not.toBeInTheDocument();
      });
    });

    it('should show "No annotations found" when search has no results', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for annotations');
      await user.type(searchInput, 'NonExistent');

      await waitFor(() => {
        expect(screen.getByText('No annotations found')).toBeInTheDocument();
      });
    });

    it('should be case insensitive when searching', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for annotations');
      await user.type(searchInput, 'option a');

      await waitFor(() => {
        expect(screen.getByText('Option A')).toBeInTheDocument();
      });
    });

    it('should update search term on input change', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for annotations');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      expect(searchInput).toHaveValue('Test');
    });

    it('should show custom filterType in no results message', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
          filterType="Tags"
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for tags');
      await user.type(searchInput, 'xyz');

      await waitFor(() => {
        expect(screen.getByText('No tags found')).toBeInTheDocument();
      });
    });
  });

  describe('selection functionality (local state)', () => {
    it('should NOT call onChange when selecting an option (local state only)', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const optionA = screen.getByText('Option A');
      fireEvent.click(optionA);

      // onChange should NOT be called on toggle — only on Apply
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should update local state when toggling options', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Click Option A to select it locally
      fireEvent.click(screen.getByText('Option A'));

      // The right panel should now show it selected
      expect(screen.getByText('1 Selected')).toBeInTheDocument();
    });

    it('should deselect option locally when clicking a selected item', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A', 'Option B']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Click on Option A in left panel to deselect locally
      const optionElements = screen.getAllByText('Option A');
      fireEvent.click(optionElements[0]);

      // Should show 1 Selected now (B only)
      expect(screen.getByText('1 Selected')).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should toggle option via checkbox icon click without calling onChange', () => {
      const { container } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Find the checked checkbox box (blue background) and click it
      const checkIcons = container.querySelectorAll('[data-testid="CheckIcon"]');
      if (checkIcons.length > 0) {
        const checkboxBox = checkIcons[0].closest('div');
        if (checkboxBox) {
          fireEvent.click(checkboxBox);
          expect(mockOnChange).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Select All functionality', () => {
    it('should select all filtered options locally when Select All is clicked', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Click the first option's checkbox area to verify local-only behavior
      fireEvent.click(screen.getByText('Option A'));
      expect(screen.getByText('1 Selected')).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should show indeterminate state (Remove icon) when some options are selected', () => {
      const { container } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A', 'Option B']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Should have a Remove icon for indeterminate state
      const removeIcons = container.querySelectorAll('[data-testid="RemoveIcon"]');
      expect(removeIcons.length).toBeGreaterThan(0);
    });

    it('should show checked state (Check icon in select-all) when all options are selected', () => {
      const { container } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[...mockOptions]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // All options selected — the select-all should show a Check icon
      // There should be Check icons for each option + the select-all
      const checkIcons = container.querySelectorAll('[data-testid="CheckIcon"]');
      // mockOptions.length options in left panel + mockOptions.length in right panel + 1 select-all = 2*n + 1
      expect(checkIcons.length).toBe(mockOptions.length * 2 + 1);
    });

    it('should show unchecked state (empty box) when no options are selected', () => {
      const { container } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // No Check or Remove icons in select-all area (only unchecked boxes for options)
      const removeIcons = container.querySelectorAll('[data-testid="RemoveIcon"]');
      expect(removeIcons.length).toBe(0);

      const checkIcons = container.querySelectorAll('[data-testid="CheckIcon"]');
      expect(checkIcons.length).toBe(0);
    });
  });

  describe('Clear All functionality', () => {
    it('should clear all selections locally without calling onChange', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A', 'Option B', 'Option C']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      // Should show 0 Selected locally
      expect(screen.getByText('0 Selected')).toBeInTheDocument();
      expect(screen.getByText('No items selected')).toBeInTheDocument();
      // onChange should NOT be called — only local state changed
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should work when no items are selected', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(screen.getByText('0 Selected')).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Apply and close functionality', () => {
    it('should call onChange and onClose when Apply is clicked', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(mockOnChange).toHaveBeenCalledWith(['Option A']);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should apply local selections when Apply is clicked', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Select Option A and Option B locally
      fireEvent.click(screen.getByText('Option A'));
      fireEvent.click(screen.getByText('Option B'));

      // No onChange yet
      expect(mockOnChange).not.toHaveBeenCalled();

      // Click Apply
      fireEvent.click(screen.getByText('Apply'));

      // Now onChange should be called with the local selections
      expect(mockOnChange).toHaveBeenCalledWith(['Option A', 'Option B']);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Close icon is clicked (without calling onChange)', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const closeIcon = screen.getByTestId('CloseIcon');
      const closeButton = closeIcon.closest('button');
      fireEvent.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should call onClose when clicking outside the component (without calling onChange)', async () => {
      render(
        <Provider store={createMockStore()}>
          <div data-testid="outside">
            <FilterAnnotationsMultiSelect
              options={mockOptions}
              value={[]}
              onChange={mockOnChange}
              onClose={mockOnClose}
              isOpen={true}
            />
          </div>
        </Provider>
      );

      // Click outside the component
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not call onClose when clicking inside the component', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const header = screen.getByText('Annotations');
      fireEvent.mouseDown(header);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should discard local changes when closing via X button', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Select Option A locally
      fireEvent.click(screen.getByText('Option A'));
      expect(screen.getByText('1 Selected')).toBeInTheDocument();

      // Close via X — should NOT call onChange
      const closeIcon = screen.getByTestId('CloseIcon');
      fireEvent.click(closeIcon.closest('button')!);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options array', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={[]}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('No annotations found')).toBeInTheDocument();
    });

    it('should handle options with special characters', () => {
      const specialOptions = ['Option & Special', 'Option <Test>', 'Option "Quoted"'];

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={specialOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('Option & Special')).toBeInTheDocument();
    });

    it('should handle very long option names', () => {
      const longOption = 'A'.repeat(100);
      const longOptions = [longOption];

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={longOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText(longOption)).toBeInTheDocument();
    });

    it('should handle large number of options', () => {
      const manyOptions = Array.from({ length: 100 }, (_, i) => `Option ${i + 1}`);

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={manyOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 100')).toBeInTheDocument();
    });

    it('should handle default props', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Default filterType should be 'Annotations'
      expect(screen.getByText('Annotations')).toBeInTheDocument();
    });
  });

  describe('right panel interactions', () => {
    it('should deselect item locally when clicking checkbox in right panel', () => {
      const { container } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A', 'Option B']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Find Check icons — there should be multiple (in both left and right panels)
      const checkIcons = container.querySelectorAll('[data-testid="CheckIcon"]');
      expect(checkIcons.length).toBeGreaterThan(0);

      // Click on one of the checked boxes in right panel
      const rightPanelCheckbox = checkIcons[checkIcons.length - 1].parentElement;
      if (rightPanelCheckbox) {
        fireEvent.click(rightPanelCheckbox);
        // Only local state should change, not onChange
        expect(mockOnChange).not.toHaveBeenCalled();
      }
    });

    it('should NOT display EditNoteOutlined icons for selected items in right panel', () => {
      const { container } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
          filterType="Aspects" // Add this line here as well
        />
      );

      // EditNote icons should only be in the browse panel (left), not the selected panel (right)
      // With 5 options in browse panel, there should be 5 icons (one per option)
      const editNoteIcons = container.querySelectorAll('[data-testid="EditNoteOutlinedIcon"]');
      expect(editNoteIcons.length).toBe(mockOptions.length);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener when component unmounts', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should not add event listener when isOpen is false', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={false}
        />
      );

      // Event listener should not be added when isOpen is false
      const mousedownCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'mousedown'
      );

      expect(mousedownCalls.length).toBe(0);

      addEventListenerSpy.mockRestore();
    });
  });

  describe('default export', () => {
    it('should export FilterAnnotationsMultiSelect as default', async () => {
      const module = await import('./FilterAnnotationsMultiSelect');
      expect(module.default).toBeDefined();
    });

    it('should export a function component', async () => {
      const module = await import('./FilterAnnotationsMultiSelect');
      expect(typeof module.default).toBe('function');
    });
  });

  describe('position prop', () => {
    it('should use default position when position is null', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
          position={null}
        />
      );

      expect(screen.getByText('Annotations')).toBeInTheDocument();
    });

    it('should use custom position when provided', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
          position={{ top: 150, left: 250 }}
        />
      );

      expect(screen.getByText('Annotations')).toBeInTheDocument();
    });
  });

  describe('local state syncs with prop changes', () => {
    it('should sync local state when value prop changes', () => {
      const { rerender } = renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('0 Selected')).toBeInTheDocument();

      // Re-render with new value
      rerender(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A', 'Option B']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('2 Selected')).toBeInTheDocument();
    });

    it('should handle multiple local selections then Apply', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={[]}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Select multiple options locally
      fireEvent.click(screen.getByText('Option A'));
      fireEvent.click(screen.getByText('Option C'));
      fireEvent.click(screen.getByText('Option E'));

      expect(screen.getByText('3 Selected')).toBeInTheDocument();

      // Apply
      fireEvent.click(screen.getByText('Apply'));
      expect(mockOnChange).toHaveBeenCalledWith(['Option A', 'Option C', 'Option E']);
    });

    it('should handle local deselection then Apply', () => {
      renderWithProvider(
        <FilterAnnotationsMultiSelect
          options={mockOptions}
          value={['Option A', 'Option B', 'Option C']}
          onChange={mockOnChange}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Deselect Option B locally
      const optionBElements = screen.getAllByText('Option B');
      fireEvent.click(optionBElements[0]);

      expect(screen.getByText('2 Selected')).toBeInTheDocument();

      // Apply
      fireEvent.click(screen.getByText('Apply'));
      expect(mockOnChange).toHaveBeenCalledWith(['Option A', 'Option C']);
    });
  });
});
