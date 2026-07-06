import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Skeleton,
} from '@mui/material';
import { ArrowBack, KeyboardArrowUp, KeyboardArrowDown, Close, FormatListBulleted, DashboardOutlined, Inventory2Outlined } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../app/store';
import { browseResourcesByAspects, setItems, setItemsStatus } from '../../features/resources/resourcesSlice';
import { useDispatch, useSelector } from 'react-redux';
import ResourcePreview from '../Common/ResourcePreview';
import DetailPageOverview from '../DetailPageOverview/DetailPageOverview';
import AnnotationPageSkeleton from './AnnotationPageSkeleton';
import SubTypesTab from './SubTypesTab';
import SubTypesTabSkeleton from './SubTypesTabSkeleton';
import SubTypeHeaderSkeleton from './SubTypeHeaderSkeleton';
import AspectLinkedAssets from './AspectLinkedAssets';
import AnnotationsIconBlue from '../../assets/svg/annotations-icon-blue.svg';
import AnnotationSubitemIcon from '../../assets/svg/annotation-subitem.svg';
import ThemedIconContainer from '../Common/ThemedIconContainer';

/**
 * @file MainComponent.tsx
 * @summary Renders the main content panel for the "Browse by Aspect" (Annotation) page.
 *
 * @description
 * This component displays a tab-based view for the selected aspect with two tabs:
 * - Overview: Shows aspect details using DetailPageOverview component
 * - Sub Types: Shows a grid of sub-type cards with asset counts
 *
 * When a sub-type is clicked, it navigates to the ResourceViewer to show
 * the filtered resources for that sub-type.
 */

interface MainComponentProps {
  selectedCard: any;
  onItemClick: (item: any) => void;
  selectedSubItem: any;
  onSubItemClick: (subItem: any) => void;
  annotationsData: any[];
  tabValue: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  contentSearchTerm: string;
  onContentSearchTermChange: (value: string) => void;
  sortBy: 'name' | 'assets' | 'type';
  onSortByChange: (value: 'name' | 'assets' | 'type') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  loadingAspectName?: string | null;
  subTypesWithCache: Record<string, boolean>;
  isSidebarOpen?: boolean;
  onSidebarToggle?: (open: boolean) => void;
  isSmallScreen?: boolean;
}

