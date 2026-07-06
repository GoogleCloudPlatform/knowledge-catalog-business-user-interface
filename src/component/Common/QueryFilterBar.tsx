import React, { useState } from 'react';
import { Box, TextField, InputAdornment, IconButton } from '@mui/material';
import { FilterList, Close } from '@mui/icons-material';

interface QueryFilterBarProps {
  searchTerm: string;
  onSearchTermChange: (text: string) => void;
  placeholder?: string;
}

const QueryFilterBar: React.FC<QueryFilterBarProps> = ({
  searchTerm,
  onSearchTermChange,
  placeholder = "Search query description"
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        height: '32px',
        backgroundColor: '#FFFFFF',
        // Highlights blue when focused or when text is present
        border: (isFocused || searchTerm) ? '1px solid #022FCD' : '1px solid #C8CEE0',
        borderRadius: '54px',
        padding: '8px 4px 8px 12px',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s ease',
        '&:hover': {
          borderColor: '#022FCD',
        },
        width: '100%',
        maxWidth: '350px', // Matches typical filter bar width
      }}
    >
      <FilterList sx={{ fontSize: '20px', color: '#1F1F1F', flexShrink: 0 }} />
      <TextField
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        variant="outlined"
        size="small"
        sx={{
          flex: 1,
          minWidth: 0,
          '& .MuiOutlinedInput-root': {
            padding: 0,
            fontSize: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            '& fieldset': { border: 'none' },
            '&:hover fieldset': { border: 'none' },
            '&.Mui-focused fieldset': { border: 'none' },
          },
          '& .MuiInputBase-input': {
            padding: '4px 8px',
            fontSize: '12px',
            color: '#1F1F1F',
          },
          '& .MuiInputBase-input::placeholder': {
            color: '#5E5E5E',
            opacity: 1,
            fontFamily: '"Google Sans", sans-serif',
            fontWeight: 400,
            fontSize: '12px',
          },
        }}
        InputProps={{
          endAdornment: searchTerm ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => onSearchTermChange('')}
                sx={{ padding: '2px' }}
              >
                <Close sx={{ fontSize: '14px' }} />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
      />
    </Box>
  );
};

export default QueryFilterBar;