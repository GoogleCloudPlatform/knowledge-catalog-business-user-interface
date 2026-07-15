import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Tooltip } from '@mui/material';
import { useSelector } from 'react-redux';
import FilterTag from '../Tags/FilterTag';
import { getAssetIcon } from '../../utils/resourceUtils';
import { isGlossaryAssetType, getGlossaryMuiIcon, assetNameToGlossaryType } from '../../constants/glossaryIcons';
import './FilterChipCarousel.css';

interface FilterChipCarouselProps {
  availableTypeAliases: { name: string; count: number }[];
  selectedFilters: any[];
  onTypeAliasClick: (type: string) => void;
  resourcesStatus: string;
}

const SCROLL_AMOUNT = 200;

const FilterChipCarousel: React.FC<FilterChipCarouselProps> = ({
  availableTypeAliases,
  selectedFilters,
  onTypeAliasClick,
  resourcesStatus,
}) => {
  const mode = useSelector((state: any) => state.user.mode) as string;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Sort: selected chips first, then unselected
  const sortedAliases = useMemo(() => {
    const selected = availableTypeAliases.filter(item =>
      selectedFilters.some((f: any) => f.name === item.name && f.type === 'typeAliases')
    );
    const unselected = availableTypeAliases.filter(item =>
      !selectedFilters.some((f: any) => f.name === item.name && f.type === 'typeAliases')
    );
    return [...selected, ...unselected];
  }, [availableTypeAliases, selectedFilters]);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons);
    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      observer.disconnect();
    };
  }, [updateScrollButtons, availableTypeAliases]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (resourcesStatus === 'loading') {
    return (
      <div className="filter-chip-carousel" style={{ padding: '4px 10px 8px 10px' }}>
        <Box sx={{
          display: 'flex',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: mode === 'dark'
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
            animation: 'shimmer 1.5s infinite',
            '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } },
            zIndex: 1,
          }} />
          {[90, 70, 100, 80, 60, 90, 75].map((w, i) => (
            <Box key={i} sx={{
              width: `${w}px`,
              height: '32px',
              backgroundColor: mode === 'dark' ? '#3c4043' : '#F0F0F0',
              borderRadius: '59px',
              flexShrink: 0,
            }} />
          ))}
        </Box>
      </div>
    );
  }

  if (availableTypeAliases.length === 0) return null;

  return (
    <div style={{ padding: '8px 10px 8px 10px' }}>
      <div className="filter-chip-carousel">
        {/* Scrollable chips container */}
        <div
          ref={scrollRef}
          className="carousel-scroll-container"
        >
          {sortedAliases.map((item) => {
            const isSelected = selectedFilters.some(
              (f: any) => f.name === item.name && f.type === 'typeAliases'
            );
            return (
              <span
                key={`carousel-${item.name}`}
                className={isSelected ? `carousel-chip-selected ${mode === 'dark' ? 'dark-selected' : ''}` : (mode === 'dark' ? 'dark-unselected' : '')}
              >
                <FilterTag
                  handleClick={() => onTypeAliasClick(item.name)}
                  handleClose={() => onTypeAliasClick(item.name)}
                  showCloseButton={isSelected}
                  icon={isGlossaryAssetType(item.name)
                    ? getGlossaryMuiIcon(assetNameToGlossaryType(item.name), { size: '20px', color: '#4285F4' })
                    : getAssetIcon(item.name)}
                  iconSize="20px"
                  css={{
                    margin: '0px',
                    textTransform: 'capitalize',
                    fontFamily: '"Product Sans", sans-serif',
                    fontWeight: 400,
                    fontSize: '12px',
                    lineHeight: '16px',
                    letterSpacing: '0.1px',
                    padding: '8px 13px',
                    borderRadius: '59px',
                    gap: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: isSelected
                      ? (mode === 'dark' ? '#004a77' : '#E7F0FE')
                      : 'transparent',
                    color: isSelected
                      ? (mode === 'dark' ? '#8ab4f8' : '#022FCD')
                      : (mode === 'dark' ? '#e3e3e3' : '#1F1F1F'),
                    border: isSelected ? 'none' : `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}`,
                    height: '32px',
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                  text={item.name}
                />
              </span>
            );
          })}
        </div>

        {/* Left arrow with gradient fade */}
        {canScrollLeft && (
          <div className={`carousel-fade carousel-fade-left ${mode === 'dark' ? 'dark' : ''}`}>
            <Tooltip title="Previous" arrow>
              <div
                role="button"
                tabIndex={0}
                className={`carousel-arrow ${mode === 'dark' ? 'dark' : ''}`}
                onClick={() => scroll('left')}
                onKeyDown={(e) => { if (e.key === 'Enter') scroll('left'); }}
                aria-label="Previous"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 12L6 8L10 4" stroke={mode === 'dark' ? '#e3e3e3' : '#1F1F1F'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Tooltip>
          </div>
        )}

        {/* Right arrow with gradient fade */}
        {canScrollRight && (
          <div className={`carousel-fade carousel-fade-right ${mode === 'dark' ? 'dark' : ''}`}>
            <Tooltip title="Next" arrow>
              <div
                role="button"
                tabIndex={0}
                className={`carousel-arrow ${mode === 'dark' ? 'dark' : ''}`}
                onClick={() => scroll('right')}
                onKeyDown={(e) => { if (e.key === 'Enter') scroll('right'); }}
                aria-label="Next"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 4L10 8L6 12" stroke={mode === 'dark' ? '#e3e3e3' : '#1F1F1F'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterChipCarousel;
