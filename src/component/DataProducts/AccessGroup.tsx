import React, { useCallback, useEffect, useState } from 'react';
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
  Skeleton
} from '@mui/material';
import FilterBar from '../Common/FilterBar';
import type { ActiveFilter, PropertyConfig } from '../Common/FilterBar';
import { useSelector } from 'react-redux';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from '../Schema/ResizeHandle';


// //interface for the filter dropdown Props
interface AccessGroupProps {
  entry: any;
  selectedDataProduct?: any;
  css: React.CSSProperties; // Optional CSS properties for the button
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

const AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg, #1CB5E0 0%, #000851 100%)' },
  { bg: 'linear-gradient(135deg, #56AB2F 0%, #A8E063 100%)' },
  { bg: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)' },
  { bg: 'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)' },
];

const getAvatarColor = (email: string): string => {
  const code = email.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length].bg;
};

// FilterDropdown component
const AccessGroup: React.FC<AccessGroupProps> = ({ entry, css }) => {

  const [accessPermissionData, setAccessPermissionData] = useState<any[]>([]);
  const [filterText, setFilterText] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<'Name' | 'Type' | 'System' | 'Source-Project' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const {dataProductAssets, dataProductAssetsStatus }= useSelector((state: any) => state.dataProducts);

  const number = entry?.entryType?.split('/')[1];

  // Column config for resize hook (SearchTableView pattern)
  const COLUMN_CONFIGS = React.useMemo(() => [
    { key: 'name', initialWidth: 200, minWidth: 100 },
    { key: 'type', initialWidth: 160, minWidth: 80 },
    { key: 'system', initialWidth: 150, minWidth: 80 },
    { key: 'sourceProject', initialWidth: 200, minWidth: 100 },
    { key: 'mappedPermissions', initialWidth: 240, minWidth: 150 },
  ], []);

  const { columnWidths, activeIndex, handleMouseDown } = useColumnResize({
    columns: COLUMN_CONFIGS,
    mode: 'coupled',
  });

  const columnPercents = React.useMemo(() => {
    const total = columnWidths.reduce((s, w) => s + w, 0);
    return columnWidths.map(w => `${((w / total) * 100).toFixed(2)}%`);
  }, [columnWidths]);

  useEffect(() => {
    if(dataProductAssetsStatus === 'succeeded') {
      console.log(number);
        const assetData:any[] = Array.isArray(dataProductAssets) ? dataProductAssets.map((asset:any) => {
            const mapPermission = Object.keys(asset?.accessGroupConfigs || {}).map((accessGroupId:any) => {
                const roles = asset.accessGroupConfigs[accessGroupId].iamRoles || [];
                return `${accessGroupId} : ${roles.join(', ')}`;
            });

            return ({
                Name: asset.resource.split('/').pop(),
                Type: asset.resource.split('/').slice(-2, -1)[0],
                System: 'Bigquery',
                'Source-Project': asset.resource.split('projects/')[1].split('/')[0],
                'Mapped-Permissions': mapPermission,
        })}) : [];

        setAccessPermissionData(assetData);
    }
  }, [dataProductAssets]);

  let selectedDataProduct = localStorage.getItem('selectedDataProduct') ?
  JSON.parse(localStorage.getItem('selectedDataProduct') || '{}') : {};

  let accessGroups = selectedDataProduct ? (selectedDataProduct?.accessGroups || {}): {};

  const columnKeys = React.useMemo(() => {
    if (accessPermissionData.length > 0) {
      return Object.keys(accessPermissionData[0]);
    }
    return [];
  }, [accessPermissionData]);

  const columnProperties: PropertyConfig[] = React.useMemo(
    () => columnKeys.map(key => ({ name: key, mode: 'both' as const })),
    [columnKeys]
  );

  const getPropertyValues = useCallback((property: string): string[] => {
    const values = new Set<string>();
    accessPermissionData.forEach((row: any) => {
      const val = row[property];
      if (val != null && typeof val !== 'object') {
        const str = String(val);
        if (str && str !== '-') values.add(str);
      }
    });
    return Array.from(values).sort();
  }, [accessPermissionData]);

  // Sorting logic (SearchTableView pattern)
  const handleToggleSort = (col: 'Name' | 'Type' | 'System' | 'Source-Project') => (event: React.MouseEvent) => {
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

  // Filter data based on active filter chips
  const filteredData = React.useMemo(() => {
    if (activeFilters.length === 0) return accessPermissionData;
    return accessPermissionData.filter((row: any) => {
      return activeFilters.every(filter => {
        const isTextChip = Boolean(filter.id);
        // Global search: check across all columns
        if (!filter.property) {
          return filter.values.some(fv => {
            const fvLower = fv.toLowerCase();
            return Object.values(row).some(cellVal => {
              if (cellVal == null || typeof cellVal === 'object') return false;
              return String(cellVal).toLowerCase().includes(fvLower);
            });
          });
        }
        const val = row[filter.property];
        const rowVal = (val != null && typeof val !== 'object') ? String(val) : '';
        return filter.values.some(fv =>
          isTextChip
            ? rowVal.toLowerCase().includes(fv.toLowerCase())
            : rowVal === fv
        );
      });
    });
  }, [accessPermissionData, activeFilters]);

  // Display data: apply sort on filtered data
  const displayedData = React.useMemo(() => {
    if (!sortColumn) return filteredData;

    const sorted = [...filteredData].sort((a: any, b: any) => {
      const aVal = String(a[sortColumn] ?? '').toLowerCase();
      const bVal = String(b[sortColumn] ?? '').toLowerCase();
      return aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
    });

    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [filteredData, sortColumn, sortOrder]);

  // Build access permission table view
  let accessPermissionView: React.ReactNode;

  if (accessPermissionData && accessPermissionData.length > 0) {
    accessPermissionView = (
      <>
        {/* Filter Bar */}
        <FilterBar
          filterText={filterText}
          onFilterTextChange={setFilterText}
          propertyNames={columnProperties}
          getPropertyValues={getPropertyValues}
          activeFilters={activeFilters}
          onActiveFiltersChange={setActiveFilters}
          defaultProperty={columnKeys[0]}
          placeholder="Enter property name or value"
          marginLeft="0px"
          sx={{ 
            backgroundColor: '#F8F9FA', 
            padding: '12px 0px', 
          }}
        />
        {/* Table - SearchTableView pattern */}
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
          <Table sx={{ width: '100%', tableLayout: 'fixed' }} aria-label="asset permissions table">
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
                    backgroundColor: '#E8EEF5',
                  },
                }}
              >
                {/* Name */}
                <TableCell
                  sx={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#444746',
                    fontFamily: '"Google Sans", sans-serif',
                    position: 'relative',
                    lineHeight: '40px',
                    padding: '0px !important',
                  }}
                >
                  <Tooltip title={getSortTooltip('Name')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                    <Box
                      role="button"
                      onClick={handleToggleSort('Name')}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                        height: '100%', width: '100%', borderRadius: '0px', 
                        padding: '12px 20px 4px 20px', margin: '0px',
                        transition: 'background-color 0.2s ease',
                        '&:hover': { backgroundColor: '#F8F9FA' },
                      }}
                    >
                      <span>Name</span>
                      <Box component="span" className="sort-btn" sx={{
                        display: 'flex', alignItems: 'center', flexShrink: 0,
                        opacity: sortColumn === 'Name' ? 1 : 0,
                        transform: (sortColumn === 'Name' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
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

                {/* Type */}
                <TableCell
                  sx={{
                    fontSize: '14px', fontWeight: '500', color: '#444746',
                    fontFamily: '"Google Sans", sans-serif', position: 'relative',
                    lineHeight: '40px', padding: '0px !important',
                  }}
                >
                  <Tooltip title={getSortTooltip('Type')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                    <Box
                      role="button"
                      onClick={handleToggleSort('Type')}
                      sx={{
                          display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                          height: '100%', width: '100%', borderRadius: '0px', 
                          padding: '12px 20px 4px 20px', margin: '0px',
                          transition: 'background-color 0.2s ease',
                          '&:hover': { backgroundColor: '#F8F9FA' },
                        }}
                    >
                      <span>Type</span>
                      <Box component="span" className="sort-btn" sx={{
                        display: 'flex', alignItems: 'center', flexShrink: 0,
                        opacity: sortColumn === 'Type' ? 1 : 0,
                        transform: (sortColumn === 'Type' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
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
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(1, e); }}
                    isActive={activeIndex === 1}
                    darkMode={false}
                  />
                </TableCell>

                {/* System */}
                <TableCell
                  sx={{
                    fontSize: '14px', fontWeight: '500', color: '#444746',
                    fontFamily: '"Google Sans", sans-serif', position: 'relative',
                    lineHeight: '40px', padding: '0px !important',
                  }}
                >
                  <Tooltip title={getSortTooltip('System')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                    <Box
                      role="button"
                      onClick={handleToggleSort('System')}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                        height: '100%', width: '100%', borderRadius: '0px', 
                        padding: '12px 20px 4px 20px', margin: '0px',
                        transition: 'background-color 0.2s ease',
                        '&:hover': { backgroundColor: '#F8F9FA' },
                      }}
                    >
                      <span>System</span>
                      <Box component="span" className="sort-btn" sx={{
                        display: 'flex', alignItems: 'center', flexShrink: 0,
                        opacity: sortColumn === 'System' ? 1 : 0,
                        transform: (sortColumn === 'System' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
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
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(2, e); }}
                    isActive={activeIndex === 2}
                    darkMode={false}
                  />
                </TableCell>

                {/* Source-Project */}
                <TableCell
                  sx={{
                    fontSize: '14px', fontWeight: '500', color: '#444746',
                    fontFamily: '"Google Sans", sans-serif', position: 'relative',
                    lineHeight: '40px', padding: '0px !important',
                  }}
                >
                  <Tooltip title={getSortTooltip('Source-Project')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                    <Box
                      role="button"
                      onClick={handleToggleSort('Source-Project')}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                        height: '100%', width: '100%', borderRadius: '0px', 
                        padding: '12px 20px 4px 20px', margin: '0px',
                        transition: 'background-color 0.2s ease',
                        '&:hover': { backgroundColor: '#F8F9FA' },
                      }}
                    >
                      <span>Source-Project</span>
                      <Box component="span" className="sort-btn" sx={{
                        display: 'flex', alignItems: 'center', flexShrink: 0,
                        opacity: sortColumn === 'Source-Project' ? 1 : 0,
                        transform: (sortColumn === 'Source-Project' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
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
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(3, e); }}
                    isActive={activeIndex === 3}
                    darkMode={false}
                  />
                </TableCell>

                {/* Mapped-Permissions (no sort, no resize on last) */}
                <TableCell
                  sx={{
                    fontSize: '14px', fontWeight: '500', color: '#444746',
                    fontFamily: '"Google Sans", sans-serif',
                    textAlign: 'right',
                  }}
                >
                  Mapped-Permissions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedData.map((row: any, index: number) => (
                  <TableRow
                    key={index}
                    sx={{
                      position: 'relative',
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
                    {/* Name */}
                    <TableCell sx={{ padding: '10px 20px', overflow: 'hidden' }}>
                      <OverflowTooltip text={row['Name'] ?? '-'}>
                        <Typography sx={{
                          fontFamily: '"Google Sans", sans-serif',
                          fontSize: '14px', fontWeight: 400, color: '#1F1F1F',
                          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                        }}>
                          {row['Name'] ?? '-'}
                        </Typography>
                      </OverflowTooltip>
                    </TableCell>

                    {/* Type */}
                    <TableCell sx={{ padding: '10px 20px', overflow: 'hidden' }}>
                      <OverflowTooltip text={row['Type'] ?? '-'}>
                        <Typography sx={{
                          fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                          fontSize: '14px', fontWeight: 400, color: '#575757',
                          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                        }}>
                          {row['Type'] ?? '-'}
                        </Typography>
                      </OverflowTooltip>
                    </TableCell>

                    {/* System */}
                    <TableCell sx={{ padding: '10px 20px', overflow: 'hidden' }}>
                      <OverflowTooltip text={row['System'] ?? '-'}>
                        <Typography sx={{
                          fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                          fontSize: '14px', fontWeight: 400, color: '#575757',
                          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                        }}>
                          {row['System'] ?? '-'}
                        </Typography>
                      </OverflowTooltip>
                    </TableCell>

                    {/* Source-Project */}
                    <TableCell sx={{ padding: '10px 20px', overflow: 'hidden' }}>
                      <OverflowTooltip text={row['Source-Project'] ?? '-'}>
                        <Typography sx={{
                          fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                          fontSize: '14px', fontWeight: 400, color: '#575757',
                          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                        }}>
                          {row['Source-Project'] ?? '-'}
                        </Typography>
                      </OverflowTooltip>
                    </TableCell>

                    {/* Mapped-Permissions */}
                    <TableCell 
                      sx={{ 
                        padding: '10px 20px', 
                        verticalAlign: Array.isArray(row['Mapped-Permissions']) && row['Mapped-Permissions'].length > 0 ? 'top' : 'middle', 
                        textAlign: 'right' 
                      }}
                    >
                      {Array.isArray(row['Mapped-Permissions']) && row['Mapped-Permissions'].length > 0 ? (
                        row['Mapped-Permissions'].map((mp: string, mpIndex: number) => (
                          <Box key={mpIndex} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '2px 0px' }}>
                            <span style={{ fontWeight: 600, fontSize: '12px', margin: '2px 0px' }}>{mp.split(':')[0]} :</span>
                            <span style={{ fontSize: '12px', padding: '0px 5px', margin: '2px 0px' }}>{mp.split(':')[1]}</span>
                          </Box>
                        ))
                      ) : (
                        <Typography sx={{ 
                          fontFamily: '"Product Sans", "Google Sans Text", sans-serif',
                          fontSize: '14px', 
                          fontWeight: 400, 
                          color: '#575757',
                          textAlign: 'right'
                        }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </>
    );
  } else {
    accessPermissionView = (
      <Box sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 0",
          gap: 2,
      }}>
          <Typography variant="body1" color="#0C1226CC">
              No asset permissions available for this data product.
          </Typography>
      </Box>
    );
  }


  return (
    <div style={{ width: '100%', ...css }}>
        <Grid
            container
            spacing={0}
            style={{marginBottom:"5px"}}
        >
            {/* left side  */}
            <Grid size={12} sx={{ padding: "0px 5px 10px 0px" }}>
                <Box sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          padding: "16px 20px",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E8EEF5",
                          borderRadius: "16px",
                          overflow: "hidden",
                          width: "calc(100% - 32px)",
                          margin: "0 16px",
                          boxSizing: "border-box",
                      }}>
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                        }}>
                                <Typography
                                    component="span"
                                    variant="heading2Medium"
                                    sx={{
                                        fontWeight: 500,
                                        fontSize: "16px",
                                        lineHeight: "1.33em",
                                        color: "#1F1F1F",
                                        textTransform: "capitalize",
                                    }}
                                >
                                Access Groups
                            </Typography>
                            </Box>

                            <Box
                                sx={{
                                    fontFamily: '"Google Sans Text", sans-serif',
                                    fontSize: "12px",
                                    color: "#575757",
                                    fontWeight: 400,
                                    lineHeight: "1.43em",
                                }}
                            >
                                <Typography sx={{fontWeight: 400,
                                        fontSize: "13px",
                                        lineHeight: "2rem",
                                        color: "#0C1226CC",}}>
                                Define access groups which will be used by Data product consumers to request access. Asset permissions will be assigned
                                to the access groups defined here.
                                </Typography>
                            </Box>
                            <Grid container spacing={4}>
                                {
                                  Object.keys(accessGroups).length === 0 && (
                                      <Box sx={{
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          width: "100%",
                                          padding: "40px 0",
                                          gap: 2,
                                      }}>
                                          <Typography variant="body1" color="#0C1226CC">
                                              No access groups available for this data product.
                                          </Typography>
                                      </Box>
                                  )
                                }
                                { Object.keys(accessGroups).map((key: any) => {
                                    const groupEmail = accessGroups[key]?.principal?.googleGroup || '';
                                    const avatarChar = (groupEmail || accessGroups[key].displayName)
                                      .charAt(0).toUpperCase();

                                    return (
                                      <Grid
                                        size="auto"
                                        key={accessGroups[key].id}
                                        sx={{ marginTop: '5px', paddingBottom: '8px' }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '5px' }}>
                                          {/* Avatar — color/letter driven by email */}
                                          <Box sx={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: getAvatarColor(groupEmail),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#FFFFFF',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            fontFamily: 'Roboto, sans-serif',
                                            flexShrink: 0,
                                          }}>
                                            {avatarChar}
                                          </Box>

                                          {/* Header (displayName) + footer (email) */}
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px'}}>
                                            <Typography sx={{
                                              fontFamily: '"Google Sans", sans-serif',
                                              fontWeight: 500,
                                              fontSize: '14px',
                                              color: '#7D7D7D',
                                              textTransform: 'capitalize',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                            }}>
                                              {accessGroups[key].displayName}
                                            </Typography>
                                            <OverflowTooltip text={groupEmail || 'No group defined'}>
                                              <Typography sx={{
                                                fontFamily: '"Google Sans", sans-serif',
                                                fontWeight: 500,
                                                fontSize: '13px',
                                                color: '#3D4151',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}>
                                                {groupEmail || 'No group defined'}
                                              </Typography>
                                            </OverflowTooltip>
                                          </Box>
                                        </Box>
                                      </Grid>
                                    );
                                })}
                            </Grid>
                </Box>
                <Box sx={{
                    padding: "20px 16px 5px 16px",
                    overflow: "hidden",
                    backgroundColor: "transparent"
                }}>
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                                <Typography
                                    component="span"
                                    variant="heading2Medium"
                                    sx={{
                                        fontWeight: 500,
                                        fontSize: "16px",
                                        lineHeight: "1.33em",
                                        color: "#1F1F1F",
                                        textTransform: "capitalize",
                                    }}
                                >
                                Asset Permissions
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                fontFamily: '"Google Sans", sans-serif',
                                fontSize: "12px",
                                color: "#575757",
                                fontWeight: 400,
                                lineHeight: "1.43em",
                            }}
                        >
                            <Typography sx={{fontWeight: 400,
                                        fontSize: "13px",
                                        lineHeight: "2rem",
                                        color: "#0C1226CC",}}>
                                View which permissions are mapped to each asset in this data product. Each asset shows the access groups and their corresponding IAM roles.
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        paddingTop: '0px',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                    }}>
                        {dataProductAssetsStatus === 'loading' ? (
                            <Box sx={{ width: '100%', pt: 2 }}>
                                {/* Filter bar skeleton */}
                                <Skeleton variant="rounded" width="100%" height={40} sx={{ mb: 2, borderRadius: '8px' }} />
                                
                                {/* Table skeleton */}
                                <Skeleton variant="rounded" width="100%" height={250} sx={{ borderRadius: '16px' }} />
                            </Box>
                        ) : dataProductAssetsStatus === 'succeeded' ? (
                            accessPermissionView
                        ) : (
                            <Box sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "40px 0",
                                gap: 2,
                            }}>
                                <Typography variant="body1" color="#0C1226CC">
                                    No asset permissions available for this data product.
                                </Typography>
                            </Box>
                        )}
                    </Box>
            </Grid>
        </Grid>
    </div>
  );
}

export default AccessGroup;
