import React, { useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Autocomplete, TextField } from '@mui/material';
import './SearchBar.css'
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { useAuth } from '../../auth/AuthProvider';
import { useLocation } from 'react-router-dom';
import { useAccessRequest } from '../../contexts/AccessRequestContext';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * @file SearchBar.tsx
 * @description
 * This component renders a sophisticated search bar, which is a composite of an
 * `Autocomplete` text input and a `Select` dropdown for search types
 * (e.g., "All Assets", "BigQuery").
 *
 * It is deeply integrated with the Redux `search` slice, both reading and
 * writing the global `searchTerm` and `searchType`.
 *
 * Key functionalities include:
 * 1.  **Suggestions**: The `Autocomplete` input provides two modes:
 * - When focused and empty, it displays recent searches.
 * - When the user types (>= 3 chars), it displays suggestions from `dataSearch`.
 * 2.  **Recent Searches**: It persists recent searches to `localStorage`, scoped
 * by the logged-in user's email. Users can delete individual recent searches.
 * 3.  **Submission**: When a search is submitted (via Enter or selection), it
 * calls the `handleSearchSubmit` prop and adds the term to recent searches.
 * 4.  **Variants**: It supports two visual `variant` styles: 'default' (for
 * the home page) and 'navbar' (a more compact version for the main header).
 * 5.  **Route Awareness**: It uses `useLocation` to automatically clear the
 * `searchTerm` in Redux when the user navigates back to the '/home' page.
 *
 * @param {SearchProps} props - The props for the component.
 * @param {function} props.handleSearchSubmit - The callback function to
 * execute when a search is submitted. It receives the search term as an
L * argument.
 * @param {any[]} props.dataSearch - An array of data (e.g., `[{ name: 'BigQuery' }]`)
 * used to populate the search suggestions when the user types.
 * @param {'default' | 'navbar'} [props.variant='default'] - (Optional) The
 * visual variant, which controls layout and styling. Defaults to 'default'.
 *
 * @returns {React.ReactElement} A React element rendering the complete
 * search bar UI with its suggestion and type-selection dropdowns.
 */

interface SearchProps {
  handleSearchSubmit: any | (() => void); // Function to handle search, can be any function type
  dataSearch: any[]; // Optional data prop for search suggestions
  variant?: 'default' | 'navbar'; // Variant prop to handle different layouts
}

