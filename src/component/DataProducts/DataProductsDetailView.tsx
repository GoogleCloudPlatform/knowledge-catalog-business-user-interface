import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, IconButton, Skeleton, Tab, Tabs } from '@mui/material'
import { KeyboardArrowUp, KeyboardArrowDown, DashboardOutlined, Inventory2Outlined, GroupsOutlined, ArticleOutlined } from '@mui/icons-material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import CustomTabPanel from '../TabPanel/CustomTabPanel'
import PreviewAnnotation from '../Annotation/PreviewAnnotation'
import AnnotationFilter from '../Annotation/AnnotationFilter'
import type { AppDispatch } from '../../app/store'
import { useAuth } from '../../auth/AuthProvider'
import { getMimeType, getName  } from '../../utils/resourceUtils'
import DetailPageOverviewSkeleton from '../DetailPageOverview/DetailPageOverviewSkeleton';
import { fetchDataProductsAssetsList, fetchDataProductsList, getDataProductDetails, setDataProductsDetailTabValue } from '../../features/dataProducts/dataProductsSlice'
import Assets from './Assets'
import AccessGroup from './AccessGroup'
import Contract from './Contract'
import DataProductOverviewNew from './DataProductOverviewNew'
import SubmitAccess from '../SearchPage/SubmitAccess'
import NotificationBar from '../SearchPage/NotificationBar'
import { useAccessRequest } from '../../contexts/AccessRequestContext'
import ResourcePreview from '../Common/ResourcePreview'
import { fetchEntry, clearHistory } from '../../features/entry/entrySlice'
import { useNotification } from '../../contexts/NotificationContext'
import DataProductsInsight from './DataProductsInsight'
import AccessRequests from './AccessRequests'
import RequestAccessButton from './RequestAccessButton'
import axios from '../../utils/apiInterceptor'
// import { useFavorite } from '../../hooks/useFavorite'

/**
 * @file ViewDetails.tsx
 * @description
 * This component renders the main "View Details" page for a specific data entry.
 * It serves as a container for various sub-components displayed in a tabbed
 * interface.
 *
 * Key functionalities include:
 * 1.  **Data Fetching**: It reads the primary `entry` data from the Redux
 * `entry.items` state. If the entry is a BigQuery table, it also dispatches
 * `getSampleData` to fetch table preview data.
 * 2.  **Loading State**: It displays a `ShimmerLoader` while the `entryStatus`
 * from Redux is 'loading'.
 * 3.  **Sticky Header**: It renders a sticky header containing:
 * - A "Back" button (`goBack`) that uses an internal Redux `entry.history`
 * stack for navigation before falling back to browser history.
 * - The entry's title and descriptive `Tag` components.
 * - Action buttons, such as "Open in BigQuery" and "Explore with Looker
 * Studio" (conditional on the entry type).
 * 4.  **Tabbed Interface**: It renders a `Tabs` component that dynamically
 * displays different tabs based on the `entryType`:
 * - **Tables (BigQuery)**: Overview, Aspects, Lineage, Data Profile,
 * Data Quality.
 * - **Datasets**: Overview, Entry List, Aspects.
 * - **Others**: Overview, Aspects.
 * 5.  **Tab Content**: It uses `CustomTabPanel` to render the content for the
 * active tab, which can be `DetailPageOverview`, `PreviewAnnotation`
 * (with `AnnotationFilter`), `Lineage`, `DataProfile`, `DataQuality`, or
 * `EntryList`.
 *
 * @param {object} props - This component accepts no props. It relies
 * entirely on data from the Redux store (via `useSelector`) and context
 * (via `useAuth`).
 *
 * @returns {React.ReactElement} A React element rendering the complete
 * detail page layout, which includes the sticky header, tab navigation,
 * and the content of the currently active tab, or a `ShimmerLoader` if
Such * data is loading.
 */

// //interface for the component props
interface DataProductsDetailViewProps {
  //css?: React.CSSProperties; // Optional CSS properties for the button
  onRequestAccess?: (entry: any) => void;
}

