import React, { useState, useMemo } from 'react';
import {
  FormControl,
  Select,
  Box,
  OutlinedInput,
  Checkbox,
  Typography,
  Button,
  TextField,
  IconButton,
  Paper,
  Tooltip
} from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { 
  KeyboardArrowDown, 
  Search, 
  Edit,
  Close
} from '@mui/icons-material';

/**
 * @file MultiSelect.tsx
 * @description
 * This component renders a highly customized multi-select dropdown input.
 *
 * Key features include:
 * 1.  **Main Selection**: A `Select` input that, when clicked, opens a large
 * two-panel modal.
 * - **Left Panel**: Shows all available `options` with a "Select All"
 * checkbox and a search bar for filtering.
 * - **Right Panel**: Shows all currently `value` (selected) items with
 * a "Clear All" button.
 * - An "OK" button confirms and closes this panel.
 * 2.  **Chip Display**: Renders the selected `value` items as a grid of
 * chips below the main input.
 * 3.  **Sub-Selection (Edit)**: Each chip has an "Edit" icon.
 * - Clicking "Edit" opens a *secondary, smaller* dropdown specific
 * to that chip.
 * - The options for this secondary dropdown are supplied by the
 * `editOptions` prop.
 * - This secondary dropdown also has its own "Select All" and search.
 * - Selections made here are stored internally and emitted via
 * `onEditSelectionsChange`.
 *
 * @param {MultiSelectProps} props - The props for the component.
 * @param {string} props.label - The text label displayed above the `Select` input.
 * @param {string} props.placeholder - Placeholder text for the `Select` input
 * when no values are selected.
 * @param {string[]} [props.options=[]] - The array of string options to display
 * in the main selection (left panel).
 * @param {string[]} [props.value=[]] - The array of currently selected main
 * options (the `value` for the `Select` input).
 * @param {(value: string[]) => void} props.onChange - Callback function invoked
 * when the main selection list (`value`) is changed.
 * @param {React.CSSProperties} [props.css={}] - (Optional) Custom CSS styles to
 * apply to the root `Box` container.
 * @param {(chipValue: string) => void} [props.onEditChip] - (Optional) A
 * callback function triggered if the user clicks "Edit" on a chip that
 * does not have corresponding entries in the `editOptions` prop.
 * @param {{ [key: string]: string[] }} [props.editOptions={}] - (Optional) An
 * object mapping a main option (chip) to its specific array of
 * sub-options for the "Edit" dropdown.
 * @param {(selections: { [key: string]: string[] }) => void} [props.onEditSelectionsChange] -
 * (Optional) Callback invoked when sub-selections in an "Edit" dropdown are
 * confirmed (by closing it). It passes the *entire* state of all
 * chip-to-sub-selection mappings.
 *
 * @returns {React.ReactElement} A React element containing the complete
 * multi-select and chip-editing UI.
 */

interface MultiSelectProps {
  label: string;
  placeholder: string; // Placeholder text for the input field   
  options: string[]; // Array of options to be displayed in the dropdown
  value: string[]; // Currently selected values 
  onChange: (value: string[]) => void; // Function to handle changes in selected values
  //onSubChange?: (value: string[]) => void; // Function to handle changes in selected values
  css?: React.CSSProperties; // Optional CSS properties for the component
  onEditChip?: (chipValue: string) => void; // Optional function to handle edit icon clicks
  editOptions?: { [key: string]: string[] }; // Options to show in edit dropdown
  onEditSelectionsChange?: (selections: { [key: string]: string[] }) => void; // Emit per-chip selections
}

