import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Menu, MenuItem } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import SearchEntriesCard from '../SearchEntriesCard/SearchEntriesCard';
import SearchTableView from '../SearchPage/SearchTableView';
import ShimmerLoader from '../Shimmer/ShimmerLoader';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { fetchEntry, clearHistory } from '../../features/entry/entrySlice';
import SubmitAccess from '../SearchPage/SubmitAccess';
import NotificationBar from '../SearchPage/NotificationBar';
import { getName } from '../../utils/resourceUtils';
import FilterChipCarousel from './FilterChipCarousel';
import { useNoAccess } from '../../contexts/NoAccessContext';

/**
 * @file ResourceViewer.tsx
 * @summary A highly configurable component for displaying a list of data resources.
 *
 * @description
 * This component acts as the main content area for displaying search results or
 * browsable resource lists. It is responsible for:
 *
 * 1.  **Displaying Data:** Renders the `resources` array in one of two modes:
 * - 'list' (using `<SearchEntriesCard>`)
 * - 'table' (using `<SearchTableView>`)
 * 2.  **Handling States:** Manages the UI for 'loading' (shows `<ShimmerLoader>`),
 * 'succeeded' (shows data), and 'failed' (handles auth errors by
 * redirecting to login, or shows an error for invalid arguments).
 * 3.  **Sticky Header:** Renders a feature-rich sticky header that includes:
 * - A `customHeader` (if provided).
 * - Filters: `customFilters`, `<FilterChips>` for selected filters, and
 * dynamically generated type-alias tags.
 * - Sort by dropdown ('Name' or 'Last Modified').
 * - Pagination controls (rows per page, next/previous buttons).
 * - A view-mode `ToggleButtonGroup` (list/table).
 * - An info icon to toggle the preview panel.
 * 4.  **Interactivity:**
 * - Handles item clicks to update the parent's preview state
 * (via `onPreviewDataChange`).
 * - Handles double-clicks to navigate to the 'view-details' page.
 * - Manages the UI for pagination, delegating the fetch logic to the
 * `handlePagination` prop.
 *
 * @param {object} props - The props for the ResourceViewer component.
 *
 * @param {any[]} props.resources - The array of resource items to display.
 * @param {'idle' | 'loading' | 'succeeded' | 'failed'} props.resourcesStatus - The
 * current fetch status of the resources.
 * @param {any|string} [props.error] - The error object or message if `resourcesStatus`
 * is 'failed'.
 *
 * @param {any | null} props.previewData - The currently selected resource object
 * for the preview panel.
 * @param {(data: any | null) => void} props.onPreviewDataChange - Callback function
 * to update the `previewData` in the parent component.
 *
 * @param {string | null} props.selectedTypeFilter - The currently selected type filter
 * (legacy, often managed by `selectedFilters` now).
 * @param {(filter: string | null) => void} props.onTypeFilterChange - Callback to
 * change the type filter.
 * @param {string[]} props.typeAliases - A list of available type alias strings for
 * filtering.
 *
 * @param {'list' | 'table'} props.viewMode - The current display mode.
 * @param {(mode: 'list' | 'table') => void} props.onViewModeChange - Callback to
 * change the view mode.
 *
 * @param {string} props.id_token - The user's authentication token.
 *
 * @param {boolean} [props.showFilters=true] - Whether to display the filter bar.
 * @param {boolean} [props.showSortBy=false] - Whether to display the sort-by dropdown.
 * @param {boolean} [props.showResultsCount=true] - Whether to display the results
 * count text.
 * @param {React.ReactNode} [props.customHeader] - An optional React node to render
 * at the top of the header.
 * @param {React.ReactNode} [props.customFilters] - Optional React nodes to render
 * in the filter bar.
 * @param {any[]} [props.selectedFilters=[]] - An array of active filter objects
 * to be displayed as chips.
 * @param {(filters: any[]) => void} [props.onFiltersChange] - Callback to notify
 * the parent of a change in filters.
 *
 * @param {React.CSSProperties} [props.containerStyle] - Optional styles for the main
 * container.
 * @param {React.CSSProperties} [props.contentStyle] - Optional styles for the
 * scrollable content area.
 *
 * @param {(entry: any) => void} [props.onViewDetails] - Optional callback for
 * "View Details" action.
 * @param {(entry: any) => void} [props.onRequestAccess] - Optional callback for
 * "Request Access" action.
 * @param {(entry: any) => void} [props.onFavoriteClick] - Optional callback for
 * clicking the favorite icon.
 *
 * @param {boolean} [props.renderPreview] - (Note: This prop is in the interface
 * but not currently used in the component's logic).
 *
 * @param {number} props.pageSize - The current number of items per page.
 * @param {(size: number) => void} props.setPageSize - Callback to update the page size.
 * @param {number} [props.startIndex=0] - The starting index of the current page.
 * @param {any[]} props.requestItemStore - The store of all fetched items across pages.
 * @param {number} props.resourcesTotalSize - The total number of resources available.
 * @param {(direction: 'next' | 'previous', size: number, sizeChange: boolean) => void} props.handlePagination -
 * The main callback function to trigger a pagination event.
 *
 * @returns {JSX.Element} A React component that renders the full resource list UI,
 * including a shimmer loader, error state, or the interactive list/table of results.
 */