// Tab component
const DataProductsDetailView: React.FC<DataProductsDetailViewProps> = ({ onRequestAccess }) => {

  const { user } = useAuth();
  const {
        dataProductsItems, 
        status, 
        selectedDataProductDetails, 
        selectedDataProductStatus,
        selectedDataProductError
    } = useSelector((state: any) => state.dataProducts);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataProductIdFromUrl = searchParams.get('dataProductId');
  const dispatch = useDispatch<AppDispatch>();
  const { showError } = useNotification();

  const { setAccessPanelOpen } = useAccessRequest();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<'name' | 'lastModified'>('name');
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [dataProductsList, setDataProductsList] = useState<any>([]);
  const tabValue = (useSelector((state: any) => state.dataProducts.detailTabValue) ?? 0) as number;
  const setTabValue = (val: number) => dispatch(setDataProductsDetailTabValue(val));
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());
  const [filteredEntry, setFilteredEntry] = useState<any>(null);
  const [isSubmitAccessOpen, setIsSubmitAccessOpen] = useState<boolean>(false);
  const [isNotificationVisible, setIsNotificationVisible] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [assetPreviewData, setAssetPreviewData] = useState<any | null>(null);
  const [isAssetPreviewOpen, setIsAssetPreviewOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const id_token = user?.token || '';

  const isOwner = React.useMemo(() => {
    const currentUserEmail = user?.email?.trim().toLowerCase();
    if (!currentUserEmail) return false;

    const ownerEmails: string[] = [];

    // Owner emails carried over from the list/card selection (set on card click).
    try {
      const stored = JSON.parse(localStorage.getItem('selectedDataProduct') || '{}');
      if (Array.isArray(stored?.ownerEmails)) {
        ownerEmails.push(...stored.ownerEmails);
      }
    } catch {
      // Ignore malformed localStorage value.
    }

    // Owner emails from the fetched detail entry's contacts aspect (covers deep links/refresh).
    const number = selectedDataProductDetails?.entryType?.split('/')?.[1] ?? '0';
    const identities: Array<{ role?: string; name?: string }> =
      selectedDataProductDetails?.aspects?.[`${number}.global.contacts`]?.data?.identities ?? [];
    identities
      .filter((contact) => typeof contact?.role === 'string' && /owner/i.test(contact.role))
      .forEach((contact) => {
        const rawName: string = contact?.name ?? '';
        const email = rawName.includes('<') ? rawName.split('<')[1].slice(0, -1) : rawName;
        if (email) ownerEmails.push(email);
      });

    return ownerEmails.some((email) => email.trim().toLowerCase() === currentUserEmail);
  }, [selectedDataProductDetails, user?.email]);
  const [changeRequests, setChangeRequests] = useState<any | []>([]);
  const [changeRequestStatus, setChangeRequestStatus] = useState<'loading' | 'success' | 'error'>('loading');


  const requestedGroupIds = React.useMemo(() => {
    if (!user?.email || changeRequestStatus !== 'success') return new Set();
    
    return new Set(
      changeRequests
        .filter((cr: any) => cr?.author?.toLowerCase() === user?.email?.toLowerCase() && cr?.state !== 'REJECTED')
        .map((cr: any) => cr?.dataProductAccessRequest?.accessGroupId)
        .filter(Boolean)
    );
  }, [changeRequests, user?.email, changeRequestStatus]);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 200);
    }
  }, []);


  let selectedDataProduct = localStorage.getItem('selectedDataProduct') ? 
  JSON.parse(localStorage.getItem('selectedDataProduct') || '{}') : {};

  let accessGroups = selectedDataProduct ? (selectedDataProduct?.accessGroups || {}): {};
    const handleResourceClick = (id: string) => {
      dispatch(clearHistory());
  
      // Convert resource ID to entry name format for fetchEntry
      // Resource ID format: projects/{project}/locations/{location}/glossaries/{glossary}/[categories/{category}/]terms/{term}
      // Entry name format: projects/{project}/locations/{location}/entryGroups/@dataplex/entries/{resource}
      let entryName = id;
  
      // Check if this is already in entry name format or needs conversion
      if (!id.includes('/entryGroups/')) {
        // Extract project and location from the resource ID
        const parts = id.split('/');
        const projectIndex = parts.indexOf('projects');
        const locationIndex = parts.indexOf('locations');
  
        if (projectIndex !== -1 && locationIndex !== -1) {
          const project = parts[projectIndex + 1];
          const location = parts[locationIndex + 1];
  
          // Build entry name format
          entryName = `projects/${project}/locations/${location}/entryGroups/@dataplex/entries/${id}`;
        }
      }
  
      dispatch(fetchEntry({ entryName: entryName, id_token: id_token }));
      navigate('/view-details');
    };
    
    
    
    

  const handleAnnotationCollapseAll = () => {
    console.log(filteredEntry, sortAnchorEl, dataProductsList);
    setSearchTerm(searchTerm);
    setSortOrder(sortOrder);
    setSortBy(sortBy);
    setSortAnchorEl(sortAnchorEl);
    setExpandedAnnotations(new Set());
  };
  
  const handleAnnotationExpandAll = () => {
  if (selectedDataProductDetails?.aspects) {
    setExpandedAnnotations(new Set(Object.keys(selectedDataProductDetails.aspects)));
  }
};

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log("Tab changed to:", event);
    setIsAssetPreviewOpen(false);
    setAssetPreviewData(null);
    setTabValue(newValue);
  };

  const loadChangeRequests = async () => {
    setChangeRequestStatus('loading');
    axios.get(`https://dataplex.googleapis.com/v1/projects/${selectedDataProductDetails.name.split('/')[1]}/locations/${selectedDataProductDetails.name.split('/')[3]}/changeRequests`, {
          headers: {
            Authorization: `Bearer ${id_token}`,
          },       
          params: {
            filter: `resource="//dataplex.googleapis.com/${selectedDataProductDetails.name.split('/entryGroups/')[0]}/dataProducts/${selectedDataProductDetails.name.split('/dataProducts/')[1]}" AND changeType="REQUEST_DATA_PRODUCT_ACCESS"`
          }
          }).then((response:any) => {           
            const changeRequests = response.data.changeRequests || [];
            if (changeRequests.length > 0) {
              setChangeRequests(changeRequests);
              // Auto-hide notification after 5 seconds
            }else{
              setChangeRequests([]);
            }
            console.log("Fetched change requests:", changeRequests);
            setChangeRequestStatus('success');
        }).catch((error:any) => {
          console.error("Error fetching change requests:", error);
          setChangeRequestStatus('error');
        });
  };