const MultiSelect: React.FC<MultiSelectProps> = ({ 
  label, 
  placeholder, 
  options = [], 
  value = [], 
  onChange,
  //onSubChange,
  css = {},
  onEditChip,
  editOptions = {},
  onEditSelectionsChange
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDropdownOpen, setEditDropdownOpen] = useState<string | null>(null);
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [editSelectedValues, setEditSelectedValues] = useState<string[]>([]);
  const [chipEditSelections, setChipEditSelections] = useState<{ [key: string]: string[] }>({});

  const filteredOptions = useMemo(() => {
    return options.filter((option: string) => 
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Calculate select all state
  const selectAllState = useMemo(() => {
    if (filteredOptions.length === 0) return { checked: false, indeterminate: false };
    
    const selectedCount = filteredOptions.filter(option => value.includes(option)).length;
    const totalCount = filteredOptions.length;
    
    if (selectedCount === 0) return { checked: false, indeterminate: false };
    if (selectedCount === totalCount) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  }, [filteredOptions, value]);

  const getEditOptionsForChip = (chipValue: string) => {
    // First try exact match
    if (editOptions[chipValue]) {
      return editOptions[chipValue];
    }
    
    // Try to find a partial match
    const availableKeys = Object.keys(editOptions);
    const matchedKey = availableKeys.find(key => 
      chipValue.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(chipValue.toLowerCase())
    );
    
    if (matchedKey) {
      return editOptions[matchedKey];
    }
    
    // Return default options
    return ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"];
  };

  const filteredEditOptions = useMemo(() => {
    if (!editDropdownOpen) return [];
    const options = getEditOptionsForChip(editDropdownOpen);
    //onSubChange(options);
    return options.filter((option: string) => 
      option.toLowerCase().includes(editSearchTerm.toLowerCase())
    );
  }, [editOptions, editDropdownOpen, editSearchTerm]);

  // Calculate edit dropdown select all state
  const editSelectAllState = useMemo(() => {
    if (filteredEditOptions.length === 0) return { checked: false, indeterminate: false };
    
    const selectedCount = filteredEditOptions.filter(option => editSelectedValues.includes(option)).length;
    const totalCount = filteredEditOptions.length;
    
    if (selectedCount === 0) return { checked: false, indeterminate: false };
    if (selectedCount === totalCount) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  }, [filteredEditOptions, editSelectedValues]);

  const handleToggleOption = (option :string) => {
    const newValue = value.includes(option)
      ? value.filter(item => item !== option)
      : [...value, option];
    onChange(newValue);
    
    // When adding a new option, automatically select all its edit options by default
    if (!value.includes(option)) {
      const editOptionsForNewItem = getEditOptionsForChip(option);
      if (editOptionsForNewItem.length > 0) {
        setChipEditSelections(prev => {
          const updated = {
            ...prev,
            // initialize empty; user will pick in dropdown
            [option]: prev[option] || []
          };
          onEditSelectionsChange && onEditSelectionsChange(updated);
          return updated;
        });
      }
    } else {
      // Removing chip should also remove its selections
      setChipEditSelections(prev => {
        if (!prev[option]) return prev;
        const { [option]: _removed, ...rest } = prev;
        onEditSelectionsChange && onEditSelectionsChange(rest);
        return rest;
      });
    }
  };

  const handleClearAll = () => {
    onChange([]);
    setChipEditSelections(() => {
      const cleared: { [key: string]: string[] } = {};
      onEditSelectionsChange && onEditSelectionsChange(cleared);
      return cleared;
    });
  };

  const handleSelectAll = () => {
    const currentlySelected = filteredOptions.filter(option => value.includes(option));
    const allFilteredSelected = currentlySelected.length === filteredOptions.length;
    
    if (allFilteredSelected) {
      // Deselect all filtered options
      const newValue = value.filter(option => !filteredOptions.includes(option));
      onChange(newValue);
    } else {
      // Select all filtered options
      const newValue = [...new Set([...value, ...filteredOptions])];
      onChange(newValue);
    }
  };

  const handleEditSelectAll = () => {
    const currentlySelected = filteredEditOptions.filter(option => editSelectedValues.includes(option));
    const allFilteredSelected = currentlySelected.length === filteredEditOptions.length;
    
    if (allFilteredSelected) {
      // Deselect all filtered edit options
      const newValue = editSelectedValues.filter(option => !filteredEditOptions.includes(option));
      setEditSelectedValues(newValue);
    } else {
      // Select all filtered edit options
      const newValue = [...new Set([...editSelectedValues, ...filteredEditOptions])];
      setEditSelectedValues(newValue);
    }
  };

  const handleEditChip = (chipValue: string) => {
    console.log('Edit chip clicked:', chipValue);
    console.log('Available edit options:', editOptions);
    console.log('Label:', label);
    
    // Get the available options for this chip
    let availableOptions: string[] = [];
    
    // First try exact match
    if (editOptions[chipValue]) {
      availableOptions = editOptions[chipValue];
      console.log('Opening edit dropdown for:', chipValue);
      setEditDropdownOpen(chipValue);
      // Set all options as selected by default, or use existing selections if any
      const existingSelections = chipEditSelections[chipValue] || [];
      const defaultSelections = existingSelections.length > 0 ? existingSelections : availableOptions;
      setEditSelectedValues(defaultSelections);
      setEditSearchTerm('');
    } else {
      // Try to find a partial match or use default options
      const availableKeys = Object.keys(editOptions);
      const matchedKey = availableKeys.find(key => 
        chipValue.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(chipValue.toLowerCase())
      );
      
      if (matchedKey) {
        availableOptions = editOptions[matchedKey];
        console.log('Found partial match:', matchedKey, 'for:', chipValue);
        setEditDropdownOpen(chipValue);
        const existingSelections = chipEditSelections[chipValue] || [];
        const defaultSelections = existingSelections.length > 0 ? existingSelections : availableOptions;
        setEditSelectedValues(defaultSelections);
        setEditSearchTerm('');
      } else if (onEditChip) {
        console.log('Using onEditChip callback for:', chipValue);
        onEditChip(chipValue);
        console.log("chip val", chipValue);
      } else {
        console.log('No edit options found for:', chipValue);
        // Use default options if available
        const defaultOptions = ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"];
        if (defaultOptions.length > 0) {
          availableOptions = defaultOptions;
          console.log('Using default options for:', chipValue);
          setEditDropdownOpen(chipValue);
          const existingSelections = chipEditSelections[chipValue] || [];
          const defaultSelections = existingSelections.length > 0 ? existingSelections : availableOptions;
          setEditSelectedValues(defaultSelections);
          setEditSearchTerm('');
        }
      }
    }
    
    // If this is the first time opening the dropdown and no selections exist, 
    // automatically save the default selections
    if (!chipEditSelections[chipValue] && availableOptions.length > 0) {
      setChipEditSelections(prev => ({
        ...prev,
        [chipValue]: availableOptions
      }));
    }
  };

  const handleEditOptionToggle = (option: string) => {
    const newValue = editSelectedValues.includes(option)
      ? editSelectedValues.filter(item => item !== option)
      : [...editSelectedValues, option];
    setEditSelectedValues(newValue);
    console.log(newValue);
  };

  const handleCloseEditDropdown = () => {
    if (editDropdownOpen) {
      setChipEditSelections(prev => {
        const updated = {
          ...prev,
          [editDropdownOpen]: editSelectedValues
        };
        onEditSelectionsChange && onEditSelectionsChange(updated);
        return updated;
      });
    }
    setEditDropdownOpen(null);
    setEditSelectedValues([]);
    setEditSearchTerm('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', ...css, position: 'relative' }}>
      <Box
        component="span"
        sx={{
          fontWeight: 500,
          fontSize: '14px',
          lineHeight: '1.43em',
          color: '#1F1F1F',
        }}
      >
        {label}
      </Box>
      <FormControl fullWidth>
        <Select
          multiple
          value={value}
          onChange={() => {}} 
          input={<OutlinedInput />}
          displayEmpty
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          IconComponent={KeyboardArrowDown}
          sx={{
            height: '48px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              border: '1px solid #575757',
              '& fieldset': {
                border: 'none',
              },
              '&:hover fieldset': {
                border: 'none',
              },
              '&.Mui-focused fieldset': {
                border: 'none',
              },
            },
            '& .MuiSelect-select': {
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '1.43em',
              color: value.length === 0 ? '#575757' : '#1F1F1F',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            '& .MuiSelect-icon': {
              color: '#1F1F1F',
            },
          }}
          renderValue={() => {
            if (value.length === 0) {
              return (
                <span style={{ color: '#575757' }}>
                  {placeholder}
                </span>
              );
            }
            return (
              <span style={{ color: '#1F1F1F' }}>
                {value.length} {label} selected
              </span>
            );
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                width: '552px',
                maxHeight: '341px',
                borderRadius: '8px',
                boxShadow: '0px 1px 3px 0px rgba(60, 64, 67, 0.3), 0px 4px 8px 3px rgba(60, 64, 67, 0.15)',
                '& .MuiList-root': {
                  padding: 0,
                },
              },
            },
          }}
        >
          {/* Dropdown panel */}
          <Box sx={{ display: 'flex', height: '285px' }}>
            {/* Left Panel */}
            <Box sx={{ 
              flex: 1, 
              borderRight: '1px solid #DADCE0',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Search bar */}
              <Box sx={{ 
                borderBottom: '1px solid #DADCE0', 
                padding: '6.5px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Tooltip 
                  title={selectAllState.checked ? "Deselect all" : "Select all"} 
                  placement="top"
                >
                  <Checkbox
                    checked={selectAllState.checked}
                    indeterminate={selectAllState.indeterminate}
                    onChange={handleSelectAll}
                    sx={{
                      color: selectAllState.checked || selectAllState.indeterminate ? '#022FCD' : '#575757',
                      '&.Mui-checked': {
                        color: '#022FCD',
                      },
                      '&.MuiCheckbox-indeterminate': {
                        color: '#022FCD',
                      },
                      width: '20px',
                      height: '20px',
                      padding: '0',
                    }}
                  />
                </Tooltip>
                <Search sx={{ color: '#575757', fontSize: '16px' }} />
                <TextField
                  placeholder={`Search for ${label === 'Products' ? 'products' : 'aspect types'}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="standard"
                  fullWidth
                  sx={{
                    '& .MuiInput-root': {
                      fontSize: '12px',
                      color: '#575757',
                      '&:before': { borderBottom: 'none' },
                      '&:after': { borderBottom: 'none' },
                      '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                    },
                    '& .MuiInput-input': {
                      padding: '0',
                      fontSize: '12px',
                      color: '#575757',
                    },
                  }}
                />
              </Box>

              {/* Options list */}
              <Box sx={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '4px 0',
                maxHeight: '280px'
              }}>
                {filteredOptions.map((option) => (
                  <Box
                    key={option}
                    sx={{
                      padding: '6px 16px',
                      '&:hover': {
                        backgroundColor: '#F8F9FA',
                      },
                      cursor: 'pointer',
                    }}
                    onClick={() => handleToggleOption(option)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <Checkbox
                        checked={value.includes(option)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleOption(option);
                        }}
                        sx={{
                          color: value.includes(option) ? '#022FCD' : '#575757',
                          '&.Mui-checked': {
                            color: '#022FCD',
                          },
                          width: '20px',
                          height: '20px',
                        }}
                      />
                      <Typography
                        sx={{
                          fontWeight: 400,
                          fontSize: '12px',
                          lineHeight: '1.33em',
                          color: '#1F1F1F',
                          flex: 1,
                        }}
                      >
                        {option}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Right Panel */}
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Selected items header */}
              <Box sx={{ 
                borderBottom: '1px solid #DADCE0', 
                padding: '6px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: '12px',
                    color: '#1F1F1F',
                  }}
                >
                  {value.length} Selected
                </Typography>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  sx={{
                    fontWeight: 500,
                    fontSize: '12px',
                    color: '#1F1F1F',
                    textTransform: 'none',
                    padding: '0',
                    minWidth: 'auto',
                    opacity: 0.3,
                    '&:hover': {
                      opacity: 0.7,
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Clear All
                </Button>
              </Box>

              {/* Selected items list */}
              <Box sx={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '8px 0',
                maxHeight: '280px'
              }}>
                {value.map((selectedValue) => (
                  <Box key={selectedValue} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '9px',
                    padding: '6px 16px'
                  }}>
                    <Checkbox
                      checked={true}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleOption(selectedValue);
                      }}
                      sx={{
                        color: '#022FCD',
                        '&.Mui-checked': {
                          color: '#022FCD',
                        },
                        width: '20px',
                        height: '20px',
                      }}
                    />
                    <Typography
                      sx={{
                        fontWeight: 400,
                        fontSize: '12px',
                        lineHeight: '1.33em',
                        color: '#1F1F1F',
                        flex: 1,
                      }}
                    >
                      {selectedValue}
                    </Typography>
                  </Box>
                ))}
                {value.length === 0 && (
                  <Typography
                    sx={{
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: '1.33em',
                      color: '#0C1226CC',
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
          
          {/* Footer with OK button */}
          <Box sx={{
            borderTop: '1px solid #DADCE0',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#FAFAFA'
          }}>
            <Button
              onClick={() => setOpen(false)}
              size="small"
              sx={{
                backgroundColor: '#022FCD',
                color: '#FFFFFF',
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '1.33em',
                textTransform: 'none',
                borderRadius: '4px',
                padding: '4px 12px',
                minWidth: '48px',
                height: '28px',
                '&:hover': {
                  backgroundColor: '#0D47A1',
                },
              }}
            >
              OK
            </Button>
          </Box>
        </Select>
      </FormControl>
      
      {/* Selected items as blue chips with edit icons below input field */}
      {value.length > 0 && (
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginTop: '8px'
        }}>
          {value.map((selectedValue) => (
            <Box
              key={selectedValue}
              sx={{
                backgroundColor: '#F0F4F8',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                height: '44px',
                width: '100%',
                position: 'relative'
              }}
            >
              <Box sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px',
                flex: 1
              }}>
                <Typography sx={{
                  fontWeight: 530,
                  fontSize: '14px',
                  lineHeight: '1.43em',
                  color: '#1F1F1F',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '120px'
                }}>
                  {selectedValue}
                </Typography>
                <Typography sx={{
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '1.33em',
                  letterSpacing: '0.833%',
                  color: '#1F1F1F'
                }}>
                  {(() => {
                    // If the edit dropdown is open for this chip, show the current selection count
                    if (editDropdownOpen === selectedValue) {
                      return `${editSelectedValues.length} ${label === 'Products' ? 'Assets' : 'Aspects'}`;
                    }
                    
                    // Otherwise, show the persistent count or default count
                    const persistentCount = chipEditSelections[selectedValue]?.length || 0;
                    
                    // If no persistent selections, use default options count
                    if (persistentCount === 0) {
                      const defaultOptions = getEditOptionsForChip(selectedValue);
                      if (defaultOptions.length > 0) {
                        return `${defaultOptions.length} ${label === 'Products' ? 'Assets' : 'Aspects'}`;
                      }
                    }
                    
                    if (persistentCount > 0) {
                      return `${persistentCount} ${label === 'Products' ? 'Assets' : 'Aspects'}`;
                    }
                    return label === 'Products' ? 'Assets' : 'Aspects';
                  })()}
                </Typography>
              </Box>
              <Tooltip title="Click to edit Asset Selection" placement="top">
                <IconButton
                  size="small"
                  onClick={() => handleEditChip(selectedValue)}
                  sx={{
                    color: '#0B57D0',
                    padding: '2.5px',
                    width: '20px',
                    height: '20px',
                    marginLeft: 'auto',
                    '&:hover': {
                      backgroundColor: '#FFFFFF',
                    }
                  }}
                >
                  <Edit sx={{ fontSize: '15px' }} />
                </IconButton>
              </Tooltip>

              {/* Edit Dropdown for this specific chip */}
              {editDropdownOpen === selectedValue && (
                <ClickAwayListener onClickAway={handleCloseEditDropdown}>
                  <Paper
                    elevation={3}
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '272px',
                      borderRadius: '8px',
                      boxShadow: '0px 1px 3px 0px rgba(60, 64, 67, 0.3), 0px 4px 8px 3px rgba(60, 64, 67, 0.15)',
                      zIndex: 1000,
                      overflow: 'hidden',
                      marginTop: '8px'
                    }}
                  >
                  {/* Header */}
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px 8px 16px',
                    borderBottom: '1px solid #DADCE0'
                  }}>
                    <Typography sx={{
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '1.43em',
                      color: '#1F1F1F'
                    }}>
                      {editDropdownOpen} {label === 'Products' ? 'Assets' : 'Aspects'}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCloseEditDropdown}
                      sx={{ color: '#1F1F1F' }}
                    >
                      <Close />
                    </IconButton>
                  </Box>

                  {/* Search Section */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderBottom: '1px solid #DADCE0'
                  }}>
                    <Tooltip 
                      title={editSelectAllState.checked ? "Deselect all" : "Select all"} 
                      placement="top"
                    >
                      <Checkbox
                        checked={editSelectAllState.checked}
                        indeterminate={editSelectAllState.indeterminate}
                        onChange={handleEditSelectAll}
                        sx={{
                          color: editSelectAllState.checked || editSelectAllState.indeterminate ? '#022FCD' : '#575757',
                          '&.Mui-checked': {
                            color: '#022FCD',
                          },
                          '&.MuiCheckbox-indeterminate': {
                            color: '#022FCD',
                          },
                          width: '20px',
                          height: '20px',
                          padding: '0',
                        }}
                      />
                    </Tooltip>
                    <Search sx={{ color: '#575757', fontSize: '16px' }} />
                    <TextField
                      placeholder={`Search for ${editDropdownOpen} ${label === 'Products' ? 'Assets' : 'Aspects'}`}
                      value={editSearchTerm}
                      onChange={(e) => setEditSearchTerm(e.target.value)}
                      variant="standard"
                      fullWidth
                      sx={{
                        '& .MuiInput-root': {
                          fontSize: '12px',
                          color: '#575757',
                          '&:before': { borderBottom: 'none' },
                          '&:after': { borderBottom: 'none' },
                          '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                        },
                        '& .MuiInput-input': {
                          padding: '0',
                          fontSize: '12px',
                          color: '#575757',
                        },
                      }}
                    />
                  </Box>

                  {/* Options List */}
                  <Box sx={{
                    padding: '16px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {filteredEditOptions.map((option) => (
                      <Box
                        key={option}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          padding: '8px 0'
                        }}
                      >
                        <Checkbox
                          checked={editSelectedValues.includes(option)}
                          onChange={() => handleEditOptionToggle(option)}
                          sx={{
                            color: editSelectedValues.includes(option) ? '#022FCD' : '#575757',
                            '&.Mui-checked': {
                              color: '#022FCD',
                            },
                            width: '20px',
                            height: '20px',
                          }}
                        />
                        <Typography sx={{
                          fontWeight: 400,
                          fontSize: '12px',
                          lineHeight: '1.33em',
                          color: '#1F1F1F'
                        }}>
                          {option}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  </Paper>
                </ClickAwayListener>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Remove the old fixed position dropdown */}
    </Box>
  );
};

export default MultiSelect; 