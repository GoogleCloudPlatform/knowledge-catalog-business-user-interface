import React, { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip } from '@mui/material';
import { LocationOnOutlined } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from '../Schema/ResizeHandle';
import { getMimeType } from '../../utils/resourceUtils';

interface DataProduct {
  name: string;
  displayName: string;
  description?: string;
  updateTime: string;
  ownerEmails: string[];
  assetCount?: number;
  icon?: string;
  accessGroups?: Record<string, { id: string; displayName: string; principal?: any }>;
}

interface DataProductsTableViewProps {
  dataProducts: DataProduct[];
  onRowClick: (dataProduct: DataProduct) => void;
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

const getAvatarColor = (email: string, excludeBg?: string): string => {
  const code = email.charCodeAt(0) || 0;
  let idx = code % AVATAR_COLORS.length;
  if (excludeBg && AVATAR_COLORS[idx].bg === excludeBg) {
    idx = (idx + 1) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[idx].bg;
};


const DataProductsTableView: React.FC<DataProductsTableViewProps> = ({
  dataProducts,
  onRowClick,
}) => {
  const mode = useSelector((state: any) => state.user.mode) as string;
  const isDark = mode === 'dark';
  const [sortColumn, setSortColumn] = useState<'name' | 'date' | 'owner' | 'location' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const COLUMN_CONFIGS = React.useMemo(() => [
    { key: 'name', initialWidth: 260, minWidth: 150 },
    { key: 'description', initialWidth: 300, minWidth: 150 },
    { key: 'owner', initialWidth: 240, minWidth: 150 },
    { key: 'location', initialWidth: 130, minWidth: 100 },
    { key: 'assets', initialWidth: 80, minWidth: 60 },
    { key: 'lastModified', initialWidth: 120, minWidth: 100 },
  ], []);

  const { columnWidths, activeIndex, handleMouseDown } = useColumnResize({
    columns: COLUMN_CONFIGS,
    mode: 'coupled',
  });

  const columnPercents = React.useMemo(() => {
    const total = columnWidths.reduce((s, w) => s + w, 0);
    return columnWidths.map(w => `${((w / total) * 100).toFixed(2)}%`);
  }, [columnWidths]);

  const displayedProducts = React.useMemo(() => {
    if (!sortColumn) return dataProducts;

    if (sortColumn === 'date') {
      const sorted = [...dataProducts].sort((a, b) => {
        const aTs = a.updateTime ? new Date(a.updateTime).getTime() : 0;
        const bTs = b.updateTime ? new Date(b.updateTime).getTime() : 0;
        return aTs - bTs;
      });
      return sortOrder === 'asc' ? sorted : sorted.reverse();
    }

    if (sortColumn === 'name') {
      const sorted = [...dataProducts].sort((a, b) => {
        return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
      });
      return sortOrder === 'asc' ? sorted : sorted.reverse();
    }

    if (sortColumn === 'owner') {
      const sorted = [...dataProducts].sort((a, b) => {
        const ownerA = a.ownerEmails[0] || '';
        const ownerB = b.ownerEmails[0] || '';
        return ownerA.localeCompare(ownerB, undefined, { sensitivity: 'base' });
      });
      return sortOrder === 'asc' ? sorted : sorted.reverse();
    }

    if (sortColumn === 'location') {
      const sorted = [...dataProducts].sort((a, b) => {
        const locA = a.name.split('/')[3] || '';
        const locB = b.name.split('/')[3] || '';
        return locA.localeCompare(locB, undefined, { sensitivity: 'base' });
      });
      return sortOrder === 'asc' ? sorted : sorted.reverse();
    }

    return dataProducts;
  }, [dataProducts, sortColumn, sortOrder]);

  const handleToggleNameSort = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sortColumn === 'name') {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
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
        setSortColumn(null);
        setSortOrder('asc');
      }
    } else {
      setSortColumn('date');
      setSortOrder('asc');
    }
  };

  const handleToggleOwnerSort = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sortColumn === 'owner') {
      if (sortOrder === 'asc') setSortOrder('desc');
      else { setSortColumn(null); setSortOrder('asc'); }
    } else {
      setSortColumn('owner'); setSortOrder('asc');
    }
  };

  const handleToggleLocationSort = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sortColumn === 'location') {
      if (sortOrder === 'asc') setSortOrder('desc');
      else { setSortColumn(null); setSortOrder('asc'); }
    } else {
      setSortColumn('location'); setSortOrder('asc');
    }
  };

  const getOwnerSortTooltip = (): string => {
    if (sortColumn === 'owner' && sortOrder === 'asc') return 'Sort Z to A';
    if (sortColumn === 'owner' && sortOrder === 'desc') return '';
    return 'Sort A to Z';
  };

  const getLocationSortTooltip = (): string => {
    if (sortColumn === 'location' && sortOrder === 'asc') return 'Sort Z to A';
    if (sortColumn === 'location' && sortOrder === 'desc') return '';
    return 'Sort A to Z';
  };

  const getNameSortTooltip = (): string => {
    if (sortColumn === 'name' && sortOrder === 'asc') return 'Sort Z to A';
    if (sortColumn === 'name' && sortOrder === 'desc') return '';
    return 'Sort A to Z';
  };

  const getDateSortTooltip = (): string => {
    if (sortColumn === 'date' && sortOrder === 'asc') return 'Sort new to old';
    if (sortColumn === 'date' && sortOrder === 'desc') return '';
    return 'Sort old to new';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  return (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: isDark ? '#131314' : '#FFFFFF',
        borderRadius: '16px',
        border: isDark ? '1px solid #3c4043' : '1px solid #E8EEF5',
        boxShadow: 'none',
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        overflowX: 'auto',
        width: '100%',
        margin: 'auto',
        maxWidth: '100%'
      }}
    >
      <Table sx={{ width: '100%', tableLayout: 'fixed', minWidth: '810px' }} aria-label="data products table">
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
                backgroundColor: isDark ? '#3c4043' : '#DADCE0',
              },
            }}
          >
            {/* Name */}
            <TableCell
              sx={{
                fontFamily: '"Google Sans", sans-serif', fontSize: '14px', fontWeight: 600, lineHeight: '40px', color: isDark ? '#dedfe0' : '#444746', position: 'relative', padding: '0px !important'
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
                    height: '100%',
                    width: '100%',
                    borderRadius: '0px',
                    padding: '12px 20px 4px 20px',
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
                fontFamily: '"Google Sans", sans-serif', fontSize: '14px', fontWeight: 600, lineHeight: '20px', color: isDark ? '#dedfe0' : '#444746', position: 'relative'
              }}
            >
              Description
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(1, e); }}
                isActive={activeIndex === 1}
                darkMode={isDark}
              />
            </TableCell>

            {/* Owner */}
            <TableCell
              sx={{
                fontFamily: '"Google Sans", sans-serif', fontSize: '14px', fontWeight: 600, lineHeight: '40px', color: isDark ? '#dedfe0' : '#444746', position: 'relative', padding: '0px !important'
              }}
            >
              <Tooltip title={getOwnerSortTooltip()} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Box
                  role="button"
                  onClick={handleToggleOwnerSort}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', height: '100%', width: '100%', borderRadius: '0px', padding: '12px 20px 4px 20px', margin: '0px', transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                  }}
                >
                  <span>Owner</span>
                  <Box
                    component="span"
                    className="sort-btn"
                    sx={{
                      display: 'flex', alignItems: 'center', flexShrink: 0,
                      opacity: sortColumn === 'owner' ? 1 : 0,
                      transform: (sortColumn === 'owner' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
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
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(2, e); }}
                isActive={activeIndex === 2}
                darkMode={isDark}
              />
            </TableCell>

            {/* Location */}
            <TableCell
              sx={{
                fontFamily: '"Google Sans", sans-serif', fontSize: '14px', fontWeight: 600, lineHeight: '40px', color: isDark ? '#dedfe0' : '#444746', position: 'relative', padding: '0px !important'
              }}
            >
              <Tooltip title={getLocationSortTooltip()} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Box
                  role="button"
                  onClick={handleToggleLocationSort}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', height: '100%', width: '100%', borderRadius: '0px', padding: '12px 20px 4px 20px', margin: '0px', transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                  }}
                >
                  <span>Location</span>
                  <Box
                    component="span"
                    className="sort-btn"
                    sx={{
                      display: 'flex', alignItems: 'center', flexShrink: 0,
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
              
            {/* Assets */}
            <TableCell sx={{ fontFamily: '"Google Sans", sans-serif', fontSize: '14px', fontWeight: 600, lineHeight: '20px', color: isDark ? '#dedfe0' : '#444746', position: 'relative' }}>
              Assets
              <ResizeHandle onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(4, e); }} isActive={activeIndex === 4} darkMode={isDark} />
            </TableCell>

            {/* Last Modified */}
            <TableCell
              sx={{
                fontFamily: '"Google Sans", sans-serif', fontSize: '14px', fontWeight: 600, lineHeight: '40px', color: isDark ? '#dedfe0' : '#444746', position: 'relative', padding: '0px !important'
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
                    height: '100%',
                    width: '100%',
                    borderRadius: '0px',
                    padding: '12px 20px 4px 20px',
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
                      <rect width="24" height="24" rx="12" fill={isDark ? '#004a77' : '#C2E7FF'}/>
                      <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill={isDark ? '#8ab4f8' : '#004A77'}/>
                    </svg>
                  </Box>
                  <span style={{ whiteSpace: 'nowrap' }}>Last modified</span>
                </Box>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedProducts.map((dp) => (
            <TableRow
              key={dp.name}
              onClick={() => onRowClick(dp)}
              sx={{
                position: 'relative',
                cursor: 'pointer',
                height: '60px',
                backgroundColor: isDark ? '#131314' : '#FFFFFF',
                '& .MuiTableCell-root': { borderBottom: 'none' },
                '&:hover .MuiTableCell-root': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: '0px',
                  right: '0px',
                  height: '1px',
                  backgroundColor: isDark ? '#3c4043' : '#E8EEF5',
                },
                '&:last-child::after': { display: 'none' }
              }}
            >
              {/* Name */}
              <TableCell sx={{ padding: '10px 20px', paddingLeft: '20px', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                  <Box sx={{
                    width: '48px', height: '48px', borderRadius: '8px', background: '#EAEEFA',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden'
                  }}>
                    {dp.icon ? (
                      <img src={`data:${getMimeType(dp.icon)};base64,${dp.icon}`} alt={dp.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="55" height="55" viewBox="0 0 53 53" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                        <g filter="url(#filter0_d_11345_132122_table)">
                          <rect x="2.7002" y="1.69995" width="48" height="48" rx="8" fill="url(#paint0_linear_11345_132122_table)" shape-rendering="crispEdges"/>
                          <path d="M25.4277 11.8923C26.2307 11.5023 27.1697 11.5023 27.9727 11.8923L40.2197 17.8435C40.5683 18.0129 40.7926 18.3624 40.7998 18.7488C40.8068 19.1351 40.5959 19.4925 40.2539 19.6746L35.5039 22.2019L40.2197 24.4939C40.5683 24.6633 40.7926 25.0128 40.7998 25.3992C40.8068 25.7854 40.5959 26.143 40.2539 26.325L35.5029 28.8523L40.2197 31.1443C40.5683 31.3136 40.7928 31.6631 40.7998 32.0496C40.807 32.4359 40.596 32.7934 40.2539 32.9753L28.0674 39.4587C27.2132 39.9134 26.1872 39.9133 25.333 39.4587L13.1465 32.9753C12.8044 32.7934 12.5935 32.4359 12.6006 32.0496C12.6077 31.6632 12.8321 31.3137 13.1807 31.1443L17.8965 28.8523L13.1465 26.325C12.8044 26.143 12.5935 25.7854 12.6006 25.3992C12.6077 25.0128 12.8321 24.6633 13.1807 24.4939L17.8955 22.2019L13.1465 19.6746C12.8044 19.4925 12.5935 19.1351 12.6006 18.7488C12.6077 18.3623 12.8321 18.0129 13.1807 17.8435L25.4277 11.8923ZM28.0674 32.8083C27.213 33.2629 26.1874 33.2629 25.333 32.8083L20.1445 30.0486L15.9033 32.1091L26.3066 37.6453C26.5521 37.7759 26.8473 37.7757 27.0928 37.6453L37.4961 32.1091L33.2539 30.0486L28.0674 32.8083ZM28.0674 26.158C27.213 26.6124 26.1874 26.6124 25.333 26.158L20.1445 23.3982L15.9033 25.4587L26.3066 30.9949C26.5522 31.1256 26.8482 31.1256 27.0938 30.9949L37.4961 25.4587L33.2549 23.3982L28.0674 26.158ZM27.0664 13.741C26.8357 13.6288 26.5647 13.6288 26.334 13.741L15.9033 18.8083L26.3066 24.3445C26.5522 24.4752 26.8482 24.4752 27.0938 24.3445L37.4961 18.8083L27.0664 13.741Z" fill="white" stroke="white" strokeWidth="0.2"/>
                        </g>
                        <defs>
                          <filter id="filter0_d_11345_132122_table" x="0.000195265" y="-4.88758e-05" width="53.4" height="53.4" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                            <feOffset dy="1"/>
                            <feGaussianBlur stdDeviation="1.35"/>
                            <feComposite in2="hardAlpha" operator="out"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 0.43645 0 0 0 0 0.530791 0 0 0 0 0.813815 0 0 0 0.4 0"/>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_11345_132122_table"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_11345_132122_table" result="shape"/>
                          </filter>
                          <linearGradient id="paint0_linear_11345_132122_table" x1="11.7002" y1="-10.3" x2="46.7002" y2="53.7" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#73C9FF"/>
                            <stop offset="1" stopColor="#7B88FF"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                  </Box>
                  <OverflowTooltip text={dp.displayName}>
                    <Typography sx={{
                      flex: 1, fontFamily: '"Google Sans", sans-serif', fontSize: '14px', fontWeight: 600,
                      color: isDark ? '#dedfe0' : '#0B57D0', cursor: 'pointer', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                    }}>
                      {dp.displayName}
                    </Typography>
                  </OverflowTooltip>
                </Box>
              </TableCell>

              {/* Description */}
              <TableCell sx={{ padding: '10px 20px', overflow: 'hidden' }}>
                <Typography sx={{ fontFamily: '"Product Sans", "Google Sans Text", sans-serif', fontSize: '14px', fontWeight: '400', color: isDark ? '#dedfe0' : '#575757', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dp.description || 'No description available.'}
                </Typography>
              </TableCell>

              {/* Owner */}
              <TableCell sx={{ padding: '10px 20px', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {dp.ownerEmails.slice(0, 2).map((email, i) => {
                      const firstColor = i === 0 ? undefined : getAvatarColor(dp.ownerEmails[0]);
                      return (
                        <Box key={email} sx={{
                          width: '28px', height: '28px', borderRadius: '50%', background: getAvatarColor(email, firstColor),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '12px',
                          fontWeight: 500, border: '2px solid #FFFFFF', marginLeft: i > 0 ? '-8px' : 0, zIndex: 2 - i, position: 'relative', flexShrink: 0,
                        }}>
                          {email.charAt(0).toUpperCase()}
                        </Box>
                      );
                    })}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', flex: 1 }}>
                  <Typography sx={{ 
                    fontFamily: '"Product Sans", "Google Sans Text", sans-serif', 
                    fontSize: '14px', 
                    fontWeight: '400', 
                    color: isDark ? '#dedfe0' : '#575757', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {dp.ownerEmails[0] || '-'}
                  </Typography>
                  
                  {dp.ownerEmails.length > 1 && (
                    <Typography sx={{ 
                      fontFamily: '"Product Sans", "Google Sans Text", sans-serif', 
                      fontSize: '14px', 
                      fontWeight: '400', 
                      color: isDark ? '#dedfe0' : '#575757', 
                      flexShrink: 0
                    }}>
                      +{dp.ownerEmails.length - 1}
                    </Typography>
                  )}
                </Box>
                </Box>
              </TableCell>

              {/* Location */}
              <TableCell sx={{ padding: '10px 20px', overflow: 'hidden' }}>
                <Box sx={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  border: '1px solid #C4E9D8', 
                  borderRadius: '12px', 
                  backgroundColor: '#F5FEF8',
                  padding: '0px 8px',
                  height: '24px'
                }}>
                  <LocationOnOutlined sx={{ fontSize: '14px', color: '#027E4C', flexShrink: 0 }} />
                  <Typography sx={{ 
                    fontFamily: '"Google Sans", sans-serif', 
                    fontSize: '12px', 
                    fontWeight: 600,
                    color: '#027E4C', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {(dp.name.split('/')[3] || '-').charAt(0).toUpperCase() + (dp.name.split('/')[3] || '').slice(1)}
                  </Typography>
                </Box>
</TableCell>

              {/* Assets */}
              <TableCell sx={{ fontFamily: '"Product Sans", "Google Sans Text", sans-serif', fontSize: '14px', color: isDark ? '#dedfe0' : '#575757', padding: '10px 20px' }}>
                {dp.assetCount || 0}
              </TableCell>

              {/* Last Modified */}
              <TableCell sx={{ fontFamily: '"Product Sans", "Google Sans Text", sans-serif', fontSize: '14px', fontWeight: '400', color: isDark ? '#dedfe0' : '#575757', padding: '10px 20px', textAlign: 'right' }}>
                {formatDate(dp.updateTime)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataProductsTableView;
