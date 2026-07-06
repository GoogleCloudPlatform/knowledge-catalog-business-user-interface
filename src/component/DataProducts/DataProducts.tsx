import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useDebounce from '../../hooks/useDebounce';
import {
  Box, Typography, Paper, Grid,
  Tooltip, Menu, MenuItem,
  TextField, Skeleton,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

import {
  Search,
  LocationOnOutlined,
  ExpandMore,
  DateRangeOutlined,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch } from '../../app/store';
import { useAuth } from '../../auth/AuthProvider';
import { fetchDataProductsList, getDataProductDetails, setDataProductsViewMode, setDataProductsDetailTabValue } from '../../features/dataProducts/dataProductsSlice';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getMimeType } from '../../utils/resourceUtils';
import DataProductsTableView from './DataProductsTableView';
import DataProductsTableViewSkeleton from './DataProductsTableViewSkeleton';
import './DataProducts.css'

// Types
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

type SortBy = 'name' | 'lastModified';
type SortOrder = 'asc' | 'desc';

// Utility function for sorting
const sortDataProducts = (
  products: DataProduct[],
  sortBy: SortBy,
  sortOrder: SortOrder
): DataProduct[] => {
  return [...products].sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = a.displayName.toLowerCase();
      const nameB = b.displayName.toLowerCase();
      return sortOrder === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    } else {
      const dateA = a.updateTime ? new Date(a.updateTime).getTime() : 0;
      const dateB = b.updateTime ? new Date(b.updateTime).getTime() : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });
};

// Reusable style constants
const SEARCH_FIELD_SX = {
  boxSizing: 'border-box',
  width: '490px',
  flex: 'none',
  order: 0,
  flexGrow: 0,
  mb: { xs: 1, sm: 0 },
  boxShadow: 'none',

  // Inner input styling
  '& .MuiOutlinedInput-root': {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0px 0px 0px 12px',
    height: '42px',
    backgroundColor: '#FFFFFF',
    borderRadius: '43px',
    gap: '8px', 
    fontFamily: '"Google Sans", sans-serif',
    fontSize: '16px',
    fontWeight: 500,
    color: '#5E5E5E',
    
    '& fieldset': { 
      borderColor: '#BBC5E4', 
      borderWidth: '1px' 
    },
    '&:hover fieldset': { borderColor: '#A8A8A8' },
    '&.Mui-focused fieldset': { borderColor: '#022FCD', borderWidth: '1.5px' },
  },

  '& .MuiInputBase-input': {
    padding: 0,
    fontFamily: '"Google Sans", sans-serif',
    fontSize: '16px',
    fontWeight: 500,
    '&::placeholder': {
      color: '#0C122666',
      opacity: 1,
    },
  },
};

const CARD_WRAPPER_SX = {
  position: 'relative',  
  width: '100%',
  height: '248px',
  flex: 'none',
  order: 0,
  flexGrow: 0,

  borderRadius: '16px',
  padding: 0,
  cursor: 'pointer',
  background: 'linear-gradient(180deg, rgba(15, 151, 246, 0.5) 0%, rgba(3, 51, 206, 0.5) 100%)',
  boxShadow: '0px 0px 16.3px rgba(157, 173, 196, 0.2)',
  transition: 'box-shadow 0.2s',
  '&:hover': {
    boxShadow: '0px 0px 14.4px rgba(17, 102, 212, 0.4)',
  },
};

const CARD_INNER_SX = {
  position: 'absolute',
  left: '5px',
  top: 0,
  right: 0,
  bottom: 0,
  background: '#FFFFFF',
  borderRadius: '16px',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  gap: '12px',
};

// Deterministic color palette for owner avatars
const AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg, #1CB5E0 0%, #000851 100%)' }, // Blue hue
  { bg: 'linear-gradient(135deg, #56AB2F 0%, #A8E063 100%)' }, // Green hue
  { bg: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)' }, // Red hue
  { bg: 'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)' }, // Amber hue
];

