import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';

interface FieldDefinition {
  name: string;
  displayName?: string;
  type: 'bool' | 'enum' | 'string' | 'int' | 'strong' | 'datetime';
  enumValues?: string[];
}

interface FilterValue {
  fieldName: string;
  value: string;
  enabled: boolean;
  filterType: 'include' | 'exclude';
}

interface FilterSubAnnotationsPanelProps {
  annotationName: string;
  subAnnotations: FieldDefinition[];
  subAnnotationsloader: boolean;
  selectedSubAnnotations: FilterValue[];
  onSubAnnotationsChange: (selectedSubAnnotations: FilterValue[]) => void;
  onSubAnnotationsApply: (appliedSubAnnotations: FilterValue[]) => void;
  onClose: () => void;
  isOpen: boolean;
  clickPosition?: { top: number; right: number };
}

const FilterSubAnnotationsPanel: React.FC<FilterSubAnnotationsPanelProps> = ({
  annotationName,
  subAnnotations = [],
  subAnnotationsloader,
  selectedSubAnnotations = [],
  onSubAnnotationsChange,
  onSubAnnotationsApply,
  onClose,
  isOpen,
  clickPosition
}) => {
  const mode = useSelector((state: any) => state.user.mode) as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [panelPosition, setPanelPosition] = useState({
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  });

  useLayoutEffect(() => {
    if (isOpen && clickPosition) {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const rem = 16;
      const panelMaxHeight = 32 * rem;
      const panelWidth = 24 * rem;
      const margin = 16;

      let left = clickPosition.right + margin;

      if (left + panelWidth + margin > viewportWidth) {
        left = viewportWidth - panelWidth - margin;
      }
      if (left < margin) {
        left = margin;
      }

      let top = clickPosition.top;

      if (top + panelMaxHeight + margin > viewportHeight) {
        top = viewportHeight - panelMaxHeight - margin;
      }
      if (top < margin) {
        top = margin;
      }

      setPanelPosition({
        top: `${top}px`,
        left: `${left}px`,
        transform: 'none'
      });

    } else if (!isOpen) {
      setPanelPosition({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
    }
  }, [isOpen, clickPosition]);

  const filteredSubAnnotations = useMemo(() => {
    return subAnnotations;
  }, [subAnnotations]);

  const handleToggleField = (fieldName: string) => {
    const existingIndex = selectedSubAnnotations.findIndex(item => item.fieldName === fieldName);
    let newSelected = [...selectedSubAnnotations];

    if (existingIndex >= 0) {
      if (newSelected[existingIndex].enabled) {
        // Unchecking: remove from array (hides input, clears value)
        newSelected.splice(existingIndex, 1);
      } else {
        // Re-checking: enable
        newSelected[existingIndex] = { ...newSelected[existingIndex], enabled: true };
      }
    } else {
      // First check: add with enabled=true, empty value
      newSelected.push({ fieldName, value: '', enabled: true, filterType: 'include' });
    }
    onSubAnnotationsChange(newSelected);
  };

  const handleValueChange = (fieldName: string, value: string) => {
    const existingIndex = selectedSubAnnotations.findIndex(item => item.fieldName === fieldName);
    let newSelected = [...selectedSubAnnotations];
    if (existingIndex >= 0) {
      newSelected[existingIndex] = { ...newSelected[existingIndex], value };
    }
    onSubAnnotationsChange(newSelected);

    if (showErrors) {
      const stillHasEmpty = newSelected.some(
        filter => filter.enabled && (!filter.value || filter.value.trim() === '')
      );
      if (!stillHasEmpty) {
        setShowErrors(false);
      }
    }
  };

  const getFieldValue = (fieldName: string): string => {
    const field = selectedSubAnnotations.find(item => item.fieldName === fieldName);
    return field?.value || '';
  };

  const isFieldEnabled = (fieldName: string): boolean => {
    const field = selectedSubAnnotations.find(item => item.fieldName === fieldName);
    return field?.enabled || false;
  };

  const getValidFilters = (): FilterValue[] => {
    return selectedSubAnnotations.filter(filter => {
      if (!filter.enabled || !filter.value || filter.value === '') {
        return false;
      }

      const fieldDefinition = subAnnotations.find(field => field.name === filter.fieldName);
      const fieldType = fieldDefinition?.type || 'string';
      const validation = validateFieldValue(fieldType, filter.value);

      return validation.isValid;
    });
  };

  const validateFieldValue = (fieldType: string, value: string): { isValid: boolean; errorMessage: string } => {
    if (!value || value.trim() === '') {
      return { isValid: true, errorMessage: '' };
    }

    switch (fieldType) {
      case 'int':
        const trimmedValue = value.trim();
        const intValue = parseInt(trimmedValue, 10);
        if (isNaN(intValue) || !Number.isInteger(intValue) || intValue.toString() !== trimmedValue) {
          return { isValid: false, errorMessage: 'Please enter a valid integer value' };
        }
        return { isValid: true, errorMessage: '' };

      default:
        return { isValid: true, errorMessage: '' };
    }
  };

  const hasAnyCheckedFields = (): boolean => {
    return selectedSubAnnotations.some(filter => filter.enabled);
  };

  const handleClearAll = () => {
    setShowErrors(false);
    onSubAnnotationsChange([]);
  };

  if (!isOpen) return null;

  const dropdownMenuProps = {
    PaperProps: {
      style: {
        marginTop: '4px',
        borderRadius: '8px',
        boxShadow: mode === 'dark'
          ? '0px 4px 6px -1px rgba(0, 0, 0, 0.3), 0px 2px 4px -1px rgba(0, 0, 0, 0.2)'
          : '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
        backgroundColor: mode === 'dark' ? '#3c4043' : undefined,
      }
    }
  };

  const selectFormControlSx = {
    margin: '0 0 0.625rem 2.25rem',
    width: 'calc(100% - 2.25rem)',
    '& .MuiOutlinedInput-root': {
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      '& fieldset': {
        borderColor: mode === 'dark' ? '#3c4043' : '#DADCE0',
      },
      '&:hover fieldset': {
        borderColor: mode === 'dark' ? '#3c4043' : '#DADCE0',
      },
      '&.Mui-focused fieldset': {
        borderColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
        borderWidth: '1px',
      },
    },
    '& .MuiSelect-select': {
      padding: '0.625rem 0.75rem',
      fontSize: '0.875rem',
      color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
    },
  };

  const textFieldSx = {
    margin: '0 0 0.625rem 2.25rem',
    width: 'calc(100% - 2.25rem)',
    '& .MuiOutlinedInput-root': {
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      '& fieldset': {
        borderColor: mode === 'dark' ? '#3c4043' : '#DADCE0',
      },
      '&:hover fieldset': {
        borderColor: mode === 'dark' ? '#3c4043' : '#DADCE0',
      },
      '&.Mui-focused fieldset': {
        borderColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
        borderWidth: '1px',
      },
    },
    '& .MuiOutlinedInput-input': {
      padding: '0.625rem 0.75rem',
      fontSize: '0.875rem',
      color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
    },
  };

  const renderFieldInput = (field: FieldDefinition) => {
    const fieldName = String(field.name || '');
    const currentValue = getFieldValue(fieldName);

    if (field.type === 'bool') {
      return (
        <FormControl size="small" sx={selectFormControlSx}>
          <Select
            value={currentValue}
            onChange={(e) => handleValueChange(fieldName, e.target.value)}
            displayEmpty
            MenuProps={dropdownMenuProps}
            renderValue={(selected) => {
              if (!selected) {
                return <span style={{ color: mode === 'dark' ? '#5f6368' : '#9AA0A6' }}>Choose option</span>;
              }
              return selected === 'true' ? 'True' : 'False';
            }}
          >
            <MenuItem value="true" sx={{
              fontSize: '12px',
              fontWeight: currentValue === 'true' ? '500' : '400',
              color: currentValue === 'true' ? (mode === 'dark' ? '#8ab4f8' : '#0B57D0') : (mode === 'dark' ? '#e3e3e3' : '#1F1F1F'),
              backgroundColor: currentValue === 'true' ? (mode === 'dark' ? 'rgba(138, 180, 248, 0.16)' : '#F8FAFD') : 'transparent',
              '&:hover': { backgroundColor: mode === 'dark' ? '#3c4043' : '#F1F3F4' },
            }}>
              True
            </MenuItem>
            <MenuItem value="false" sx={{
              fontSize: '12px',
              fontWeight: currentValue === 'false' ? '500' : '400',
              color: currentValue === 'false' ? (mode === 'dark' ? '#8ab4f8' : '#0B57D0') : (mode === 'dark' ? '#e3e3e3' : '#1F1F1F'),
              backgroundColor: currentValue === 'false' ? (mode === 'dark' ? 'rgba(138, 180, 248, 0.16)' : '#F8FAFD') : 'transparent',
              '&:hover': { backgroundColor: mode === 'dark' ? '#3c4043' : '#F1F3F4' },
            }}>
              False
            </MenuItem>
          </Select>
        </FormControl>
      );
    }

    if (field.type === 'enum') {
      const enumValues = field.enumValues || [];

      return (
        <FormControl size="small" sx={selectFormControlSx}>
          <Select
            value={currentValue}
            onChange={(e) => handleValueChange(fieldName, e.target.value)}
            displayEmpty
            MenuProps={dropdownMenuProps}
            renderValue={(selected) => {
              if (!selected) {
                return <span style={{ color: mode === 'dark' ? '#5f6368' : '#9AA0A6' }}>Choose option</span>;
              }
              return selected;
            }}
          >
            {enumValues.map((value: string, index: number) => (
              <MenuItem key={index} value={value} sx={{
                fontSize: '12px',
                fontWeight: currentValue === value ? '500' : '400',
                color: currentValue === value ? (mode === 'dark' ? '#8ab4f8' : '#0B57D0') : (mode === 'dark' ? '#e3e3e3' : '#1F1F1F'),
                backgroundColor: currentValue === value ? (mode === 'dark' ? 'rgba(138, 180, 248, 0.16)' : '#F8FAFD') : 'transparent',
                '&:hover': { backgroundColor: mode === 'dark' ? '#3c4043' : '#F1F3F4' },
              }}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (field.type === 'datetime') {
      return (
        <DatePicker
          value={currentValue ? dayjs(currentValue) : null}
          onChange={(newValue) => {
            handleValueChange(fieldName, newValue ? newValue.format('YYYY-MM-DD') : '');
          }}
          slotProps={{
            textField: {
              size: 'small',
              placeholder: 'Pick a date',
              sx: textFieldSx,
            },
          }}
        />
      );
    }

    // string, int, strong types
    const placeholder = field.type === 'int' ? 'Enter number' : 'Enter value';
    return (
      <TextField
        size="small"
        value={currentValue}
        onChange={(e) => handleValueChange(fieldName, e.target.value)}
        placeholder={placeholder}
        sx={textFieldSx}
      />
    );
  };

  return (
    <Box
      ref={containerRef}
      data-sub-annotations-panel
      sx={{
        position: 'fixed',
        top: panelPosition.top,
        left: panelPosition.left,
        transform: panelPosition.transform,
        zIndex: 1400,
        backgroundColor: mode === 'dark' ? '#282a2c' : '#FFFFFF',
        borderRadius: '1rem',
        boxShadow: mode === 'dark'
          ? '0px 1px 3px 0px rgba(0, 0, 0, 0.5), 0px 4px 8px 3px rgba(0, 0, 0, 0.3)'
          : '0px 1px 3px 0px rgba(60, 64, 67, 0.3), 0px 4px 8px 3px rgba(60, 64, 67, 0.15)',
        width: '24rem',
        maxHeight: '32rem',
        overflow: 'visible',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 1.5rem 1rem 1.5rem',
          flex: '0 0 auto'
        }}
      >
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '1.125rem',
            lineHeight: 1.4,
            color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
          }}
        >
          {annotationName}
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
            '&:hover': {
              backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <Close sx={{ fontSize: '1.25rem' }} />
        </Button>
      </Box>

      {/* Divider */}
      <Box sx={{ borderTop: `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}` }} />

      {/* Field List */}
      {!subAnnotationsloader ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0.5rem 0.75rem',
            flex: '1 1 auto',
            overflowY: 'auto',
            overflowX: 'hidden',
            '&::-webkit-scrollbar': {
              width: '0.375rem',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '0.25rem',
              '&:hover': {
                background: mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
              },
            },
          }}
        >
          {filteredSubAnnotations.map((field) => {
            const fieldName = String(field.name || '');
            const isChecked = isFieldEnabled(fieldName);

            return (
              <Box key={field.name} sx={{ display: 'flex', flexDirection: 'column' }}>
                {/* Checkbox Row */}
                <Box
                  onClick={() => handleToggleField(fieldName)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: mode === 'dark' ? '#3c4043' : '#F8F9FA',
                      borderRadius: '0.5rem',
                    },
                  }}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={() => handleToggleField(fieldName)}
                    onClick={(e) => e.stopPropagation()}
                    icon={
                      <Box sx={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: `2px solid ${mode === 'dark' ? '#9aa0a6' : '#575757'}`,
                      }} />
                    }
                    checkedIcon={
                      <Box sx={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke={mode === 'dark' ? '#1e1f20' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Box>
                    }
                    sx={{ padding: 0 }}
                  />
                  <Typography sx={{
                    fontSize: '0.875rem',
                    color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                    fontWeight: 400,
                    lineHeight: 1.4,
                  }}>
                    {field.displayName || fieldName}
                  </Typography>
                </Box>

                {/* Input: only shown when checked */}
                {isChecked && renderFieldInput(field)}

                {/* Error: shown when checked, Apply pressed, and value is empty */}
                {isChecked && showErrors && !getFieldValue(fieldName) && (
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: '#D93025',
                      margin: '-0.375rem 0 0.625rem 2.25rem',
                    }}
                  >
                    Please enter a value
                  </Typography>
                )}
              </Box>
            );
          })}

          {filteredSubAnnotations.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
              }}
            >
              <Typography
                sx={{
                  fontWeight: 400,
                  fontSize: '0.875rem',
                  color: mode === 'dark' ? '#9aa0a6' : '#0C1226CC',
                }}
              >
                No fields found
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem',
            flex: '1 1 auto',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.5rem',
          borderTop: `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}`,
          flex: '0 0 auto'
        }}
      >
        {/* Clear All */}
        <Button
          variant="text"
          onClick={handleClearAll}
          disabled={!hasAnyCheckedFields()}
          sx={{
            color: hasAnyCheckedFields() ? (mode === 'dark' ? '#8ab4f8' : '#022FCD') : (mode === 'dark' ? '#5f6368' : '#9AA0A6'),
            fontWeight: 500,
            fontSize: '0.875rem',
            textTransform: 'none',
            padding: '0.5rem 1rem',
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: hasAnyCheckedFields() ? (mode === 'dark' ? 'rgba(138, 180, 248, 0.08)' : 'rgba(14, 77, 202, 0.04)') : 'transparent',
            },
            '&:disabled': {
              color: mode === 'dark' ? '#5f6368' : '#9AA0A6',
            },
          }}
        >
          Clear all
        </Button>

        {/* Apply Button */}
        <Button
          variant="contained"
          onClick={() => {
            const hasEmptyCheckedFields = selectedSubAnnotations.some(
              filter => filter.enabled && (!filter.value || filter.value.trim() === '')
            );

            if (hasEmptyCheckedFields) {
              setShowErrors(true);
              return;
            }

            setShowErrors(false);
            const validFilters = getValidFilters();
            onSubAnnotationsApply(validFilters);
          }}
          sx={{
            backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
            color: mode === 'dark' ? '#1e1f20' : '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            borderRadius: '1.5rem',
            padding: '0.5rem 1.5rem',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#6b9ef5' : '#0B3FA8',
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

export default FilterSubAnnotationsPanel;