interface ResourceViewerProps {
  // Data props
  resources: any[];
  resourcesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: any|string;
  
  // Preview props
  previewData: any | null;
  onPreviewDataChange: (data: any | null) => void;
  
  // Filter props
  selectedTypeFilter?: string | null;
  onTypeFilterChange?: (filter: string | null) => void;
  typeAliases: string[];
  
  // View mode props
  viewMode: 'list' | 'table';
  onViewModeChange?: (mode: 'list' | 'table') => void;
  
  // Access control props
  id_token: string;
  
  // Layout props
  showFilters?: boolean;
  showSortBy?: boolean;
  showResultsCount?: boolean;
  customHeader?: React.ReactNode;
  customFilters?: React.ReactNode;
  customFilterChips?: React.ReactNode;
  selectedFilters?: any[];
  onFiltersChange?: (filters: any[]) => void;
  availableTypeAliases?: { name: string; count: number }[];
  onTypeAliasClick?: (type: string) => void;
  hideMostRelevant?: boolean;
  
  // Styling props
  containerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  
  // Event handlers
  onViewDetails?: (entry: any) => void;
  onRequestAccess?: (entry: any) => void;
  onFavoriteClick?: (entry: any) => void;
  
  // Preview rendering
  renderPreview?: boolean;

  // Pagination props
  pageSize : number;
  setPageSize: (size: number) => void;
  startIndex?: number;
  requestItemStore: any[]; // Store for all fetched items
  resourcesTotalSize: number;
  handlePagination: (direction: 'next' | 'previous', size: number, sizeChange:boolean) => void;

  isDataProduct?: boolean;
  hideViewToggle?: boolean;
  isGlossary?: boolean;
}

