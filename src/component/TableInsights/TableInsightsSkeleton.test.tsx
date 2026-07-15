import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TableInsightsSkeleton from './TableInsightsSkeleton';

describe('TableInsightsSkeleton', () => {
  describe('Rendering', () => {
    it('renders skeleton container', () => {
      render(<TableInsightsSkeleton />);

      const container = document.querySelector('.insights-skeleton');
      expect(container).toBeInTheDocument();
    });

    it('renders table description section skeleton', () => {
      render(<TableInsightsSkeleton />);

      const sections = document.querySelectorAll('.insights-section');
      expect(sections.length).toBeGreaterThanOrEqual(1);
    });

    it('renders generated queries section skeleton', () => {
      render(<TableInsightsSkeleton />);

      const sections = document.querySelectorAll('.insights-section');
      expect(sections.length).toBe(2);
    });

    it('renders circular skeletons for icons', () => {
      render(<TableInsightsSkeleton />);

      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      expect(circularSkeletons.length).toBeGreaterThan(0);
    });

    it('renders text skeletons for labels', () => {
      render(<TableInsightsSkeleton />);

      const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
      expect(textSkeletons.length).toBeGreaterThan(0);
    });

    it('renders multiple date group header skeletons', () => {
      render(<TableInsightsSkeleton />);

      // The Generated Queries section renders 3 collapsed date-group header rows,
      // each with a circular expand-toggle skeleton, plus the two section help icons.
      const circularSkeletons = document.querySelectorAll('.MuiSkeleton-circular');
      expect(circularSkeletons.length).toBeGreaterThanOrEqual(5);
    });

    it('renders the filter bar skeleton', () => {
      render(<TableInsightsSkeleton />);

      // The pill-shaped filter bar is a rounded skeleton.
      const roundedSkeletons = document.querySelectorAll('.MuiSkeleton-rounded');
      expect(roundedSkeletons.length).toBeGreaterThan(0);
    });

    it('renders skeleton structure', () => {
      render(<TableInsightsSkeleton />);

      // The component renders a complete skeleton structure
      const container = document.querySelector('.insights-skeleton');
      expect(container).toBeInTheDocument();
      expect(container?.children.length).toBeGreaterThan(0);
    });

    it('exports as default', () => {
      expect(TableInsightsSkeleton).toBeDefined();
      expect(typeof TableInsightsSkeleton).toBe('function');
    });
  });
});
