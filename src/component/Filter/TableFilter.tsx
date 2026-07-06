import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  Checkbox,
  IconButton,
  Collapse,
  TextField,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { FilterList, Close, KeyboardArrowRight } from '@mui/icons-material';
import OverflowTooltip from '../Common/OverflowTooltip';

/**
 * @file TableFilter.tsx
 * @description
 * This component provides a filter bar for a data table. It allows users to filter
 * data in two ways:
 *
 * 1.  **Free-text Search**: A text field that searches across all specified `columns`
 * in the `data` array.
 * 2.  **Property-value Filtering**: A "Filter" button opens a menu where users
 * can first select a property (column) and then select one or more
 * unique values from that property to filter by.
 *
 * The component displays active filters as "chips" below the search bar and
 * provides a "Clear All" button.
 *
 * It takes the raw `data` and `columns` as props and uses the
 * `onFilteredDataChange` callback to return the resulting filtered data to the
 * parent component. To optimize performance, it only emits this change when
 * the filtered data's signature (length, first/last item) actually changes.
 *
 * @param {TableFilterProps} props - The props for the component.
 * @param {any[]} props.data - The complete, unfiltered array of data objects.
 * @param {string[]} props.columns - An array of strings representing the column
 * keys (properties) in the data objects that should be available for
 * filtering and searching.
 * @param {(filteredData: any[]) => void} props.onFilteredDataChange - Callback
 * function that is invoked when the filtered data changes. It passes the
 * new filtered array. If no filters are active, it passes an empty array `[]`.
 *
 * @returns {React.ReactElement} A React fragment containing the collapsible
 * filter bar UI and the hidden `Menu` component for property selection.
 */

interface TableFilterProps {
  data: any[];
  columns: string[];
  onFilteredDataChange: (filteredData: any[]) => void;
  /** Filter bar visual variant: "pill" (rounded, default) or "classic" (rectangular top-bar) */
  variant?: 'pill' | 'classic';
}

