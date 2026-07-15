import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Menu,
  MenuItem,
  ListItemText,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Checkbox,
  Button
} from '@mui/material';
import {
  FilterList,
  Close,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchLineageEntry, pushToHistory } from '../../features/entry/entrySlice';
import type { AppDispatch } from '../../app/store';
import { useAuth } from '../../auth/AuthProvider';

/**
 * @file ListView.tsx
 * @description
 * This component renders a tabular list view of lineage data. It provides
 * comprehensive filtering, sorting, and navigation capabilities.
 *
 * Key functionalities include:
 * 1.  **Tabbed Filtering**: Displays "All", "Upstream", and "Downstream" chips
 * to quickly filter the lineage list relative to the main `entry`.
 * 2.  **Advanced Filtering**: Provides a filter bar (similar to `EntryList`)
 * that allows for free-text search and property-based filtering (e.g.,
 * "Source System" == "BigQuery").
 * 3.  **Sorting**: Allows users to sort the table by clicking on column headers.
 * 4.  **Navigation**: Renders "Source" and "Target" names as clickable links.
 * Clicking a link dispatches Redux actions (`pushToHistory`,
 * `fetchLineageEntry`) to fetch the selected entry's details and navigate
 * to the '/view-details' page.
 *
 * @param {LineageListViewProps} props - The props for the component.
 * @param {LineageData[]} props.listData - An array of lineage data objects,
 * where each object represents a single source-to-target link.
 * @param {object} [props.entry] - (Optional) The main entry object, used to
 * determine "Upstream" and "Downstream" relationships based on its
 * `fullyQualifiedName`.
 *
 * @returns {React.ReactElement} A React element containing the filter chips,
 * filter bar, and a `Table` that displays the sorted and filtered lineage data.
 */

interface LineageData {
  id: number;
  sourceSystem: string;
  sourceProject: string;
  source: string;
  sourceFQN: string;
  target: string;
  targetProject: string;
  targetSystem: string;
  targetFQN: string;
}

interface LineageListViewProps {
  listData:LineageData[];
  entry?: {
    fullyQualifiedName: string;
    name: string;
  };
}