const formatDate = (iso: string): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getAvatarColor = (email: string, excludeBg?: string): string => {
  const code = email.charCodeAt(0) || 0;
  let idx = code % AVATAR_COLORS.length;
  if (excludeBg && AVATAR_COLORS[idx].bg === excludeBg) {
    idx = (idx + 1) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[idx].bg;
};

// Memoized DataProduct Card Component
const DataProductCard = React.memo(({
  dataProduct,
  onClick
}: {
  dataProduct: DataProduct;
  onClick: () => void;
}) => {
  const location = dataProduct.name.split('/')[3] || '';
  const dateStr = formatDate(dataProduct.updateTime);
  const visibleOwners = dataProduct.ownerEmails.slice(0, 2);
  const extraOwners = dataProduct.ownerEmails.length - 2;

  return (
    <Box sx={CARD_WRAPPER_SX} onClick={onClick} className='parent-container'>
      <Box sx={CARD_INNER_SX}>
        {/* Head */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <Box sx={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: dataProduct.icon ? '#EAEEFA' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: dataProduct.icon ? 'hidden' : 'visible',
          }}>
            {dataProduct.icon ? (
              <img
                src={`data:${getMimeType(dataProduct.icon)};base64,${dataProduct.icon}`}
                alt={dataProduct.displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, transform: 'translate(0px, -1px)' }}>
                <g filter="url(#filter0_d_11345_132122)">
                  <rect x="2.7002" y="1.69995" width="48" height="48" rx="8" fill="url(#paint0_linear_11345_132122)" shape-rendering="crispEdges"/>
                  <path d="M25.4277 11.8923C26.2307 11.5023 27.1697 11.5023 27.9727 11.8923L40.2197 17.8435C40.5683 18.0129 40.7926 18.3624 40.7998 18.7488C40.8068 19.1351 40.5959 19.4925 40.2539 19.6746L35.5039 22.2019L40.2197 24.4939C40.5683 24.6633 40.7926 25.0128 40.7998 25.3992C40.8068 25.7854 40.5959 26.143 40.2539 26.325L35.5029 28.8523L40.2197 31.1443C40.5683 31.3136 40.7928 31.6631 40.7998 32.0496C40.807 32.4359 40.596 32.7934 40.2539 32.9753L28.0674 39.4587C27.2132 39.9134 26.1872 39.9133 25.333 39.4587L13.1465 32.9753C12.8044 32.7934 12.5935 32.4359 12.6006 32.0496C12.6077 31.6632 12.8321 31.3137 13.1807 31.1443L17.8965 28.8523L13.1465 26.325C12.8044 26.143 12.5935 25.7854 12.6006 25.3992C12.6077 25.0128 12.8321 24.6633 13.1807 24.4939L17.8955 22.2019L13.1465 19.6746C12.8044 19.4925 12.5935 19.1351 12.6006 18.7488C12.6077 18.3623 12.8321 18.0129 13.1807 17.8435L25.4277 11.8923ZM28.0674 32.8083C27.213 33.2629 26.1874 33.2629 25.333 32.8083L20.1445 30.0486L15.9033 32.1091L26.3066 37.6453C26.5521 37.7759 26.8473 37.7757 27.0928 37.6453L37.4961 32.1091L33.2539 30.0486L28.0674 32.8083ZM28.0674 26.158C27.213 26.6124 26.1874 26.6124 25.333 26.158L20.1445 23.3982L15.9033 25.4587L26.3066 30.9949C26.5522 31.1256 26.8482 31.1256 27.0938 30.9949L37.4961 25.4587L33.2549 23.3982L28.0674 26.158ZM27.0664 13.741C26.8357 13.6288 26.5647 13.6288 26.334 13.741L15.9033 18.8083L26.3066 24.3445C26.5522 24.4752 26.8482 24.4752 27.0938 24.3445L37.4961 18.8083L27.0664 13.741Z" fill="white" stroke="white" stroke-width="0.2"/>
                </g>
                <defs>
                  <filter id="filter0_d_11345_132122" x="0.000195265" y="-4.88758e-05" width="53.4" height="53.4" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="1"/>
                    <feGaussianBlur stdDeviation="1.35"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0.43645 0 0 0 0 0.530791 0 0 0 0 0.813815 0 0 0 0.4 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_11345_132122"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_11345_132122" result="shape"/>
                  </filter>
                  <linearGradient id="paint0_linear_11345_132122" x1="11.7002" y1="-10.3" x2="46.7002" y2="53.7" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#73C9FF"/>
                    <stop offset="1" stop-color="#7B88FF"/>
                  </linearGradient>
                </defs>
              </svg>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            <Typography sx={{
              fontFamily: '"Google Sans", sans-serif',
              fontSize: '18px',
              fontWeight: 700,
              color: 'rgba(12, 18, 38, 0.8)',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {dataProduct.displayName}
            </Typography>
            <Box data-testid="tag" sx={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(7, 106, 255, 0.1)',
              border: '1px solid rgba(7, 106, 255, 0.2)',
              borderRadius: '12px',
              padding: '4px 12px',
              alignSelf: 'flex-start',
            }}>
              <Typography sx={{
                fontFamily: '"Google Sans", sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: '#076AFF',
                letterSpacing: '0.2px',
                lineHeight: 1,
              }}>
                {dataProduct.assetCount || 0} Assets
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Description */}
        <Typography sx={{
          fontFamily: '"Google Sans", sans-serif',
          fontSize: 'Static/Body Medium/Size',
          fontWeight: 400,
          color: '#2D2F35',
          marginTop: '4px',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {dataProduct.description || 'No description available.'}
        </Typography>

        {/* Footer */}
        <Box sx={{ marginTop: 'auto' }}>
          <Box sx={{ height: '1px', background: '#EFF3F5', mb: '12px' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Left: location pill + date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#F5FEF8',
                border: '1px solid #C4E9D8',
                borderRadius: '12px',
                padding: '0px 8px',
                height: '24px',
              }}>
                <LocationOnOutlined sx={{ fontSize: '14px', color: '#027E4C', flexShrink: 0 }} />
                <Typography sx={{
                  fontFamily: '"Google Sans", sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#027E4C',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}>
                  {location.charAt(0).toUpperCase() + location.slice(1)}
                </Typography>
              </Box>
              <Tooltip title={`Last modified: ${dateStr}`} arrow placement='top'>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DateRangeOutlined sx={{ fontSize: '16px', color: '#979DA2' }} />
                <Typography 
                    sx={{ 
                      color: '#979DA2', 
                      whiteSpace: 'nowrap',
                      fontFamily: '"Product Sans", sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: 'Static/Body Small/Line Height',
                      letterSpacing: '0px',
                      verticalAlign: 'middle',
                      leadingTrim: 'none'
                    }}
                  >
                  {dateStr}
                </Typography>
              </Box>
              </Tooltip>
            </Box>

          {/* Right: owner avatars */}
          <Tooltip title={`Owner: ${dataProduct.ownerEmails.join(', ') || 'Unknown'}`} arrow placement='top'>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'flex-end',
                width: '51.1px',
                height: '28px',
                flex: 'none',
                order: 2,
                flexGrow: 0
              }}>
              {visibleOwners.map((email, i) => {
                const firstColor = i === 0 ? undefined : getAvatarColor(visibleOwners[0]);
                return (
                  <Box key={email} sx={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: getAvatarColor(email, firstColor),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'Roboto, sans-serif',
                    letterSpacing: '0.08px',
                    lineHeight: '19.2px',
                    border: '2px solid #FFFFFF',
                    marginLeft: i > 0 ? '-8px' : 0,
                    zIndex: visibleOwners.length - i,
                    position: 'relative',
                    flexShrink: 0,
                  }}>
                    {email.charAt(0).toUpperCase()}
                  </Box>
                );
              })}
              {extraOwners > 0 && (
                <Box sx={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#E0E0E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5F6368',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'Roboto, sans-serif',
                  letterSpacing: '0.08px',
                  lineHeight: '19.2px',
                  border: '2px solid #FFFFFF',
                  marginLeft: '-8px',
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  +{extraOwners}
                </Box>
              )}
            </Box>
          </Tooltip>
        </Box>
      </Box>
      </Box>
    </Box>
  );
});

DataProductCard.displayName = 'DataProductCard';

const DataProducts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { dataProductsItems, status, error } = useSelector((state: any) => state.dataProducts);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortBy, setSortBy] = useState<SortBy>('lastModified');
  const viewMode = (useSelector((state: any) => state.dataProducts.viewMode) || 'list') as 'table' | 'list';
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [sortMenuWidth, setSortMenuWidth] = useState<number>(0);
  const [dataProductsList, setDataProductsList] = useState<DataProduct[]>([]);
  const [searchLoader, setSearchLoader] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const handleViewModeChange = useCallback((_event: React.MouseEvent<HTMLElement>, newMode: 'list' | 'table' | null) => {
    if (newMode !== null) {
        dispatch(setDataProductsViewMode(newMode));
    }
  }, [dispatch]);



  useEffect(() => {
    if (dataProductsItems.length === 0 && status === 'idle' && user?.token) {
       dispatch(fetchDataProductsList({ id_token: user?.token }));
    }
    if(status=== 'succeeded'){
        localStorage.removeItem('selectedDataProduct');
        const sortedData = sortDataProducts(dataProductsItems, 'lastModified', 'desc');
        setDataProductsList(sortedData);
    }
  }, [dispatch, dataProductsItems, status, user?.token]);

  //sorting handlers
  const handleSortMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
    setSortMenuWidth(event.currentTarget.clientWidth);
  }, []);

  const handleSortMenuClose = useCallback(() => {
    setSortAnchorEl(null);
  }, []);

  // const handleSortOrderToggle = useCallback(() => {
  //   const newOrder: SortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  //   setSortOrder(newOrder);
  //   const sorted = sortDataProducts(dataProductsList, sortBy, newOrder);
  //   setDataProductsList(sorted);
  // }, [sortOrder, sortBy, dataProductsList]);

  const handleSortOptionSelect = useCallback((option: SortBy) => {
    const newOrder: SortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(option);
    setSortOrder(newOrder);
    const sorted = sortDataProducts(dataProductsList, option, newOrder);
    setDataProductsList(sorted);
    handleSortMenuClose();
  }, [sortOrder, dataProductsList, handleSortMenuClose]);

  const handleCardClick = useCallback((dataProduct: DataProduct) => {
    dispatch(getDataProductDetails({ dataProductId: dataProduct.name, id_token: user?.token }));
    dispatch(setDataProductsDetailTabValue(0)); // Reset to Overview tab on fresh navigation
    localStorage.setItem('selectedDataProduct', JSON.stringify(dataProduct));
    navigate(`/data-products-details?dataProductId=${encodeURIComponent(dataProduct.name)}`);
  }, [dispatch, navigate, user?.token]);

  // Memoize the display state for better performance
  const showNoAccess = useMemo(() => status === 'failed' && error?.type === 'PERMISSION_DENIED', [status, error]);
  const showLoading = useMemo(() => status === 'loading' || searchLoader, [status, searchLoader]);
  const showEmptyState = useMemo(() =>
    status === 'succeeded' &&
    !searchLoader &&
    dataProductsList.length === 0 &&
    (dataProductsItems.length === 0 || (debouncedSearchTerm.length > 0 && searchTerm.length > 0)),
    [status, searchLoader, dataProductsList.length, dataProductsItems.length, debouncedSearchTerm.length, searchTerm.length]
  );
  const emptyStateMessage = useMemo(() =>
    dataProductsItems.length === 0
      ? 'No data products available'
      : 'No data products found matching your search',
    [dataProductsItems.length]
  );


  useEffect(() => {
    const cancelTokenSource = axios.CancelToken.source();

    if (dataProductsItems.length > 0 && debouncedSearchTerm.length > 0) {
      setSearchLoader(true);
      axios.post(
        `https://dataplex.googleapis.com/v1/projects/${import.meta.env.VITE_GOOGLE_PROJECT_ID}/locations/global:searchEntries`,
        {
          query: `${debouncedSearchTerm} AND (type="data_product")`,
          orderBy: 'relevance',
          semanticSearch: true,
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          },
          cancelToken: cancelTokenSource.token,
        }
      ).then((response: any) => {
        const array2 = response?.data?.results || [];
        const items = dataProductsItems.filter((obj1: DataProduct) =>
          array2.some((obj2: any) =>
            obj1.name.split('/').slice(2).join('/') === obj2.dataplexEntry?.entrySource?.resource.split('/').slice(2).join('/')
          )
        );
        setDataProductsList(items);
        setSearchLoader(false);
      }).catch((error: any) => {
        if (!axios.isCancel(error)) {
          console.error('Error fetching data product assets details:', error);
          setSearchLoader(false);
        }
      });
    } else if (debouncedSearchTerm.length === 0) {
      setSearchLoader(false);
      setDataProductsList(dataProductsItems);
    }

    return () => {
      cancelTokenSource.cancel('Component unmounted or search term changed');
    };
  }, [debouncedSearchTerm, dataProductsItems, user?.token]);






  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      px: { xs: 0, sm: 0 },
      pb: { xs: 1, sm: 2 },
      pt: 0,
      backgroundColor: '#F8FAFC',
      height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 72px)' },
      width: '100%',
      overflow: 'hidden'
    }}>
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          height: { xs: 'calc(100vh - 72px)', sm: 'calc(100vh - 88px)' },
          borderRadius: { xs: '16px', sm: '24px' },
          backgroundColor: '#F8FAFC',
          border: 'transparent',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        <Box sx={{  width: '100%', margin: '0 auto' }}>
            {/* Page header */}
            <Box sx={{
              px: { xs: '16px', sm: '32px' },
              pt: { xs: '12px', sm: '20px' },
              pb: { xs: '8px', sm: '16px' },
              width: '100%',
              boxSizing: 'border-box',
            }}>
              <Typography sx={{
                fontFamily: '"Google Sans", sans-serif',
                fontWeight: 700,
                fontSize: '36px',
                lineHeight: 1.2,
                color: '#1F1F1F',
              }}>
                Data Products
              </Typography>
              <Typography sx={{
                fontFamily: '"Google Sans", sans-serif',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: 1.3,
                color: '#7D7D7D',
                mt: '10px',
              }}>
                Discover and manage your organization's governed data products
              </Typography>
            </Box>

            {/* Search + controls row */}
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 1, sm: 0.1 },
              px: { xs: '16px', sm: '32px' },
              width: '100%',
              boxSizing: 'border-box',
            }}>
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search data products"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={SEARCH_FIELD_SX}
                    InputProps={{
                        startAdornment: <Search sx={{ color: '#575757', fontSize: 'clamp(16px, 1.5vw, 20px)' }} />,
                    }}
                />

                <Box sx={{
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                  marginLeft: { xs: 0, sm: 'auto' },
                  flexShrink: 0,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '16px',
                }}>
                    {/* Sort Controls — hidden in table view */}
                    {viewMode !== 'table' && (
                      <Box
                        onClick={handleSortMenuClick}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          width: "fit-content",
                          height: "36px",
                          background: "#FFFFFF",
                          border: "1px solid #D6D9E8",
                          borderRadius: "7.5px",
                          padding: "0 12px", 
                          gap: "6px",
                          cursor: "pointer",
                          boxSizing: "border-box"
                        }}
                      >
                        <Typography sx={{ 
                          fontSize: "14px", 
                          fontFamily: '"Google Sans", sans-serif',
                          whiteSpace: "nowrap"
                        }}>
                          <span style={{ color: "#6A6E7C", fontWeight: 400 }}>
                            Sort by&nbsp;
                          </span>
                          <span style={{ color: "#0C1226", fontWeight: 600 }}>
                            {sortBy === 'name' ? 'Name' : 'Last modified'}
                          </span>
                        </Typography>
                        
                        <ExpandMore
                          sx={{
                            color: "#6A6E7C",
                            transform: sortAnchorEl ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.3s ease",
                          }}
                        />
                      </Box>
                    )}
                    
                    <Menu
                      anchorEl={sortAnchorEl}
                      open={Boolean(sortAnchorEl)}
                      onClose={handleSortMenuClose}
                      PaperProps={{
                        style: {
                          marginTop: '4px',
                          borderRadius: '8px',
                          boxShadow: '0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
                          minWidth: sortMenuWidth > 0 ? `${sortMenuWidth}px` : 'auto',
                        }
                      }}
                    >
                      <MenuItem
                        onClick={() => handleSortOptionSelect('name')}
                        sx={{
                          fontSize: '14px',
                          fontFamily: '"Google Sans Text", sans-serif',
                          fontWeight: sortBy === 'name' ? '600' : '400',
                          color: sortBy === 'name' ? '#022FCD' : '#0C1226',
                          backgroundColor: sortBy === 'name' ? '#F8FAFD' : 'transparent',
                        }}
                      >
                        Name
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleSortOptionSelect('lastModified')}
                        sx={{
                          fontSize: '14px',
                          fontFamily: '"Google Sans Text", sans-serif',
                          fontWeight: sortBy === 'lastModified' ? '600' : '400',
                          color: sortBy === 'lastModified' ? '#022FCD' : '#0C1226',
                          backgroundColor: sortBy === 'lastModified' ? '#F8FAFD' : 'transparent',
                        }}
                      >
                        Last modified
                      </MenuItem>
                    </Menu>

                    {/* View Mode Toggle */}
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={handleViewModeChange}
                        aria-label="view mode"
                        sx={{
                          display: 'flex',
                          gap: '8px',
                          '& .MuiToggleButton-root': {
                            width: '36px',
                            height: '36px',
                            border: '1px solid #D6D9E8 !important',
                            borderRadius: '6px !important',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FFFFFF',
                            color: '#6A6E7C',
                            transition: 'all 0.2s ease-in-out',
                            '&.Mui-selected': {
                              backgroundColor: '#022FCD',
                              borderColor: '#022FCD !important',
                              color: '#FFFFFF',
                              '&:hover': {
                                backgroundColor: '#022299',
                              }
                            },
                            '&:not(.Mui-selected):hover': {
                              backgroundColor: '#F5F6F8',
                            }
                          }
                        }}
                    >
                        <ToggleButton value="list" aria-label="card view">
                          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.5 0.5H0.5V6.5H6.5V0.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                            <path d="M15.5 0.5H9.5V6.5H15.5V0.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                            <path d="M15.5 9.5H9.5V15.5H15.5V9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                            <path d="M6.5 9.5H0.5V15.5H6.5V9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          </svg>
                        </ToggleButton>
                        
                        <ToggleButton value="table" aria-label="table view">
                          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 0.5V15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M13.833 0.5H2.167C1.246 0.5 0.5 1.246 0.5 2.167V13.833C0.5 14.754 1.246 15.5 2.167 15.5H13.833C14.754 15.5 15.5 14.754 15.5 13.833V2.167C15.5 1.246 14.754 0.5 13.833 0.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M0.5 5.5H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M0.5 10.5H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </ToggleButton>
                    </ToggleButtonGroup>
              </Box>
            </Box>
            
            <Box sx={{
              flexGrow: 1,
              py: { xs: 1, sm: 2 },
              px: { xs: '16px', sm: '32px' },
              mt: '8px',
              overflowY: 'auto'
            }}>
                {showNoAccess && (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        minHeight: { xs: 'calc(100vh - 250px)', sm: 'calc(100vh - 300px)' },
                        gap: 2
                    }}>
                        <Typography variant="body1" color="text.secondary">
                            You have no access to data products.
                        </Typography>
                    </Box>
                )}
                {!showNoAccess && <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
                    {
                        showLoading && viewMode === 'list' &&
                            Array.from(new Array(6)).map((_, index) => (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                    <Box sx={{
                                        background: '#FFFFFF',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        height: '215px',
                                        boxSizing: 'border-box',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        boxShadow: '0px 0px 16.3px rgba(157, 173, 196, 0.2)',
                                    }}>
                                        {/* Head */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <Skeleton variant="rectangular" width={48} height={48} sx={{ borderRadius: '8px', flexShrink: 0 }} />
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                                <Skeleton variant="text" width="70%" height={20} />
                                                <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: '4px' }} />
                                            </Box>
                                        </Box>
                                        {/* Description */}
                                        <Box>
                                            <Skeleton variant="text" width="100%" height={16} />
                                            <Skeleton variant="text" width="75%" height={16} />
                                        </Box>
                                        {/* Footer */}
                                        <Box>
                                            <Skeleton variant="rectangular" width="100%" height={1} sx={{ mb: '12px', bgcolor: '#EFF3F5' }} />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Skeleton variant="rectangular" width={70} height={22} sx={{ borderRadius: '24px' }} />
                                                    <Skeleton variant="text" width={80} height={16} />
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Skeleton variant="circular" width={36} height={36} />
                                                    <Skeleton variant="circular" width={36} height={36} sx={{ ml: '-8px' }} />
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))
                    }
                    {
                        showLoading && viewMode === 'table' &&
                            <DataProductsTableViewSkeleton />
                    }
                    { !showLoading && !showEmptyState &&
                        ( viewMode === 'list' ?
                        (dataProductsList.map((dataProducts: DataProduct) => (
                            <Grid
                                size={{ xs: 12, sm: 6, md: 4 }}
                                key={dataProducts.name}
                            >
                                <DataProductCard
                                    dataProduct={dataProducts}
                                    onClick={() => handleCardClick(dataProducts)}
                                />
                            </Grid>
                        )))
                        : (
                          <DataProductsTableView
                            dataProducts={dataProductsList}
                            onRowClick={handleCardClick}
                          />
                        ))
                    }
                    { showEmptyState && (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            minHeight: { xs: 'calc(100vh - 250px)', sm: 'calc(100vh - 300px)' },
                            opacity: 1,
                            gap: 2
                        }}>
                            <Typography variant="body1" color="text.secondary">
                                {emptyStateMessage}
                            </Typography>
                        </Box>
                    )}
                </Grid>}
            </Box>
        </Box>
        </Paper>
    </Box>
  );
};

export default DataProducts;