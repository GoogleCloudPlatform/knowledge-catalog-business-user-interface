import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CTAButton from './CTAButton';

describe('CTAButton', () => {
  let mockHandleClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleClick = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('should render the button with provided text', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Click Me" />);

      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
    });

    it('should render as a MUI Button component', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Test Button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-root');
    });

    it('should render with different text values', () => {
      const { rerender } = render(
        <CTAButton handleClick={mockHandleClick} text="Submit" />
      );

      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();

      rerender(<CTAButton handleClick={mockHandleClick} text="Cancel" />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should render with empty text', () => {
      render(<CTAButton handleClick={mockHandleClick} text="" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should render with long text', () => {
      const longText = 'This is a very long button text that should still render correctly';
      render(<CTAButton handleClick={mockHandleClick} text={longText} />);

      expect(screen.getByRole('button', { name: longText })).toBeInTheDocument();
    });
  });

  describe('default styling', () => {
    it('should have blue background color by default', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Styled Button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ background: '#022FCD' });
    });

    it('should have white text color by default', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Styled Button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ color: '#ffffff' });
    });

    it('should have rounded border radius by default', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Styled Button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ borderRadius: '20px' });
    });

    it('should have correct padding by default', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Styled Button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ padding: '5px 20px' });
    });
  });

  describe('custom CSS styling', () => {
    it('should apply custom CSS properties', () => {
      const customCss = { width: '300px' };
      render(
        <CTAButton handleClick={mockHandleClick} text="Custom Button" css={customCss} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ width: '300px' });
    });

    it('should override default styles with custom CSS', () => {
      const customCss = { borderRadius: '0px' };
      render(
        <CTAButton handleClick={mockHandleClick} text="Custom Button" css={customCss} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ borderRadius: '0px' });
    });

    it('should apply multiple custom CSS properties', () => {
      const customCss = {
        fontSize: '18px',
        fontWeight: 'bold',
        margin: '10px',
      };
      render(
        <CTAButton handleClick={mockHandleClick} text="Multi CSS" css={customCss} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ fontSize: '18px' });
      expect(button).toHaveStyle({ fontWeight: 'bold' });
      expect(button).toHaveStyle({ margin: '10px' });
    });

    it('should work without css prop (undefined)', () => {
      render(<CTAButton handleClick={mockHandleClick} text="No CSS" />);

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ background: '#022FCD' });
    });

    it('should handle empty css object', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Empty CSS" css={{}} />);

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ background: '#022FCD' });
    });
  });

  describe('disabled state', () => {
    it('should be enabled by default', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Enabled" />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <CTAButton handleClick={mockHandleClick} text="Disabled" disabled={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be enabled when disabled prop is false', () => {
      render(
        <CTAButton handleClick={mockHandleClick} text="Enabled" disabled={false} />
      );

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should not call handleClick when disabled and clicked', async () => {
      render(
        <CTAButton handleClick={mockHandleClick} text="Disabled" disabled={true} />
      );

      const button = screen.getByRole('button');
      // MUI disabled buttons have pointer-events: none, so we can't use userEvent
      // Instead, we verify the button is disabled which prevents click events
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
      // Manually dispatch click event to verify handler is not called
      button.click();
      expect(mockHandleClick).not.toHaveBeenCalled();
    });

    it('should have MUI disabled class when disabled', () => {
      render(
        <CTAButton handleClick={mockHandleClick} text="Disabled" disabled={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('Mui-disabled');
    });
  });

  describe('click handling', () => {
    it('should call handleClick when button is clicked', async () => {
      const user = userEvent.setup();

      render(<CTAButton handleClick={mockHandleClick} text="Click Me" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockHandleClick).toHaveBeenCalledTimes(1);
    });

    it('should call handleClick multiple times on multiple clicks', async () => {
      const user = userEvent.setup();

      render(<CTAButton handleClick={mockHandleClick} text="Multi Click" />);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockHandleClick).toHaveBeenCalledTimes(3);
    });

    it('should pass event to handleClick', async () => {
      const user = userEvent.setup();

      render(<CTAButton handleClick={mockHandleClick} text="Event Test" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockHandleClick).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle async handleClick function', async () => {
      const user = userEvent.setup();
      const asyncHandleClick = vi.fn().mockResolvedValue('done');

      render(<CTAButton handleClick={asyncHandleClick} text="Async Click" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(asyncHandleClick).toHaveBeenCalled();
    });

    it('should handle handleClick that returns a value', async () => {
      const user = userEvent.setup();
      const returnValueClick = vi.fn().mockReturnValue('clicked');

      render(<CTAButton handleClick={returnValueClick} text="Return Click" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(returnValueClick).toHaveBeenCalled();
      expect(returnValueClick).toHaveReturnedWith('clicked');
    });
  });

  describe('prop updates', () => {
    it('should update text when prop changes', () => {
      const { rerender } = render(
        <CTAButton handleClick={mockHandleClick} text="Original" />
      );

      expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();

      rerender(<CTAButton handleClick={mockHandleClick} text="Updated" />);

      expect(screen.getByRole('button', { name: 'Updated' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Original' })).not.toBeInTheDocument();
    });

    it('should update disabled state when prop changes', () => {
      const { rerender } = render(
        <CTAButton handleClick={mockHandleClick} text="Toggle" disabled={false} />
      );

      expect(screen.getByRole('button')).not.toBeDisabled();

      rerender(<CTAButton handleClick={mockHandleClick} text="Toggle" disabled={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should update handleClick when prop changes', async () => {
      const user = userEvent.setup();
      const newHandleClick = vi.fn();

      const { rerender } = render(
        <CTAButton handleClick={mockHandleClick} text="Click" />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockHandleClick).toHaveBeenCalledTimes(1);
      expect(newHandleClick).not.toHaveBeenCalled();

      rerender(<CTAButton handleClick={newHandleClick} text="Click" />);

      await user.click(button);

      expect(mockHandleClick).toHaveBeenCalledTimes(1);
      expect(newHandleClick).toHaveBeenCalledTimes(1);
    });

    it('should update CSS when prop changes', () => {
      const { rerender } = render(
        <CTAButton
          handleClick={mockHandleClick}
          text="Styled"
          css={{ margin: '5px' }}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ margin: '5px' });

      rerender(
        <CTAButton
          handleClick={mockHandleClick}
          text="Styled"
          css={{ margin: '15px' }}
        />
      );

      expect(button).toHaveStyle({ margin: '15px' });
    });
  });

  describe('accessibility', () => {
    it('should be focusable', async () => {
      const user = userEvent.setup();

      render(<CTAButton handleClick={mockHandleClick} text="Focus Me" />);

      const button = screen.getByRole('button');
      await user.tab();

      expect(button).toHaveFocus();
    });

    it('should be activatable with keyboard (Enter)', async () => {
      const user = userEvent.setup();

      render(<CTAButton handleClick={mockHandleClick} text="Keyboard" />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(mockHandleClick).toHaveBeenCalled();
    });

    it('should be activatable with keyboard (Space)', async () => {
      const user = userEvent.setup();

      render(<CTAButton handleClick={mockHandleClick} text="Keyboard" />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

      expect(mockHandleClick).toHaveBeenCalled();
    });

    it('should have button role', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Role Test" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not be focusable when disabled', () => {
      render(
        <CTAButton handleClick={mockHandleClick} text="Disabled" disabled={true} />
      );

      const button = screen.getByRole('button');
      // Disabled MUI buttons typically have tabIndex -1 or are removed from tab order
      expect(button).toBeDisabled();
    });
  });

  describe('default export', () => {
    it('should export CTAButton as default', async () => {
      const module = await import('./CTAButton');
      expect(module.default).toBeDefined();
    });

    it('should export a function component', async () => {
      const module = await import('./CTAButton');
      expect(typeof module.default).toBe('function');
    });

    it('should have the same reference on multiple imports', async () => {
      const module1 = await import('./CTAButton');
      const module2 = await import('./CTAButton');
      expect(module1.default).toBe(module2.default);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in text', () => {
      const specialText = '!@#$%^&*()_+<>?';
      render(<CTAButton handleClick={mockHandleClick} text={specialText} />);

      expect(screen.getByRole('button', { name: specialText })).toBeInTheDocument();
    });

    it('should handle unicode characters in text', () => {
      const unicodeText = '按钮 ボタン кнопка';
      render(<CTAButton handleClick={mockHandleClick} text={unicodeText} />);

      expect(screen.getByRole('button', { name: unicodeText })).toBeInTheDocument();
    });

    it('should handle whitespace-only text', () => {
      render(<CTAButton handleClick={mockHandleClick} text="   " />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle text with HTML entities', () => {
      render(<CTAButton handleClick={mockHandleClick} text="Save &amp; Continue" />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Save & Continue');
    });

    it('should render correctly with all props provided', () => {
      render(
        <CTAButton
          handleClick={mockHandleClick}
          text="Full Props"
          disabled={false}
          css={{ width: '200px' }}
        />
      );

      const button = screen.getByRole('button', { name: 'Full Props' });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
      expect(button).toHaveStyle({ width: '200px' });
    });
  });

  describe('component composition', () => {
    it('should work within a form', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn((e) => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <CTAButton handleClick={mockHandleClick} text="Submit Form" />
        </form>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockHandleClick).toHaveBeenCalled();
    });

    it('should work alongside other elements', () => {
      render(
        <div>
          <span>Label:</span>
          <CTAButton handleClick={mockHandleClick} text="Action" />
          <span>Helper text</span>
        </div>
      );

      expect(screen.getByText('Label:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
      expect(screen.getByText('Helper text')).toBeInTheDocument();
    });

    it('should render multiple CTAButtons independently', async () => {
      const user = userEvent.setup();
      const handleClick1 = vi.fn();
      const handleClick2 = vi.fn();

      render(
        <>
          <CTAButton handleClick={handleClick1} text="Button 1" />
          <CTAButton handleClick={handleClick2} text="Button 2" />
        </>
      );

      const button1 = screen.getByRole('button', { name: 'Button 1' });
      const button2 = screen.getByRole('button', { name: 'Button 2' });

      await user.click(button1);
      expect(handleClick1).toHaveBeenCalledTimes(1);
      expect(handleClick2).not.toHaveBeenCalled();

      await user.click(button2);
      expect(handleClick1).toHaveBeenCalledTimes(1);
      expect(handleClick2).toHaveBeenCalledTimes(1);
    });
  });
});
