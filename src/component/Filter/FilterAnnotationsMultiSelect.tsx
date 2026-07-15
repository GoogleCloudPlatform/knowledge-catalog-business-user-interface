import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import {
  Box,
  Typography,
  Button,
  TextField,
  Tooltip
} from '@mui/material';
import { Search, Close, Check, Remove } from '@mui/icons-material';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import { useSelector } from 'react-redux';

/**
 * @file FilterAnnotationsMultiSelect.tsx
 * @description
 * This component renders a modal-like pop-up for multi-selecting filter options,
 * specifically designed for annotations.
 *
 * It features a two-panel layout:
 * 1.  **Left Panel (Browse):** Displays all available `options`. It includes a
 * search bar to filter the list and a "Select All" checkbox that
 * selects/deselects all *filtered* options.
 * 2.  **Right Panel (Selected):** Displays only the items currently present in the
 * `value` array. It shows a count of selected items and provides a
 * "Clear All" button.
 *
 * The component's visibility is controlled by the `isOpen` prop. It can be closed
 * by clicking the 'Apply' button, the 'X' icon, or by clicking outside the
 * component's boundaries. The `onChange` callback is only invoked when 'Apply'
 * is clicked — toggling checkboxes updates local state only.
 *
 * @param {FilterAnnotationsMultiSelectProps} props - The props for the component.
 * @param {string[]} [props.options=[]] - The complete list of available string
 * options to display in the filter.
 * @param {string[]} [props.value=[]] - The array of currently selected option strings.
 * @param {(value: string[]) => void} props.onChange - Callback function invoked with
 * the new array of selected values when the user clicks 'Apply'.
 * @param {() => void} props.onClose - Callback function invoked when the user
 * clicks 'Apply', the 'Close' icon, or outside the component.
 * @param {boolean} props.isOpen - Controls whether the component is visible.
 * @param {string} [props.filterType='Annotations'] - (Optional) The string to
 * display as the title in the component's header.
 * @param {{ top: number; left: number } | null} [props.position=null] - (Optional)
 * An object with `top` and `left` coordinates for fixed positioning of the pop-up.
 *
 * @returns {React.ReactElement | null} A React element representing the filter
 * pop-up, or `null` if `isOpen` is false.
 */

interface FilterAnnotationsMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  onClose: () => void;
  isOpen: boolean;
  filterType?: string;
  position?: { top: number; left: number } | null;
  onEditNote?: (optionName: string, iconTop: number, modalRight: number) => void;
}

