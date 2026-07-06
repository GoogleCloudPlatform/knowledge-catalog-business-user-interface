import React, { useCallback, useState, useRef } from 'react';
import {
  Typography,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Paper,
  IconButton,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import FilterBar from '../Common/FilterBar';
import type { ActiveFilter, PropertyConfig } from '../Common/FilterBar';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from '../Schema/ResizeHandle';

// interface for the AccessRequests Props
interface AccessRequestsProps {
  entry: any;
  changeRequests: any[];
  css: React.CSSProperties;
}

// Columns rendered by the table — `sortable` columns expose the sort affordance
type ColumnKey = 'requestor' | 'requestedFor' | 'accessGroup' | 'status' | 'lastModified' | 'justification' | 'expand';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  sortable: boolean;
  align?: 'left' | 'right';
  initialWidth: number;
  minWidth: number;
}

const COLUMNS: ColumnDef[] = [
  { key: 'requestor', label: 'Requestor', sortable: true, initialWidth: 260, minWidth: 160 },
  { key: 'requestedFor', label: 'Requested for', sortable: true, initialWidth: 230, minWidth: 120 },
  { key: 'accessGroup', label: 'Access group', sortable: true, initialWidth: 200, minWidth: 120 },
  { key: 'status', label: 'Status', sortable: true, initialWidth: 140, minWidth: 100 },
  { key: 'lastModified', label: 'Last Modified', sortable: true, initialWidth: 160, minWidth: 120 },
  { key: 'justification', label: 'Requestor justification', sortable: false, initialWidth: 220, minWidth: 120 },
  { key: 'expand', label: '', sortable: false, align: 'right', initialWidth: 80, minWidth: 60 },
];

const TruncatedTooltip = ({ value, sxProps, isResizing }: { value: string, sxProps: any, isResizing: boolean }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const handleMouseEnter = () => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  };

  // Conditionally clear the title instead of disabling the hover listener.
  // MUI will automatically hide the tooltip if the title is falsy ("").
  const tooltipText = (isTruncated && !isResizing) ? value : "";

  return (
    <Tooltip 
      title={tooltipText} 
      placement="top-start"
    >
      <Typography
        ref={textRef}
        onMouseEnter={handleMouseEnter}
        sx={sxProps}
      >
        {value}
      </Typography>
    </Tooltip>
  );
};