const tabProps = (index: number)  => {
    return {
        id: `tab-${index}`,
        'aria-controls': `tabpanel-${index}`,
    };
}

  useEffect(() => {
    if (dataProductsItems.length === 0 && status === 'idle' && user?.token) {
       dispatch(fetchDataProductsList({ id_token: user?.token }));
    }
    if(status=== 'succeeded'){
        setDataProductsList(dataProductsItems);
    }
  }, [dispatch, dataProductsItems.length, status, user?.token]);

    useEffect(() => {
    if (selectedDataProductStatus === 'idle' && dataProductIdFromUrl && user?.token) {
      dispatch(getDataProductDetails({ id_token: user.token, dataProductId: dataProductIdFromUrl }));
    }
    }, [dispatch, selectedDataProductStatus, dataProductIdFromUrl, user?.token]);

    useEffect(() => {
    if(selectedDataProductStatus=== 'succeeded'){
        console.log("Selected Data Product Details", selectedDataProductDetails);
        dispatch(fetchDataProductsAssetsList({ id_token: user?.token, dataProductId: selectedDataProductDetails.name }));
    }

    if(selectedDataProductStatus === 'failed'){
        console.log("Error fetching selected data product details", selectedDataProductError);
        showError(`Error fetching data product details: ${selectedDataProductError}`, 5000);
        setTimeout(() => {
          //setIsNotificationVisible(false);
          navigate('/data-products');
        }, 2000);
    }
  }, [dispatch, selectedDataProductDetails.length, selectedDataProductStatus, user?.token]);

  // Effects
    // Sync local panel state with global context
    useEffect(() => {
      setAccessPanelOpen(isSubmitAccessOpen);
    }, [isSubmitAccessOpen, setAccessPanelOpen]);

    useEffect(() => {
      if(selectedDataProductStatus=== 'succeeded'){
        loadChangeRequests();
      }
    }, [selectedDataProductStatus, selectedDataProductDetails]);


    const handleCloseSubmitAccess = () => {
    setIsSubmitAccessOpen(false);
  };

  const handleSubmitSuccess = (_assetName: string) => {
    // After successful access request submission, refresh the change requests list to show the new request
    loadChangeRequests();
    
    setIsSubmitAccessOpen(false);
    setNotificationMessage(`Request sent`);
    setIsNotificationVisible(true);
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setIsNotificationVisible(false);
    }, 5000);
  };

  const handleCloseNotification = () => {
    setIsNotificationVisible(false);
  };

  //sorting handlers
//   const handleSortMenuClick = (event: React.MouseEvent<HTMLElement>) => {
//     setSortAnchorEl(event.currentTarget);
//   };
  
//   const handleSortMenuClose = () => {
//     setSortAnchorEl(null);
//   };
  
