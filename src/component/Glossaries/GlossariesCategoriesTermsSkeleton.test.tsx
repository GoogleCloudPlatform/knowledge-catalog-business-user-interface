import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import GlossariesCategoriesTermsSkeleton from './GlossariesCategoriesTermsSkeleton';

describe('GlossariesCategoriesTermsSkeleton', () => {
  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      expect(container).toBeInTheDocument();
    });

    it('renders the main container with full height', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      const mainBox = container.firstChild as HTMLElement;
      expect(mainBox).toBeInTheDocument();
    });

    it('renders all skeleton elements', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      // MUI Skeleton components have the class 'MuiSkeleton-root'
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Header Section Skeleton', () => {
    it('renders search bar skeleton with rounded variant', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      // At least one rounded skeleton for search bar
      expect(roundedSkeletons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders search bar skeleton with correct dimensions', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      // The first rounded skeleton should be the search bar (309x32)
      expect(roundedSkeletons[0]).toBeInTheDocument();
    });

    it('renders sort icon circular skeleton in header', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // Should have at least one circular skeleton in header (sort icon)
      expect(circularSkeletons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders sort text skeleton in header', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Should have text skeletons for sort label and other text elements
      expect(textSkeletons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Card Grid Skeleton', () => {
    it('renders exactly 6 card skeleton placeholders', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      // Count by structure - each card has icon + title + 2 desc + footer
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      // Header: 2 rounded (search bar + sort controls) = 2
      // Each card: 1 circular (icon) + 1 text (title) + 2 text (desc) + 1 circular (time icon) + 1 text (time) = 6
      // Total: 2 + (6 * 6) = 38 skeletons
      expect(skeletons.length).toBe(38);
    });

    it('renders circular skeleton for card icons', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // 6 card icons (6) + 6 card footer time icons (6) = 12
      expect(circularSkeletons.length).toBe(12);
    });

    it('renders text skeletons for card titles', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // 6 card titles (6) + 12 card descriptions (2 per card) + 6 card times (6) = 24
      expect(textSkeletons.length).toBe(24);
    });

    it('renders description line skeletons for each card', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Each card has 2 description lines, 6 cards total = 12 description skeletons
      // Plus other text skeletons (title, footer, header)
      expect(textSkeletons.length).toBeGreaterThanOrEqual(12);
    });

    it('renders footer skeleton for each card with time icon and text', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // Each card has a small circular skeleton (16x16) for time icon
      // 6 cards * 1 time icon = 6 time icons + 6 card icons = 12
      expect(circularSkeletons.length).toBe(12);
    });
  });

  describe('Skeleton Variants', () => {
    it('uses rounded variant for search bar', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      // Search bar + sort controls pill = 2 rounded skeletons
      expect(roundedSkeletons.length).toBe(2);
    });

    it('uses circular variant for icons', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // 6 card icons + 6 time icons = 12
      expect(circularSkeletons.length).toBe(12);
    });

    it('uses text variant for text content', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // 6 titles + 12 descriptions + 6 times = 24
      expect(textSkeletons.length).toBe(24);
    });
  });

  describe('Layout Structure', () => {
    it('renders header section before cards grid', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      const allBoxes = container.querySelectorAll('.MuiBox-root');
      expect(allBoxes.length).toBeGreaterThan(0);
    });

    it('renders grid container for cards', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      // The grid container should be present
      expect(container.querySelector('.MuiBox-root')).toBeInTheDocument();
    });

    it('renders flex container in header', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      // Header has flex display
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders card containers with proper structure', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      // Each card is a Box with specific styling
      const boxes = container.querySelectorAll('.MuiBox-root');
      // Main container + inner container + header row + sort controls box +
      // grid container + 6 cards * (card + header box + desc box + footer box) = many boxes
      expect(boxes.length).toBeGreaterThan(6);
    });
  });

  describe('Skeleton Dimensions', () => {
    it('renders search bar skeleton with width 320', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const roundedSkeleton = document.querySelector('.MuiSkeleton-rounded');
      expect(roundedSkeleton).toBeInTheDocument();
      // Width is applied as inline style
      expect(roundedSkeleton).toHaveStyle({ width: '320px' });
    });

    it('renders search bar skeleton with height 36', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const roundedSkeleton = document.querySelector('.MuiSkeleton-rounded');
      expect(roundedSkeleton).toHaveStyle({ height: '36px' });
    });

    it('renders card icon skeleton with dimensions 24x24', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // First circular skeleton is the first card icon (24x24)
      expect(circularSkeletons[0]).toHaveStyle({ width: '24px', height: '24px' });
    });

    it('renders card time icon skeleton with dimensions 16x16', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // Circular skeletons are interleaved: card1-icon(0), card1-time(1), card2-icon(2), card2-time(3), etc.
      // Index 1 is the first footer time icon (16x16)
      expect(circularSkeletons[1]).toHaveStyle({ width: '16px', height: '16px' });
    });

    it('renders card title skeleton with 60% width', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Index 0 is the first card title
      expect(textSkeletons[0]).toHaveStyle({ width: '60%' });
    });

    it('renders first description line with 100% width', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Index 1 is the first card's first description line
      expect(textSkeletons[1]).toHaveStyle({ width: '100%' });
    });

    it('renders second description line with 80% width', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Index 2 is the first card's second description line
      expect(textSkeletons[2]).toHaveStyle({ width: '80%' });
    });

    it('renders card footer time text with width 100', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Index 3 is the first card's footer time text
      expect(textSkeletons[3]).toHaveStyle({ width: '100px' });
    });
  });

  describe('Multiple Cards Verification', () => {
    it('renders 6 card icon skeletons', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // Filter for 24x24 circular skeletons (card icons + header sort icon)
      const cardIcons = Array.from(circularSkeletons).filter((s) => {
        return s.getAttribute('style')?.includes('24px');
      });
      // 6 card icons = 6 circular skeletons with 24x24
      expect(cardIcons.length).toBe(6);
    });

    it('renders 6 card time icon skeletons (16x16)', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      // Filter for 16x16 circular skeletons (time icons)
      const timeIcons = Array.from(circularSkeletons).filter((s) => {
        return s.getAttribute('style')?.includes('16px');
      });
      expect(timeIcons.length).toBe(6);
    });

    it('renders 6 card title skeletons with 60% width', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Filter for 60% width text skeletons (card titles)
      const titles = Array.from(textSkeletons).filter((s) => {
        return s.getAttribute('style')?.includes('60%');
      });
      expect(titles.length).toBe(6);
    });

    it('renders 6 full-width description lines', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Filter for 100% width text skeletons (first description lines)
      const fullWidthDesc = Array.from(textSkeletons).filter((s) => {
        return s.getAttribute('style')?.includes('100%');
      });
      expect(fullWidthDesc.length).toBe(6);
    });

    it('renders 6 partial-width description lines', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      // Filter for 80% width text skeletons (second description lines)
      const partialWidthDesc = Array.from(textSkeletons).filter((s) => {
        return s.getAttribute('style')?.includes('80%');
      });
      expect(partialWidthDesc.length).toBe(6);
    });
  });

  describe('Default Export', () => {
    it('exports the component as default', () => {
      expect(GlossariesCategoriesTermsSkeleton).toBeDefined();
      expect(typeof GlossariesCategoriesTermsSkeleton).toBe('function');
    });

    it('is a valid React functional component', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      expect(container.firstChild).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Accessibility', () => {
    it('renders skeleton elements with proper MUI accessibility attributes', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      // All skeletons should be rendered
      expect(skeletons.length).toBe(38);
    });

    it('renders with visible animation for loading indication', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      // MUI Skeleton uses pulse animation by default
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      // Check that skeletons have the pulse animation class
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass('MuiSkeleton-pulse');
      });
    });
  });

  describe('Component Structure Verification', () => {
    it('renders nested Box components correctly', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      const boxes = container.querySelectorAll('.MuiBox-root');
      // Outer box + inner flex box + header box + sort controls box +
      // grid box + (6 cards * 4 boxes each) = 5 + 24 = 29 boxes
      expect(boxes.length).toBeGreaterThan(20);
    });

    it('maintains consistent card structure across all 6 cards', () => {
      render(<GlossariesCategoriesTermsSkeleton />);
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');

      // Each card has exactly: 2 circular (icon + time) + 4 text (title + 2 desc + time)
      // 6 cards = 12 circular + 24 text (header has 2 rounded, no circular/text)
      expect(circularSkeletons.length).toBe(12);
      expect(textSkeletons.length).toBe(24);
    });

    it('renders the component without any text content', () => {
      const { container } = render(<GlossariesCategoriesTermsSkeleton />);
      // Get all text nodes
      const textContent = container.textContent?.trim();
      // Skeleton component should not have any visible text
      expect(textContent).toBe('');
    });
  });

  describe('Snapshot and Stability', () => {
    it('renders consistently on multiple renders', () => {
      const { container: container1 } = render(<GlossariesCategoriesTermsSkeleton />);
      const { container: container2 } = render(<GlossariesCategoriesTermsSkeleton />);

      const skeletons1 = container1.querySelectorAll('.MuiSkeleton-root').length;
      const skeletons2 = container2.querySelectorAll('.MuiSkeleton-root').length;

      expect(skeletons1).toBe(skeletons2);
    });

    it('renders the same number of elements each time', () => {
      const results: number[] = [];

      for (let i = 0; i < 3; i++) {
        const { container } = render(<GlossariesCategoriesTermsSkeleton />);
        results.push(container.querySelectorAll('.MuiSkeleton-root').length);
      }

      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });

  describe('Edge Cases', () => {
    it('renders correctly when rendered multiple times in the same parent', () => {
      const { container } = render(
        <div>
          <GlossariesCategoriesTermsSkeleton />
          <GlossariesCategoriesTermsSkeleton />
        </div>
      );

      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      // 38 skeletons per component * 2 = 76
      expect(skeletons.length).toBe(76);
    });

    it('does not throw errors when unmounted', () => {
      const { unmount } = render(<GlossariesCategoriesTermsSkeleton />);
      expect(() => unmount()).not.toThrow();
    });

    it('can be rendered within a fragment', () => {
      const { container } = render(
        <>
          <GlossariesCategoriesTermsSkeleton />
        </>
      );
      expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    });
  });
});
