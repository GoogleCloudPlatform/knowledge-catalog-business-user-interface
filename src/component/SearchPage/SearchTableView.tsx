import React, { useState, useRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip } from '@mui/material';
import { Lock, LocationOnOutlined } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import Tag from '../Tags/Tag';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from '../Schema/ResizeHandle';

/**
 * @file SearchTableView.tsx
 * @description
 * This component renders search results in a Material-UI `Table` view.
 *
 * It displays a list of `resources` in rows, with columns for Name,
 * Description, Type (as `Tag` components), Location, and Last Modified date.
 * It provides local state for sorting the "Name" and "Last modified" columns
 * in ascending, descending, or default order.
 *
 * The component relies on helper functions passed as props (`getFormatedDate`,
 * `getEntryType`) to correctly parse and display data.
 *
 * @param {SearchTableViewProps} props - The props for the component.
 * @param {any[]} props.resources - An array of resource objects to be
 * displayed in the table.
 * @param {(entry: any) => void} props.onRowClick - A callback function
 * triggered when a table row is clicked, passing the corresponding entry object.
 * @param {(entry: any) => void} props.onFavoriteClick - A callback function
 * triggered when the favorite (star) icon is clicked. (Note: This
 * functionality is currently commented out in the component's implementation).
 * @param {(date: any) => string} props.getFormatedDate - A utility function
 * to convert a timestamp (e.g., in seconds) into a formatted date string.
 * @param {(namePath: string, separator: string) => string} props.getEntryType -
 * A utility function to parse the entry's type from its full name path.
 *
 * @returns {React.ReactElement} A React element rendering the `TableContainer`
 * with the sortable list of search results.
 */

interface SearchTableViewProps {
  resources: any[];
  onRowClick: (entry: any) => void;
  onFavoriteClick: (entry: any) => void;
  getFormatedDate: (date: any) => string;
  getEntryType: (namePath: string, separator: string) => string;
  previewOpen?: boolean;
  selectedEntryName?: string | null;
  isDataProduct?: boolean;
}

// const capitalizeFirstLetter = (s: any) => {
//   if (typeof s !== 'string' || s.length === 0) {
//     return '';
//   }
//   return s.charAt(0).toUpperCase() + s.slice(1);
// };

const getNameFromEntry = (entry: any) => {
  var calculatedName = '';
  if (entry?.entrySource?.displayName && entry.entrySource.displayName.length > 0) {
    calculatedName = entry.entrySource.displayName;
  } else if (entry.name) {
    const segments = entry.name.split('/');
    calculatedName = segments[segments.length - 1];
  }
  return calculatedName;
}
const OverflowTooltip: React.FC<{ text: string; children: React.ReactElement<{ onMouseEnter?: React.MouseEventHandler<HTMLElement> }> }> = ({ text, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    setShowTooltip(el.scrollWidth > el.clientWidth);
  };

  return (
    <Tooltip title={text} arrow disableHoverListener={!showTooltip}>
      {React.cloneElement(children, { onMouseEnter: handleMouseEnter })}
    </Tooltip>
  );
};