const FilterAnnotationsMultiSelect: React.FC<FilterAnnotationsMultiSelectProps> = ({
  options = [],
  value = [],
  onChange,
  onClose,
  isOpen,
  filterType = 'Annotations',
  position = null,
  onEditNote
}) => {
  const mode = useSelector((state: any) => state.user.mode) as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [localValue, setLocalValue] = useState<string[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Sync local state when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!debouncedSearch) return options;
    return options.filter((option: string) =>
      option.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [options, debouncedSearch]);

  const handleToggleOption = (option: string) => {
    setLocalValue(prev =>
      prev.includes(option)
        ? prev.filter(item => item !== option)
        : [...prev, option]
    );
  };

  const handleClearAll = () => {
    setLocalValue([]);
  };

  const handleSelectAll = () => {
    if (localValue.length === filteredOptions.length) {
      setLocalValue([]);
    } else {
      setLocalValue([...filteredOptions]);
    }
  };

  const handleApply = () => {
    onChange(localValue);
    onClose();
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        // Don't close if clicking inside the sub-annotations panel
        const subPanel = document.querySelector('[data-sub-annotations-panel]');
        if (subPanel && subPanel.contains(target)) return;
        // Don't close if clicking inside a MUI popover/menu (rendered in portal)
        const popover = (target as Element).closest?.('.MuiPopover-root, .MuiModal-root');
        if (popover) return;
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isAllSelected = filteredOptions.length > 0 && localValue.length === filteredOptions.length;
  const isIndeterminate = localValue.length > 0 && localValue.length < filteredOptions.length;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        top: position ? `${position.top}px` : '6.25rem',
        left: position ? `${position.left}px` : '13.75rem',
        zIndex: 1300,
        backgroundColor: mode === 'dark' ? '#282a2c' : '#FFFFFF',
        borderRadius: '1rem',
        boxShadow: mode === 'dark'
          ? '0px 1px 3px 0px rgba(0, 0, 0, 0.5), 0px 4px 8px 3px rgba(0, 0, 0, 0.3)'
          : '0px 1px 3px 0px rgba(60, 64, 67, 0.3), 0px 4px 8px 3px rgba(60, 64, 67, 0.15)',
        width: '44rem',
        height: '21.3125rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          borderBottom: `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}`,
          flex: '0 0 auto'
        }}
      >
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: '1rem',
            lineHeight: 1.5,
            color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
            flex: '0 1 auto'
          }}
        >
          {filterType}
        </Typography>
        <Button
          onClick={onClose}
          sx={{
            minWidth: 'auto',
            padding: 0,
            color: mode === 'dark' ? '#9aa0a6' : '#1F1F1F',
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            flex: '0 0 auto',
            '&:hover': {
              backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <Close sx={{ fontSize: '1.25rem' }} />
        </Button>
      </Box>

      {/* Main Content - Two Panels */}
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
          overflow: 'hidden'
        }}
      >
        {/* Left Panel - Browse Options */}
        <Box
          sx={{
            flex: '1 1 auto',
            borderRight: `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}`,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Search Bar with Select All Checkbox */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0 0.75rem 0 1.125rem',
              height: '2.5rem',
              borderBottom: `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}`,
              flexShrink: 0,
              flex: '0 0 auto'
            }}
          >
            <Tooltip title="Select all" arrow>
              {isAllSelected ? (
                <Box
                  data-testid="select-all-checkbox"
                  sx={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginRight: '8px',
                    flexShrink: 0
                  }}
                  onClick={handleSelectAll}
                >
                  <Check sx={{ fontSize: '14px', color: mode === 'dark' ? '#1e1f20' : '#FFFFFF' }} />
                </Box>
              ) : isIndeterminate ? (
                <Box
                  data-testid="select-all-checkbox"
                  sx={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginRight: '8px',
                    flexShrink: 0
                  }}
                  onClick={handleSelectAll}
                >
                  <Remove sx={{ fontSize: '14px', color: mode === 'dark' ? '#1e1f20' : '#FFFFFF' }} />
                </Box>
              ) : (
                <Box
                  data-testid="select-all-checkbox"
                  sx={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `2px solid ${mode === 'dark' ? '#9aa0a6' : '#575757'}`,
                    cursor: 'pointer',
                    marginRight: '8px',
                    flexShrink: 0
                  }}
                  onClick={handleSelectAll}
                />
              )}
            </Tooltip>
            <Search sx={{ color: mode === 'dark' ? '#9aa0a6' : '#1F1F1F', fontSize: '16px' }} />
            <TextField
              placeholder={`Search for ${filterType.toLowerCase()}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="standard"
              fullWidth
              sx={{
                '& .MuiInput-root': {
                  fontSize: '0.75rem',
                  color: mode === 'dark' ? '#9aa0a6' : '#575757',
                  fontFamily: '"Google Sans Text", sans-serif',
                  '&:before': { borderBottom: 'none' },
                  '&:after': { borderBottom: 'none' },
                  '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                },
                '& .MuiInput-input': {
                  padding: 0,
                  fontSize: '0.75rem',
                  color: mode === 'dark' ? '#e3e3e3' : '#575757',
                  fontFamily: '"Google Sans Text", sans-serif',
                  fontWeight: 400,
                  lineHeight: 1.33,
                  letterSpacing: '0.83px',
                  flex: '1 1 auto'
                },
                '& .MuiInput-input::placeholder': {
                  color: mode === 'dark' ? '#9aa0a6' : '#575757',
                  opacity: 1,
                  fontFamily: '"Google Sans Text", sans-serif',
                  fontWeight: 400,
                },
              }}
            />
          </Box>

          {/* Options List */}
          <Box
            sx={{
              flex: 1,
              overflow: 'hidden',
              backgroundColor: 'transparent',
            }}
          >
            {filteredOptions.length > 0 ? (
              <Virtuoso
                style={{ height: '100%', width: '100%' }}
                totalCount={filteredOptions.length}
                itemContent={(index) => {
                  const option = filteredOptions[index];
                  return (
                    <Box
                      key={option}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        width: '100%',
                        cursor: 'pointer',
                        padding: '4px 18px',
                      }}
                      onClick={() => handleToggleOption(option)}
                    >
                      {localValue.includes(option) ? (
                        <Box
                          sx={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOption(option);
                          }}
                        >
                          <Check sx={{ fontSize: '14px', color: mode === 'dark' ? '#1e1f20' : '#FFFFFF' }} />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: `2px solid ${mode === 'dark' ? '#9aa0a6' : '#575757'}`,
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOption(option);
                          }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontWeight: 400,
                          fontSize: '12px',
                          lineHeight: '1.3333333333333333em',
                          letterSpacing: '0.8333333457509676%',
                          color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                          flex: 1,
                        }}
                      >
                        {option}
                      </Typography>
                      {filterType === 'Aspects' && (<EditNoteOutlinedIcon
                        sx={{ fontSize: '20px', color: mode === 'dark' ? '#9aa0a6' : '#575757', cursor: 'pointer', flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const iconRect = e.currentTarget.getBoundingClientRect();
                          const modalRect = containerRef.current?.getBoundingClientRect();
                          onEditNote?.(option, iconRect.top, modalRect?.right ?? iconRect.right);
                        }}
                      />)}
                    </Box>
                  );
                }}
              />
            ) : (
              <Typography
                sx={{
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '1.3333333333333333em',
                  color: mode === 'dark' ? '#9aa0a6' : '#0C1226CC',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                No {`${filterType.toLowerCase()}`} found
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right Panel - Selected Items */}
        <Box
          sx={{
            width: '352px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Selected Count and Clear All Button */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 16px',
              height: '2.5rem',
              borderBottom: `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}`,
              flexShrink: 0
            }}
          >
            <Typography
              sx={{
                fontWeight: 400,
                fontSize: '12px',
                lineHeight: '1.3333333333333333em',
                color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F'
              }}
            >
              {localValue.length} Selected
            </Typography>
            <Button
              onClick={handleClearAll}
              disabled={localValue.length === 0}
              sx={{
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '1.3333333333333333em',
                color: localValue.length > 0 ? (mode === 'dark' ? '#8ab4f8' : '#022FCD') : (mode === 'dark' ? '#5f6368' : '#9AA0A6'),
                textTransform: 'none',
                padding: '0',
                minWidth: 'auto',
                '&:hover': {
                  backgroundColor: 'transparent',
                },
                '&:disabled': {
                  color: mode === 'dark' ? '#5f6368' : '#9AA0A6',
                },
              }}
            >
              Clear All
            </Button>
          </Box>

          {/* Selected Items List */}
          <Box
            sx={{
              flex: 1,
              overflow: 'hidden',
              backgroundColor: 'transparent',
            }}
          >
            {localValue.length > 0 ? (
              <Virtuoso
                style={{ height: '100%', width: '100%' }}
                totalCount={localValue.length}
                itemContent={(index) => {
                  const selectedOption = localValue[index];
                  return (
                    <Box
                      key={selectedOption}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        width: '100%',
                        padding: '4px 18px'
                      }}
                    >
                      <Box
                        sx={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleOption(selectedOption);
                        }}
                      >
                        <Check sx={{ fontSize: '14px', color: mode === 'dark' ? '#1e1f20' : '#FFFFFF' }} />
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 400,
                          fontSize: '12px',
                          lineHeight: '1.3333333333333333em',
                          color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                          flex: 1,
                        }}
                      >
                        {selectedOption}
                      </Typography>
                    </Box>
                  );
                }}
              />
            ) : (
              <Typography
                sx={{
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '1.3333333333333333em',
                  color: mode === 'dark' ? '#9aa0a6' : '#0C1226CC',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                No items selected
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Footer with Apply Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '8px',
          borderTop: `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}`,
          flex: '0 0 auto'
        }}
      >
        <Button
          onClick={handleApply}
          sx={{
            backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
            color: mode === 'dark' ? '#1e1f20' : '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'none',
            padding: '0.5rem 1.5rem',
            minWidth: 'auto',
            borderRadius: '1.5rem',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#6b9ef5' : '#0B4BA8',
              boxShadow: 'none',
            },
          }}
        >
          Apply
        </Button>
      </Box>
    </Box>
  );
};

export default FilterAnnotationsMultiSelect;