const MainComponent: React.FC<MainComponentProps> = ({
  selectedCard,
  selectedSubItem,
  onSubItemClick,
  tabValue,
  onTabChange,
  contentSearchTerm,
  onContentSearchTermChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  loadingAspectName = null,
  subTypesWithCache,
  isSidebarOpen = true,
  onSidebarToggle,
  isSmallScreen = false,
}) => {

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const id_token = useSelector((state:any) => state.user.token);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // ResourceViewer state
  const resources = useSelector((state: any) => state.resources.items);
  const resourcesStatus = useSelector((state: any) => state.resources.status);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [linkedAssetsSearchTerm, setLinkedAssetsSearchTerm] = useState<string>('');
  const [subItemDescExpanded, setSubItemDescExpanded] = useState(false);

  // Access Redux cache
  const aspectBrowseCache = useSelector((state: RootState) => state.resources.aspectBrowseCache);

  // Cache key generator helper
  const generateCacheKey = (aspectTitle: string, subTypeName: string) => {
    return `${aspectTitle}__${subTypeName}`;
  };

  // Fetch resources when sub-item is selected
  useEffect(() => {
    if (selectedCard && selectedSubItem) {
      // Check if data is already cached
      const cacheKey = generateCacheKey(selectedCard.title, selectedSubItem.title);
      const cachedData = aspectBrowseCache[cacheKey];

      if (cachedData && subTypesWithCache[cacheKey]) {
        // Use cached data - set directly without API call
        dispatch(setItems(cachedData.data));
        dispatch(setItemsStatus('succeeded'));
        // Don't clear preview when using cache for better UX
      } else {
        // Fetch fresh data
        dispatch({ type: 'resources/setItemsPreviousPageRequest', payload: null });
        dispatch({ type: 'resources/setItemsPageRequest', payload: null });
        dispatch({ type: 'resources/setItemsStoreData', payload: [] });
        dispatch(browseResourcesByAspects({term : '', id_token: id_token, annotationName : selectedCard.title, subAnnotationName: selectedSubItem.title || null}));
        setIsPreviewOpen(false);
      }
    }
  }, [selectedCard, selectedSubItem, dispatch, id_token, aspectBrowseCache, subTypesWithCache]);

  // Reset description expanded state when selected card changes
  useEffect(() => {
    setDescriptionExpanded(false);
  }, [selectedCard?.name]);

  // Reset sub-item description expanded state when sub-item changes
  useEffect(() => {
    setSubItemDescExpanded(false);
  }, [selectedSubItem?.title]);


  const handleBackClick = () => {
    if (selectedSubItem) {
      onSubItemClick(null); // Clear selected subItem, return to tabs view
    } else {
      navigate('/home');
    }
  };

  const handleSubTypeClick = (subItem: any) => {
    onSubItemClick(subItem);
    setIsPreviewOpen(false);
  };

  // Transform annotation data to entry format for DetailPageOverview
  const transformAnnotationToEntry = (item: any) => {
    if (!item) return null;
    return {
      name: item.name,
      entryType: `annotation/${item.title}`,
      fullyQualifiedName: item.fullyQualifiedName || item.resource || item.name,
      createTime: item.createTime,
      updateTime: item.updateTime,
      entrySource: {
        description: item.description || '',
        displayName: item.title,
        location: item.location || '',
        system: item.system || '',
        resource: item.resource || '',
        labels: item.labels || {}
      },
      aspects: {
        [`${item.title}.global.overview`]: {
          data: {
            fields: {
              content: {
                stringValue: 'No Documentation Available',
                kind: 'stringValue'
              }
            }
          }
        }
      }
    };
  };

  // Custom header for ResourceViewer (when viewing sub-item resources)
  const subItemDescription = selectedSubItem?.description || '';
  const resourceViewerHeader =
    resourcesStatus === 'loading' ? (
      <SubTypeHeaderSkeleton />
    ) : (
      <Box sx={{ flexShrink: 0 }}>
        <Box
          sx={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            padding: "24px",
            gap: "20px",
            width: "auto",
            margin: "20px 20px 15px 20px",
            background: "#FFFFFF",
            borderRadius: "16px",
            border: "1px solid #ECEEF4",
            flex: "none",
            order: 0,
          }}
        >
          {/* Back Arrow, Icon, and Title Row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              width: '100%',
              minHeight: '40px',
            }}
          >
            <IconButton
              sx={{ p: '4px', width: '40px', height: '40px', borderRadius: '50%', color: '#1F1F1F', transition: 'background-color 0.2s', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
              onClick={handleBackClick}
            >
              <ArrowBack style={{ fontSize: "24px" }} />
            </IconButton>
            <ThemedIconContainer iconColor="#F9AB00">
              <img
                src={AnnotationSubitemIcon}
                alt=""
                style={{ width: '24px', height: '24px' }}
              />
            </ThemedIconContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <label style={{
                    fontFamily: '"Google Sans", sans-serif',
                    color: '#1F1F1F',
                    fontSize: '24px',
                    fontWeight: '500',
                    lineHeight: '32px',
                    maxWidth: '500px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {selectedSubItem?.displayName || selectedSubItem?.title}
                  </label>
              </div>
            </div>
          </Box>

          {/* Description Section */}
          <div style={{ width: '100%' }}>
            {subItemDescription ? (
              <>
                <div style={{
                  fontFamily: '"Google Sans", sans-serif',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#0C1226',
                  fontWeight: 400,
                  maxHeight: subItemDescExpanded ? 'none' : '60px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {subItemDescription}
                </div>
                {subItemDescription.length > 200 && (
                  <button
                    onClick={() => setSubItemDescExpanded(!subItemDescExpanded)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 0px',
                      color: '#0B57D0',
                      fontFamily: '"Google Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '20px',
                      marginTop: '4px'
                    }}
                  >
                    {subItemDescExpanded ? <KeyboardArrowUp sx={{ fontSize: '20px' }} /> : <KeyboardArrowDown sx={{ fontSize: '20px' }} />}
                    {subItemDescExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            ) : (
              <div style={{
                fontFamily: '"Google Sans", sans-serif',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#0C1226CC',
                fontWeight: 400,
              }}>
                No description provided.
              </div>
            )}
          </div>
        </Box>
      </Box>
    );

  // If selectedSubItem is set, show Linked Assets view
  if (selectedSubItem) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: 'calc(100vh - 80px)',
          flex: 1,
          backgroundColor: '#f8fafc',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            height: '100%',
            borderRadius: '0px',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Sections Toggle Button */}
          <Box sx={{ padding: '12px 20px 0px' }}>
            <span
              style={{
                boxSizing: 'border-box',
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                padding: '8px 13px',
                gap: '8px',
                height: '32px',
                border: isSidebarOpen ? 'none' : '1px solid #022FCD',
                borderRadius: '59px',
                background: isSidebarOpen ? '#022FCD' : 'none',
                color: isSidebarOpen ? '#EDF2FC' : '#022FCD',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newState = !isSidebarOpen;
                onSidebarToggle?.(newState);
                if (isSmallScreen && newState) {
                  setPreviewData(null);
                  setIsPreviewOpen(false);
                }
              }}
            >
              {isSidebarOpen ? <Close style={{ width: '16px', height: '16px', flexShrink: 0 }} /> : <FormatListBulleted style={{ width: '16px', height: '16px', flexShrink: 0 }} />}
              <span style={{
                fontFamily: '"Google Sans", sans-serif',
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '16px',
                letterSpacing: '0.1px',
                whiteSpace: 'nowrap',
              }}>Sections</span>
            </span>
          </Box>

          {/* Header */}
          {resourceViewerHeader}

          {/* Linked Assets Tab */}
          <Box
            sx={{
              paddingLeft: "1.75rem",
              position: "relative",
              "& .MuiTabs-root": {
                minHeight: "47px",
                height: "47px",
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                "& .MuiTabs-flexContainer": { gap: "4px" }
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
                gap: "4px",
                "&.Mui-selected": { color: "#022FCD" },
                "&.Mui-disabled": { color: "#BDBDBD" },
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
            }}
          >
            {resourcesStatus === 'loading' ? (
              <Box sx={{ minHeight: '47px', height: '47px', display: 'flex', alignItems: 'flex-end', pb: '8px' }}>
                <Skeleton
                  variant="text"
                  width={100}
                  height={20}
                  sx={{ borderRadius: '4px', bgcolor: '#E8EAED' }}
                />
              </Box>
            ) : (
              <Tabs
                value={0}
                aria-label="linked assets tabs"
                TabIndicatorProps={{
                  children: <span className="indicator" />,
                }}
              >
                <Tab 
                  label="Linked Assets" 
                  icon={<Inventory2Outlined sx={{ fontSize: "20px" }} />} 
                  iconPosition="start" 
                />
              </Tabs>
            )}
          </Box>
          <Box sx={{ mx: "20px", borderBottom: "1px solid #DADCE0" }} />

          {/* Linked Assets Content */}
          <Box sx={{ flex: 1, p: '20px', overflow: 'hidden' }}>
            <AspectLinkedAssets
              linkedAssets={resources}
              searchTerm={linkedAssetsSearchTerm}
              onSearchTermChange={setLinkedAssetsSearchTerm}
              idToken={id_token}
              isPreviewOpen={isPreviewOpen}
              onAssetPreviewChange={(data) => {
                setPreviewData(data);
                setIsPreviewOpen(!!data);
                if (isSmallScreen && data) {
                  onSidebarToggle?.(false);
                }
              }}
              resourcesStatus={resourcesStatus}
              isSidebarOpen={isSidebarOpen}
              onSidebarToggle={onSidebarToggle}
            />
          </Box>
        </Paper>

        {/* Resource Preview Panel */}
        <Paper
          elevation={0}
          sx={{
            width: isPreviewOpen ? 'clamp(300px, 22vw, 360px)' : '0px',
            minWidth: isPreviewOpen ? 'clamp(300px, 22vw, 360px)' : '0px',
            height: 'calc(100vh - 100px)',
            borderRadius: '0px',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'width 0.3s ease-in-out, min-width 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-left 0.3s ease-in-out',
            marginLeft: isPreviewOpen ? '2px' : 0,
            marginRight: isPreviewOpen ? '16px' : 0,
            opacity: isPreviewOpen ? 1 : 0,
            borderWidth: isPreviewOpen ? undefined : 0,
          }}
        >
          <ResourcePreview
            previewData={previewData}
            onPreviewDataChange={(data) => {
              if (data) {
                setPreviewData(data);
                setIsPreviewOpen(true);
              } else {
                setIsPreviewOpen(false);
              }
            }}
            id_token={id_token}
            isGlossary={true}
          />
        </Paper>
      </Box>
    );
  }

  // If no selectedCard, show empty state
  if (!selectedCard) {
    return (
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          height: 'calc(100vh - 80px)',
          borderRadius: '0px',
          backgroundColor: '#f8fafc',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Typography sx={{ color: '#575757', fontFamily: '"Google Sans Text", sans-serif' }}>
          Select an aspect from the sidebar
        </Typography>
      </Paper>
    );
  }

  // Tab-based view (Overview + Sub Types)
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        height: 'calc(100vh - 72px)',
        borderRadius: '0px',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {loadingAspectName === selectedCard?.name ? (
        <AnnotationPageSkeleton />
      ) : (
      <>
      {/* Header with Title, Description, Stats, and Tabs */}
      <Box
        sx={{
          flexShrink: 0,
        }}
      >
        {/* Sections Toggle Button */}
        <Box sx={{ padding: '12px 20px 0px' }}>
          <span
            style={{
              boxSizing: 'border-box',
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '8px 13px',
              gap: '8px',
              height: '32px',
              border: isSidebarOpen ? 'none' : '1px solid #022FCD',
              borderRadius: '59px',
              background: isSidebarOpen ? '#022FCD' : 'none',
              color: isSidebarOpen ? '#EDF2FC' : '#022FCD',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const newState = !isSidebarOpen;
              onSidebarToggle?.(newState);
            }}
          >
            {isSidebarOpen ? <Close style={{ width: '16px', height: '16px', flexShrink: 0 }} /> : <FormatListBulleted style={{ width: '16px', height: '16px', flexShrink: 0 }} />}
            <span style={{
              fontFamily: '"Google Sans", sans-serif',
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: '16px',
              letterSpacing: '0.1px',
              whiteSpace: 'nowrap',
            }}>Sections</span>
          </span>
        </Box>

        {/* Header Card (Title and Description) */}
        <Box
          sx={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            padding: "24px",
            gap: "20px",
            width: "auto",
            margin: "20px 20px 15px 20px",
            background: "#FFFFFF",
            borderRadius: "16px",
            border: "1px solid #ECEEF4",
            flex: "none",
            order: 0,
          }}
        >
          {/* Title Row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              width: "100%",
              minHeight: "40px",
            }}
          >
            <ThemedIconContainer iconColor="#1A73E8">
              <img src={AnnotationsIconBlue} alt="" style={{ width: '24px', height: '24px' }} />
            </ThemedIconContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  <label style={{
                    fontFamily: '"Google Sans", sans-serif',
                    color: "#1F1F1F", fontSize: "24px",
                    fontWeight: "500", lineHeight: "32px",
                  }}>
                    {selectedCard?.title}
                  </label>
              </div>
            </div>
          </Box>

          {/* Description Section */}
          <div style={{ width: "100%" }}>
            {selectedCard?.description ? (
              <>
                <div style={{
                  fontFamily: '"Google Sans", sans-serif',
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "#0C1226",
                  fontWeight: 400,
                  maxHeight: descriptionExpanded ? "none" : "60px",
                  overflow: "hidden",
                  position: "relative",
                }}>
                  {selectedCard.description}
                </div>
                {selectedCard.description.length > 200 && (
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
                      lineHeight: "20px",
                      marginTop: "4px"
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
                fontWeight: 400,
              }}>
                No description provided for this aspect.
              </div>
            )}
          </div>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            paddingLeft: "1.75rem",
            position: "relative",
            "& .MuiTabs-root": {
              minHeight: "47px",
              height: "47px",
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              "& .MuiTabs-flexContainer": { gap: "4px" }
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
              gap: "4px",
              "&.Mui-selected": { color: "#022FCD" },
              "&.Mui-disabled": { color: "#BDBDBD" },
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
          }}
        >
          <Tabs
            value={tabValue}
            onChange={onTabChange}
            aria-label="annotation tabs"
            TabIndicatorProps={{
              children: <span className="indicator" />,
            }}
          >
            <Tab 
              label="Overview" 
              icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} 
              iconPosition="start" 
            />
            <Tab 
              label="Sub Types" 
              icon={
                <Box 
                  component="span" 
                  sx={{ 
                    width: '16px', 
                    height: '16px', 
                    backgroundColor: 'currentColor',
                    WebkitMaskImage: `url("${AnnotationSubitemIcon}")`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: `url("${AnnotationSubitemIcon}")`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                  }} 
                />
              } 
              iconPosition="start" 
            />
          </Tabs>
        </Box>
        <Box sx={{ mx: "20px", borderBottom: "1px solid #DADCE0" }} />
      </Box>

      {/* Tab Content */}
      <Box sx={{ p: "0px 20px 20px 20px", pt: tabValue !== 0 ? "20px" : "0px", overflowY: "hidden", flex: 1 }}>
        {/* Overview Tab */}
        {tabValue === 0 && selectedCard && (
          <Box sx={{ height: "100%", overflowY: "auto", minHeight: 0 }}>
            <DetailPageOverview
              entry={transformAnnotationToEntry(selectedCard)}
              css={{ width: "100%" }}
            />
          </Box>
        )}

        {/* Sub Types Tab */}
        {tabValue === 1 && (
          selectedCard?.subTypesLoaded ? (
            <SubTypesTab
              key={selectedCard?.title || selectedCard?.name}
              items={selectedCard?.subItems || []}
              searchTerm={contentSearchTerm}
              onSearchTermChange={onContentSearchTermChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortByChange={onSortByChange}
              onSortOrderToggle={onSortOrderToggle}
              onItemClick={handleSubTypeClick}
            />
          ) : (
            <SubTypesTabSkeleton />
          )
        )}
      </Box>
      </>
      )}
    </Paper>
  );
};

export default MainComponent;