const ListView: React.FC<LineageListViewProps> = ({ listData, entry }) => {
  const [filterText, setFilterText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upstream' | 'downstream'>('all');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  
  // Advanced filter states
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  // const filterRef = useRef<HTMLDivElement>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<Array<{property: string, values: string[]}>>([]);
  
  // Navigation and Redux hooks
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const id_token = user?.token || '';
  
  useEffect(() => {
    setFilterText('');
    console.log(listData);
  },[listData]);


  // Event handlers for filter dropdown
    const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
      setFilterAnchorEl(event.currentTarget);
    };
  
    const handleFilterClose = () => {
      setFilterAnchorEl(null);
      setSelectedProperty('');
    };

  // Function to handle navigation to Overview tab
  const handleNavigateToOverview = (fqn: string) => {
    console.log("Navigating to Overview for FQN:", fqn);
    // Push current entry to history before fetching new entry
    dispatch(pushToHistory());
    // Fetch the entry data using FQN
    dispatch({ type: 'entry/setLineageToEntryCopy', payload: true });
    dispatch(fetchLineageEntry({ fqn, id_token }));

    // Navigate to view-details page (Overview tab is the default)
    navigate('/view-details');
  };

  // Dummy data based on the Figma design
  const lineageData: LineageData[] = listData;
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => {
        if (prev === 'asc') return 'desc';
        if (prev === 'desc') return null;
        return 'asc';
      });
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column || sortDirection === null) {
      return <ArrowUpward sx={{ fontSize: '16px', opacity: 0.3 }} />;
    }
    return sortDirection === 'asc' ? <ArrowUpward sx={{ fontSize: '16px' }} /> : <ArrowDownward sx={{ fontSize: '16px' }} />;
  };

  // Get property names from dummy data
 const getPropertyNames = () => {
  if (lineageData.length === 0) return [];

  const allKeys = new Set<keyof LineageData>(); 
  lineageData.forEach(item => {
    (Object.keys(item) as Array<keyof LineageData>).forEach(key => {
      allKeys.add(key);
    });
  });

  return Array.from(allKeys).filter(key => {
    if (key === 'id') {
      return false;
    }

    const isColumnEntirelyEmpty = lineageData.every(item =>
      item[key] === null || item[key] === undefined || item[key] === ''
    );

    return !isColumnEntirelyEmpty;
  });
};

  // Filter properties that have different values
  const handleValueToggle = (value: string) => {
    const newSelectedValues = selectedValues.includes(value) 
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    setSelectedValues(newSelectedValues);
    
    // Auto-apply filter when values change
    if (selectedProperty && newSelectedValues.length > 0) {
      // Check if this property already has an active filter
      const existingFilterIndex = activeFilters.findIndex(f => f.property === selectedProperty);
      
      if (existingFilterIndex >= 0) {
        // Update existing filter
        setActiveFilters(prev => prev.map((filter, index) => 
          index === existingFilterIndex 
            ? { ...filter, values: newSelectedValues }
            : filter
        ));
      } else {
        // Add new filter
        setActiveFilters(prev => [...prev, { property: selectedProperty, values: newSelectedValues }]);
      }
    } else if (selectedProperty && newSelectedValues.length === 0) {
      // Remove filter if no values are selected
      setActiveFilters(prev => prev.filter(f => f.property !== selectedProperty));
    }
  };

  const handleRemoveFilter = (propertyToRemove: string) => {
    setActiveFilters(prev => prev.filter(f => f.property !== propertyToRemove));
  };

  const handleClearFilters = () => {
    setSelectedProperty('');
    setSelectedValues([]);
    setActiveFilters([]);
    setFilterAnchorEl(null);
    setFilterText('');
  };

  // Get unique values for a property
  const getPropertyValues = (property: string) => {
    const propertyKey = property as keyof LineageData;
    const values = new Set<string>();
    lineageData.forEach(item => {
      const value = item[propertyKey];
      if (value) values.add(String(value));
    });
    return Array.from(values);
  };

  const formatPropertyName = (name: string) => {
    if (!name) return '';
    const result = name.replace(/(?<![A-Z])([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const handlePropertySelect = (property: string) => {
  const existingFilter = activeFilters.find(f => f.property === property);
  setSelectedValues(existingFilter ? existingFilter.values : []);
  setSelectedProperty(property);
};

  // Apply filters to data
  const applyFilters = (data: LineageData[]) => {
  if (activeFilters.length === 0) {
    return data;
  }
  return data.filter(item => {
    return activeFilters.every(filter => {
      if (filter.values.length === 0) return true;
      const propertyKey = filter.property as keyof LineageData;
      const itemValue = String(item[propertyKey]);
      return filter.values.includes(itemValue);
    });
  });
};


  const filteredData = applyFilters(lineageData).filter(item => {
    // Apply tab-based filtering first
    let matchesTabFilter = true;
    if (selectedFilter === 'upstream') {
      // For upstream: show items where current entry is the target
      matchesTabFilter = item.target === entry?.fullyQualifiedName?.split('.').pop();
    } else if (selectedFilter === 'downstream') {
      // For downstream: show items where current entry is the source
      matchesTabFilter = item.source === entry?.fullyQualifiedName?.split('.').pop();
    }
    // For 'all' tab, matchesTabFilter remains true
    
    // Apply text filter
    const matchesTextFilter = filterText === '' || 
      item.source.toLowerCase().includes(filterText.toLowerCase()) ||
      item.target.toLowerCase().includes(filterText.toLowerCase()) ||
      item.sourceFQN.toLowerCase().includes(filterText.toLowerCase()) ||
      item.targetFQN.toLowerCase().includes(filterText.toLowerCase());
    
    return matchesTabFilter && matchesTextFilter;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortDirection || !sortColumn) return 0;
    
    const aValue = a[sortColumn as keyof LineageData];
    const bValue = b[sortColumn as keyof LineageData];
    
    if (sortDirection === 'asc') {
      return String(aValue) < String(bValue) ? -1 : String(aValue) > String(bValue) ? 1 : 0;
    } else {
      return String(aValue) > String(bValue) ? -1 : String(aValue) < String(bValue) ? 1 : 0;
    }
  });

  return (
    <Box sx={{ 
      flex: '1 1 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#FFFFFF', 
      borderBottomLeftRadius: '0.5rem',
      borderBottomRightRadius: '0.5rem',
      minWidth: 0, // Allow shrinking
      overflow: 'hidden'
    }}>
      {/* Filter Pills Section */}
      <Box sx={{ 
        flex: '0 0 auto',
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        padding: '1.25rem 1.25rem 0 1.25rem'
      }}>
        <Chip
          label={`All (${lineageData.length})`}
          onClick={() => setSelectedFilter('all')}
          sx={{
            backgroundColor: selectedFilter === 'all' ? '#E7F0FE' : '#FFFFFF',
            color: selectedFilter === 'all' ? '#022FCD' : '#1F1F1F',
            border: selectedFilter === 'all' ? 'none' : '1px solid #DADCE0',
            fontSize: '0.75rem',
            fontWeight: 400,
            fontFamily: '"Google Sans Text", sans-serif',
            lineHeight: 1.33,
            letterSpacing: '0.1px',
            padding: '0.5rem 0.8125rem',
            borderRadius: '3.6875rem',
            height: 'auto',
            '&:hover': {
              backgroundColor: selectedFilter === 'all' ? '#E7F0FE' : '#f5f5f5',
            }
          }}
        />
        <Chip
          label={`Upstream (${lineageData.filter(item => item.target === entry?.fullyQualifiedName?.split('.').pop()).length})`}
          onClick={() => setSelectedFilter('upstream')}
          sx={{
            backgroundColor: selectedFilter === 'upstream' ? '#E7F0FE' : '#FFFFFF',
            color: selectedFilter === 'upstream' ? '#022FCD' : '#1F1F1F',
            border: selectedFilter === 'upstream' ? 'none' : '1px solid #DADCE0',
            fontSize: '0.75rem',
            fontWeight: 400,
            fontFamily: 'Google Sans Text, sans-serif',
            lineHeight: 1.33,
            letterSpacing: '0.1px',
            padding: '0.5rem 0.8125rem',
            borderRadius: '3.6875rem',
            height: 'auto',
            '&:hover': {
              backgroundColor: selectedFilter === 'upstream' ? '#E7F0FE' : '#f5f5f5',
            }
          }}
        />
        <Chip
          label={`Downstream (${lineageData.filter(item => item.source === entry?.fullyQualifiedName?.split('.').pop()).length})`}
          onClick={() => setSelectedFilter('downstream')}
          sx={{
            backgroundColor: selectedFilter === 'downstream' ? '#E7F0FE' : '#FFFFFF',
            color: selectedFilter === 'downstream' ? '#022FCD' : '#1F1F1F',
            border: selectedFilter === 'downstream' ? 'none' : '1px solid #DADCE0',
            fontSize: '0.75rem',
            fontWeight: 400,
            fontFamily: 'Google Sans Text, sans-serif',
            lineHeight: 1.33,
            letterSpacing: '0.1px',
            padding: '0.5rem 0.8125rem',
            borderRadius: '3.6875rem',
            height: 'auto',
            '&:hover': {
              backgroundColor: selectedFilter === 'downstream' ? '#E7F0FE' : '#f5f5f5',
            }
          }}
        />
      </Box>

      {/* Filter Input Section */}
      <Box sx={{ 
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          border: '1px solid #DADCE0',
          backgroundColor: '#FFFFFF',
          marginTop: '1rem',
          marginLeft: '1.25rem',
          marginRight: '1.25rem',
          borderTopLeftRadius: '0.5rem',
          borderTopRightRadius: '0.5rem',
          borderBottom: 'none'
        }}>       
        {/* Filter Icon and Label */}
        <Box sx={{ display: 'flex', alignItems: 'center', marginLeft: '-0.5rem', }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem'
          }}>
            <Tooltip title="Filter by selecting property and values" arrow>
              <IconButton
                size="small"
                onClick={handleFilterClick}
                sx={{ padding: '4px', '&:hover': { backgroundColor: '#E8F4FF' } }}
              >
                <FilterList sx={{ color: '#1F1F1F', fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filter by selecting property and values" arrow>
              <Typography 
                onClick={handleFilterClick}
                sx={{ 
                  color: '#1F1F1F', 
                  fontSize: '0.75rem', 
                  fontWeight: 500,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Filter
              </Typography>
            </Tooltip>
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
                fontSize: '0.75rem',
                backgroundColor: 'transparent',
                border: 'none',
                '& fieldset': { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' }
              },
              '& .MuiInputBase-input': { padding: '4px 8px', fontSize: '0.75rem', color: '#1F1F1F' },
              '& .MuiInputBase-input::placeholder': { color: '#575757', opacity: 1 }
            }}
            InputProps={{
              endAdornment: filterText && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setFilterText('')} sx={{ padding: '2px' }}>
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
                fontSize: '0.6875rem',
                color: '#0B57D0',
                textTransform: 'none',
                padding: '0.125rem 0.5rem',
                minWidth: 'auto',
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
      gap: '0.375rem',
      paddingTop: '4px'
    }}>
      {activeFilters.map((filter) => (
        <Box
          key={filter.property}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.5rem',
            backgroundColor: '#E7F0FE',
            border: '1px solid #022FCD',
            borderRadius: '16px',
            fontSize: '11px'
          }}
        >
          <Typography sx={{ 
            fontSize: '0.6875rem', 
            fontWeight: 500,
            color: '#022FCD'
          }}>
            {formatPropertyName(filter.property)}:
          </Typography>
          <Typography sx={{ 
            fontSize: '0.6875rem', 
            color: '#1F1F1F'
          }}>
            {filter.values.join(', ')}
          </Typography>
          <IconButton
            size="small"
            onClick={() => handleRemoveFilter(filter.property)}
            sx={{
              padding: '0.125rem',
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
              fontSize: '0.75rem', 
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

      {/* Property Dropdown Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
        PaperProps={{
          sx: {
            maxHeight: 300,
            width: 250
          }
        }}
      >
        {!selectedProperty ? [
          <MenuItem
            key="header"
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              backgroundColor: '#F8F9FA',
              borderBottom: '1px solid #E0E0E0',
              height: "32px",
              minHeight: "32px",
              paddingTop: 0,
              paddingBottom: 1,
              "&.Mui-disabled": {
                opacity: 1,
                color: "#575757 !important",
                backgroundColor: "transparent !important",
              },
            }}
            disabled
          >
            <ListItemText primary="Select Property to Filter" primaryTypographyProps={{
              fontWeight: 500,
              fontSize: '12px',
            }}/>
          </MenuItem>,
          ...getPropertyNames().map((property) => (
            <MenuItem
              key={property}
              onClick={() => handlePropertySelect(property)}
              sx={{ fontSize: '12px' }}
            >
              <ListItemText primary={formatPropertyName(property)} primaryTypographyProps={{ fontSize: '12px'}}/>
            </MenuItem>
          ))
        ] : [
          // Show values for selected property
            <MenuItem
              key="back"
              onClick={() => setSelectedProperty('')}
              sx={{ fontSize: '0.6875rem',
                fontWeight: 400,
                backgroundColor: '#F8F9FA',
                borderBottom: '1px solid #E0E0E0',
                marginTop: '-8px',
                paddingTop: 1.30,
                paddingBottom: 1.30, }}
            >
              <ListItemText primary={`← Back to Properties`} primaryTypographyProps={{ fontSize: '12px' }} />
            </MenuItem>,
            <MenuItem
                        key="filter-header"
                        sx={{
                          fontSize: '0.6875rem',
                          fontWeight: 400,
                          backgroundColor: '#F8F9FA',
                          borderBottom: '1px solid #E0E0E0'
                        }}
                        disabled
                      >
                        <ListItemText primary={`Filter by: ${formatPropertyName(selectedProperty)}`} primaryTypographyProps={{
                    fontSize: '12px',
                  }}/>
                      </MenuItem>,
            ...getPropertyValues(selectedProperty).map((value) => (
              <MenuItem
                key={value}
                onClick={() => handleValueToggle(value)}
                sx={{ fontSize: '12px',
                      paddingTop: '2px',
                      paddingBottom: '2px',
                      paddingLeft: '8px',
                      paddingRight: '8px',
                      minHeight: 'auto'
                    }}
              >
                <Checkbox
                  checked={selectedValues.includes(value)}
                  size="small"
                />
                <ListItemText primary={value} primaryTypographyProps={{ fontSize: '12px'}}/>
              </MenuItem>
            ))
        ]}
      </Menu>

      {/* Table */}
      <Box sx={{ 
        flex: '1 1 auto',
        overflow: 'auto', 
        marginLeft: '1.25rem', 
        marginRight: '1.25rem',
        minWidth: 0
      }}>
        <TableContainer component={Paper} sx={{ 
            boxShadow: 'none', 
            borderTop: 'none',
            overflowX: 'auto',
            borderRadius: 0,
          }}>
          <Table sx={{ 
            minWidth: '50rem',
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}>
            <TableHead>
              <TableRow sx={{
                backgroundColor: '#F0F4F8',
                height: '2rem',
                border: '1px solid #DADCE0',
              }}>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: '#444746',
                    borderBottom: '1px solid #DADCE0',
                    borderTop: '1px solid #DADCE0',
                    borderLeft: '1px solid #DADCE0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.5rem 1.1875rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', '&:hover .MuiIconButton-root': {
    opacity: 1,
  } }}>
                    Source System
                    <Tooltip title="Sort" arrow>
                      <IconButton size="small" onClick={() => handleSort('sourceSystem')} sx={{ opacity: (sortColumn === 'sourceSystem' && sortDirection !== null) ? 1 : 0 }}>
                        {getSortIcon('sourceSystem')}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: '#444746',
                    borderBottom: '1px solid #DADCE0',
                    borderTop: '1px solid #DADCE0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', '&:hover .MuiIconButton-root': {
    opacity: 1,
  } }}>
                    Source Project
                    <Tooltip title="Sort" arrow>
                      <IconButton size="small" onClick={() => handleSort('sourceProject')} sx={{ opacity: (sortColumn === 'sourceProject' && sortDirection !== null) ? 1 : 0 }}>
                        {getSortIcon('sourceProject')}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: '#444746',
                    borderBottom: '1px solid #DADCE0',
                    borderTop: '1px solid #DADCE0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', '&:hover .MuiIconButton-root': {
    opacity: 1,
  } }}>
                    Source
                    <Tooltip title="Sort" arrow>
                      <IconButton size="small" onClick={() => handleSort('source')} sx={{ opacity: (sortColumn === 'source' && sortDirection !== null) ? 1 : 0 }}>
                        {getSortIcon('source')}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: '#444746',
                    borderBottom: '1px solid #DADCE0',
                    borderTop: '1px solid #DADCE0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', '&:hover .MuiIconButton-root': {
    opacity: 1,
  } }}>
                    Source FQN
                    <Tooltip title="Sort" arrow>
                      <IconButton size="small" onClick={() => handleSort('sourceFQN')} sx={{ opacity: (sortColumn === 'sourceFQN' && sortDirection !== null) ? 1 : 0 }}>
                        {getSortIcon('sourceFQN')}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: '#444746',
                    borderBottom: '1px solid #DADCE0',
                    borderTop: '1px solid #DADCE0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', '&:hover .MuiIconButton-root': {
    opacity: 1,
  } }}>
                    Target
                    <Tooltip title="Sort" arrow>
                      <IconButton size="small" onClick={() => handleSort('target')} sx={{ opacity: (sortColumn === 'target' && sortDirection !== null) ? 1 : 0 }}>
                        {getSortIcon('target')}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: '#444746',
                    borderBottom: '1px solid #DADCE0',
                    borderTop: '1px solid #DADCE0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', '&:hover .MuiIconButton-root': {
    opacity: 1,
  } }}>
                    Target Project
                    <Tooltip title="Sort" arrow>
                      <IconButton size="small" onClick={() => handleSort('targetProject')} sx={{ opacity: (sortColumn === 'targetProject' && sortDirection !== null) ? 1 : 0 }}>
                        {getSortIcon('targetProject')}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: '#444746',
                    borderBottom: '1px solid #DADCE0',
                    borderTop: '1px solid #DADCE0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', '&:hover .MuiIconButton-root': {
    opacity: 1,
  } }}>
                    Target System
                    <Tooltip title="Sort" arrow>
                      <IconButton size="small" onClick={() => handleSort('targetSystem')} sx={{ opacity: (sortColumn === 'targetSystem' && sortDirection !== null) ? 1 : 0 }}>
                        {getSortIcon('targetSystem')}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: '#444746',
                    borderBottom: '1px solid #DADCE0',
                    borderTop: '1px solid #DADCE0',
                    borderRight: '1px solid #DADCE0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', '&:hover .MuiIconButton-root': {
    opacity: 1,
  } }}>
                    Target FQN
                    <Tooltip title="Sort" arrow>
                      <IconButton size="small" onClick={() => handleSort('targetFQN')} sx={{ opacity: (sortColumn === 'targetFQN' && sortDirection !== null) ? 1 : 0 }}>
                        {getSortIcon('targetFQN')}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    height: '2.2rem',
                    '&:hover': { backgroundColor: '#f8f9fa' },

                    // --- Style rules for ALL rows ---
                    '& .MuiTableCell-root': {
                      borderBottom: '1px solid #DADCE0',
                    },
                    '& .MuiTableCell-root:first-of-type': {
                      borderLeft: '1px solid #DADCE0',
                    },
                    '& .MuiTableCell-root:last-of-type': {
                      borderRight: '1px solid #DADCE0',
                    },

                    // --- Special style rules for the LAST row ---
                    '&:last-child': {
                      '& .MuiTableCell-root:first-of-type': {
                        borderBottomLeftRadius: '0.5rem',
                      },
                      '& .MuiTableCell-root:last-of-type': {
                        borderBottomRightRadius: '0.5rem',
                      },
                    },
                  }}
                >
                  <TableCell sx={{ 
                    fontSize: '0.75rem', 
                    color: '#1F1F1F', 
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.625rem 1.1875rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px',
                  }}>
                    {row.sourceSystem}
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: '0.75rem', 
                    color: '#1F1F1F', 
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.625rem 1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px'
                  }}>
                    {row.sourceProject}
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.625rem 1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    <Typography
                      component="span"
                      sx={{
                        color: '#0B57D0',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        '&:hover': { color: '#1565c0' },
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 400
                      }}
                      onClick={() => handleNavigateToOverview(row.sourceFQN)}
                    >
                      {row.source}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: '0.75rem', 
                    color: '#1F1F1F', 
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.625rem 1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    {row.sourceFQN}
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.625rem 1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    <Typography
                      component="span"
                      sx={{
                        color: '#0B57D0',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        '&:hover': { color: '#1565c0' },
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 400
                      }}
                      onClick={() => handleNavigateToOverview(row.targetFQN)}
                    >
                      {row.target}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: '0.75rem', 
                    color: '#1F1F1F', 
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.625rem 1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px'
                  }}>
                    {row.targetProject}
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: '0.75rem', 
                    color: '#1F1F1F', 
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.625rem 1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px'
                  }}>
                    {row.targetSystem}
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: '0.75rem', 
                    color: '#1F1F1F', 
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.33,
                    letterSpacing: '0.1px',
                    padding: '0.625rem 1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    {row.targetFQN}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default ListView;