//   const handleSortOptionSelect = (option: 'name' | 'lastModified') => {
//     setSortBy(option);
//     setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
//     setDataProductsList(sortItems(dataProductsList));
//     handleSortMenuClose();
//   };

  const sortItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') {
          const nameA = a.displayName.toLowerCase();
          const nameB = b.displayName.toLowerCase();
          if (sortOrder === 'asc') return nameA.localeCompare(nameB);
          return nameB.localeCompare(nameA);
      } else {
          // Last Modified (Number)
          const dateA = a.updateTime || 0;
          const dateB = b.updateTime || 0;
          if (sortOrder === 'asc') return dateA - dateB; // Oldest first
          return dateB - dateA; // Newest first
      }
    });
  };

  useEffect(() => {
    if (dataProductsItems.length > 0) {
      setDataProductsList(sortItems(
        dataProductsItems.filter((item:any) => {
            // The includes() method is case-sensitive. Use .toLowerCase() for case-insensitive search.
            return item.displayName.toLowerCase().includes(searchTerm);
        })
      ));
    }
  }, [searchTerm]);


  let annotationTab = <PreviewAnnotation
    entry={filteredEntry || selectedDataProductDetails}
    css={{width:"100%"}}
    isTopComponent={true} 
    expandedItems={expandedAnnotations}
    setExpandedItems={setExpandedAnnotations}
    isDataProduct={true}
  />;
  
  let overviewTab = <DataProductOverviewNew entry={selectedDataProductDetails} entryType={'data-product'} labels={selectedDataProduct?.labels} css={{width:"100%"}} />;
  let assetsTab = <Assets 
    entry={selectedDataProductDetails} css={{width:"100%"}} 
    onAssetPreviewChange={(data) => {
        setAssetPreviewData(data);
        setIsAssetPreviewOpen(!!data);
    }}
  />;
  let accessGroupTab = <AccessGroup entry={selectedDataProductDetails} css={{width:"100%"}} />;
  let contractTab = <Contract entry={selectedDataProductDetails} css={{width:"100%"}} />;
  let insightsTab = <DataProductsInsight entry={selectedDataProductDetails} css={{width:"100%"}} />;
  let accessRequestTab = <AccessRequests entry={selectedDataProductDetails} changeRequests={changeRequests} css={{width:"100%"}} />;


  const handleRequestAccess = (data: any) => {
    if (onRequestAccess) {
      onRequestAccess(data);
    } else {
      setIsSubmitAccessOpen(true);
    }
  };

 


  const headerDescription = (selectedDataProductDetails?.entrySource?.description || '').trim();

  return selectedDataProductStatus == 'succeeded' ? (
    <div ref={scrollContainerRef} onScroll={handleScroll} style={{display: "flex", flexDirection: "column", padding: "0px 0", background:"#F8FAFC", height: "100%", overflowY: "auto" }}>
      {/* Primary Title Bar - sticky, direct child of scroll container */}
      <div style={{
        display: "flex",
        flexDirection: isScrolled ? "column" : "row",
        alignItems: isScrolled ? "flex-start" : "center",
        padding: isScrolled ? "8px 20px 0px" : "16px 20px 8px 20px",
        gap: isScrolled ? "12px" : "0px",
        position: "sticky",
        top: 0,
        backgroundColor: isScrolled ? "#F9F9FC" : "#F7F9F9",
        zIndex: 1001,
        boxShadow: isScrolled ? "0px 1px 6.6px rgba(171, 171, 179, 0.5)" : "none",
        transition: "all 0.2s ease",
        boxSizing: "border-box",
        width: "100%",
        height: isScrolled ? "100px" : "auto",
        minHeight: isScrolled ? "100px" : "auto"
      }}>
        {isScrolled ? (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Scrolled State: Compact Header */}
            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", width: "100%", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "100%", gap: "16px" }}>
                <IconButton
                  onClick={() => { navigate('/data-products'); }}
                  sx={{ p: '4px', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.825 13L13.425 18.6L12 20L4 12L12 4L13.425 5.4L7.825 11H20V13H7.825Z" fill="#1F1F1F"/>
                  </svg>
                </IconButton>

                <Box sx={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#EAEEFA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1.25px solid #FFFFFF',
                  overflow: 'hidden',
                }}>
                  {selectedDataProduct.icon ? (
                    <img
                      src={`data:${getMimeType(selectedDataProduct.icon)};base64,${selectedDataProduct.icon}`}
                      alt={selectedDataProductDetails.entrySource?.displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <svg width="42" height="42" viewBox="0 0 54 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, transform: 'translate(0px, -1px)' }}>
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

                <label style={{
                  fontFamily: '"Google Sans", sans-serif',
                  color: "#1F1F1F",
                  fontSize: "20px",
                  fontWeight: "500",
                  lineHeight: "28px",
                }}>
                  {selectedDataProductDetails.entrySource?.displayName?.length > 0 ? selectedDataProductDetails.entrySource.displayName : getName(selectedDataProductDetails.name || '', '/')}
                </label>
              </div>

              {changeRequestStatus === 'loading' ? (
                  <Skeleton variant="rounded" width={140} height={36} sx={{ borderRadius: '100px' }} />
                ) : (
                  <RequestAccessButton
                    entry={selectedDataProductDetails}
                    onRequestAccess={handleRequestAccess}
                    changeRequests={changeRequests}
                    changeRequestStatus={changeRequestStatus}
                    userEmail={user?.email}
                    variant="compact"
                    totalAccessGroups={Object.keys(accessGroups).length}
                  />
                )}
            </div>

            {/* Scrolled State: Tabs Container */}
            <Box sx={{
              width: "100%",
              marginTop: "auto",
              "& .MuiTabs-root": { minHeight: "47px", height: "47px" },
              "& .MuiTab-root": {
                fontFamily: '"Google Sans", sans-serif',
                fontSize: "14px",
                fontWeight: 500,
                color: "#0C1226",
                textTransform: "none",
                minHeight: "47px",
                padding: "0px 16px",
                "&.Mui-selected": { color: "#022FCD" },
              },
              "& .MuiTabs-indicator": { backgroundColor: "#022FCD", height: "3px", borderRadius: "3px 3px 0 0" },
            }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Overview" {...tabProps(0)} />
                <Tab icon={<Inventory2Outlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Assets" {...tabProps(1)} />
                {isOwner && (
                  <Tab value={2} icon={<GroupsOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Access Groups & Permissions" {...tabProps(2)} />
                )}
                <Tab icon={<ArticleOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Contracts" {...tabProps(3)} />
                {isOwner && (
                    <Tab value={4} icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>lock_open</span>} iconPosition="start" label="Access Requests" {...tabProps(4)} />
                  )}
                <Tab icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span>} iconPosition="start" label="Aspects" {...tabProps(5)} />
                <Tab icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>query_stats</span>} iconPosition="start" label="Insights" {...tabProps(6)} />
              </Tabs>
            </Box>
          </div>
        ) : (
          /* Unscrolled State: Just the Custom Back Button */
          <>
          <div 
            onClick={() => { navigate(-1); }} 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "4px", 
              cursor: "pointer" 
            }}
          >
          <IconButton
            sx={{
              p: '4px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.825 13L13.425 18.6L12 20L4 12L12 4L13.425 5.4L7.825 11H20V13H7.825Z" fill="#1F1F1F"/>
            </svg>
          </IconButton>
          </div>
          <span style={{
              width: "300px",
              height: "40px",
              marginLeft: "8px",
              fontFamily: "'Product Sans Medium', 'Google Sans', sans-serif",
              fontStyle: "normal",
              fontWeight: 500,
              fontSize: "14px",
              lineHeight: "40px",
              display: "flex",
              alignItems: "center",
              color: "#1F1F1F",
              userSelect: "none"
            }}>
              Back to Data Products
            </span>
          </>
        )}
      </div>
        <div style={{display: "flex", flexDirection: "row", gap: "2px"}}>
          <div style={{display: "flex", flexDirection: "column", flex: 1, minWidth: 0}}>
            <div style={{padding:"0px 20px", display: "flex", flexDirection: "column"}}>
              
              {/* New Recreated Data Product Card Layout */}
              <div style={{
                  position: "relative",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  padding: "24px",
                  gap: "20px",
                  background: "linear-gradient(88.29deg, #F6F7FF 0%, #F6FFFC 105.88%)",
                  borderRadius: "16px",
                  width: "100%",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)"
              }}>
                  {/* Top Row: Icon and Title */}
                  <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "100%", gap: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <Box sx={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            background: '#EAEEFA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1.25px solid #FFFFFF',
                            overflow: 'hidden',
                          }}>
                            {selectedDataProduct.icon ? (
                              <img
                                src={`data:${getMimeType(selectedDataProduct.icon)};base64,${selectedDataProduct.icon}`}
                                alt={selectedDataProductDetails.entrySource?.displayName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <svg width="52" height="52" viewBox="0 0 54 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, transform: 'translate(0px, -1px)' }}>
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
                          <label style={{
                              fontFamily: '"Google Sans", sans-serif',
                              color: "#1F1F1F",
                              fontSize: "24px",
                              fontWeight: "500",
                              lineHeight: "32px",
                          }}>
                              {selectedDataProductDetails.entrySource?.displayName?.length > 0 ? selectedDataProductDetails.entrySource.displayName : getName(selectedDataProductDetails.name || '', '/')}
                          </label>
                      </div>
                  </div>

                  {/* Middle Row: Action Button */}
                  <div style={{
                      position: "absolute",
                      top: "24px",
                      right: "24px",
                  }}>
                    {changeRequestStatus === 'loading' ? (
                      <Skeleton variant="rounded" width={160} height={40} sx={{ borderRadius: '100px' }} />
                    ) : (
                      <RequestAccessButton
                        entry={selectedDataProductDetails}
                        onRequestAccess={handleRequestAccess}
                        changeRequests={changeRequests}
                        changeRequestStatus={changeRequestStatus}
                        userEmail={user?.email}
                        variant="card"
                        totalAccessGroups={Object.keys(accessGroups).length}
                      />
                    )}
                  </div>
                  {/* Bottom Row: Description text block */}
                  <div style={{ width: "100%" }}>
                    {headerDescription ? (
                      <>
                        <div style={{
                            fontFamily: '"Google Sans", sans-serif',
                            fontSize: "14px",
                            lineHeight: "20px",
                            color: "#0C1226",
                            fontWeight: 400,
                            maxHeight: descriptionExpanded ? "none" : "60px",
                            overflow: "hidden",
                            position: "relative"
                        }}>
                            {headerDescription}
                        </div>
                        {headerDescription.length > 200 && (
                            <button
                                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "6px 0px",
                                    color: "#0B57D0",
                                    fontFamily: '"Google Sans", sans-serif',
                                    fontSize: "14px",
                                    fontWeight: 500,
                                }}
                            >
                                {descriptionExpanded ? <KeyboardArrowUp sx={{ fontSize: "20px" }} /> : <KeyboardArrowDown sx={{ fontSize: "20px" }} />}
                                {descriptionExpanded ? 'Show less' : 'Show more'}
                            </button>
                        )}
                      </>
                    ) : (
                      <div style={{
                          fontFamily: '"Google Sans", sans-serif',
                          fontSize: "14px",
                          lineHeight: "20px",
                          color: "#0C1226CC",
                          fontStyle: "italic",
                      }}>
                          No description provided for this data product.
                      </div>
                    )}
                  </div>
              </div>

              {/* Navigation Tab Bar */}
              <div style={{ 
                paddingTop: "12px",
                opacity: isScrolled ? 0 : 1, 
                marginTop: "0px",
                transition: "opacity 0.2s ease",
                pointerEvents: isScrolled ? "none" : "auto" }}>
                <Box
                  sx={{
                    width: "100%",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      "& .MuiTabs-root": {
                        minHeight: "47px",
                        height: "47px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        padding: "0px",
                        width: "1203px",
                        maxWidth: "100%",
                        "& .MuiTabs-flexContainer": {
                          gap: "4px",
                        }
                      },
                      "& .MuiTab-root": {
                        fontFamily: '"Google Sans", sans-serif',
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0C1226",
                        textTransform: "none",
                        minHeight: "47px",
                        padding: "0px 16px",
                        display: "inline-flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "1px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        "&.Mui-selected": {
                          color: "#022FCD",
                        },
                      },
                      "& .MuiTabs-indicator": {
                        backgroundColor: "transparent",
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          left: "16px",
                          right: "16px",
                          bottom: "0px",
                          height: "3px",
                          backgroundColor: "#022FCD",
                          borderRadius: "3px 3px 0 0",
                        },
                      },
                    }}>
                        <Tabs 
                          value={tabValue}
                          onChange={handleTabChange}
                          aria-label="basic tabs"
                          TabIndicatorProps={{
                            children: <span className="indicator" />,
                          }}
                        >
                            <Tab value={0} key="overview" icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Overview" {...tabProps(0)} />
                            <Tab value={1} key="assets" icon={<Inventory2Outlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Assets" {...tabProps(1)} />
                            {isOwner && (
                              <Tab value={2} key="accessGroup&Permission" icon={<GroupsOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Access Groups & Permissions" {...tabProps(2)} />
                            )}
                            <Tab value={3} key="contract" icon={<ArticleOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Contracts" {...tabProps(3)} />
                            {isOwner && (
                              <Tab value={4} key="Access Requests" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>lock_open</span>} iconPosition="start" label="Access Requests" {...tabProps(4)} />
                            )}
                            <Tab 
                                value={5}
                                key="annotations" 
                                icon={
                                  <span 
                                    className="material-symbols-outlined" 
                                    style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}
                                  >
                                    newsmode
                                  </span>
                                } 
                                iconPosition="start" 
                                label="Aspects" 
                                {...tabProps(5)} 
                              />
                            <Tab value={6} key="insights" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>query_stats</span>} iconPosition="start" label="Insights" {...tabProps(6)} />
                          </Tabs>
                        </Box>
                      </Box>
                    </div>
                  </div>

            {/* Tab Content - Scrollable */}
            <div style={{paddingTop:"0px", marginTop:"0px", marginLeft: "20px", marginRight: "20px", paddingBottom: "2rem", borderTop: "1px solid #E0E0E0"}}>
                    <CustomTabPanel value={tabValue} index={0}>
                        {overviewTab}
                    </CustomTabPanel>
                    <CustomTabPanel value={tabValue} index={1}>
                        <div style={{ marginLeft: "-20px", marginRight: "-20px", marginTop: "-10px" }}>
                          {assetsTab}
                        </div>
                    </CustomTabPanel>
                    <CustomTabPanel value={tabValue} index={2}>
                        {accessGroupTab}
                    </CustomTabPanel>
                    <CustomTabPanel value={tabValue} index={3}>
                        {contractTab}
                    </CustomTabPanel>
                    <CustomTabPanel value={tabValue} index={4}>
                        <div style={{ marginTop: "-18px" }}>
                            {accessRequestTab}
                        </div>
                    </CustomTabPanel>
                    <CustomTabPanel value={tabValue} index={5}>
                        {(() => {
                            const entryToUse = filteredEntry || selectedDataProductDetails;
                            const number = entryToUse?.entryType?.split('/')?.[1] ?? '0';
                            const aspects = entryToUse?.aspects || {};
                            
                            const displayableKeys = Object.keys(aspects).filter(key => {
                                const isSchema = key === `${number}.global.schema`;
                                const isOverview = key.endsWith('.global.overview');
                                const isContacts = key === `${number}.global.contacts`;
                                const isUsage = key === `${number}.global.usage`;
                                const isGlossaryTermAspect = key.endsWith('.global.glossary-term-aspect');
                                const isDataProductAspect = key.endsWith('.data-product');
                                const isQueries = key.endsWith('.queries');
                                const isRefreshCadence = key === `${number}.global.refresh-cadence`;
                                
                                return !(isSchema || isOverview || isContacts || isUsage || isGlossaryTermAspect || isDataProductAspect || isQueries || isRefreshCadence);
                            });
                            if (displayableKeys.length === 0) {
                                return (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '200px',
                                        color: '#0C1226CC',
                                        fontSize: '16px',
                                        fontFamily: '"Google Sans", sans-serif',
                                        marginTop: '-65px'
                                    }}>
                                        No aspects available for this data product.
                                    </div>
                                );
                            }
                            return (
                                <>
                                    <AnnotationFilter
                                        entry={selectedDataProductDetails}
                                        onFilteredEntryChange={setFilteredEntry}
                                        sx={{width: "100%", backgroundColor: "transparent"}}
                                        onCollapseAll={handleAnnotationCollapseAll}
                                        onExpandAll={handleAnnotationExpandAll}
                                    />
                                    <Box sx={{ 
                                        border: '1px solid #DADCE0', 
                                        borderRadius: '12px', 
                                        overflow: 'hidden', 
                                        backgroundColor: '#FFFFFF' 
                                    }}>
                                        {annotationTab}
                                    </Box>
                                </>
                            );
                        })()}
                    </CustomTabPanel>
                    <CustomTabPanel value={tabValue} index={6}>
                        {insightsTab}
                    </CustomTabPanel>
            </div>
          </div>

        {/* Backdrop Overlay */}
        {selectedDataProductStatus == 'succeeded' && isSubmitAccessOpen && (
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
            onClick={handleCloseSubmitAccess}
          />
        )}

        {/* Submit Access Panel */}
        {selectedDataProductStatus == 'succeeded' && selectedDataProductDetails && (<SubmitAccess
          isOpen={isSubmitAccessOpen}
          onClose={handleCloseSubmitAccess}
          assetName={selectedDataProductDetails?.entrySource?.displayName?.length > 0 ? selectedDataProductDetails?.entrySource?.displayName : getName(selectedDataProductDetails.name || '', '/')}
          entry={selectedDataProductDetails}
          onSubmitSuccess={handleSubmitSuccess}
          previewData={selectedDataProductDetails ?? null}
          isLookup={true}
          isCalledFromDataProducts={true}
          dataProductsDescription={selectedDataProductDetails?.entrySource?.description || ''}
          assetCounts={selectedDataProduct.assetCount || 0}
          accessGroups={Object.entries(accessGroups)
            .map(([key, value]) => ({ id: key, ...(typeof value === 'object' ? value : {}) }))
            .filter(group => !requestedGroupIds.has(group.id))
          }
        />)}

        {/* Notification Bar */}
        <NotificationBar
          isVisible={isNotificationVisible}
          onClose={handleCloseNotification}
          message={notificationMessage}
        />
      </div>

      {/* Asset Preview Panel - Sticky Sidebar */}
      <Box
        sx={{
          width: isAssetPreviewOpen ? "clamp(300px, 22vw, 360px)" : "0px",
          minWidth: isAssetPreviewOpen ? "clamp(300px, 22vw, 360px)" : "0px",
          height: "calc(100vh - 160px)",
          position: "sticky",
          top: "80px",
          marginTop: "10px",
          borderRadius: "20px",
          backgroundColor: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.3s ease-in-out, min-width 0.3s ease-in-out, opacity 0.3s ease-in-out",
          opacity: isAssetPreviewOpen ? 1 : 0,
          marginRight: isAssetPreviewOpen ? "16px" : 0,
        }}
      >
        <ResourcePreview
          previewData={assetPreviewData}
          onPreviewDataChange={(data) => {
            if (data) {
              setAssetPreviewData(data);
              setIsAssetPreviewOpen(true);
            } else {
              setIsAssetPreviewOpen(false);
            }
          }}
          onViewDetails={(previewEntry) => {
            setIsAssetPreviewOpen(false);
            setAssetPreviewData(null);
            if (previewEntry?.name) {
              handleResourceClick(previewEntry.name);
            }
          }}
          id_token={id_token}
          isGlossary={true}
          previewMode="isolated"
        />
      </Box>
    </div>
  ):(
    <div style={{display: "flex", flexDirection: "column", padding: "0px 0", background:"#F7F9F9", height: "100vh", overflow: "hidden" }}>
      {/* 1. Unscrolled Sticky Header Skeleton (Back Button) */}
      <div style={{ padding: "16px 20px 8px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width={150} height={24} />
      </div>

      <Box sx={{ padding: "0px 20px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        
        {/* 2. Recreated Data Product Card Layout Skeleton */}
        <div style={{
            position: "relative",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "24px",
            gap: "20px",
            background: "linear-gradient(88.29deg, #F6F7FF 0%, #F6FFFC 105.88%)",
            borderRadius: "16px",
            width: "100%",
            border: "1px solid #E2E8F0",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)"
        }}>
            {/* Top Row: Icon + Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
              <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: '8px', flexShrink: 0 }} />
              <Skeleton variant="text" width={350} height={40} />
            </Box>

            {/* Middle Row: Request Access Button */}
            <Skeleton 
              variant="rounded" 
              width={160} 
              height={40} 
              sx={{ 
                borderRadius: '100px',
                position: 'absolute', 
                top: '24px', 
                right: '24px' 
              }} 
            />

            {/* Bottom Row: Description text block */}
            <Box sx={{ width: '100%' }}>
              <Skeleton variant="text" width="80%" height={20} />
              <Skeleton variant="text" width="60%" height={20} />
            </Box>
        </div>

        {/* 3. Navigation Tab Bar Skeleton */}
        <Box sx={{
          display: 'flex',
          gap: '32px',
          paddingTop: '12px',
          borderBottom: '1px solid #E0E0E0'
        }}>
          <Skeleton variant="text" width={90} height={30} />
          <Skeleton variant="text" width={70} height={30} />
          <Skeleton variant="text" width={210} height={30} />
          <Skeleton variant="text" width={90} height={30} />
          <Skeleton variant="text" width={80} height={30} />
        </Box>

        {/* 4. Tab Content Body Skeleton */}
        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: '2rem' }}>
          <DetailPageOverviewSkeleton />
        </Box>
      </Box>
    </div>
  );
}

export default DataProductsDetailView;