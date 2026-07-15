import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Paper, useMediaQuery } from '@mui/material'
import { Tune, Close } from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import FilterDropdown from '../Filter/FilterDropDown'
import type { AppDispatch } from '../../app/store'
import { searchResourcesByTerm } from '../../features/resources/resourcesSlice'
import { setSearchFiltersOpen } from '../../features/search/searchSlice'
import { useAuth } from '../../auth/AuthProvider'
import ResourceViewer from '../Common/ResourceViewer'
import ResourcePreview from '../Common/ResourcePreview'
import { typeAliases } from '../../utils/resourceUtils'

/**
 * @file SearchPage.tsx
 * @description
 * This component renders the main search results page, coordinating a
 * filter panel, a results list, and a details preview panel.
 *
 * It operates in a master-detail pattern:
 * 1.  **Filter Panel**: A `FilterDropdown` component is rendered in a
 * slidable panel on the left, which is toggled by a "Tune" icon
 * (`customFilters`).
 * 2.  **Master List**: A `ResourceViewer` component displays the main list
 * of search results (`resources`) fetched from the Redux store.
 * 3.  **Detail Panel**: A `ResourcePreview` component appears on the
 * right when an item in the `ResourceViewer` is selected (which sets
 * the `previewData` state).
 *
 * The component is heavily driven by Redux state:
 * - It fetches its own data by dispatching `searchResourcesByTerm` based
 * on the `searchTerm` and `searchType` from the Redux store.
 * - It re-fetches data whenever the `filters` (from the `FilterDropdown`) change.
 * - It automatically synchronizes the `searchType` from the global `SearchBar`
 * (via Redux) with its local `filters` state.
 * - It manages all pagination state (`startIndex`, `pageSize`, etc.) and
 * logic (`handlePagination`), dispatching new searches for more items
 * as the user paginates.
 *
 * @param {SearchPageProps} props - The props for the component.
 * @param {any[]} [props.searchResult] - (Optional) An array of search
 * results. (Note: The component primarily relies on data fetched from the
 * Redux store rather than this prop).
 *
 * @returns {React.ReactElement} A React element rendering the complete
 * search page layout, which includes the `FilterDropdown`,
 * `ResourceViewer`, and `ResourcePreview` components.
 */

