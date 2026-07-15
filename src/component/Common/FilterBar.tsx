import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  Checkbox,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { FilterList, Close, KeyboardArrowRight } from '@mui/icons-material';
import OverflowTooltip from './OverflowTooltip';

export interface PropertyConfig {
  name: string;
  mode: 'text' | 'dropdown' | 'both';
  hint?: string;
  type?: 'text' | 'date';
}

export interface ActiveFilter {
  id?: string;
  property: string;
  values: string[];
  isOr?: boolean;
}

interface FilterBarProps {
  /** Current search text (controlled) */
  filterText: string;
  onFilterTextChange: (text: string) => void;

  /** Filter property configuration — string[] defaults to dropdown mode */
  propertyNames: string[] | PropertyConfig[];

  /** Get values for dropdown-mode properties. Optional if all properties are text-mode. */
  getPropertyValues?: (property: string) => string[];

  /** Active filters (controlled) */
  activeFilters: ActiveFilter[];
  onActiveFiltersChange: (filters: ActiveFilter[]) => void;

  /** Optional callback when clear all is triggered (for parent-side cleanup) */
  onClearAll?: () => void;

  /** Layout */
  isPreview?: boolean;
  sx?: any;
  placeholder?: string;
  endContent?: React.ReactNode;
  marginLeft?: string;
  filterTooltip?: string;

  /** Default property for text input when user presses Enter without selecting a field */
  defaultProperty?: string;

  /** When true, chips are not rendered inside FilterBar (render them externally via FilterBarChips) */
  hideChips?: boolean;

  /** When true, text-only properties appear in the filter icon dropdown menu (default: false) */
  showTextInFilterMenu?: boolean;
}

// Standalone chips component for rendering filter chips outside of FilterBar
export const FilterBarChips: React.FC<{
  activeFilters: ActiveFilter[];
  onRemoveFilter: (filter: ActiveFilter) => void;
  onRemoveOrConnector?: (filter: ActiveFilter) => void;
  marginLeft?: string;
}> = ({ activeFilters, onRemoveFilter, onRemoveOrConnector, marginLeft }) => {
  if (activeFilters.length === 0) return null;
  return (
    <Box sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '8px',
      paddingTop: '4px',
      marginLeft: marginLeft ?? '0px',
      width: '100%',
    }}>
      {activeFilters.map((filter, index) => (
        <React.Fragment key={filter.id || filter.property}>
          {filter.isOr && index > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#E7F0FE',
                borderRadius: '25px',
                padding: '2px 3px 2px 8px',
                gap: '4px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '11px',
                  lineHeight: '16px',
                  letterSpacing: '0.1px',
                  color: '#0B57D0',
                }}
              >
                OR
              </Typography>
              <IconButton
                size="small"
                onClick={() => onRemoveOrConnector ? onRemoveOrConnector(filter) : onRemoveFilter(filter)}
                sx={{
                  width: 14,
                  height: 14,
                  backgroundColor: '#0B57D0',
                  borderRadius: '50%',
                  padding: 0,
                  '&:hover': {
                    backgroundColor: '#0842A0',
                  },
                }}
              >
                <Close sx={{ fontSize: 10, color: '#FFFFFF' }} />
              </IconButton>
            </Box>
          )}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#E7F0FE',
              borderRadius: '25px',
              padding: '2px 3px 2px 8px',
              gap: '4px',
              maxWidth: '250px',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {filter.property && (
              <Typography
                sx={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: '11px',
                  lineHeight: '16px',
                  letterSpacing: '0.1px',
                  color: '#0B57D0',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {filter.property}:
              </Typography>
            )}
            <OverflowTooltip text={filter.values.join(', ')}>
              <Typography
                sx={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '11px',
                  lineHeight: '16px',
                  letterSpacing: '0.1px',
                  color: '#0B57D0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {filter.values.join(', ')}
              </Typography>
            </OverflowTooltip>
            <IconButton
              size="small"
              onClick={() => onRemoveFilter(filter)}
              sx={{
                width: 14,
                height: 14,
                backgroundColor: '#0B57D0',
                borderRadius: '50%',
                padding: 0,
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: '#0842A0',
                },
              }}
            >
              <Close sx={{ fontSize: 10, color: '#FFFFFF' }} />
            </IconButton>
          </Box>
        </React.Fragment>
      ))}
    </Box>
  );
};