const ResourceViewer: React.FC<ResourceViewerProps> = ({
  resources,
  resourcesStatus,
  error,
  previewData,
  onPreviewDataChange,
  selectedTypeFilter,
  onTypeFilterChange: _onTypeFilterChange,
  typeAliases: _typeAliases,
  viewMode,
  onViewModeChange,
  showFilters = true,
  showSortBy = false,
  showResultsCount = true,
  customHeader,
  customFilters,
  customFilterChips,
  containerStyle,
  contentStyle,
  headerStyle,
  onFavoriteClick,
  onViewDetails,
  selectedFilters: _selectedFilters = [],
  onFiltersChange: _onFiltersChange,
  availableTypeAliases,
  onTypeAliasClick,
  hideMostRelevant = false,
  startIndex: _startIndex = 0,
  pageSize: _pageSize = 20,
  setPageSize,
  requestItemStore: _requestItemStore,
  resourcesTotalSize: _resourcesTotalSize,
  handlePagination: _handlePagination,
  id_token,
  isDataProduct = false,
  hideViewToggle = false,
  isGlossary = false
}) => {
  // Navigation and auth hooks
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { triggerNoAccess } = useNoAccess();
  // const id_token = user?.token || '';

  const dispatch = useDispatch<AppDispatch>();
  const entryStatus = useSelector((state: any) => state.entry.status);
  const entryItems = useSelector((state: any) => state.entry.items);
  const mode = useSelector((state: any) => state.user.mode) as string;

  // SubmitAccess modal state for card "Request Access" button
  const [isCardSubmitAccessOpen, setIsCardSubmitAccessOpen] = useState(false);
  const [cardAccessEntry, setCardAccessEntry] = useState<any>(null);
  const [isCardNotificationVisible, setIsCardNotificationVisible] = useState(false);
  const [cardNotificationMessage, setCardNotificationMessage] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<'mostRelevant' | 'name' | 'lastModified'>(hideMostRelevant ? 'name' : 'mostRelevant');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [sortMenuWidth, setSortMenuWidth] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Note: Preview panel is managed by parent components through previewData

  // Handle failed resource status
  useEffect(() => {
    if (resourcesStatus === 'failed') {
      let subString = "INVALID_ARGUMENT:";
      if(error?.details && typeof error?.details === 'string'){
        if(error.details.includes(subString)){
          content = (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              width: '100%'
            }}>
              <p style={{
                margin: 0,
                textAlign: 'center',
                color: mode === 'dark' ? '#9aa0a6' : '#666',
                fontSize: '16px'
              }}>{(error?.message || error) + ' invalid arguments passed in search params'}</p>
          </div>);
        }else if(error?.error?.code === 403 || error?.error?.status === 'PERMISSION_DENIED'){
          // Show no-access popup instead of auto-logout for 403 errors
          triggerNoAccess({
            message: 'You do not have permission to search resources. Please contact your administrator or sign in with a different account.',
          });
        }else{
          setPageSize(20);
          logout();
          navigate('/login');
        }
      }else if(error?.error?.code === 403 || error?.error?.status === 'PERMISSION_DENIED'){
        // Show no-access popup instead of auto-logout for 403 errors
        triggerNoAccess({
          message: 'You do not have permission to search resources. Please contact your administrator or sign in with a different account.',
        });
      }else{
        logout();
        navigate('/login');
      }
    }
  }, [resourcesStatus, logout, navigate, triggerNoAccess]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;
    setIsScrolled(scrollTop > 0);
  };

  // Filter and sort resources
  const filteredAndSortedResources = useMemo(() => {
    // Create a copy of the filtered array before sorting to avoid read-only errors
    const filteredCopy = [...resources];

    // Skip sorting when "Most relevant" is selected (original API order)
    if (sortBy === 'mostRelevant') {
      return filteredCopy;
    }

    // Sort the filtered resources
    const direction = sortOrder === 'asc' ? 1 : -1;
    return filteredCopy.sort((a: any, b: any) => {
      if (sortBy === 'name') {
        const nameA = a.dataplexEntry.entrySource?.displayName?.toLowerCase() || '';
        const nameB = b.dataplexEntry.entrySource?.displayName?.toLowerCase() || '';

        // Handle entries with no display name - put them at the bottom
        if (!nameA && !nameB) return 0;
        if (!nameA) return 1;
        if (!nameB) return -1;

        return direction * nameA.localeCompare(nameB);
      } else if (sortBy === 'lastModified') {
        const rawA = a.dataplexEntry.updateTime;
        const rawB = b.dataplexEntry.updateTime;
        const dateA = rawA ? (typeof rawA === 'string' ? new Date(rawA).getTime() : (rawA.seconds || 0) * 1000) : 0;
        const dateB = rawB ? (typeof rawB === 'string' ? new Date(rawB).getTime() : (rawB.seconds || 0) * 1000) : 0;
        return direction * (dateA - dateB);
      }
      return 0;
    });
  }, [resources, selectedTypeFilter, sortBy, sortOrder]);

  const filteredResources = filteredAndSortedResources;

  // Utility functions
  const getFormatedDate = (date: any) => {
    if (!date) return '-';
    
    const myDate = new Date(date);

    if (isNaN(myDate.getTime())) {
      return '-';
    }

    const formatedDate = new Intl.DateTimeFormat('en-US', { month: "long", day: "numeric", year: "numeric" }).format(myDate);
    return (formatedDate);
  };

  const getEntryType = (namePath: string = '', separator: string = '') => {
    const segments: string[] = namePath.split(separator);
    let eType = segments[segments.length - 2];
    return (`${eType[0].toUpperCase()}${eType.slice(1)}`);
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'list' | 'table' | null) => {
    if (newMode !== null) {
      onViewModeChange?.(newMode);
    }
  };

  const handleSearchEntriesClick = (entry: any) => {
    if (isDataProduct && onViewDetails) {
      onViewDetails(entry);
    } else {
      onPreviewDataChange(entry);
    }
  };

  const handleSearchEntriesDoubleClick = (clickedEntry: any) => {
    const isCurrentlyPreviewed = previewData && previewData.name === clickedEntry.name;
    const isAccessGranted = entryStatus === 'succeeded';

    if (isCurrentlyPreviewed && isAccessGranted) {
      dispatch(clearHistory());
      navigate('/view-details');
    } else {
      onPreviewDataChange(clickedEntry);
    }
  };

  const handleNavigateToTab = (clickedEntry: any, tabName: string) => {
    dispatch(clearHistory());
    dispatch(fetchEntry({ entryName: clickedEntry.name, id_token }));
    navigate('/view-details', { state: { tabName } });
  };

  const handleRequestAccessFromCard = (clickedEntry: any) => {
    setCardAccessEntry(clickedEntry);
    // Delay opening so SubmitAccess mounts at right:-500px first, then slides to right:0
    requestAnimationFrame(() => {
      setIsCardSubmitAccessOpen(true);
    });
  };

  const handleCardSubmitAccessClose = () => {
    setIsCardSubmitAccessOpen(false);
    setTimeout(() => setCardAccessEntry(null), 300);
  };

  const handleCardSubmitSuccess = () => {
    setIsCardSubmitAccessOpen(false);
    setTimeout(() => setCardAccessEntry(null), 300);
    setCardNotificationMessage('Request sent');
    setIsCardNotificationVisible(true);
    setTimeout(() => setIsCardNotificationVisible(false), 5000);
  };

  const handleCardCloseNotification = () => {
    setIsCardNotificationVisible(false);
  };

  const handleFavoriteClick = (entry: any) => {
    if (onFavoriteClick) {
      onFavoriteClick(entry);
    }
  };

  // Sort menu handlers
  const handleSortMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget);
    setSortMenuWidth(event.currentTarget.clientWidth);
  };

  const handleSortMenuClose = () => {
    setSortMenuAnchor(null);
  };

  const handleSortOptionSelect = (option: 'mostRelevant' | 'name' | 'lastModified') => {
    setSortBy(option);
    if (option === 'mostRelevant') {
      setSortOrder('asc');
    }
    handleSortMenuClose();
  };

  const selectedIndex = filteredResources?.findIndex(
  r => previewData && previewData.name === r.dataplexEntry.name
);

  // let filterChips;
  // if(searchFilters.length > 0){
  //   filterChips = (
  //     <FilterChips
  //       selectedFilters={selectedFilters}
  //       getCount={(f)=>{ return getFilterResultCount(f)}}
  //       handleRemoveFilterTag={(f) => handleRemoveFilterTag(f)}
  //     />
  //   );
  // }else{
  //   filterChips=(<></>);
  // }

  // Main content rendering
  let content;

  if (resourcesStatus === 'loading' || resourcesStatus === 'succeeded') {
    content = (
      <div
        onScroll={handleScroll}
        style={{
          display: 'block',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '0px',
          background: (isDataProduct || isGlossary) && mode !== 'dark' ? 'transparent' : (mode === 'dark' ? '#131314' : '#ffffff'),
          margin: '0px',
          padding: '0px', 
          minHeight: 'calc(100vh - 3.9rem)',
          maxHeight: 'calc(100vh - 3.9rem)',
          overflowY: 'auto',
          overflowX: 'hidden',
          ...contentStyle
      }}>
        <div style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 10,
            backgroundColor: isGlossary && mode !== 'dark' ? '#f8fafc' : (isDataProduct && mode !== 'dark' ? '#F7F9F9' : (mode === 'dark' ? '#131314' : '#ffffff'))
        }}>
        {/* Custom Header */}
        {customHeader}

        {/* Header Row — Filters, Results Count, Sort, View Toggle */}
        {(showFilters || showResultsCount || showSortBy) && (
          <div style={{
            padding: "10px 10px 8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            ...headerStyle,
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "24px",
            }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", minWidth: 0, flex: 1 }}>
              {showFilters && customFilters}
              {showResultsCount && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Typography component="span" style={{
                    fontSize: "22px",
                    fontWeight: "400",
                    fontFamily: '"Google Sans", sans-serif',
                    whiteSpace: "nowrap",
                    color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                  }}>
                    Search results
                  </Typography>
                  {resourcesStatus === 'succeeded' && (
                    <Typography component="span" style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      whiteSpace: "nowrap",
                      color: mode === 'dark' ? '#9aa0a6' : '#575757',
                    }}>
                      (Top {filteredResources?.length || 0} results)
                    </Typography>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
              {/* Sort Controls — right side */}
              {showSortBy && viewMode !== 'table' && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Box
                  onClick={handleSortMenuClick}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "max-content",
                    height: "36px",
                    background: mode === 'dark' ? '#1e1f20' : "#FFFFFF",
                    border: mode === 'dark' ? '1px solid #5f6368' : "1px solid #D6D9E8",
                    borderRadius: "7.5px",
                    padding: "0 12px",
                    gap: "8px",
                    cursor: "pointer",
                    boxSizing: "border-box"
                  }}
                >
                  <Typography sx={{ 
                    fontSize: "14px", 
                    fontFamily: '"Google Sans", sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: mode === 'dark' ? '#9aa0a6' : "#6A6E7C", fontWeight: 400 }}>
                      Sort by
                    </span>
                    <span style={{ color: mode === 'dark' ? '#e3e3e3' : "#0C1226", fontWeight: 600 }}>
                      {sortBy === 'mostRelevant' ? 'Most relevant' : sortBy === 'name' ? 'Name' : 'Last modified'}
                    </span>
                  </Typography>
                  <ExpandMoreIcon
                    sx={{
                      color: mode === 'dark' ? '#9aa0a6' : "#6A6E7C",
                      transform: Boolean(sortMenuAnchor) ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s ease",
                    }}
                  />
                </Box>
                </div>
              )}

              {/* View Mode Toggle */}
              {!hideViewToggle && (
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
                      border: mode === 'dark' ? '1px solid #5f6368 !important' : '1px solid #D6D9E8 !important',
                      borderRadius: '6px !important',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: mode === 'dark' ? '#1e1f20' : '#FFFFFF',
                      color: mode === 'dark' ? '#9aa0a6' : '#6A6E7C',
                      transition: 'all 0.2s ease-in-out',
                      '&.Mui-selected': {
                        backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
                        borderColor: mode === 'dark' ? '#8ab4f8 !important' : '#022FCD !important',
                        color: mode === 'dark' ? '#131314' : '#FFFFFF',
                        '&:hover': {
                          backgroundColor: mode === 'dark' ? '#9bc0f9' : '#022299',
                        }
                      },
                      '&:not(.Mui-selected):hover': {
                        backgroundColor: mode === 'dark' ? '#3c4043' : '#F5F6F8',
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
              )}

            </div>
            </div>
            {customFilterChips}
          </div>
        )}

        {/* Type Alias Filter Chips Carousel */}
        {showFilters && availableTypeAliases && onTypeAliasClick && (
          <FilterChipCarousel
            availableTypeAliases={availableTypeAliases}
            selectedFilters={_selectedFilters}
            onTypeAliasClick={onTypeAliasClick}
            resourcesStatus={resourcesStatus}
          />
        )}

        {/* Sort Menu */}
        <Menu
          anchorEl={sortMenuAnchor}
          open={Boolean(sortMenuAnchor)}
          onClose={handleSortMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          PaperProps={{
            style: {
              marginTop: '4px',
              borderRadius: '8px',
              boxShadow: mode === 'dark' 
                ? '0px 4px 6px -1px rgba(0, 0, 0, 0.4), 0px 2px 4px -1px rgba(0, 0, 0, 0.3)' 
                : '0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
              backgroundColor: mode === 'dark' ? '#1e1f20' : '#FFFFFF',
              minWidth: sortMenuWidth > 0 ? `${sortMenuWidth}px` : 'auto',
            }
          }}
        >
          {!hideMostRelevant && (
            <MenuItem
              onClick={() => handleSortOptionSelect('mostRelevant')}
              sx={{
                fontSize: '12px',
                fontWeight: sortBy === 'mostRelevant' ? '500' : '400',
                color: sortBy === 'mostRelevant' ? (mode === 'dark' ? '#8ab4f8' : '#0B57D0') : (mode === 'dark' ? '#e3e3e3' : '#1F1F1F'),
                backgroundColor: sortBy === 'mostRelevant' ? (mode === 'dark' ? 'rgba(138,180,248,0.16)' : '#F4F5FA') : 'transparent',
                '&:hover': { backgroundColor: mode === 'dark' ? '#3c4043' : '#F1F3F4' },
              }}
            >
              Most relevant
            </MenuItem>
          )}
          <MenuItem
            onClick={() => handleSortOptionSelect('name')}
            sx={{
              fontSize: '12px',
              fontWeight: sortBy === 'name' ? '500' : '400',
              color: sortBy === 'name' ? (mode === 'dark' ? '#8ab4f8' : '#0B57D0') : (mode === 'dark' ? '#e3e3e3' : '#1F1F1F'),
              backgroundColor: sortBy === 'name' ? (mode === 'dark' ? 'rgba(138,180,248,0.16)' : '#F4F5FA') : 'transparent',
              '&:hover': { backgroundColor: mode === 'dark' ? '#3c4043' : '#F1F3F4' },
            }}
          >
            Name
          </MenuItem>
          <MenuItem
            onClick={() => handleSortOptionSelect('lastModified')}
            sx={{
              fontSize: '12px',
              fontWeight: sortBy === 'lastModified' ? '500' : '400',
              color: sortBy === 'lastModified' ? (mode === 'dark' ? '#8ab4f8' : '#0B57D0') : (mode === 'dark' ? '#e3e3e3' : '#1F1F1F'),
              backgroundColor: sortBy === 'lastModified' ? (mode === 'dark' ? 'rgba(138,180,248,0.16)' : '#F4F5FA') : 'transparent',
              '&:hover': { backgroundColor: mode === 'dark' ? '#3c4043' : '#F1F3F4' },
            }}
          >
            Last Modified
          </MenuItem>
        </Menu>
        <div
          style={{
            position: 'absolute',
            bottom: '-1px',
            left: '-10px',
            right: '-10px',
            height: '1.5px',
            background: mode === 'dark' ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent)' : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.35), transparent)',
            filter: 'blur(1px)',
            opacity: isScrolled ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
          }}
        />
        </div>
        {/* Resources List or Shimmer */}
        {resourcesStatus === 'loading' ? (
          <div style={{ padding: '10px' }}>
            <ShimmerLoader count={6} type={viewMode === 'table' ? 'search-table' : 'search-card'} />
          </div>
        ) : filteredResources.length > 0 ? (
          viewMode === 'list' ? (
            filteredResources.map((resource: any, index: number) => {
              const isSelected = previewData && previewData.name === resource.dataplexEntry.name;
              const disableHoverEffect = selectedIndex !== -1 && selectedIndex === index - 1;
              const hideTopBorder = hoveredIndex === index - 1;
              return (
                <Box
                  key={resource.dataplexEntry.name}
                  onClick={() => handleSearchEntriesClick(resource.dataplexEntry)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  sx={{
                    cursor: 'pointer',
                    padding: '0px',
                    marginTop: index === 0 ? '10px' : '0px',
                    marginBottom: '11px',
                    marginLeft: '10px',
                    marginRight: previewData ? '4px' : '10px',
                  }}
                >
                  <SearchEntriesCard
                    index={index}
                    entry={resource.dataplexEntry}
                    hideTopBorderOnHover={hideTopBorder}
                    sx={{ backgroundColor: 'transparent' }}
                    isSelected={isSelected}
                    onDoubleClick={handleSearchEntriesDoubleClick}
                    disableHoverEffect={disableHoverEffect}
                    onNavigateToTab={handleNavigateToTab}
                    id_token={id_token}
                    onRequestAccess={handleRequestAccessFromCard}
                  />
                </Box>
              );
            })
          ) : (
            <div style={{ padding: '0 10px', width: '100%', boxSizing: 'border-box' }}>
              <SearchTableView
                resources={filteredResources}
                onRowClick={handleSearchEntriesClick}
                onFavoriteClick={handleFavoriteClick}
                getFormatedDate={getFormatedDate}
                getEntryType={getEntryType}
                previewOpen={!!previewData}
                selectedEntryName={previewData?.name || null}
                isDataProduct={isDataProduct}
              />
            </div>
          )
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            width: '100%'
          }}>
            <p style={{
              margin: 0,
              textAlign: 'center',
              color: mode === 'dark' ? '#9aa0a6' : '#0C1226CC',
              fontSize: '16px'
            }}>No Resources found</p>
          </div>
        )}
      </div>
    );
  } else if (resourcesStatus === 'failed') {
    let subString = "INVALID_ARGUMENT:";
    if(error?.details && typeof error?.details === 'string'){
      if(error.details.includes(subString)){
        content = (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            width: '100%'
          }}>
            <p style={{
              margin: 0,
              textAlign: 'center',
              color: '#666',
              fontSize: '16px'
            }}>{(error?.message || error) + ' invalid arguments passed in search params'}</p>
        </div>);
      }else if(error?.error?.code === 403 || error?.error?.status === 'PERMISSION_DENIED'){
        triggerNoAccess({
          message: 'You do not have permission to search resources. Please contact your administrator or sign in with a different account.',
        });
      }else{
        logout();
        navigate('/login');
      }
    }else if(error?.error?.code === 403 || error?.error?.status === 'PERMISSION_DENIED'){
      triggerNoAccess({
        message: 'You do not have permission to search resources. Please contact your administrator or sign in with a different account.',
      });
    }else{
      logout();
      navigate('/login');
    }
  }

  return (
    <>
      <div style={{ backgroundColor: isGlossary && mode !== 'dark' ? 'transparent' : (isDataProduct && mode !== 'dark' ? '#F7F9F9' : (mode === 'dark' ? '#131314' : '#ffffff')), height: 'calc(100vh - 4.5rem)', position: "relative", ...containerStyle }}>
        {content}
      </div>

      {/* Backdrop for card Request Access modal */}
      {isCardSubmitAccessOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1200,
            cursor: 'pointer',
            animation: 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 }
            }
          }}
          onClick={handleCardSubmitAccessClose}
        />
      )}
      {/* SubmitAccess panel for card Request Access button */}
      {cardAccessEntry && (
        <SubmitAccess
          isOpen={isCardSubmitAccessOpen}
          onClose={handleCardSubmitAccessClose}
          assetName={cardAccessEntry?.entrySource?.displayName?.length > 0 ? cardAccessEntry.entrySource.displayName : getName(cardAccessEntry?.name || '', '/')}
          entry={entryItems}
          onSubmitSuccess={handleCardSubmitSuccess}
          previewData={cardAccessEntry}
        />
      )}

      {/* Notification Bar */}
      <NotificationBar
        isVisible={isCardNotificationVisible}
        onClose={handleCardCloseNotification}
        message={cardNotificationMessage}
      />
    </>
  );
};

export default ResourceViewer;