const TableFilter: React.FC<TableFilterProps> = ({
  data,
  columns,
  onFilteredDataChange,
  variant = 'pill'
}) => {
  const [filterText, setFilterText] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<Array<{property: string, values: string[]}>>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterBarRef = React.useRef<HTMLDivElement>(null);

  // Unwrap nested objects like { value: "2012-01-03" } to their inner value
  const resolveValue = (val: any): string => {
    if (val == null) return '';
    if (typeof val === 'object' && val.value !== undefined) return String(val.value);
    if (typeof val === 'object') return '';
    return String(val);
  };

  // Get unique values for selected property with error handling
  const getPropertyValues = (property: string) => {
    const values = new Set<string>();

    try {
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      data.forEach((row: any, index: number) => {
        try {
          if (row && typeof row === 'object' && row[property] !== undefined && row[property] !== null) {
            const resolved = resolveValue(row[property]);
            if (resolved) values.add(resolved);
          }
        } catch (rowError) {
          console.warn(`Error processing row ${index} for property ${property}:`, rowError);
        }
      });
    } catch (error) {
      console.error('Error getting property values:', error);
      return [];
    }

    return Array.from(values).sort();
  };

  // Filter data based on selected values and text search with error handling
  const filteredData = useMemo(() => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      let filtered = data;

      // Apply property/value filters first
      if (activeFilters.length > 0) {
        filtered = filtered.filter((row: any, index: number) => {
          try {
            if (!row || typeof row !== 'object') {
              return false;
            }

            return activeFilters.every(filter => {
              try {
                const cellValue = resolveValue(row[filter.property]);
                return filter.values.includes(cellValue);
              } catch (filterError) {
                console.warn(`Error applying filter for property ${filter.property} on row ${index}:`, filterError);
                return false;
              }
            });
          } catch (rowError) {
            console.warn(`Error filtering row ${index}:`, rowError);
            return false;
          }
        });
      }

      // Then apply text search across all columns
      if (filterText.trim()) {
        filtered = filtered.filter((row: any, index: number) => {
          try {
            if (!row || typeof row !== 'object') {
              return false;
            }

            return columns.some((col) => {
              try {
                return resolveValue(row[col]).toLowerCase().includes(filterText.toLowerCase());
              } catch (colError) {
                console.warn(`Error searching column ${col} on row ${index}:`, colError);
                return false;
              }
            });
          } catch (rowError) {
            console.warn(`Error searching row ${index}:`, rowError);
            return false;
          }
        });
      }

      return filtered;
    } catch (error) {
      console.error('Error filtering data:', error);
      return [];
    }
  }, [data, activeFilters, filterText, columns]);

  // Update parent component when filtered data changes, but only when content actually changes
  const lastEmittedRef = React.useRef<string>('');
  React.useEffect(() => {
    // If no active filters and no text, emit empty array to signal 'no-op' only once
    if (activeFilters.length === 0 && !filterText.trim()) {
      const signature = 'EMPTY';
      if (lastEmittedRef.current !== signature) {
        lastEmittedRef.current = signature;
        onFilteredDataChange([]);
      }
      return;
    }

    // Create a lightweight signature from length + first/last item stringified to avoid heavy deep comparisons
    const signature = (() => {
      const len = filteredData.length;
      if (len === 0) return 'LEN:0';
      const first = JSON.stringify(filteredData[0]).slice(0, 200);
      const last = JSON.stringify(filteredData[len - 1]).slice(0, 200);
      return `LEN:${len}|F:${first}|L:${last}`;
    })();

    if (lastEmittedRef.current !== signature) {
      lastEmittedRef.current = signature;
      onFilteredDataChange(filteredData);
    }
  }, [filteredData, onFilteredDataChange, activeFilters.length, filterText]);

  // Handle focus management for accessibility
  React.useEffect(() => {
    if (filterAnchorEl) {
      const menuElement = document.querySelector('[role="menu"]');
      if (menuElement) {
        menuElement.removeAttribute('aria-hidden');
      }
    } else {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      menuItems.forEach(item => {
        if (item instanceof HTMLElement) {
          item.blur();
        }
      });
    }
  }, [filterAnchorEl]);

  // Cleanup hover timer on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Filter event handlers
  const handleFilterClick = () => {
    setFilterAnchorEl(filterBarRef.current);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setHoveredProperty(null);
    setSubMenuAnchorEl(null);
  };

  // Hover handlers for cascading menu
  const handlePropertyMouseEnter = (property: string, event: React.MouseEvent<HTMLElement>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredProperty(property);
    setSubMenuAnchorEl(event.currentTarget);
    const existingFilter = activeFilters.find(f => f.property === property);
    setSelectedValues(existingFilter ? existingFilter.values : []);
  };

  const handlePropertyMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => {
      setHoveredProperty(null);
      setSubMenuAnchorEl(null);
    }, 300);
  };

  const handleSubMenuMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  const handleSubMenuMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => {
      setHoveredProperty(null);
      setSubMenuAnchorEl(null);
    }, 300);
  };

  const handleValueToggle = (value: string) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];

    setSelectedValues(newSelectedValues);

    // Auto-apply filter when values change
    if (hoveredProperty && newSelectedValues.length > 0) {
      const existingFilterIndex = activeFilters.findIndex(f => f.property === hoveredProperty);

      if (existingFilterIndex >= 0) {
        setActiveFilters(prev => prev.map((filter, index) =>
          index === existingFilterIndex
            ? { ...filter, values: newSelectedValues }
            : filter
        ));
      } else {
        setActiveFilters(prev => [...prev, { property: hoveredProperty, values: newSelectedValues }]);
      }
    } else if (hoveredProperty && newSelectedValues.length === 0) {
      setActiveFilters(prev => prev.filter(f => f.property !== hoveredProperty));
    }
  };

  const handleRemoveFilter = (propertyToRemove: string) => {
    setActiveFilters(prev => prev.filter(f => f.property !== propertyToRemove));
  };

  const handleClearFilters = () => {
    setSelectedValues([]);
    setActiveFilters([]);
    setFilterAnchorEl(null);
    setHoveredProperty(null);
    setSubMenuAnchorEl(null);
    setFilterText('');
    setIsFilterExpanded(true);
  };

  return (
    <>
      {/* Filter Bar */}
      <Collapse in={isFilterExpanded} timeout={300}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          ...(variant === 'classic'
            ? { padding: '8px 16px 8px 10px', border: '1px solid #DADCE0', borderTopRightRadius: '8px', borderTopLeftRadius: '8px', backgroundColor: '#FFFFFF', margin: '6px 0px 0px 0px', borderBottom: 'none' }
            : { padding: '0px', backgroundColor: '#FFFFFF' }),
        }}>
          {/* Filter Header */}
          <Box ref={filterBarRef} sx={variant === 'classic'
            ? { display: 'flex', alignItems: 'center', gap: '4px', height: '19px' }
            : { display: 'flex', alignItems: 'center', gap: '12px', height: '32px', border: '1px solid #DADCE0', borderRadius: '54px', padding: '8px 4px 8px 2px', boxSizing: 'border-box', width: '280px', minWidth: '280px', marginLeft: '20px' }
          }>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Tooltip title="Filter by selecting property and values" slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -4] } }] } }}>
                <IconButton
                  size="small"
                  onClick={handleFilterClick}
                  sx={{
                    padding: '4px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    '&:hover': {
                      backgroundColor: '#E8F4FF'
                    }
                  }}
                >
                  <FilterList sx={{ fontSize: '20px', color: '#1f1f1f' }} />
                </IconButton>
              </Tooltip>
              <Typography
                {...(variant === 'classic' ? { variant: 'heading2Medium' as any } : {})}
                sx={{
                  fontFamily: 'Google Sans Text, sans-serif',
                  fontWeight: 500,
                  fontSize: '12px',
                  lineHeight: '1.67em',
                  color: '#1F1F1F',
                }}
              >
                Filter
              </Typography>
            </Box>
            <TextField
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Enter property name or value"
              variant="outlined"
              size="small"
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  fontSize: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  '& fieldset': {
                    border: 'none'
                  },
                  '&:hover fieldset': {
                    border: 'none'
                  },
                  '&.Mui-focused fieldset': {
                    border: 'none'
                  }
                },
                '& .MuiInputBase-input': {
                  padding: '4px 4px',
                  fontSize: '12px',
                  color: '#1F1F1F'
                },
                '& .MuiInputBase-input::placeholder': {
                  ...(variant === 'classic'
                    ? { color: '#575757', opacity: 1 }
                    : { color: '#5E5E5E', opacity: 1, fontFamily: '"Google Sans", sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '16px', letterSpacing: '0.1px' }),
                }
              }}
              InputProps={{
                endAdornment: filterText && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setFilterText('')}
                      sx={{ padding: '2px' }}
                    >
                      <Close sx={{ fontSize: '14px' }} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            {activeFilters.length > 0 && (
              <Button
                onClick={handleClearFilters}
                sx={{
                  fontSize: '11px',
                  color: '#0B57D0',
                  textTransform: 'none',
                  padding: '2px 8px',
                  minWidth: 'auto',
                  marginLeft: '-20px',
                  '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
                }}
              >
                Clear All
              </Button>
            )}
          </Box>

          {/* Active Filter Chips */}
          {activeFilters.length > 0 && (
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              paddingTop: '4px',
              marginLeft: variant === 'pill' ? '20px' : '0px'
            }}>
              {activeFilters.map((filter) => (
                <Box
                  key={filter.property}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    backgroundColor: '#E7F0FE',
                    border: '1px solid #022FCD',
                    borderRadius: '16px',
                    fontSize: '11px'
                  }}
                >
                  <Typography sx={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#022FCD'
                  }}>
                    {filter.property}:
                  </Typography>
                  <Typography sx={{
                    fontSize: '12px',
                    color: '#1F1F1F'
                  }}>
                    {filter.values.join(', ')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFilter(filter.property)}
                    sx={{
                      padding: '2px',
                      width: '16px',
                      height: '16px',
                      color: '#022FCD',
                      '&:hover': {
                        backgroundColor: '#D93025',
                        color: '#FFFFFF'
                      }
                    }}
                  >
                    <Box sx={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      lineHeight: 1
                    }}>
                      ×
                    </Box>
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Level 1: Property List Dropdown */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            'aria-hidden': !Boolean(filterAnchorEl) ? 'true' : undefined,
            style: {
              width: filterBarRef.current ? `${filterBarRef.current.offsetWidth}px` : '350px',
              minWidth: filterBarRef.current ? `${filterBarRef.current.offsetWidth}px` : '350px',
              maxWidth: 'none',
              backgroundColor: '#FFFFFF',
              boxShadow: '0px 2px 8.4px rgba(0, 0, 0, 0.15)',
              borderRadius: '12px',
              padding: '0px',
              marginTop: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
            },
          }
        }}
        MenuListProps={{ disablePadding: true }}
      >
        {columns
          .filter(property =>
            data.some(row => row && row[property] != null && resolveValue(row[property]).trim() !== '')
          )
          .map((property) => {
            const isActive = activeFilters.some(f => f.property === property);
            const isHovered = hoveredProperty === property;
            return (
              <MenuItem
                key={property}
                onMouseEnter={(e) => handlePropertyMouseEnter(property, e)}
                onMouseLeave={handlePropertyMouseLeave}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '8px 12px',
                  gap: '12px',
                  height: '45px',
                  minHeight: '45px',
                  backgroundColor: isActive || isHovered ? '#EDF2FC' : 'transparent',
                  '&:hover': { backgroundColor: '#EDF2FC' },
                  '&:first-of-type': { borderRadius: '12px 12px 0 0' },
                  '&:last-of-type': { borderRadius: '0 0 12px 12px' },
                }}
              >
                <ListItemText
                  primary={
                    <OverflowTooltip text={property}>
                      <Typography
                        sx={{
                          fontFamily: 'Google Sans, sans-serif',
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '0.25px',
                          color: '#44464F',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {property}
                      </Typography>
                    </OverflowTooltip>
                  }
                />
                <KeyboardArrowRight sx={{ fontSize: '18px', color: '#44464F', marginLeft: 'auto', flexShrink: 0 }} />
              </MenuItem>
            );
          })}
      </Menu>

      {/* Level 2: Value Checkboxes Sub-Menu */}
      <Menu
        anchorEl={subMenuAnchorEl}
        open={Boolean(subMenuAnchorEl) && Boolean(hoveredProperty)}
        onClose={() => { setHoveredProperty(null); setSubMenuAnchorEl(null); }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        sx={{ pointerEvents: 'none' }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          onMouseEnter: handleSubMenuMouseEnter,
          onMouseLeave: handleSubMenuMouseLeave,
          sx: {
            pointerEvents: 'auto',
            width: '281px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0px 2px 8.4px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px',
            padding: '0px',
            maxHeight: '300px',
            overflowY: 'auto',
          }
        }}
        MenuListProps={{ disablePadding: true }}
      >
        {hoveredProperty && getPropertyValues(hoveredProperty).map((value) => (
          <MenuItem
            key={value}
            onClick={() => handleValueToggle(value)}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '8px 12px',
              gap: '12px',
              height: '45px',
              minHeight: '45px',
              '&:hover': { backgroundColor: '#EDF2FC' },
            }}
          >
            <Checkbox
              checked={selectedValues.includes(value)}
              size="small"
              sx={{
                padding: 0,
                '&.Mui-checked': { color: '#022FCD' },
              }}
            />
            <ListItemText
              primary={
                <OverflowTooltip text={value}>
                  <Typography
                    sx={{
                      fontFamily: 'Roboto, sans-serif',
                      fontSize: '14px',
                      lineHeight: '20px',
                      letterSpacing: '0.25px',
                      color: '#44464F',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {value}
                  </Typography>
                </OverflowTooltip>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default TableFilter;