// Normalize propertyNames to PropertyConfig[]
const normalizeProperties = (propertyNames: string[] | PropertyConfig[]): PropertyConfig[] => {
  if (propertyNames.length === 0) return [];
  if (typeof propertyNames[0] === 'string') {
    return (propertyNames as string[]).map(name => ({ name, mode: 'dropdown' as const }));
  }
  return propertyNames as PropertyConfig[];
};

const FilterBar: React.FC<FilterBarProps> = ({
  filterText,
  onFilterTextChange,
  propertyNames,
  getPropertyValues,
  activeFilters,
  onActiveFiltersChange,
  onClearAll,
  isPreview = false,
  sx,
  placeholder = 'Enter property name or value',
  endContent,
  marginLeft,
  filterTooltip = 'Filter by selecting property and values',
  hideChips = false,
  showTextInFilterMenu = false,
}) => {
  const properties = normalizeProperties(propertyNames);

  // Internal menu state (for dropdown-mode properties)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Text-input mode state
  const [selectedTextProperty, setSelectedTextProperty] = useState<string | null>(null);
  const [isOrMode, setIsOrMode] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [menuTrigger, setMenuTrigger] = useState<'filter' | 'search' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputError, setInputError] = useState("");

  const isValidDate = (value: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };

  const hasFilters = activeFilters.length > 0;

  // Focus management for accessibility
  useEffect(() => {
    if (menuAnchorEl) {
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
  }, [menuAnchorEl]);

  // Cleanup hover timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Check if any text-mode properties exist
  const hasTextProperties = properties.some(p => p.mode === 'text' || p.mode === 'both');

  // Get property mode
  const getPropertyMode = (name: string): 'text' | 'dropdown' | 'both' => {
    const prop = properties.find(p => p.name === name);
    return prop?.mode ?? 'dropdown';
  };

  // Menu handlers
  const openMenuAndFocusInput = () => {
    setMenuAnchorEl(filterBarRef.current);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleFilterIconClick = () => {
    setMenuTrigger('filter');
    openMenuAndFocusInput();
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuTrigger(null);
    setHoveredProperty(null);
    setSubMenuAnchorEl(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handlePropertyClick = (property: string) => {
    const mode = getPropertyMode(property);
    if (menuTrigger === 'search' || mode === 'text') {
      // Search bar trigger: all properties act as text-input
      // Filter icon trigger: only pure text-mode properties enter text mode on click
      setSelectedTextProperty(property);
      handleMenuClose();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    // Filter icon + dropdown/both: handled by hover, click does nothing
  };

  const handlePropertyMouseEnter = (property: string, event: React.MouseEvent<HTMLElement>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const mode = getPropertyMode(property);
    if (menuTrigger === 'filter' && (mode === 'dropdown' || mode === 'both')) {
      // Only show value submenu when opened via filter icon
      setHoveredProperty(property);
      setSubMenuAnchorEl(event.currentTarget);
      const existingFilter = activeFilters.find(f => f.property === property && !f.id);
      setSelectedValues(existingFilter ? existingFilter.values : []);
    } else {
      // For text properties or search bar trigger, close any open sub-menu
      setHoveredProperty(null);
      setSubMenuAnchorEl(null);
    }
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
    if (hoveredProperty) {
      if (isOrMode) {
        // OR mode: create a new separate filter entry with isOr flag
        const newSelectedValues = selectedValues.includes(value)
          ? selectedValues.filter(v => v !== value)
          : [...selectedValues, value];
        setSelectedValues(newSelectedValues);

        // Find the OR filter we're building (last filter with isOr for this property that has an id)
        let orFilterIndex = -1;
        for (let i = activeFilters.length - 1; i >= 0; i--) {
          if (activeFilters[i].property === hoveredProperty && activeFilters[i].id && activeFilters[i].isOr) {
            orFilterIndex = i;
            break;
          }
        }

        let newFilters: ActiveFilter[];
        if (newSelectedValues.length > 0) {
          if (orFilterIndex >= 0) {
            newFilters = activeFilters.map((filter, index) =>
              index === orFilterIndex ? { ...filter, values: newSelectedValues } : filter
            );
          } else {
            newFilters = [...activeFilters, {
              id: `${hoveredProperty}-or-${Date.now()}`,
              property: hoveredProperty,
              values: newSelectedValues,
              isOr: true,
            }];
          }
        } else {
          if (orFilterIndex >= 0) {
            newFilters = activeFilters.filter((_, index) => index !== orFilterIndex);
          } else {
            newFilters = activeFilters;
          }
        }
        onActiveFiltersChange(newFilters);
      } else {
        // Normal mode: merge into existing filter for this property
        const newSelectedValues = selectedValues.includes(value)
          ? selectedValues.filter(v => v !== value)
          : [...selectedValues, value];
        setSelectedValues(newSelectedValues);

        let newFilters: ActiveFilter[];
        if (newSelectedValues.length > 0) {
          const existingIndex = activeFilters.findIndex(f => f.property === hoveredProperty && !f.id);
          if (existingIndex >= 0) {
            newFilters = activeFilters.map((filter, index) =>
              index === existingIndex ? { ...filter, values: newSelectedValues } : filter
            );
          } else {
            newFilters = [...activeFilters, { property: hoveredProperty, values: newSelectedValues }];
          }
        } else {
          newFilters = activeFilters.filter(f => !(f.property === hoveredProperty && !f.id));
        }
        onActiveFiltersChange(newFilters);
      }
    }
  };

  const handleRemoveFilter = (filter: ActiveFilter) => {
    if (filter.id) {
      // Text-mode chip: remove by id
      onActiveFiltersChange(activeFilters.filter(f => f.id !== filter.id));
    } else {
      // Dropdown-mode chip: remove by property
      onActiveFiltersChange(activeFilters.filter(f => f.property !== filter.property || f.id));
    }
  };

  const handleClearAll = () => {
    setSelectedValues([]);
    setMenuAnchorEl(null);
    setHoveredProperty(null);
    setSubMenuAnchorEl(null);
    setSelectedTextProperty(null);
    setIsOrMode(false);
    onActiveFiltersChange([]);
    onFilterTextChange('');
    onClearAll?.();
  };

  // Handle OR selection from dropdown
  const handleOrSelect = () => {
    setIsOrMode(true);
    // Keep dropdown open to show property options
  };

  // Get the default text property (first text-mode property, used when Enter is pressed without selecting a field)
  // Handle text input keydown (Enter to create chip, Backspace to remove prefix/last chip)
  const handleTextKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasTextProperties) return;

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = filterText.trim();
      if (!value) return;

      if (selectedTextProperty) {
        const propConfig = properties.find(p => p.name === selectedTextProperty);
        if (propConfig?.type === 'date' && !isValidDate(value)) {
          setInputError("Invalid date. Please use YYYY-MM-DD format.");
          return;
        }
      }

      // Use selectedTextProperty if explicitly chosen, otherwise global search (no key)
      const property = selectedTextProperty ?? '';
      const newChip: ActiveFilter = {
        id: `${property || 'global'}-${Date.now()}`,
        property,
        values: [value],
        isOr: isOrMode && hasFilters,
      };
      onActiveFiltersChange([...activeFilters, newChip]);
      onFilterTextChange('');
      setSelectedTextProperty(null);
      setIsOrMode(false);
    } else if (e.key === 'Backspace' && !filterText) {
      if (selectedTextProperty) {
        setSelectedTextProperty(null);
      } else if (isOrMode) {
        setIsOrMode(false);
      } else if (activeFilters.length > 0) {
        // Remove last chip
        onActiveFiltersChange(activeFilters.slice(0, -1));
      }
    } else if (e.key === 'Escape') {
      setMenuAnchorEl(null);
      setSelectedTextProperty(null);
      setIsOrMode(false);
    }
  }, [filterText, selectedTextProperty, isOrMode, hasFilters, activeFilters, hasTextProperties, onActiveFiltersChange, onFilterTextChange]);

  // Compute placeholder
  const getEffectivePlaceholder = () => {
    if (selectedTextProperty) {
      return `Enter ${selectedTextProperty} value...`;
    }
    if (isOrMode) {
      return 'Select field for OR filter...';
    }
    return placeholder;
  };

  // Get tooltip hint for the selected property (e.g., date format)
  const getInputTooltip = () => {
    if (selectedTextProperty) {
      const prop = properties.find(p => p.name === selectedTextProperty);
      if (prop?.hint) return prop.hint;
    }
    return '';
  };

  // Filter property names to only show those with values (dropdown/both) or always show (text)
  const visibleProperties = properties.filter(prop => {
    // When opened via filter icon, hide text-only properties unless opted in
    if (menuTrigger === 'filter' && !showTextInFilterMenu && prop.mode === 'text') {
      return false;
    }
    // When opened via search bar, hide dropdown-only properties (they are categorical only)
    if (menuTrigger === 'search' && prop.mode === 'dropdown') {
      return false;
    }
    if (prop.mode === 'text') return true;
    if (!getPropertyValues) return prop.mode !== 'dropdown';
    const values = getPropertyValues(prop.name);
    return values.length > 0;
  });

  return (
    <>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '0px',
        backgroundColor: '##F4F5FA',
        ...(isPreview ? { flex: 1, minWidth: 0 } : { width: '100%' }),
        ...sx
      }}>
        {/* Filter Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: marginLeft ?? (isPreview ? '0px' : '20px') }}>
          {/* Pill-shaped filter bar */}
          <Box
            ref={filterBarRef}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '32px',
              backgroundColor: '#FFFFFF',
              border: (isFocused || hasFilters || selectedTextProperty)
                ? '1px solid #022FCD'
                : '1px solid #C8CEE0',
              borderRadius: '54px',
              padding: '8px 4px 8px 2px',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
              '&:hover': {
                borderColor: '#022FCD',
              },
              ...(isPreview
                ? { flex: 1, minWidth: 0 }
                : { width: '280px', minWidth: '280px' }),
            }}
          >
            <Tooltip title={filterTooltip} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -4] } }] } }}>
              <IconButton
                size="small"
                onClick={handleFilterIconClick}
                sx={{
                  padding: '4px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  '&:hover': { backgroundColor: '#E8F4FF' }
                }}
              >
                <FilterList sx={{ fontSize: '20px', color: '#1F1F1F' }} />
              </IconButton>
            </Tooltip>
            {isOrMode && (
              <Box
                component="span"
                sx={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: '11px',
                  lineHeight: '16px',
                  color: '#FFFFFF',
                  backgroundColor: '#0B57D0',
                  borderRadius: '4px',
                  px: 0.75,
                  py: 0.25,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                OR
              </Box>
            )}
            {selectedTextProperty && (
              <Box
                component="span"
                sx={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#1F1F1F',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {selectedTextProperty}:
              </Box>
            )}
            <Tooltip title={getInputTooltip()} placement="bottom" open={!!getInputTooltip() && isFocused} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
              <TextField
                inputRef={inputRef}
                value={filterText}
                onChange={(e) => {
                  onFilterTextChange(e.target.value);
                  if (inputError) setInputError("");
                }}
                onKeyDown={handleTextKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onClick={() => {
                  if (!selectedTextProperty && !menuAnchorEl) {
                    setMenuTrigger('search');
                    openMenuAndFocusInput();
                  }
                }}
                placeholder={getEffectivePlaceholder()}
                variant="outlined"
                size="small"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                  },
                  '& .MuiInputBase-input': {
                    padding: '4px 4px',
                    fontSize: '12px',
                    color: '#1F1F1F',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: '#5E5E5E',
                    opacity: 1,
                    fontFamily: '"Google Sans", sans-serif',
                    fontWeight: 400,
                    fontSize: '12px',
                    lineHeight: '16px',
                    letterSpacing: '0.1px',
                    textOverflow: 'ellipsis',
                  },
                }}
                inputProps={{
                  maxLength: 1024,
                }}
                InputProps={{
                  endAdornment: filterText ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => onFilterTextChange('')}
                        sx={{ padding: '2px' }}
                      >
                        <Close sx={{ fontSize: '14px' }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
              />
            </Tooltip>
            {activeFilters.length > 0 && (
              <Button
                onClick={handleClearAll}
                sx={{
                  fontSize: '11px',
                  color: '#0B57D0',
                  textTransform: 'none',
                  padding: '2px 8px',
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
                }}
              >
                Clear All
              </Button>
            )}
          </Box>
          {/* Optional end content (e.g., expand/collapse button) */}
          {endContent}
        </Box>
          {inputError && (
          <Typography
            sx={{
              fontFamily: "'Google Sans', sans-serif",
              fontSize: "11px",
              color: "#D93025",
              marginLeft: marginLeft ?? (isPreview ? '10px' : '25px'),
              marginTop: "-4px", 
            }}
          >
            {inputError}
          </Typography>
        )}

        {/* Active Filter Chips */}
        {!hideChips && activeFilters.length > 0 && (
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '4px',
            marginLeft: marginLeft ?? (isPreview ? '0px' : '20px'),
          }}>
            {activeFilters.map((filter, index) => (
              <React.Fragment key={filter.id || filter.property}>
                {/* OR separator */}
                {filter.isOr && index > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#E7F0FE',
                      borderRadius: '25px',
                      padding: '2px 3px 2px 8px',
                      gap: '4px',
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: "'Google Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: '11px',
                        lineHeight: '16px',
                        letterSpacing: '0.1px',
                        color: '#0B57D0',
                      }}
                    >
                      OR
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        // Remove OR connector only, keep the filter as AND
                        onActiveFiltersChange(activeFilters.map(f =>
                          f.id === filter.id ? { ...f, isOr: false } : f
                        ));
                      }}
                      sx={{
                        width: 14,
                        height: 14,
                        backgroundColor: '#0B57D0',
                        borderRadius: '50%',
                        padding: 0,
                        '&:hover': {
                          backgroundColor: '#0842A0',
                        },
                      }}
                    >
                      <Close sx={{ fontSize: 10, color: '#FFFFFF' }} />
                    </IconButton>
                  </Box>
                )}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#E7F0FE',
                    borderRadius: '25px',
                    padding: '2px 3px 2px 8px',
                    gap: '4px',
                    maxWidth: '250px',
                    overflow: 'hidden',
                    minWidth: 0,
                  }}
                >
                  {filter.property && (
                    <Typography
                      sx={{
                        fontFamily: "'Google Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: '11px',
                        lineHeight: '16px',
                        letterSpacing: '0.1px',
                        color: '#0B57D0',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {filter.property}:
                    </Typography>
                  )}
                  <OverflowTooltip text={filter.values.join(', ')}>
                    <Typography
                      sx={{
                        fontFamily: "'Google Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: '11px',
                        lineHeight: '16px',
                        letterSpacing: '0.1px',
                        color: '#0B57D0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {filter.values.join(', ')}
                    </Typography>
                  </OverflowTooltip>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFilter(filter)}
                    sx={{
                      width: 14,
                      height: 14,
                      backgroundColor: '#0B57D0',
                      borderRadius: '50%',
                      padding: 0,
                      flexShrink: 0,
                      '&:hover': {
                        backgroundColor: '#0842A0',
                      },
                    }}
                  >
                    <Close sx={{ fontSize: 10, color: '#FFFFFF' }} />
                  </IconButton>
                </Box>
              </React.Fragment>
            ))}
          </Box>
        )}
      </Box>

      {/* Level 1: Property List Dropdown */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            'aria-hidden': !Boolean(menuAnchorEl) ? 'true' : undefined,
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
        {/* OR option when filters exist */}
        {hasFilters && (
          <MenuItem
            onClick={handleOrSelect}
            sx={{
              fontFamily: "'Google Sans', sans-serif",
              fontSize: '14px',
              lineHeight: '20px',
              letterSpacing: '0.25px',
              color: '#0B57D0',
              padding: '8px 12px',
              height: '45px',
              minHeight: '45px',
              borderBottom: '1px solid #E0E0E0',
            }}
          >
            OR
          </MenuItem>
        )}
        {visibleProperties.map((prop) => {
          const isActive = activeFilters.some(f => f.property === prop.name);
          const isHovered = hoveredProperty === prop.name;
          return (
            <MenuItem
              key={prop.name}
              onClick={() => handlePropertyClick(prop.name)}
              onMouseEnter={(e) => handlePropertyMouseEnter(prop.name, e)}
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
                  <OverflowTooltip text={prop.name}>
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
                      {prop.name}
                    </Typography>
                  </OverflowTooltip>
                }
              />
              {menuTrigger === 'filter' && (prop.mode === 'dropdown' || prop.mode === 'both') && (
                <KeyboardArrowRight sx={{ fontSize: '18px', color: '#44464F', marginLeft: 'auto', flexShrink: 0 }} />
              )}
            </MenuItem>
          );
        })}
      </Menu>

      {/* Level 2: Value Checkboxes Sub-Menu (dropdown-mode properties only) */}
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
          horizontal: isPreview ? 'left' : 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: isPreview ? 'right' : 'left',
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
        {hoveredProperty && getPropertyValues && getPropertyValues(hoveredProperty).map((value) => (
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

export default FilterBar;