const OverflowTag: React.FC<{ text: string; className?: string; css?: React.CSSProperties }> = ({ text, className, css }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    const el = spanRef.current?.querySelector('span') as HTMLElement;
    if (el) setShowTooltip(el.scrollWidth > el.clientWidth);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <Tooltip title={showTooltip ? text : ''} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -8] } }] } }}>
      <span
        ref={spanRef}
        style={{ maxWidth: '100%', overflow: 'hidden' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Tag text={text} className={className} css={{ ...css, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block' }} />
      </span>
    </Tooltip>
  );
};

const SearchTableView: React.FC<SearchTableViewProps> = ({
  resources,
  onRowClick,
  // onFavoriteClick,
  getFormatedDate,
  getEntryType,
  previewOpen,
  selectedEntryName,
  isDataProduct
}) => {
  const mode = useSelector((state: any) => state.user.mode) as string;
  const isDark = mode === 'dark';
  // const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<'name' | 'date' | 'location' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const COLUMN_CONFIGS = React.useMemo(() => [
    { key: 'name', initialWidth: 250, minWidth: 120 },
    { key: 'description', initialWidth: 300, minWidth: 120 },
    { key: 'type', initialWidth: 170, minWidth: 100 },
    { key: 'location', initialWidth: 130, minWidth: 80 },
    { key: 'lastModified', initialWidth: 150, minWidth: 100 },
  ], []);

  const { columnWidths, activeIndex, handleMouseDown } = useColumnResize({
    columns: COLUMN_CONFIGS,
    mode: 'coupled',
  });

  const columnPercents = React.useMemo(() => {
    const total = columnWidths.reduce((s, w) => s + w, 0);
    return columnWidths.map(w => `${((w / total) * 100).toFixed(2)}%`);
  }, [columnWidths]);

  const handleRowClick = (entry: any) => {
    onRowClick(entry);
  };

  const displayedResources = React.useMemo(() => {
    if (!sortColumn) return resources;

    if (sortColumn === 'date') {
      const toTimestamp = (raw: any) => {
        if (!raw) return 0;
        if (typeof raw === 'string') return new Date(raw).getTime();
        if (raw.seconds) return raw.seconds * 1000;
        return typeof raw === 'number' ? raw * 1000 : 0;
      };
      const sorted = [...resources].sort((a: any, b: any) => {
        const aTs = toTimestamp(a?.dataplexEntry?.updateTime || a?.dataplexEntry?.createTime);
        const bTs = toTimestamp(b?.dataplexEntry?.updateTime || b?.dataplexEntry?.createTime);
        return aTs - bTs;
      });
      return sortOrder === 'asc' ? sorted : sorted.reverse();
    }

    if (sortColumn === 'name') {
      const sorted = [...resources].sort((a: any, b: any) => {
        const aName = (a?.dataplexEntry?.name || '').split('/').pop() || '';
        const bName = (b?.dataplexEntry?.name || '').split('/').pop() || '';
        return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
      });
      return sortOrder === 'asc' ? sorted : sorted.reverse();
    }

    if (sortColumn === 'location') {
      const sorted = [...resources].sort((a: any, b: any) => {
        const aLoc = a?.dataplexEntry?.entrySource?.location || '';
        const bLoc = b?.dataplexEntry?.entrySource?.location || '';
        return aLoc.localeCompare(bLoc, undefined, { sensitivity: 'base' });
      });
      return sortOrder === 'asc' ? sorted : sorted.reverse();
    }

    return resources;
  }, [resources, sortColumn, sortOrder]);

  const handleToggleNameSort = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sortColumn === 'name') {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        // desc → back to default (most relevant)
        setSortColumn(null);
        setSortOrder('asc');
      }
    } else {
      setSortColumn('name');
      setSortOrder('asc');
    }
  };

  const handleToggleDateSort = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sortColumn === 'date') {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        // desc → back to default (most relevant)
        setSortColumn(null);
        setSortOrder('asc');
      }
    } else {
      setSortColumn('date');
      setSortOrder('asc');
    }
  };

  const handleToggleLocationSort = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sortColumn === 'location') {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortColumn(null);
        setSortOrder('asc');
      }
    } else {
      setSortColumn('location');
      setSortOrder('asc');
    }
  };

  const getLocationSortTooltip = (): string => {
    if (sortColumn === 'location' && sortOrder === 'asc') {
      return 'Sort Z to A';
    }
    if (sortColumn === 'location' && sortOrder === 'desc') {
      return '';
    }
    return 'Sort A to Z';
  };

  const getNameSortTooltip = (): string => {
    if (sortColumn === 'name' && sortOrder === 'asc') {
      return 'Sort Z to A';
    }
    if (sortColumn === 'name' && sortOrder === 'desc') {
      return '';
    }
    return 'Sort A to Z';
  };

  const getDateSortTooltip = (): string => {
    if (sortColumn === 'date' && sortOrder === 'asc') {
      return 'Sort new to old';
    }
    if (sortColumn === 'date' && sortOrder === 'desc') {
      return '';
    }
    return 'Sort old to new';
  };

  return (
    <TableContainer
      component={Paper}
          sx={{
      backgroundColor: isDark ? '#131314' : '#FFFFFF',
      borderRadius: '16px',
      border: isDark ? '1px solid #3c4043' : '1px solid #E8EEF5',
      boxShadow: 'none',
      maxHeight: 'calc(100vh - 140px)',
      overflowY: 'auto',
      overflowX: 'auto',
      width: '100%',
      maxWidth: '100%',
      marginLeft: '0px',
    }}
    >
      <Table sx={{ width: '100%', tableLayout: 'fixed' }} aria-label="search results table">
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
                borderBottom: 'none',
                padding: '0px !important',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: '0px',
                right: '0px',
                height: '1px',
                backgroundColor: isDataProduct && !isDark ? '#E8EEF5' : (mode === 'dark' ? '#3c4043' : '#DADCE0'),
              },
            }}
          >
            {/* Name */}
            <TableCell
              sx={{
                  fontFamily: '"Google Sans", sans-serif', 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  height: '48px', 
                  color: isDark ? '#dedfe0' : '#444746', 
                  position: 'relative',
                  padding: '0px !important'
              }}
            >
              <Tooltip title={getNameSortTooltip()} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Box
                  role="button"
                  onClick={handleToggleNameSort}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    padding: '0px 20px',
                    margin: '0px',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: isDark ? '#3c4043' : '#F8F9FA',
                    },
                  }}
                >
                  <span>Name</span>
                  <Box
                    component="span"
                    className="sort-btn"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      opacity: sortColumn === 'name' ? 1 : 0,
                      transform: (sortColumn === 'name' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="12" fill={isDark ? '#004a77' : '#C2E7FF'}/>
                      <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill={isDark ? '#8ab4f8' : '#004A77'}/>
                    </svg>
                  </Box>
                </Box>
              </Tooltip>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(0, e); }}
                isActive={activeIndex === 0}
                darkMode={isDark}
              />
            </TableCell>

            {/* Description */}
            <TableCell
              sx={{
                fontFamily: '"Google Sans", sans-serif', 
                fontSize: '14px', 
                fontWeight: 600, 
                height: '48px', 
                color: isDark ? '#dedfe0' : '#444746', 
                position: 'relative',
                padding: '0px !important'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', boxSizing: 'border-box', padding: '0px 20px' }}>
              Description
              </Box>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(1, e); }}
                isActive={activeIndex === 1}
                darkMode={isDark}
              />
            </TableCell>

            {/* Type */}
            <TableCell
              sx={{
                fontFamily: '"Google Sans", sans-serif', 
                fontSize: '14px', 
                fontWeight: 600, 
                height: '48px', 
                color: isDark ? '#dedfe0' : '#444746', 
                position: 'relative',
                padding: '0px !important'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', boxSizing: 'border-box', padding: '0px 20px' }}>
              Type
              </Box>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(2, e); }}
                isActive={activeIndex === 2}
                darkMode={isDark}
              />
            </TableCell>

            {/* Location */}
            <TableCell
              sx={{
                fontFamily: '"Google Sans", sans-serif', 
                fontSize: '14px', 
                fontWeight: 600, 
                height: '48px', 
                color: isDark ? '#dedfe0' : '#444746', 
                position: 'relative',
                padding: '0px !important'
              }}
            >
              <Tooltip title={getLocationSortTooltip()} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Box
                  role="button"
                  onClick={handleToggleLocationSort}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                    padding: '0px 20px',
                    margin: '0px',
                    boxSizing: 'border-box',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: isDark ? '#3c4043' : '#F8F9FA',
                    },
                  }}
                >
                  <span>Location</span>
                  <Box
                    component="span"
                    className="sort-btn"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      opacity: sortColumn === 'location' ? 1 : 0,
                      transform: (sortColumn === 'location' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="12" fill={isDark ? '#004a77' : '#C2E7FF'}/>
                      <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill={isDark ? '#8ab4f8' : '#004A77'}/>
                    </svg>
                  </Box>
                </Box>
              </Tooltip>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(3, e); }}
                isActive={activeIndex === 3}
                darkMode={isDark}
              />
            </TableCell>

            {/* Last Modified */}
            <TableCell
              sx={{
                fontFamily: '"Google Sans", sans-serif', 
                fontSize: '14px', 
                fontWeight: 600, 
                height: '48px', 
                color: isDark ? '#dedfe0' : '#444746', 
                position: 'relative',
                padding: '0px !important'
              }}
            >
              <Tooltip title={getDateSortTooltip()} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Box
                  role="button"
                  onClick={handleToggleDateSort}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    padding: previewOpen ? '0px 8px 0px 20px' : '0px 20px',
                    margin: '0px',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: isDark ? '#3c4043' : '#F8F9FA',
                    },
                  }}
                >
                  <Box
                    component="span"
                    className="sort-btn"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      opacity: sortColumn === 'date' ? 1 : 0,
                      transform: (sortColumn === 'date' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="12" fill={mode === 'dark' ? '#004a77' : '#C2E7FF'}/>
                      <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill={mode === 'dark' ? '#8ab4f8' : '#004A77'}/>
                    </svg>
                  </Box>
                  <span style={{ whiteSpace: 'nowrap' }}>Last modified</span>
                </Box>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedResources.map((resource: any) => {
            const entry = resource.dataplexEntry;
            // const isFavorite = favorites.has(entry.name);
            const hasLock = entry.name.includes('Sales_Dataset') || entry.name.includes('sales_reporting'); // Demo logic
            const isSelected = selectedEntryName === entry.name;

            return (
              <TableRow
                key={entry.name}
                className={isSelected ? 'row-selected' : ''}
                onClick={() => handleRowClick(entry)}
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  height: '60px',
                  backgroundColor: isDataProduct && !isDark ? '#FFFFFF' : (isDark ? '#131314' : '#FFFFFF'),
                  
                  '& .MuiTableCell-root': {
                    borderBottom: 'none',
                    backgroundColor: isSelected ? (mode === 'dark' ? '#004a76' : '#EDF2FC') : undefined,
                  },
                  '&:hover .MuiTableCell-root': {
                    backgroundColor: isSelected ? (mode === 'dark' ? '#185683' : '#EDF2FC') : (mode === 'dark' ? '#3c4043' : '#F8F9FA'),
                  },

                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '0px',
                    right: '0px',
                    height: '1px',
                    backgroundColor: isDataProduct && !isDark ? '#E8EEF5' : (mode === 'dark' ? '#3c4043' : '#DADCE0'),
                  },
                  '&:last-child::after': {
                    display: isDataProduct ? 'none' : 'block'
                  },
                }}
              >
                {/* Name */}
                <TableCell
                  sx={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontSize: '12px',
                    color: mode === 'dark' ? '#dedfe0' : '#1F1F1F',
                    padding: '10px 20px',
                    paddingLeft: '20px',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', overflow: 'hidden' }}>
                    <OverflowTooltip text={getNameFromEntry(entry)}>
                      <Typography
                        sx={{
                          flex: 1,
                          fontFamily: '"Google Sans", sans-serif',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: isDark ? '#dedfe0' : '#022FCD',
                          cursor: 'pointer',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            textDecoration: isDataProduct ? 'underline' : 'none'
                          }
                        }}
                      >
                        {getNameFromEntry(entry)}
                      </Typography>
                    </OverflowTooltip>
                    {hasLock && (
                      <Lock sx={{ fontSize: '12px', color: mode === 'dark' ? '#dedfe0' : '#575757', flexShrink: 0 }} />
                    )}
                  </Box>
                </TableCell>

                {/* Description */}
                <TableCell
                  sx={{
                    fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                    fontSize: '12px',
                    color: mode === 'dark' ? '#dedfe0' : '#575757',
                    padding: '10px 20px',
                    overflow: 'hidden',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                      fontSize: '14px',
                      fontWeight: '400',
                      color: mode === 'dark' ? '#dedfe0' : '#575757',
                      letterSpacing: '0.1px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {entry.entrySource?.description || 'No Description Available'}
                  </Typography>
                </TableCell>

                {/* Type */}
                <TableCell
                  sx={{
                    padding: '10px 20px',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: '8px', flexWrap: previewOpen ? 'nowrap' : 'wrap', overflow: 'hidden' }}>
                    <OverflowTag
                      text={(() => {
                        const sys = entry.entrySource?.system;
                        if (!sys) return 'Custom';
                        const lower = sys.toLowerCase();
                        if (lower === 'dataplex universal catalog' || lower === 'dataplex') return 'Knowledge Catalog';
                        if (lower === 'bigquery') return 'BigQuery';
                        return sys.charAt(0).toUpperCase() + sys.slice(1).toLowerCase();
                      })()}
                      className="asset-tag"
                      css={{
                        fontFamily: '"Google Sans", sans-serif',
                        background: 'rgba(7, 106, 255, 0.1)',
                        border: '1px solid rgba(7, 106, 255, 0.2)',
                        color: '#076AFF',
                        borderRadius: '12px',
                        height: 'auto',
                        padding: '4px 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        letterSpacing: '0.2px',
                        lineHeight: 1,
                        textTransform: 'capitalize',
                        cursor: 'default',
                        transition: 'none',
                      }}
                    />
                    <OverflowTag
                      text={getEntryType(entry.name, '/')}
                      className="asset-tag"
                      css={{
                        fontFamily: '"Google Sans", sans-serif',
                        background: 'rgba(7, 106, 255, 0.1)',
                        border: '1px solid rgba(7, 106, 255, 0.2)',
                        color: '#076AFF',
                        height: 'auto',
                        borderRadius: '12px',
                        padding: '4px 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        letterSpacing: '0.2px',
                        lineHeight: 1,
                        cursor: 'default',
                        transition: 'none',
                      }}
                    />
                  </Box>
                </TableCell>

                {/* Location */}
                <TableCell sx={{ padding: '10px 20px', overflow: 'hidden' }}>
                  <OverflowTooltip text={entry.entrySource?.location || '-'}>
                    <Box sx={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      border: '1px solid #C4E9D8', 
                      borderRadius: '12px', 
                      backgroundColor: '#F5FEF8',
                      padding: '0px 8px',
                      height: '24px',
                      maxWidth: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <LocationOnOutlined sx={{ fontSize: '14px', color: '#027E4C', flexShrink: 0 }} />
                      <Typography sx={{ 
                        fontFamily: '"Google Sans", sans-serif', 
                        fontSize: '12px', 
                        fontWeight: 600,
                        color: '#027E4C', 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0
                      }}>
                        {(entry.entrySource?.location || '-').charAt(0).toUpperCase() + (entry.entrySource?.location || '').slice(1)}
                      </Typography>
                    </Box>
                  </OverflowTooltip>
                </TableCell>

                {/* Last Modified */}
                <TableCell
                  sx={{
                    fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                    fontSize: '14px',
                    fontWeight: '400',
                    color: mode === 'dark' ? '#dedfe0' : '#575757',
                    padding: previewOpen ? '10px 8px 10px 20px' : '10px 20px',
                    letterSpacing: '0.1px',
                    textAlign: 'right',
                  }}
                >
                  {getFormatedDate(entry?.updateTime || entry?.createTime)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SearchTableView;