// Format an ISO timestamp into "May 7, 2025"
const formatDate = (iso?: string): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AccessRequests: React.FC<AccessRequestsProps> = ({ changeRequests, css }) => {

  // Normalize the raw change requests into flat rows keyed by column
  const rows = React.useMemo(
    () =>
      changeRequests.map((req: any) => ({
        requestor: req.author ?? '-',
        requestedFor: req.dataProductAccessRequest?.requestedPrincipal ?? (req.author ? `user:${req.author}` : '-'),
        accessGroup: req.dataProductAccessRequest?.accessGroupDisplayName ?? '-',
        status: req.state ?? '-',
        lastModified: formatDate(req.updateTime),
        justification: req.justification ?? '-',
        _raw: req,
      })),
    [changeRequests]
  );

  const [filterText, setFilterText] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<ColumnKey | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Column config for the resize hook (coupled mode keeps total width fixed)
  const COLUMN_CONFIGS = React.useMemo(
    () => COLUMNS.map(c => ({ key: c.key, initialWidth: c.initialWidth, minWidth: c.minWidth })),
    []
  );

  const { columnWidths, activeIndex, handleMouseDown } = useColumnResize({
    columns: COLUMN_CONFIGS,
    mode: 'coupled',
  });

  const columnPercents = React.useMemo(() => {
    const total = columnWidths.reduce((s, w) => s + w, 0);
    return columnWidths.map(w => `${((w / total) * 100).toFixed(2)}%`);
  }, [columnWidths]);

  // Filter properties are the visible (non-action) columns
  const columnProperties: PropertyConfig[] = React.useMemo(() => {
    const props: PropertyConfig[] = COLUMNS
      .filter(c => c.key !== 'expand' && c.key !== 'justification' && c.key !== 'lastModified')
      .map(c => ({ name: c.label, mode: 'both' as const }));

    // Add custom date filters
    props.push({ 
      name: 'Last modified before', 
      mode: 'text', 
      type: 'date',
      hint: 'Format: YYYY-MM-DD' 
    });
    props.push({ 
      name: 'Last modified after', 
      mode: 'text', 
      type: 'date',
      hint: 'Format: YYYY-MM-DD' 
    });

    return props;
  }, []);

  // Map a filter property label back to the row key
  const labelToKey = React.useMemo(() => {
    const map: Record<string, ColumnKey> = {};
    COLUMNS.forEach(c => { map[c.label] = c.key; });
    return map;
  }, []);

  const getPropertyValues = useCallback((property: string): string[] => {
    const key = labelToKey[property];
    if (!key) return [];
    const values = new Set<string>();
    rows.forEach((row: any) => {
      const val = row[key];
      if (val != null) {
        const str = String(val);
        if (str && str !== '-') values.add(str);
      }
    });
    return Array.from(values).sort();
  }, [rows, labelToKey]);

  // Sort toggle: asc -> desc -> none
  const handleToggleSort = (col: ColumnKey) => (event: React.MouseEvent) => {
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

  const getSortTooltip = (col: ColumnKey): string => {
    if (col === 'lastModified') {
      if (sortColumn === col && sortOrder === 'asc') return 'Sort new to old';
      if (sortColumn === col && sortOrder === 'desc') return '';
      return 'Sort old to new';
    }
    if (sortColumn === col && sortOrder === 'asc') return 'Sort Z to A';
    if (sortColumn === col && sortOrder === 'desc') return '';
    return 'Sort A to Z';
  };

  // Filter rows based on the active filter chips
  const filteredData = React.useMemo(() => {
    if (activeFilters.length === 0) return rows;
    return rows.filter((row: any) => {
      return activeFilters.every(filter => {
        const isTextChip = Boolean(filter.id);

        if (filter.property === 'Last modified before' || filter.property === 'Last modified after') {
          const rowTime = row._raw?.updateTime ? new Date(row._raw.updateTime).getTime() : 0;
          if (!rowTime) return false;

          return filter.values.some(fv => {
            const cleanVal = fv.trim();
            // Strict regex check for YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanVal)) return false;

            const filterTime = new Date(cleanVal).getTime();
            if (Number.isNaN(filterTime)) return false; 

            if (filter.property === 'Last modified before') {
              return rowTime < filterTime;
            } else {
              return rowTime > filterTime;
            }
          });
        }

        // Global search: check across all visible columns
        if (!filter.property) {
          return filter.values.some(fv => {
            const fvLower = fv.toLowerCase();
            return COLUMNS.some(c => {
              return String(row[c.key] ?? '').toLowerCase().includes(fvLower);
            });
          });
        }
        
        // Standard column filtering
        const key = labelToKey[filter.property];
        const rowVal = key ? String(row[key] ?? '') : '';
        return filter.values.some(fv =>
          isTextChip
            ? rowVal.toLowerCase().includes(fv.toLowerCase())
            : rowVal === fv
        );
      });
    });
  }, [rows, activeFilters, labelToKey]);

  // Apply sorting on the filtered rows
  const displayedData = React.useMemo(() => {
    if (!sortColumn) return filteredData;
    const sorted = [...filteredData].sort((a: any, b: any) => {
      if (sortColumn === 'lastModified') {
        const dateA = a._raw?.updateTime ? new Date(a._raw.updateTime).getTime() : 0;
        const dateB = b._raw?.updateTime ? new Date(b._raw.updateTime).getTime() : 0;
        return dateA - dateB;
      }
      
      const aVal = String(a[sortColumn] ?? '').toLowerCase();
      const bVal = String(b[sortColumn] ?? '').toLowerCase();
      return aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
    });
    
    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [filteredData, sortColumn, sortOrder]);


  // Build the access requests table view
  let accessRequestsView: React.ReactNode;

  if (rows.length > 0) {
    accessRequestsView = (
      <>
        {/* Filter Bar with a "View History" action on the right */}
        <FilterBar
          filterText={filterText}
          onFilterTextChange={setFilterText}
          propertyNames={columnProperties}
          getPropertyValues={getPropertyValues}
          activeFilters={activeFilters}
          onActiveFiltersChange={setActiveFilters}
          defaultProperty={columnProperties[0]?.name}
          placeholder="Filter Requests"
          marginLeft="0px"
          sx={{
            backgroundColor: '#F8F9FA',
            marginTop: '16px',
            marginBottom: '16px',
          }}
        />

        {/* Table */}
        {displayedData.length === 0 && activeFilters.length > 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', fontSize: '14px', fontFamily: 'Google Sans, sans-serif', color: '#0C1226CC' }}>
            No data matches the applied filters
          </div>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E8EEF5',
              boxShadow: 'none',
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              overflowX: 'auto',
              width: '100%',
            }}
          >
            <Table sx={{ width: '100%', tableLayout: 'fixed' }} aria-label="access requests table">
              <colgroup>
                {columnPercents.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <TableHead>
                <TableRow
                  sx={{
                    position: 'relative',
                    '& .MuiTableCell-root': {
                      borderBottom: 'none',
                      padding: '12px 20px 4px',
                    },
                    '& .MuiTableCell-root:first-of-type': {
                      paddingLeft: '20px',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '0px',
                      right: '0px',
                      height: '1px',
                      backgroundColor: '#DADCE0',
                    },
                  }}
                >
                  {COLUMNS.map((col, colIndex) => (
                    <TableCell
                      key={col.key}
                      sx={{
                        fontSize: '14px',
                        fontWeight: 600,
                        lineHeight: '40px',
                        color: '#444746',
                        fontFamily: '"Google Sans", sans-serif',
                        position: 'relative',
                        textAlign: col.align ?? 'left',
                        padding: '0px !important'
                      }}
                    >
                      {col.sortable ? (
                        <Tooltip title={getSortTooltip(col.key)} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                          <Box
                            role="button"
                            onClick={handleToggleSort(col.key)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                              height: '100%', width: '100%', borderRadius: '0px', padding: '12px 20px 4px 20px', margin: '0px',
                              transition: 'background-color 0.2s ease',
                              justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
                              '&:hover': { backgroundColor: '#F8F9FA' },
                            }}
                          >
                            <span>{col.label}</span>
                            <Box component="span" className="sort-btn" sx={{
                              display: 'flex', alignItems: 'center', flexShrink: 0,
                              opacity: sortColumn === col.key ? 1 : 0,
                              transform: (sortColumn === col.key && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="12" fill="#C2E7FF"/>
                                <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill="#004A77"/>
                              </svg>
                            </Box>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            height: '100%',
                            width: '100%',
                            padding: '12px 20px 4px 20px',
                            justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <span>{col.label}</span>
                        </Box>
                      )}
                      {colIndex < COLUMNS.length - 1 && (
                        <ResizeHandle
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(colIndex, e); }}
                          isActive={activeIndex === colIndex}
                          darkMode={false}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedData.map((row: any, index: number) => {
                  const isExpanded = expandedRows.has(index);
                  return (
                    <React.Fragment key={index}>
                      {/* Main Visible Row */}
                      <TableRow
                        onClick={() => toggleRow(index)}
                        sx={{
                          position: 'relative',
                          cursor: 'pointer',
                          height: '60px',
                          backgroundColor: '#FFFFFF',
                          '& .MuiTableCell-root': { borderBottom: 'none' },
                          '&:hover .MuiTableCell-root': { backgroundColor: '#F8F9FA' },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: 0,
                            left: '0px',
                            right: '0px',
                            height: '1px',
                            backgroundColor: '#E8EEF5',
                          },
                          '&:last-child::after': { display: 'none' } 
                        }}
                      >
                        {COLUMNS.map((col) => {
                          if (col.key === 'expand') {
                            return (
                              <TableCell 
                                key={col.key} 
                                sx={{ 
                                  padding: isExpanded ? '20px 20px 10px 20px' : '10px 20px', 
                                  textAlign: 'right',
                                  verticalAlign: isExpanded ? 'top' : 'middle', 
                                }}
                              >
                                <IconButton 
                                  size="small" 
                                  sx={{ 
                                    color: '#575757',
                                    // Nudge icon up slightly to align with text when expanded
                                    marginTop: isExpanded ? '-6px' : '0px' 
                                  }}
                                >
                                  {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                </IconButton>
                              </TableCell>
                            );
                          }

                          const value = row[col.key] ?? '-';
                          const isTableResizing = activeIndex !== null && activeIndex !== undefined && activeIndex !== -1;

                          const typographyStyles = {
                            fontFamily: col.key === 'requestor'
                              ? '"Google Sans", sans-serif'
                              : '"Product Sans", "Google Sans Text", sans-serif',
                            fontSize: '14px',
                            fontWeight: 400,
                            color: col.key === 'requestor' ? '#1F1F1F' : '#575757',
                            textOverflow: (isExpanded && col.key === 'justification') ? 'clip' : 'ellipsis',
                            overflow: (isExpanded && col.key === 'justification') ? 'visible' : 'hidden',
                            whiteSpace: (isExpanded && col.key === 'justification') ? 'pre-wrap' : 'nowrap',
                            wordBreak: (isExpanded && col.key === 'justification') ? 'break-word' : 'normal',
                          };

                          const needsEllipsisTooltip = ['requestor', 'requestedFor', 'accessGroup'].includes(col.key);

                          return (
                            <TableCell 
                              key={col.key} 
                              sx={{ 
                                // Increase top padding slightly when expanded so text stays exactly where it was
                                padding: isExpanded ? '20px 20px 10px 20px' : '10px 20px', 
                                overflow: 'hidden',
                                verticalAlign: isExpanded ? 'top' : 'middle', 
                              }}
                            >
                              {needsEllipsisTooltip ? (
                                <TruncatedTooltip 
                                  value={value} 
                                  sxProps={typographyStyles} 
                                  isResizing={isTableResizing} 
                                />
                              ) : (
                                <Typography sx={typographyStyles}>
                                  {value}
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </>
    );
  } else {
    accessRequestsView = (
      <Box sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 0",
        gap: 2,
      }}>
        <Typography variant="body1" color="#0C1226CC">
          No Access Requests to display.
        </Typography>
      </Box>
    );
  }

  return (
    <div style={{ width: '100%', ...css }}>
      <Grid container>
        <Grid size={12}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            paddingTop: '0px',
            paddingLeft: '0px',
          }}>
            {accessRequestsView}
          </Box>
        </Grid>
      </Grid>
    </div>
  );
};

export default AccessRequests;
