import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Paper,
  Skeleton
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { fetchEntriesByParent } from '../../features/resources/resourcesSlice';
import { useAuth } from '../../auth/AuthProvider';
import { fetchEntry, pushToHistory } from '../../features/entry/entrySlice';
import FilterBar from '../Common/FilterBar';
import type { ActiveFilter, PropertyConfig } from '../Common/FilterBar';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from '../Schema/ResizeHandle';
import OverflowTooltip from '../Common/OverflowTooltip';

interface EntryItem {
  id: string;
  name: string;
  full_name: string;
  description: string;
  lastModified: string;
}

interface EntryListProps {
  entry?: any;
}

const EntryList: React.FC<EntryListProps> = ({ entry }) => {

  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchFailed, setFetchFailed] = useState<boolean>(false);
  const [entryData, setEntryData] = useState<EntryItem[]>([]);
  const [filterText, setFilterText] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<'name' | 'lastModified' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const dispatch = useDispatch<AppDispatch>();
  const id_token = user?.token || '';
  const resourcesEntryList = useSelector((state: any) => state.resources.entryListData);
  const resourcesEntryListStatus = useSelector((state: any) => state.resources.entryListStatus);
  const error = useSelector((state: any) => state.resources.entryListError);

  const getFormatedDate = (date: any) => {
    const myDate = new Date(date * 1000);
    const formatedDate = new Intl.DateTimeFormat('en-US', { month: "short", day: "numeric", year: "numeric" }).format(myDate);
    return formatedDate;
  };

  // Column resize config
  const COLUMN_CONFIGS = React.useMemo(() => [
    { key: 'name', initialWidth: 200, minWidth: 100 },
    { key: 'description', initialWidth: 400, minWidth: 150 },
    { key: 'lastModified', initialWidth: 200, minWidth: 100 },
  ], []);

  const { columnWidths, activeIndex, handleMouseDown } = useColumnResize({
    columns: COLUMN_CONFIGS,
    mode: 'coupled',
  });

  const columnPercents = React.useMemo(() => {
    const total = columnWidths.reduce((s, w) => s + w, 0);
    return columnWidths.map(w => `${((w / total) * 100).toFixed(2)}%`);
  }, [columnWidths]);

  // FilterBar property config
  const columnProperties: PropertyConfig[] = React.useMemo(() => [
    { name: 'Name', mode: 'text' as const },
    { name: 'Description', mode: 'text' as const },
    { name: 'Last Modification Time', mode: 'text' as const },
  ], []);

  const propertyToKey: Record<string, keyof EntryItem> = React.useMemo(() => ({
    'Name': 'name',
    'Description': 'description',
    'Last Modification Time': 'lastModified',
  }), []);

  // Sorting logic
  const handleToggleSort = (col: 'name' | 'lastModified') => (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sortColumn === col) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortColumn(null);
        setSortOrder('asc');
      }
    } else {
      setSortColumn(col);
      setSortOrder('asc');
    }
  };

  const getSortTooltip = (col: string): string => {
    if (sortColumn === col && sortOrder === 'asc') return 'Sort Z to A';
    if (sortColumn === col && sortOrder === 'desc') return '';
    return 'Sort A to Z';
  };

  // Data fetching
  useEffect(() => {
    dispatch(fetchEntriesByParent({ parent: entry.name, id_token: id_token }));
  }, []);

  useEffect(() => {
    if (resourcesEntryListStatus === 'loading') {
      setLoading(true);
      setFetchFailed(false);
    }
    if (resourcesEntryListStatus === 'succeeded') {
      const d: EntryItem[] = [];
      resourcesEntryList.forEach((res: { dataplexEntry: { name: string; entrySource: { description: string }; updateTime: { seconds: number } } }, index: number) => {
        d.push({
          id: "" + index + 1,
          name: res.dataplexEntry.name.split('/').pop() ?? '',
          full_name: res.dataplexEntry.name,
          description: res.dataplexEntry.entrySource.description,
          lastModified: getFormatedDate(res.dataplexEntry.updateTime.seconds)
        });
      });
      setEntryData(d);
      setLoading(false);
    }
    if (resourcesEntryListStatus === 'failed') {
      setFetchFailed(true);
      setLoading(false);
    }
  }, [resourcesEntryListStatus]);

  const handleSelectEntry = (fullName: string) => {
    dispatch(pushToHistory());
    dispatch(fetchEntry({ entryName: fullName, id_token: id_token }));
  };

  // Filter data based on active filter chips
  const filteredData = React.useMemo(() => {
    let data = entryData;

    if (activeFilters.length > 0) {
      data = data.filter((row: EntryItem) => {
        return activeFilters.every(filter => {
          const isTextChip = Boolean(filter.id);
          // Global search: check across all columns
          if (!filter.property) {
            return filter.values.some(fv => {
              const fvLower = fv.toLowerCase();
              return (
                row.name.toLowerCase().includes(fvLower) ||
                row.description.toLowerCase().includes(fvLower) ||
                row.lastModified.toLowerCase().includes(fvLower)
              );
            });
          }
          const key = propertyToKey[filter.property];
          const rowVal = key ? String(row[key] ?? '') : '';
          return filter.values.some(fv =>
            isTextChip
              ? rowVal.toLowerCase().includes(fv.toLowerCase())
              : rowVal === fv
          );
        });
      });
    }

    return data;
  }, [entryData, activeFilters]);

  // Display data: apply sort on filtered data
  const displayedData = React.useMemo(() => {
    if (!sortColumn) return filteredData;

    const sorted = [...filteredData].sort((a: EntryItem, b: EntryItem) => {
      const aVal = String(a[sortColumn] ?? '').toLowerCase();
      const bVal = String(b[sortColumn] ?? '').toLowerCase();
      return aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
    });

    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [filteredData, sortColumn, sortOrder]);

  if (!loading && !fetchFailed && entryData.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 300px)', width: '100%' }}>
        <Typography sx={{ fontSize: '14px', color: '#575757' }}>
          No entries available
        </Typography>
      </Box>
    );
  }

  return !loading ? !fetchFailed ? (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        borderRadius: '24px',
        backgroundColor: 'transparent',
        border: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0px',
        height: '100%',
        overflowY: 'visible',
        backgroundColor: 'transparent'
      }}>
      {/* FilterBar */}
      <Box sx={{ marginBottom: '20px', marginTop: '6px' }}>
        <FilterBar
          filterText={filterText}
          onFilterTextChange={setFilterText}
          propertyNames={columnProperties}
          activeFilters={activeFilters}
          onActiveFiltersChange={setActiveFilters}
          defaultProperty="Name"
          placeholder="Enter property name or value"
          marginLeft="0px"
          showTextInFilterMenu
        />
      </Box>

      {/* Table */}
      {displayedData.length === 0 && activeFilters.length > 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', fontSize: '14px', fontFamily: 'Google Sans, sans-serif', color: '#575757' }}>
          No entries match your search or filter criteria
        </div>
      ) : (
          <TableContainer
            sx={{
              maxHeight: '600px',
              overflowY: 'auto',
              overflowX: 'auto',
              width: '100%',
              borderRadius: '16px',
              border: '1px solid #E8EEF5',
              backgroundColor: '#FFFFFF',
          }}
          >
            <Table sx={{ width: '100%', tableLayout: 'fixed' }} aria-label="entry list table">
            <colgroup>
              {columnPercents.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <TableHead>
              <TableRow
                sx={{
                  position: 'relative',
                  height: '48px',
                  '& .MuiTableCell-root': {
                    borderBottom: '1px solid #DADCE0',
                    padding: '0px 20px',
                  },
                  '& .MuiTableCell-root:first-of-type': {
                    paddingLeft: '20px',
                  }
                }}
              >
                {/* Name */}
                <TableCell
                  onClick={handleToggleSort('name')}
                  sx={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#444746',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: '#F8F9FA' },
                  }}
                >
                  <Tooltip title={getSortTooltip('name')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        width: '100%', height: '100%'
                      }}
                    >
                      <span>Name</span>
                      <Box component="span" className="sort-btn" sx={{
                        display: 'flex', alignItems: 'center', flexShrink: 0,
                        opacity: sortColumn === 'name' ? 1 : 0,
                        transform: (sortColumn === 'name' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" rx="12" fill="#C2E7FF"/>
                          <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill="#004A77"/>
                        </svg>
                      </Box>
                    </Box>
                  </Tooltip>
                  <ResizeHandle
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(0, e); }}
                    isActive={activeIndex === 0}
                    darkMode={false}
                  />
                </TableCell>

                {/* Description */}
                <TableCell
                  sx={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#444746',
                    position: 'relative',
                  }}
                >
                  <span>Description</span>
                  <ResizeHandle
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(1, e); }}
                    isActive={activeIndex === 1}
                    darkMode={false}
                  />
                </TableCell>

                {/* Last Modification Time */}
                <TableCell
                  onClick={handleToggleSort('lastModified')}
                  sx={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#444746',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: '#F8F9FA' },
                  }}
                >
                  <Tooltip title={getSortTooltip('lastModified')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        width: '100%', height: '100%'
                      }}
                    >
                      <span>Last Modification Time</span>
                      <Box component="span" className="sort-btn" sx={{
                        display: 'flex', alignItems: 'center', flexShrink: 0,
                        opacity: sortColumn === 'lastModified' ? 1 : 0,
                        transform: (sortColumn === 'lastModified' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" rx="12" fill="#C2E7FF"/>
                          <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill="#004A77"/>
                        </svg>
                      </Box>
                    </Box>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedData.map((row) => {
                return (
                <TableRow
                  key={row.id}
                 sx={{
                    height: '60px',
                    '& .MuiTableCell-root': {
                      borderBottom: '1px solid #E8EEF5',
                    },
                    '&:last-child .MuiTableCell-root': {
                      borderBottom: 'none',
                    },
                    '&:hover .MuiTableCell-root': {
                      backgroundColor: '#F8F9FA',
                    },
                  }}
                >
                  {/* Name - clickable link */}
                  <TableCell sx={{ padding: '0px 20px', overflow: 'hidden' }}>
                    <OverflowTooltip text={row.name}>
                      <Typography
                        onClick={() => handleSelectEntry(row.full_name)}
                        sx={{
                          fontFamily: '"Google Sans", sans-serif',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#022FCD',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: '#0842A0',
                          },
                        }}
                      >
                        {row.name}
                      </Typography>
                    </OverflowTooltip>
                  </TableCell>

                  {/* Description */}
                  <TableCell sx={{ padding: '0px 20px', overflow: 'hidden' }}>
                    <OverflowTooltip text={row.description || '-'}>
                      <Typography sx={{
                        fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                        fontSize: '14px',
                        fontWeight: 400,
                        color: '#575757',
                        letterSpacing: '0.1px',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}>
                        {row.description || '-'}
                      </Typography>
                    </OverflowTooltip>
                  </TableCell>

                  {/* Last Modification Time */}
                  <TableCell sx={{ padding: '0px 20px', overflow: 'hidden' }}>
                    <OverflowTooltip text={row.lastModified}>
                      <Typography sx={{
                        fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                        fontSize: '14px',
                        fontWeight: 400,
                        color: '#575757',
                        letterSpacing: '0.1px',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}>
                        {row.lastModified}
                      </Typography>
                    </OverflowTooltip>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
    </Paper>
  ) : (
    <Box sx={{
      flex: 1, backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #DADCE0',
      overflow: 'hidden', marginTop: '5rem', alignItems: 'center', justifyContent: 'center',
      display: 'flex', minHeight: '400px'
    }}>
      <p>{error}</p>
    </Box>
  ) : (
    <Box data-testid="entry-list-skeleton" sx={{  width: '100%', boxSizing: 'border-box' }}>
      {/* Header skeleton: Search bar ONLY */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', marginTop: '6px' }}>
          <Skeleton variant="rounded" width={300} height={32} sx={{ borderRadius: '54px' }} />
      </Box>
      
      {/* Table skeleton */}
      <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8EEF5', width: '100%', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', padding: '12px 20px', borderBottom: '1px solid #DADCE0', gap: '20px' }}>
              <Skeleton variant="text" width="25%" height={20} />
              <Skeleton variant="text" width="50%" height={20} />
              <Skeleton variant="text" width="25%" height={20} />
          </Box>
          {Array.from({ length: 6 }).map((_, index) => (
              <Box key={index} sx={{ display: 'flex', padding: '16px 20px', borderBottom: index < 5 ? '1px solid #E8EEF5' : 'none', gap: '20px', alignItems: 'center' }}>
                  <Skeleton variant="text" width="25%" height={20} />
                  <Skeleton variant="text" width="50%" height={20} />
                  <Skeleton variant="text" width="25%" height={20} />
              </Box>
          ))}
      </Box>
    </Box>
  );
};

export default EntryList;