const SearchBar: React.FC<SearchProps> = ({handleSearchSubmit, dataSearch, variant = 'default' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const searchTerm = useSelector((state:any) => state.search.searchTerm);
  const mode = useSelector((state: any) => state.user.mode) as string;
  const { user } = useAuth();
  const location = useLocation();
  const { isAccessPanelOpen } = useAccessRequest();
  const { showError } = useNotification();
  const [searchData, setSearchData] = useState([
    { name: 'BigQuery' }, { name: 'Data Warehouse' }, { name: 'Data Lake' }, { name: 'Data Pipeline' }
  ]);
  const [recentSearches, setRecentSearches] = useState<Array<{ id: number, term: string, timestamp: number }>>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const highlightedOptionRef = useRef<string | null>(null);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  // Local storage key for recent searches
  const getStorageKey = (userId: string) => `recentSearches_${userId}`;
  
  // Load recent searches from localStorage on component mount
  useEffect(() => {
    if (user?.email) {
      const storageKey = getStorageKey(user.email);
      const storedSearches = localStorage.getItem(storageKey);
      if (storedSearches) {
        try {
          const parsedSearches = JSON.parse(storedSearches);
          setRecentSearches(parsedSearches);
        } catch (error) {
          console.error('Error parsing stored searches:', error);
          setRecentSearches([]);
        }
      }
    }
  }, [user?.email]);

  // Reset search term to default state when on /home route
  useEffect(() => {
    if (location.pathname === '/home') {
      dispatch({ type: 'search/setSearchTerm', payload: { searchTerm: '' } });
    }
  }, [location.pathname, dispatch]);

  // Save recent searches to localStorage whenever they change
  useEffect(() => {
    if (user?.email && recentSearches.length > 0) {
      try {
        const storageKey = getStorageKey(user.email);
        const dataToStore = JSON.stringify(recentSearches);
        
        // Security: Limit storage size to prevent abuse
        if (dataToStore.length > 10000) { // ~10KB limit
          console.warn('Recent searches data too large, skipping save');
          return;
        }
        
        localStorage.setItem(storageKey, dataToStore);
      } catch (error) {
        console.error('Error saving recent searches to localStorage:', error);
        // Optionally clear corrupted data
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          try {
            const storageKey = getStorageKey(user.email);
            localStorage.removeItem(storageKey);
          } catch (cleanupError) {
            console.error('Error cleaning up localStorage:', cleanupError);
          }
        }
      }
    }
  }, [recentSearches, user?.email]);

  useEffect(() => {
    setSearchData(dataSearch);
    // This effect updates the searchData state whenever the data prop changes.
  }, [dataSearch]);


  // Add search term to recent searches
  const addToRecentSearches = (searchTerm: string) => {
    if (!searchTerm || !searchTerm.trim() || !user?.email) return;
    
    // Sanitize and validate input
    const trimmedTerm = searchTerm.toString().trim();
    
    // Security: Limit length to prevent abuse
    if (trimmedTerm.length > 100) return;
    
    // Security: Basic sanitization to prevent XSS
    const sanitizedTerm = trimmedTerm.replace(/[<>]/g, '');
    if (sanitizedTerm !== trimmedTerm) return; // Reject if contains HTML tags
    
    const now = Date.now();
    
    setRecentSearches(prev => {
      // Remove existing entry with same term
      const filtered = prev.filter(search => search.term !== sanitizedTerm);
      
      // Add new entry at the beginning
      const newSearch = { id: now, term: sanitizedTerm, timestamp: now };
      const updated = [newSearch, ...filtered];
      
      // Keep only the last 10 searches
      return updated.slice(0, 10);
    });
  };

  // const handleSearchChange = (event : any) => {
  //   // Dispatch the setSearchTerm action with the new value
  //   const trimmedValue = event.target.value.trim();
  //   dispatch({ type: 'search/setSearchTerm', payload: {searchTerm : trimmedValue }});
  //   console.log("Search Term:", trimmedValue);
    
    
  //   if (event.key === 'Enter') {
  //       // Check if search term meets minimum requirements
  //       if (trimmedValue && trimmedValue.length >= 3) {
  //           // Call the search submit function with the current search term
  //           handleSearchSubmit(trimmedValue);
  //           // Add to recent searches
  //           addToRecentSearches(trimmedValue);
  //       } else if (trimmedValue && trimmedValue.length > 0 && trimmedValue.length < 3) {
  //           alert('Please type at least 3 characters to search');
  //       }
  //   }   
  // };

  const handleSelectOption = (option: string) => {
    // Sanitize input to prevent XSS
    const sanitizedOption = option?.toString().trim() || '';
    if (sanitizedOption !== '') {
      dispatch({ type: 'search/setSearchTerm', payload: {searchTerm : sanitizedOption}});
      // Ignore blank searches and only search if minimum 3 characters
      if (sanitizedOption && sanitizedOption.length >= 3) {
        dispatch({ type: 'search/setSearchSubmitted', payload: true });
        handleSearchSubmit(sanitizedOption);
        // Add to recent searches
        addToRecentSearches(sanitizedOption);
      }
    }
    setIsDropdownOpen(false);
  };

  const handleDeleteRecentSearch = (searchId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    // Validate searchId to prevent malicious deletion
    if (typeof searchId !== 'number' || searchId <= 0) {
      console.warn('Invalid search ID for deletion:', searchId);
      return;
    }
    
    setRecentSearches(prev => prev.filter(search => search.id !== searchId));
  };

  // const clearAllRecentSearches = () => {
  //   setRecentSearches([]);
  //   if (user?.email) {
  //     const storageKey = getStorageKey(user.email);
  //     localStorage.removeItem(storageKey);
  //   }
  // };

  const handleRecentSearchSelect = (searchTerm: string) => {
    // Sanitize input to prevent XSS
    const sanitizedTerm = searchTerm?.toString().trim() || '';
    if (!sanitizedTerm) return;

    dispatch({ type: 'search/setSearchTerm', payload: {searchTerm: sanitizedTerm}});
    // Ignore blank searches and only search if minimum 3 characters
    if (sanitizedTerm.length >= 3) {
      dispatch({ type: 'search/setSearchSubmitted', payload: true });
      handleSearchSubmit(sanitizedTerm);
      // Move selected search to top of recent searches
      addToRecentSearches(sanitizedTerm);
    }
    setIsDropdownOpen(false);
  };

  const handleInputChange = (_event: React.SyntheticEvent, newInputValue: string, reason: string) => {
        if (reason === 'input') {
          dispatch({ type: 'search/setSearchTerm', payload: { searchTerm: newInputValue } });
          highlightedOptionRef.current = null;
        }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            setIsKeyboardNav(true);
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            const optionToSearch = highlightedOptionRef.current || searchTerm?.toString().trim();
            if (optionToSearch && optionToSearch.length >= 3) {
                dispatch({ type: 'search/setSearchTerm', payload: { searchTerm: optionToSearch } });
                dispatch({ type: 'search/setSearchSubmitted', payload: true });
                handleSearchSubmit(optionToSearch);
                addToRecentSearches(optionToSearch);
                setIsDropdownOpen(false);
            } else if (optionToSearch && optionToSearch.length > 0 && optionToSearch.length < 3) {
                showError('Please type at least 3 characters to search');
            }
        }
  };
  const handleInputFocus = () => {
    setIsFocused(true);
    // Only open if we have valid conditions
    const shouldOpen = (searchTerm && searchTerm.length >= 3) || recentSearches.length > 0;
    if (shouldOpen) {
      setIsDropdownOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Close immediately — mousedown handler on the container
    // prevents blur from firing when clicking inside the search bar
    setIsFocused(false);
    setIsDropdownOpen(false);
  };

  // Check if any search data matches the current input (hide dropdown when nothing matches)
  const hasMatchingOptions = searchTerm
    ? searchData.some(option => option.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : true;

  const autocompleteOptions = useMemo(() =>
    searchTerm ? searchData.map((option) => option.name) : recentSearches.map(search => search.term),
    [searchTerm, searchData, recentSearches]
  );

  // Determine if any dropdown is open
  const isAnyDropdownOpen = isDropdownOpen;

  return (
        <div
            id="search-bar"
            className={`${variant === 'navbar' ? 'navbar-variant' : ''}`}
            data-route={location.pathname === '/browse-by-annotation' ? 'browse-by-annotation' : ''}
            onMouseDown={(e) => {
                // Prevent input blur when clicking inside the search bar (not on the input itself)
                // This keeps the dropdown open; clicking outside will still trigger blur
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT') {
                    e.preventDefault();
                }
            }}
            style={{
                height:  'clamp(2.75rem, 3.4vw, 4rem)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: '170px',
                background: variant === 'navbar'
                  ? (mode === 'dark' ? '#282a2c' : '#ffffff')
                  : ((isAnyDropdownOpen || variant === 'default') ? (mode === 'dark' ? '#282a2c' : '#ffffff') : (mode === 'dark' ? '#282a2c' : '#E9EEF6')),
                padding: '0rem 0.5rem 0rem 1rem',
                width: '100%',
                maxWidth: variant === 'navbar' ? '400px' : 'clamp(600px, 57vw, 1080px)',
                marginLeft: variant === 'navbar' ? '1rem' : '0',
                marginRight: variant === 'navbar' ? '0.5rem' : '0',
                position: 'relative',
                zIndex: isAccessPanelOpen ? 999 : 1100,
                transition: 'border-radius 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
                boxShadow: variant === 'default' ? `inset 0 0 0 1px ${mode === 'dark' ? '#3c4043' : '#DAE2ED'}` : 'none',
                 border: 'none',
                 boxSizing: 'border-box',
            }}>
            {/* SearchIcon on the left */}
            <SearchIcon style={{
                color: mode === 'dark' ? '#9aa0a6' : '#5F6368',
                marginRight: '0.5rem',
                transition: 'color 0.2s ease',
                height:"1.25rem",
                width:"1.25rem",
                flexShrink: 0
            }}/>
            <Autocomplete
                freeSolo
                disablePortal
                inputValue={searchTerm || ''}
                disableClearable
                ListboxProps={{
                    'data-nav': isKeyboardNav ? 'keyboard' : 'mouse',
                    onMouseMove: () => { if (isKeyboardNav) setIsKeyboardNav(false); },
                } as React.HTMLAttributes<HTMLUListElement>}
                onInputChange={handleInputChange}
                onChange={() => {}}
                onHighlightChange={(_event, option) => {
                  highlightedOptionRef.current = option as string | null;
                }}
                open={isDropdownOpen && ((searchTerm && searchTerm.length >= 3) || recentSearches.length > 0) && hasMatchingOptions}
                onOpen={() => {
                    const shouldOpen = (searchTerm && searchTerm.length >= 3) || recentSearches.length > 0;
                    if (shouldOpen) {
                        setIsDropdownOpen(true);
                    }
                }}
                onClose={(_event: React.SyntheticEvent, reason: string) => {
                    // Only close on escape key; blur handler manages all other close scenarios
                    if (reason === 'escape') {
                      setIsFocused(false);
                      setIsDropdownOpen(false);
                    }
                }}
                autoSelect={false}
                autoHighlight={false}
                options={autocompleteOptions}
                renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    
                    if (!searchTerm) {
                        // Render recent search item
                        const searchItem = recentSearches.find(search => search.term === option);
                        if (searchItem) {
                            return (
                                <li
                                    key={key}
                                    {...otherProps}
                                    className={`${otherProps.className || ''} recent-search-item`}
                                    onClick={() => handleRecentSearchSelect(option)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 11px',
                                        gap: '11px',
                                        width: '100%',
                                        fontFamily: 'Google Sans Text, sans-serif',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '1.4285714285714286em',
                                        color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <AccessTimeIcon style={{
                                            color: mode === 'dark' ? '#9aa0a6' : '#575757',
                                            fontSize: '20px',
                                            width: '20px',
                                            height: '20px',
                                            opacity: 0.8
                                        }} />
                                        <span>{option}</span>
                                    </div>
                                    <span
                                        className="recent-search-delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteRecentSearch(searchItem.id, e);
                                        }}
                                        style={{
                                            color: mode === 'dark' ? '#9aa0a6' : '#575757',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            fontFamily: 'Google Sans Text, sans-serif',
                                            fontWeight: 400,
                                            lineHeight: '1.4285714285714286em'
                                        }}
                                    >
                                        Delete
                                    </span>
                                </li>
                            );
                        }
                    }
                    // Render regular search option
                    return (
                        <li
                            key={key}
                            {...otherProps}
                            onClick={() => handleSelectOption(option)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '11px',
                                padding: '8px 11px',
                                fontFamily: 'Google Sans Text, sans-serif',
                                fontWeight: 400,
                                fontSize: '14px',
                                lineHeight: '1.4285714285714286em',
                                color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                                cursor: 'pointer'
                            }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <SearchIcon style={{
                                  color: mode === 'dark' ? '#9aa0a6' : '#575757',
                                  fontSize: '20px',
                                  width: '20px',
                                  height: '20px',
                                  opacity: 0.8
                              }} />
                              <span>
                                {searchTerm
                                  ? option.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, i) =>
                                      part.toLowerCase() === searchTerm.toLowerCase()
                                        ? <strong key={i}>{part}</strong>
                                        : part
                                    )
                                  : option
                                }
                              </span>
                          </div>
                        </li>
                    );
                }}

                renderInput={(params) => (
                    <div style={{ position: 'relative', width: '100%' }}>
                        {!searchTerm && !isFocused && (
                            <span
                                className="animated-placeholder"
                                style={{
                                    left: variant === 'navbar' ? '7px' : '0px'
                                }}
                            >
                                {"Ask anything"}
                            </span>
                        )}

                        <TextField
                            {...params}
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            placeholder=""
                            slotProps={{
                                input: {
                                    ...params.InputProps,
                                    type: 'search',
                                },
                            }}
                            style={{
                                fontFamily: '"Google Sans Text", sans-serif',
                                color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                                width: "100%",
                                flex: 1,
                                background: variant === 'navbar'
                                  ? (mode === 'dark' ? '#282a2c' : '#ffffff')
                                  : ((isAnyDropdownOpen || variant === 'default') ? (mode === 'dark' ? '#282a2c' : '#ffffff') : (mode === 'dark' ? '#282a2c' : '#E9EEF6')),
                                fontWeight: "500",
                                fontSize: "0.875rem",
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& input': {
                                        fontFamily: '"Google Sans Text", sans-serif',
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
                                        opacity: "0.8",
                                        color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                                        fontStyle: "normal",
                                        padding: "0rem 0.5625rem 0rem 0rem"
                                    },
                                },
                            }}
                        />
                    </div>
                )}
                PaperComponent={(props) => (
                    <div
                        {...props}
                        className={`${props.className || ''} autocomplete-dropdown ${variant === 'navbar' ? 'navbar-dropdown' : ''}`}
                        style={{
                        ...props.style,
                        borderRadius: '24px',
                        border: 'none',
                        boxShadow: mode === 'dark' ? '0 4px 6px rgba(0,0,0,0.5)' : '0 4px 6px rgba(32,33,36,.28)',
                        padding: '10px 0px',
                        backgroundColor: mode === 'dark' ? '#282a2c' : '#ffffff',
                        width: '100%',
                        zIndex: 2000,
                        overflow: "hidden",
                        ...(variant === 'navbar' ? {
                            position: 'relative' as const,
                            marginTop: '0px',
                        } : {
                            position: 'absolute' as const,
                            left: 0,
                            top: 'calc(100%)',
                            marginTop: -10,
                            marginLeft: 0,
                        }),
                    }}
                    />
                )}
                sx={variant === 'navbar' ? {
                    flex: '1 1 auto',
                    minWidth: 0,
                    position: 'static',
                    '& .MuiAutocomplete-listbox': { padding: '0px' },
                    '& .MuiAutocomplete-option:hover': {
                        backgroundColor: mode === 'dark' ? '#3c4043 !important' : '#E8EAED !important',
                    },
                    '& .MuiAutocomplete-option.Mui-focused': {
                        backgroundColor: 'transparent !important',
                    },
                    '& .MuiAutocomplete-option[aria-selected="true"]': {
                        backgroundColor: 'transparent !important',
                    },
                } : {
                    flex: 1,
                    minWidth: 0,
                    position: 'static',
                    '& .MuiAutocomplete-listbox': { padding: '0px' },
                    '& .MuiAutocomplete-option:hover': {
                        backgroundColor: mode === 'dark' ? '#3c4043 !important' : '#E8EAED !important',
                    },
                    '& .MuiAutocomplete-option.Mui-focused': {
                        backgroundColor: 'transparent !important',
                    },
                    '& .MuiAutocomplete-option[aria-selected="true"]': {
                        backgroundColor: 'transparent !important',
                    },
                }}
                noOptionsText={!searchTerm && recentSearches.length === 0 ? "No recent searches" : "No options"}
            />
        </div>
  );
}

export default SearchBar;