const SearchPage: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const searchTerm = useSelector((state:any) => state.search.searchTerm);
  const searchType = useSelector((state:any) => state.search.searchType);
  const semanticSearch = useSelector((state:any) => state.search.semanticSearch);
  const searchSubmitted = useSelector((state: any) => state.search.searchSubmitted);
  const searchFilters = useSelector((state: any) => state.search.searchFilters);
  const mode = useSelector((state: any) => state.user.mode) as string;
  const id_token = user?.token || '';
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [filters, setFilters] = useState<any[]>(searchFilters || []);
  const [prevFilters, setPrevFilters] = useState<any[]>(searchFilters || []);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const isFiltersOpen = useSelector((state: any) => state.search.isSearchFiltersOpen);
  const isSmallScreen = useMediaQuery('(max-width: 1280px)');
  const [startIndex, setStartIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const isInitialMount = useRef(true);
  const isInitialFiltersMount = useRef(true);
  const isInitialSearchTypeMount = useRef(true);


  const handleFilterChange = useCallback((selectedFilters: any[]) => {
    setFilters(selectedFilters);
  }, []);

  const handleTuneIconClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const newFilterState = !isFiltersOpen;
    dispatch(setSearchFiltersOpen(newFilterState));
    if (isSmallScreen && newFilterState) {
      setPreviewData(null);
    }
  };

  const handlePreviewDataChange = (data: any) => {
    setPreviewData(data);
    if (isSmallScreen && data !== null) {
      dispatch(setSearchFiltersOpen(false));
    }
  };

  // Set background on main-content-area so no white shows behind shifted navbar
  useEffect(() => {
    const mainArea = document.querySelector('.main-content-area') as HTMLElement;
    if (mainArea) {
      mainArea.style.backgroundColor = mode === 'dark' ? '#131314' : '#F4F5FA';
    }
    return () => {
      if (mainArea) {
        mainArea.style.backgroundColor = '';
      }
    };
  }, [mode]);

  useEffect(() => {
    if (!searchSubmitted) return; // Back navigation: retain existing data

    setPageSize(20);
    setPageNumber(1);
    setStartIndex(0);
    // Clear previous search results in the store
    dispatch({ type: 'resources/setItemsPreviousPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsStoreData', payload: [] });
    if (searchTerm && searchTerm.trim() !== '') {
      dispatch(searchResourcesByTerm({term : searchTerm, id_token: id_token, filters: filters, semanticSearch: semanticSearch}) );
    }
    dispatch({ type: 'search/setSearchSubmitted', payload: false });
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // Skip on mount — the mount useEffect handles initial load
    }
    setStartIndex(0);
    setPageNumber(1);
    setPageSize(20);
    dispatch({ type: 'resources/setItemsPreviousPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsStoreData', payload: [] });
  }, [searchTerm]);

  useEffect(() => {
    if (isInitialFiltersMount.current) {
      isInitialFiltersMount.current = false;
      return; // Skip on mount — filters haven't actually changed
    }
    dispatch({ type: 'resources/setItemsPreviousPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsStoreData', payload: [] });
    setStartIndex(0);
    setPageNumber(1);
    if(filters.length > 0 || prevFilters.length > 0){
      dispatch(searchResourcesByTerm({term : searchTerm, id_token: id_token, filters: filters, semanticSearch: semanticSearch}));
    }
    setPrevFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (isInitialSearchTypeMount.current) {
      isInitialSearchTypeMount.current = false;
      return; // Skip on mount — filters are already correct from the previous session
    }
    dispatch({ type: 'resources/setItemsPreviousPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsStoreData', payload: [] });
    setStartIndex(0);
    setPageNumber(1);
    if(searchType === "BigQuery" || searchType === "bigquery"){
      if(!filters.some(item => item.name === "BigQuery")){
        const updatedFilters = [...filters, {name: 'BigQuery', type: 'system'}];
        setFilters(updatedFilters);
        // Notify parent
        dispatch({ type: 'search/setSearchFilters', payload: { searchFilters: updatedFilters } });
      }
    }else if(searchType === "All"){
      if(filters.some(item => item.name === "BigQuery")){
        const updatedFilters = filters.filter((f: any) => !(f.name === "BigQuery" && f.type === 'system'));
        setFilters(updatedFilters);
        // Notify parent
        dispatch({ type: 'search/setSearchFilters', payload: { searchFilters: updatedFilters } });
      }
    }
  }, [searchType]);

  // Select data from the Redux store
  const resources = useSelector((state: any) => state.resources.items);
  const resourcesStatus = useSelector((state: any) => state.resources.status);
  const error = useSelector((state: any) => state.resources.error);

  useEffect(() => {
    if(resourcesStatus === 'succeeded' || resourcesStatus === 'failed'){
      dispatch({ type: 'resources/setItemsNextPageSize', payload: null });
    }
  }, [resourcesStatus]);

  // Compute available type aliases with counts from current results
  const availableTypeAliases = useMemo(() => {
    const activeTypeFilters = filters.filter((f) => f.type === 'typeAliases');
    if (!resources || resources.length === 0) {
      // No results but there are active type filters — show all chips so user can deselect
      if (activeTypeFilters.length > 0) {
        return activeTypeFilters.map((f) => ({ name: f.name, count: 0 }));
      }
      return [];
    }
    return typeAliases
      .map((item: string) => ({
        name: item,
        count: resources.filter((resource: any) =>
          resource.dataplexEntry?.entryType?.includes('-' + item.toLowerCase())
        ).length,
      }))
      .filter((item) => item.count > 0 || activeTypeFilters.some((f) => f.name === item.name));
  }, [resources, filters]);

  // Pagination state
  const resourcesTotalSize = useSelector((state: any) => state.resources.totalItems);
  const resourcesRequestData = useSelector((state: any) => state.resources.itemsRequestData);
  const requestItemStore = useSelector((state: any) => state.resources.itemsStore);

  // Pagination handler
  const handlePagination = (direction: 'next' | 'previous', size: number, sizeChange:boolean = false) => {
    if (!resourcesRequestData) return;
    let requestResourceData = { ...resourcesRequestData };
    if (sizeChange){
      setStartIndex(0);
      setPageNumber(1);
      setPageSize(size);
    }

    if (direction === 'next') {
      if (requestItemStore.length > 0){
        const start = sizeChange ? 0 : size * pageNumber;
        setPageNumber(pageNumber + 1);
        setStartIndex(start);
        const paginatedItems = start + size <= requestItemStore.length 
        ? requestItemStore.slice(start, start + size) : requestItemStore.slice(start);

        if(paginatedItems.length === size || ((start + size) >= resourcesTotalSize && requestItemStore.length === resourcesTotalSize)){
          dispatch({ type: 'resources/setItemsStatus', payload: 'loading' });
          dispatch({ type: 'resources/setItems', payload: paginatedItems });
        }else if(requestResourceData != null){
          requestResourceData.pageSize = (start + size) - requestItemStore.length;
          dispatch({ type: 'resources/setItemsNextPageSize', payload: size });
          dispatch(searchResourcesByTerm({ term:searchTerm, requestResourceData: requestResourceData, id_token: id_token, filters:filters, semanticSearch: semanticSearch }) );
        }
      }
    } else if (direction === 'previous') {
      if (requestItemStore.length > 0){
        dispatch({ type: 'resources/setItemsStatus', payload: 'loading' });
        const start = sizeChange ? 0 : Math.max(0, size * (pageNumber - 2));
        setPageNumber(Math.max(1, pageNumber - 1));
        setStartIndex(start);
        const paginatedItems = requestItemStore.slice(start, start + size);
        dispatch({ type: 'resources/setItems', payload: paginatedItems });
      }
    }

  };

  // useEffect hook to dispatch the fetchResources action for the initial load
  useEffect(() => {
    // Only set previewData to null on initial load, not on every status change
    if (resourcesStatus === 'idle') {
      setPreviewData(null);
    }
    if (resourcesStatus === 'loading') {
      //setLoader(true);
      setPreviewData(null);
    }
    // if (resourcesStatus === 'succeeded') {
    //   //setLoader(false)
    //   //console.log("Resources fetched successfully:", resources);
    // }
  }, [resourcesStatus]);
  
  // Custom filter component for SearchPage
  const filterBorderColor = mode === 'dark' ? '#a7c6fa' : '#022FCD';
  const filterActiveColor = mode === 'dark' ? '#a7c6fa' : '#022FCD';
  const customFilters = (
    <span
        style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "8px 13px",
            gap: "8px",
            width: "85px",
            height: "32px",
            border: isFiltersOpen ? "none" : `1px solid ${filterBorderColor}`,
            borderRadius: "59px",
            background: isFiltersOpen ? filterActiveColor : "none",
            color: isFiltersOpen ? (mode === 'dark' ? '#072e6f' : "#EDF2FC") : filterActiveColor,
            cursor: "pointer",
            transition: "all 0.2s ease",
            flexShrink: 0,
            flexGrow: 0,
        }}
        onClick={handleTuneIconClick}
    >
        {isFiltersOpen ? <Close style={{ width: "16px", height: "16px", flexShrink: 0, flexGrow: 0 }} /> : <Tune style={{ width: "16px", height: "16px", flexShrink: 0, flexGrow: 0 }} />}
        <span style={{
            fontFamily: '"Google Sans", sans-serif',
            fontWeight: 500,
            fontSize: "12px",
            lineHeight: "16px",
            letterSpacing: "0.1px",
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            flexShrink: 0,
            flexGrow: 0,
        }}>Filters</span>
    </span>
  );

  return (
    <>
        <div className="search-page-bg" style={{backgroundColor: mode === 'dark' ? '#131314' : '#F4F5FA', height: 'calc(100vh - 3.9rem)', position: "relative"}}>
            {/* Filters Component - Fixed Full-Height Overlay */}
            <div className="filter-panel-container" style={{
                position: 'fixed',
                left: isFiltersOpen ? '92px' : '-252px',
                top: 0,
                width: '252px',
                height: '100vh',
                transition: 'left 0.3s ease-in-out',
                zIndex: 1100,
                overflowY: 'auto',
                overflowX: 'hidden',
                backgroundColor: mode === 'dark' ? '#282a2c' : '#F4F5FA',
                scrollbarWidth: 'none',
            }}>
                <FilterDropdown
                  key="filters-panel"
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClose={() => dispatch(setSearchFiltersOpen(false))}
                  availableTypeAliases={availableTypeAliases}
                  onTypeAliasClick={(type) => {
                    const updated = filters.find((f: any) => (f.name === type && f.type === 'typeAliases'))
                      ? filters.filter((f: any) => !(f.name === type && f.type === 'typeAliases'))
                      : [...filters, { name: type, type: 'typeAliases' }];
                    handleFilterChange(updated);
                    dispatch({ type: 'search/setSearchFilters', payload: { searchFilters: updated } });
                  }}
                  resourcesTotalSize={resourcesTotalSize}
                  resourcesStatus={resourcesStatus}
                />
            </div>

            {/* Main Content - Always Stable Layout */}
            <div style={{display: 'flex', padding: '0', height: 'calc(100vh - 3.9rem)'}}>
                <div style={{
                    flex: 1,
                    minWidth: 0,
                    transition: 'margin-left 0.3s ease-in-out',
                    marginLeft: isFiltersOpen ? '252px' : '0px'
                }}>
                      <ResourceViewer
                      resources={resources}
                      resourcesStatus={resourcesStatus}
                      error={error}
                      previewData={previewData}
                      onPreviewDataChange={handlePreviewDataChange}
                      typeAliases={typeAliases}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      id_token={id_token}
                      showFilters={true}
                      showSortBy={true}
                      showResultsCount={true}
                      customFilters={customFilters}
                      selectedFilters={filters}
                      onFiltersChange={handleFilterChange}
                      availableTypeAliases={availableTypeAliases}
                      onTypeAliasClick={(type) => {
                        const updated = filters.find((f: any) => (f.name === type && f.type === 'typeAliases'))
                          ? filters.filter((f: any) => !(f.name === type && f.type === 'typeAliases'))
                          : [...filters, { name: type, type: 'typeAliases' }];
                        handleFilterChange(updated);
                        dispatch({ type: 'search/setSearchFilters', payload: { searchFilters: updated } });
                      }}
                      containerStyle={{ marginLeft: '0px' }}
                      contentStyle={{ margin: '0px', ...(viewMode === 'table' && previewData ? { paddingRight: '0px' } : {}) }}
                      renderPreview={false}
                      startIndex={startIndex}
                      pageSize={pageSize}
                      setPageSize={setPageSize}
                      requestItemStore={requestItemStore}
                      resourcesTotalSize={resourcesTotalSize}
                      handlePagination={handlePagination}
                    />
                </div>
                <Paper
                  elevation={0}
                  sx={{
                    width: previewData ? '25%' : '0px',
                    minWidth: previewData ? '25%' : '0px',
                    height: 'calc(100vh - 5rem)',
                    borderRadius: '0px',
                    backgroundColor: mode === 'dark' ? '#131314' : '#FFFFFF',
                    border: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    flexShrink: 0,
                    transition: 'width 0.3s ease-in-out, min-width 0.3s ease-in-out, opacity 0.3s ease-in-out',
                    paddingLeft: previewData ? '8px' : '0px',
                    paddingRight: previewData ? '20px' : '0px',
                    opacity: previewData ? 1 : 0,
                  }}
                >
                  {previewData && (
                    <ResourcePreview
                      previewData={previewData}
                      onPreviewDataChange={handlePreviewDataChange}
                      id_token={id_token}
                    />
                  )}
                </Paper>
            </div>
        </div>
    </>
  )
}

export default SearchPage;