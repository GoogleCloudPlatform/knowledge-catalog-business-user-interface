import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Box, Grid, Tooltip, IconButton, Typography, Skeleton, Tab, Tabs } from '@mui/material';
import { Close, LockOutlined, DashboardOutlined, ViewListOutlined } from '@mui/icons-material';
import BigQueryIcon from '../../assets/svg/BigQuery.svg';
import './ResourcePreview.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEntry, clearHistory } from '../../features/entry/entrySlice';
import PreviewSchema from '../Schema/PreviewSchema';
import PreviewAnnotation from '../Annotation/PreviewAnnotation';
import SchemaFilter from '../Schema/SchemaFilter';
import AnnotationFilter from '../Annotation/AnnotationFilter';
import { useNavigate } from 'react-router-dom';
import SubmitAccess from '../SearchPage/SubmitAccess';
import NotificationBar from '../SearchPage/NotificationBar';
import ShimmerLoader from '../Shimmer/ShimmerLoader';
import PreviewAnnotationSkeleton from '../Annotation/PreviewAnnotationSkeleton';
import type { AppDispatch } from '../../app/store';
import { getName, getEntryType, generateBigQueryLink, hasValidAnnotationData, generateLookerStudioLink, getFormattedDateTimePartsByDateTime, extractProjectNumberFromEntryName, resolveProjectDisplayName } from '../../utils/resourceUtils';
// import { useFavorite } from '../../hooks/useFavorite';
import { useAuth } from '../../auth/AuthProvider';
import { usePreviewEntry } from '../../hooks/usePreviewEntry';
import { useAccessRequest } from '../../contexts/AccessRequestContext';

/**
 * @file ResourcePreview.tsx
 * @summary Renders a detailed preview panel for a selected data resource.
 *
 * @description
 * This component displays a comprehensive side panel (or main view) for a
 * resource selected from a list (passed via the `previewData` prop).
 *
 * When `previewData` is provided, this component:
 * 1.  Dispatches the `fetchEntry` Redux action to retrieve the full, detailed
 * entry, including schema and all aspects (annotations).
 * 2.  Manages the loading (`entryStatus === 'loading'`) and error states
 * (`entryStatus === 'failed'`) for this fetch, displaying `ShimmerLoader`
 * skeletons or an `Alert` message, respectively.
 * 3.  Handles permission-denied (403) errors by disabling the "View Details"
 * button.
 * 4.  Handles unauthenticated (401) errors by logging the user out.
 *
 * The UI consists of:
 * -   A header with the resource title, a "Close" button, and dynamic links
 * to "Open in BigQuery" and "Explore with Looker Studio" (if applicable).
 * -   Metadata tags (e.g., "BigQuery", "Table").
 * -   CTA buttons: "View Details" and "Request Access".
 * -   A tabbed interface for "Overview", "Schema", and "Aspects".
 *
 * It renders sub-components for filtering and displaying tab content:
 * -   **Overview:** Displays key-value metadata (description, dates, contacts).
 * -   **Schema:** (For tables only) Renders `SchemaFilter` and `PreviewSchema`.
 * -   **Aspects:** Renders `AnnotationFilter` and `PreviewAnnotation`.
 *
 * This component also orchestrates the "Request Access" flow by managing
 * the `SubmitAccess` modal and the `NotificationBar` for success messages.
 *
 * If `previewData` is `null` or a placeholder, it renders a default message
 * prompting the user to select an item.
 *
 * @param {object} props - The props for the ResourcePreview component.
 * @param {any | null} props.previewData - The core data object for the resource
 * to be previewed. If `null`, a placeholder is shown.
 * @param {(data: any | null) => void} props.onPreviewDataChange - Callback function
 * to update the parent's preview state (e.g., pass `null` to close the preview).
 * @param {string} props.id_token - The user's authentication token, required
 * for the `fetchEntry` API call.
 * @param {(entry: any) => void} [props.onViewDetails] - Optional callback to
 * override the default "View Details" behavior (which navigates to '/view-details').
 * @param {(entry: any) => void} [props.onRequestAccess] - Optional callback to
 * override the default "Request Access" behavior (which opens the `SubmitAccess` modal).
 *
 * @returns {JSX.Element} A styled `div` containing the full resource preview
 * panel or a placeholder message.
 */

interface ResourcePreviewProps {
  // Preview props
  previewData: any | null;
  onPreviewDataChange: (data: any | null) => void;

  // Access control props
  id_token: string;
  demoMode?: boolean;

  // Preview mode control
  previewMode?: 'redux' | 'isolated'; // Default: 'redux' for backward compatibility

  // Event handlers
  onViewDetails?: (entry: any) => void;
  onRequestAccess?: (entry: any) => void;
  isGlossary?: boolean;
}

const ResourcePreview: React.FC<ResourcePreviewProps> = ({
  previewData,
  onPreviewDataChange,
  id_token,
  onViewDetails,
  onRequestAccess,
  demoMode = false,
  isGlossary = false,
  previewMode = 'redux' // Default to existing behavior for backward compatibility
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { setAccessPanelOpen } = useAccessRequest();

  // Local state
  const [tabValue, setTabValue] = useState(0);
  const [isSubmitAccessOpen, setIsSubmitAccessOpen] = useState<boolean>(false);
  const [isNotificationVisible, setIsNotificationVisible] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [filteredSchemaEntry, setFilteredSchemaEntry] = useState<any | null>(null);
  const [filteredAnnotationEntry, setFilteredAnnotationEntry] = useState<any | null>(null);
  const [viewDetailAccessable, setViewDetailAccessable] = useState<boolean>(true);
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Use shared favorite state
  // const { isFavorite: isFavorited, toggleFavorite } = useFavorite(previewData?.name || '');

  // Redux selectors (used in 'redux' mode)
  const mode = useSelector((state: any) => state.user.mode) as string;
  const reduxEntry = useSelector((state: any) => state.entry.items);
  const reduxEntryStatus = useSelector((state: any) => state.entry.status);
  const reduxEntryError = useSelector((state: any) => state.entry.error);
  const projectsList = useSelector((state: any) => state.projects.items);

  // Isolated preview hook (used in 'isolated' mode)
  const {
    entry: isolatedEntry,
    status: isolatedStatus,
    error: isolatedError
  } = usePreviewEntry({
    entryName: previewMode === 'isolated' ? previewData?.name : null,
    id_token,
    enabled: previewMode === 'isolated' && !demoMode
  });

  // Determine which data source to use based on mode
  const entry = demoMode
    ? previewData
    : previewMode === 'isolated'
      ? isolatedEntry
      : reduxEntry;

  const entryStatus = demoMode
    ? 'succeeded'
    : previewMode === 'isolated'
      ? isolatedStatus
      : reduxEntryStatus;

  const entryError = previewMode === 'isolated'
    ? isolatedError
    : reduxEntryError;
  const number = entry?.entryType?.split('/')[1];
  const rawContacts = entry?.aspects?.[`${number}.global.contacts`]?.data?.fields?.identities?.listValue?.values || [];
  const contacts = rawContacts.filter((c: { structValue?: { fields?: { name?: { stringValue?: string }; id?: { stringValue?: string } } } }) => {
    const fields = c?.structValue?.fields;
    const name = fields?.name?.stringValue || '';
    const id = fields?.id?.stringValue || '';
    return name.trim() !== '' || id.trim() !== '';
  });
  const schemaData = entry?.aspects?.[`${number}.global.schema`]?.data?.fields?.fields?.listValue?.values || [];
  const hasAnnotations = entry?.aspects ? Object.keys(entry.aspects).some(key => hasValidAnnotationData(entry.aspects[key])) : false;


  const { date: creationDate, time: creationTime } = getFormattedDateTimePartsByDateTime(previewData?.createTime);
  const { date: updateDate, time: updateTime } = getFormattedDateTimePartsByDateTime(previewData?.updateTime);


  const projectDisplayName = useMemo(() => {
    const fqn = previewData?.fullyQualifiedName || '';
    const fromFqn = (fqn.split(':').pop() || '').split('.')[0];
    if (fromFqn) return fromFqn;

    const projectNumber =
      extractProjectNumberFromEntryName(previewData?.name) ||
      extractProjectNumberFromEntryName(previewData?.parentEntry);

    if (projectNumber) {
      const resolved = resolveProjectDisplayName(projectNumber, projectsList);
      if (resolved) return resolved;
      return projectNumber;
    }

    return '-';
  }, [previewData?.fullyQualifiedName, previewData?.name, previewData?.parentEntry, projectsList]);

  const isTable = previewData?.name ? getEntryType(previewData.name, '/') == 'Tables' : false;
  const aspectsTabIndex = isTable ? 2 : 1;

  // Event handlers
  const handleTabClick = (tabIndex: number) => {
    setTabValue(tabIndex);
  };

  const handleViewDetails = (entry: any) => {
    if (onViewDetails) {
      onViewDetails(entry);
    } else {
      dispatch(clearHistory());
      navigate('/view-details');
    }
  };

  const handleRequestAccess = (entry: any) => {
    if (onRequestAccess) {
      onRequestAccess(entry);
    } else {
      setIsSubmitAccessOpen(true);
    }
  };

  const handleCloseSubmitAccess = () => {
    setIsSubmitAccessOpen(false);
  };

  const handleSubmitSuccess = (_assetName: string) => {
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

  const handleAnnotationCollapseAll = () => {
  setExpandedAnnotations(new Set());
  };

  const lookerUrl = useMemo(() => {
      if (!entry) {
        return '';
      }
      return generateLookerStudioLink(entry);
    }, [entry]);

  const bigQueryUrl = useMemo(() => {
      if (!entry) {
        return '';
      }
      return generateBigQueryLink(entry);
    }, [entry]);


    const getDisplayName = (contact: any) => {
    try {
      const name = contact.structValue.fields.name.stringValue;
      if (!name) return "--";
      return name.split('<').length > 1
        ? name.split('<')[1].slice(0, -1)
        : name;
    } catch (e) {
      console.error("Error parsing contact name:", e);
      return "--"; // Failsafe
    }
  };

  const handleAnnotationExpandAll = () => {
  if (entry?.aspects) {
    const number = getEntryType(entry.name, '/');
    const annotationKeys = Object.keys(entry.aspects)
      .filter(key =>
        // First, filter out the non-annotation aspects as before
        key !== `${number}.global.schema` &&
        key !== `${number}.global.overview` &&
        key !== `${number}.global.contacts` &&
        key !== `${number}.global.usage`
      )
      .filter(key => 
        // THEN, filter again to only keep keys that have valid data
        hasValidAnnotationData(entry.aspects[key])
      );
    setExpandedAnnotations(new Set(annotationKeys));
  }
};
  // Effects
  // Sync local panel state with global context
  useEffect(() => {
    setAccessPanelOpen(isSubmitAccessOpen);
  }, [isSubmitAccessOpen, setAccessPanelOpen]);

  useEffect(() => {
    // Only dispatch Redux action in 'redux' mode
    if (previewData !== null && !demoMode && previewMode === 'redux') {
       dispatch(fetchEntry({ entryName: previewData.name, id_token: id_token }));
    }
    // In 'isolated' mode, the hook handles fetching automatically
  }, [previewData, dispatch, id_token, demoMode, previewMode]);

  // Reset description expanded state and tab selection when preview data changes
  useEffect(() => {
    setDescriptionExpanded(false);
    setTabValue(0);
  }, [previewData]);

  // Sync filtered entries with fetched entry
  // Only react to entryStatus when we have previewData (i.e., we've actually requested data)
  // This prevents reacting to stale Redux state from previous operations elsewhere in the app
  useEffect(() => {
    // Skip if no previewData - we haven't requested any entry yet
    if (!previewData) {
      return;
    }

    if (entryStatus === 'loading') {
      setViewDetailAccessable(false);
    }
    if (entryStatus === 'succeeded') {
      setFilteredSchemaEntry(entry);
      setFilteredAnnotationEntry(entry);
      setViewDetailAccessable(true);
    }
    if (entryStatus === 'failed') {
      if(entryError?.details?.toLowerCase().includes('403') || entryError?.details?.includes('PERMISSION_DENIED')) {
        setViewDetailAccessable(false);
      }else if(entryError?.details?.includes('UNAUTHENTICATED')) {
        logout();
        navigate('/login');
      }
    }
  }, [entry, entryStatus, previewData]);

  // Preview content rendering logic
  let schema;
  let annotationTab;

  if (entryStatus === 'loading') {
    schema = <ShimmerLoader type="preview-schema" count={5} />;
    annotationTab = (
      <Box sx={{ padding: '16px 0' }}>
        <PreviewAnnotationSkeleton />
      </Box>
    );
  } else if (entryStatus === 'succeeded') {
    schema = <PreviewSchema entry={filteredSchemaEntry || entry} sx={{ width: "100%", borderTopLeftRadius: '0px', borderTopRightRadius: '0px' }} />;
    annotationTab = <PreviewAnnotation entry={filteredAnnotationEntry || entry} css={{
      width: "100%",
      backgroundColor: mode === 'dark' ? '#131314' : '#FFFFFF',
      overflow: "hidden",
    }} isTopComponent={false}
    expandedItems={expandedAnnotations}
    setExpandedItems={setExpandedAnnotations}
    />;
  } else if (entryStatus === 'failed') {
    if(entryError?.details?.toLowerCase().includes('403') || entryError?.details?.includes('PERMISSION_DENIED')) {
      annotationTab = schema = <Alert severity="error">You do not have enough permisssion to see this entry data.</Alert>;
    }else{
      annotationTab = schema = <Alert severity="error">Failed to load entry data: {entryError?.message || entryError}</Alert>;
    }
    
  }

  let preview = (<>
  <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
    <Tooltip title="Close preview" arrow>
    <IconButton
      aria-label="close"
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
      }}
      onClick={() => onPreviewDataChange(null)}
    >
      <Close sx={{ fontSize: '1.5rem', color: mode === 'dark' ? '#9aa0a6' : '#575757' }} />
    </IconButton>
    </Tooltip>
    <Grid
      container
      spacing={0}
      direction="column"
      alignItems="center"
      justifyContent="center"
      sx={{ minHeight: '75vh' }}
    >
      <img
        src="/assets/images/asset-preview-default.png"
        alt="Asset Preview"
        style={{ width: "var(--empty-img-width)", flex: "0 0 auto" }}
      />
      <span style={{ fontSize: "var(--empty-text-size)", color: mode === 'dark' ? '#9aa0a6' : '#575757', fontWeight: "500", marginTop: "var(--empty-text-margin-top)", fontFamily: "Google Sans Text, sans-serif" }}>
        Click on an item to see preview
      </span>
    </Grid>
  </Box>
</>
  );
  if (previewData !== null && !previewData?.isPlaceholder) {
    preview = (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: mode === 'dark' ? '#131314' : '#FFFFFF',
        borderRadius: 'var(--preview-radius)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto'
      }}>
        {/* Title + Close Row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '4px',
          flex: '0 0 auto',
        }}>
          <span style={{
              fontFamily: '"Google Sans", sans-serif',
              fontWeight: 500,
              fontSize: 'var(--title-font-size)',
              lineHeight: 'var(--title-line-height)',
              color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
              letterSpacing: '0.15px',
              wordBreak: 'break-word',
            }}>
              {previewData.entrySource?.displayName?.length > 0 ? previewData.entrySource.displayName : getName(previewData.name || '', '/')}
          </span>
          <Tooltip title="Close preview" arrow>
            <IconButton
              size="small"
              onClick={() => onPreviewDataChange(null)}
              sx={{ padding: '4px', flexShrink: 0 }}
            >
              <Close sx={{ fontSize: 'var(--close-icon-size)', color: mode === 'dark' ? '#9aa0a6' : '#575757' }} />
            </IconButton>
          </Tooltip>
        </div>

        {/* CTA Buttons Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: 'var(--cta-pt) 0 0',
          gap: 'var(--cta-gap)',
          marginBottom: 'var(--cta-mb)',
          flex: '0 0 auto',
        }}>
          {/* View Details - full width */}
          <Tooltip title={demoMode ? "Action disabled in demo mode" : (viewDetailAccessable ? "" : "You do not have permission to view details")} arrow>
            <Box
              component="button"
              sx={{
                width: '100%',
                height: 'var(--btn-height)',
                boxSizing: 'border-box',
                background: mode === 'dark' ? '#a7c6fa' : '#022FCD',
                color: mode === 'dark' ? '#072e6f' : '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--btn-radius)',
                fontFamily: '"Google Sans", sans-serif',
                fontWeight: 600,
                fontSize: 'var(--btn-font-size)',
                cursor: viewDetailAccessable && !demoMode ? 'pointer' : 'default',
                opacity: viewDetailAccessable && !demoMode ? 1 : 0.6,
                textTransform: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.2s ease',
                '&:hover': viewDetailAccessable && !demoMode ? { backgroundColor: mode === 'dark' ? '#8fb8f0' : '#1A5CD8' } : {},
              }}
              onClick={() => { if (viewDetailAccessable && !demoMode) handleViewDetails(entry); }}
            >
              View Details
            </Box>
          </Tooltip>

          {/* Request Access + Icon buttons row */}
          <div className="preview-cta-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--btn-gap)' }}>
            <Box
              component="button"
              sx={{
                flex: '1 1 auto',
                minWidth: 0,
                height: 'var(--btn-height)',
                boxSizing: 'border-box',
                background: 'transparent',
                color: mode === 'dark' ? '#ffffff' : '#44464F',
                border: mode === 'dark' ? '1px solid #ffffff' : '1px solid #C5C7C5',
                borderRadius: 'var(--btn-radius)',
                padding: 'var(--btn-padding)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--btn-gap)',
                cursor: demoMode ? 'default' : 'pointer',
                fontFamily: '"Google Sans", sans-serif',
                fontWeight: 600,
                fontSize: 'var(--btn-font-size)',
                opacity: demoMode ? 0.6 : 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                transition: 'background-color 0.2s ease',
                '&:hover': !demoMode ? {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                } : {},
              }}
              onClick={() => { if (!demoMode) handleRequestAccess(entry); }}
            >
              <LockOutlined sx={{ fontSize: 'var(--lock-icon-size)', color: mode === 'dark' ? '#ffffff' : '#575757', flexShrink: 0, transition: 'color 0.2s ease' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Request Access</span>
            </Box>

            {/* BigQuery icon button */}
            {previewData.entrySource?.system?.toLowerCase() === 'bigquery' && (
              <Tooltip title={entryStatus !== 'succeeded' ? "Loading link..." : "Open in BigQuery"} arrow>
                <Box
                  component="button"
                  sx={{
                    width: 'var(--icon-btn-size)',
                    height: 'var(--icon-btn-size)',
                    boxSizing: 'border-box',
                    borderRadius: 'var(--btn-radius)',
                    border: mode === 'dark' ? '1px solid #ffffff' : '1px solid #C5C7C5',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: entryStatus !== 'succeeded' || !bigQueryUrl || demoMode ? 'default' : 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    opacity: entryStatus !== 'succeeded' || !bigQueryUrl || demoMode ? 0.4 : 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': entryStatus === 'succeeded' && bigQueryUrl && !demoMode ? {
                      backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                    } : {},
                  }}
                  onClick={() => {
                    if (entryStatus === 'succeeded' && bigQueryUrl && !demoMode) {
                      window.open(bigQueryUrl, '_blank');
                    }
                  }}
                >
                  <img
                    src={BigQueryIcon}
                    alt="Open in BigQuery"
                    style={{ width: 'var(--icon-img-size)', height: 'var(--icon-img-size)' }}
                  />
                </Box>
              </Tooltip>
            )}

            {/* Looker icon button */}
            {previewData.entrySource?.system?.toLowerCase() === 'bigquery' && (
              <Tooltip title={entryStatus !== 'succeeded' ? "Loading link..." : (demoMode ? "Disabled in Demo Mode" : "Explore with Looker Studio")} arrow>
                <Box
                  component="button"
                  sx={{
                    width: 'var(--icon-btn-size)',
                    height: 'var(--icon-btn-size)',
                    boxSizing: 'border-box',
                    borderRadius: 'var(--btn-radius)',
                    border: mode === 'dark' ? '1px solid #ffffff' : '1px solid #C5C7C5',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: entryStatus !== 'succeeded' || !lookerUrl || demoMode ? 'default' : 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    opacity: entryStatus !== 'succeeded' || !lookerUrl || demoMode ? 0.4 : 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': entryStatus === 'succeeded' && lookerUrl && !demoMode ? {
                      backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                    } : {},
                  }}
                  onClick={() => {
                    if (entryStatus === 'succeeded' && lookerUrl && !demoMode) {
                      window.open(lookerUrl, '_blank');
                    }
                  }}
                >
                  <img
                    src="/assets/svg/looker-icon.svg"
                    alt="Explore with Looker Studio"
                    style={{ width: 'var(--icon-img-size)', height: 'var(--icon-img-size)' }}
                  />
                </Box>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <Box
          className="preview-tabs"
          sx={{
            marginTop: '8px',
            borderBottom: 1,
            borderBottomColor: mode === 'dark' ? '#3c4043' : '#DADCE0',
            marginBottom: 'var(--tab-mb)',
            position: 'relative',
            '& .MuiTabs-flexContainer': {
              justifyContent: 'space-around',
              gap: isTable ? '0px' : '12px',
              padding: isTable ? '0 8px' : '0 4px',
            },
            '& .MuiTab-root': {
              fontFamily: '"Google Sans", sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              color: mode === 'dark' ? '#dedfe0' : '#0C1226',
              textTransform: 'none',
              minHeight: '47px',
              padding: '0px 4px',
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 'unset',
              '&.Mui-selected': {
                color: mode === 'dark' ? '#8ab4f8' : '#022FCD',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'transparent',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: '4px',
                right: '4px',
                bottom: '0px',
                height: '3px',
                backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
                borderRadius: '3px 3px 0 0',
              },
            },
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_e, newValue) => handleTabClick(newValue)}
            aria-label="preview tabs"
            TabIndicatorProps={{
              children: <span className="indicator" />,
            }}
          >
            <Tab icon={<DashboardOutlined sx={{ fontSize: "18px" }} />} iconPosition="start" label="Overview" />
            {getEntryType(previewData.name, '/') == 'Tables' && (
              <Tab icon={<ViewListOutlined sx={{ fontSize: "18px" }} />} iconPosition="start" label="Schema" />
            )}
            <Tab icon={<span className="material-symbols-outlined" style={{ fontSize: "18px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span>} iconPosition="start" label="Aspects" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{
          padding: 0,
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'scroll',
          ...((tabValue === aspectsTabIndex || tabValue === 1) && {
            marginRight: 'calc(-0.5 * var(--preview-padding))',
          }),
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#C5C7C5',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : '#7c7c7d',
          },
        }}>
          {tabValue === 0 && (
            <div style={{ color: mode === 'dark' ? '#dedfe0' : '#6c6c6c' }}>
              {entryStatus === 'loading' ? (
                <>
                  {/* Description skeleton */}
                  <div style={{ borderBottom: mode === 'dark' ? '1px solid #3c4043' : '1px solid #E8EAED', padding: 'var(--desc-section-padding)' }}>
                    <div style={{ color: mode === 'dark' ? '#dedfe0' : '#575757', fontSize: 'var(--desc-label-size)', fontWeight: 500 }}>Description</div>
                    <Skeleton variant="text" sx={{ fontSize: 'var(--desc-text-size)', width: '90%', marginTop: '4px', ...(mode === 'dark' ? { backgroundColor: '#3c4043' } : {}) }} />
                    <Skeleton variant="text" sx={{ fontSize: 'var(--desc-text-size)', width: '70%', ...(mode === 'dark' ? { backgroundColor: '#3c4043' } : {}) }} />
                  </div>
                  {/* Row skeletons */}
                  {['Created', 'Last modified', 'Location', 'Contact(s)', 'Parent', 'Project'].map((label) => (
                    <div key={label} className="preview-overview-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--row-padding)', gap: 'var(--row-gap)' }}>
                      <span style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--label-font-size)', fontWeight: 500, color: mode === 'dark' ? '#dedfe0' : '#5F6368', lineHeight: 'var(--label-line-height)', flexShrink: 0, width: 'var(--label-width)', minWidth: 'auto' }}>{label}</span>
                      <Skeleton variant="text" sx={{ fontSize: 'var(--value-font-size)', width: '60%', flex: 1, ...(mode === 'dark' ? { backgroundColor: '#3c4043' } : {}) }} />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {/* Description */}
                  <div style={{ borderBottom: mode === 'dark' ? '1px solid #3c4043' : '1px solid #E8EAED', padding: 'var(--desc-section-padding)' }}>
                    <div style={{ color: mode === 'dark' ? '#dedfe0' : '#575757', fontSize: 'var(--desc-label-size)', fontWeight: 500 }}>Description</div>
                    {(() => {
                      const desc = previewData.entrySource.description || '-';
                      const maxLength = 150;
                      const isLong = desc.length > maxLength;
                      return (
                        <div style={{ color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', fontSize: 'var(--desc-text-size)', fontWeight: 400, marginTop: '4px' }}>
                          {isLong && !descriptionExpanded ? desc.slice(0, maxLength) + '...' : desc}
                          {isLong && (
                            <span
                              onClick={() => setDescriptionExpanded(prev => !prev)}
                              style={{ color: mode === 'dark' ? '#8ab4f8' : '#1A73E8', cursor: 'pointer', marginLeft: '4px', fontSize: 'var(--show-more-size)', fontWeight: 500 }}
                            >
                              {descriptionExpanded ? 'Show less' : 'Show more'}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Created */}
                  <div className="preview-overview-row" style={{ display: 'flex', alignItems: 'baseline', padding: 'var(--row-padding)', paddingTop: '20px', gap: 'var(--row-gap)' }}>
                    <span style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--label-font-size)', fontWeight: 500, color: mode === 'dark' ? '#dedfe0' : '#5F6368', lineHeight: 'var(--label-line-height)', flexShrink: 0, width: 'var(--label-width)' }}>Created</span>
                    <span className="preview-overview-value" style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--value-font-size)', fontWeight: 400, color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', lineHeight: 'var(--value-line-height)', flex: 1, wordBreak: 'break-word' }}>
                      {creationDate} {creationTime}
                    </span>
                  </div>

                  {/* Last modified */}
                  <div className="preview-overview-row" style={{ display: 'flex', alignItems: 'baseline', padding: 'var(--row-padding)', gap: 'var(--row-gap)' }}>
                    <span style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--label-font-size)', fontWeight: 500, color: mode === 'dark' ? '#dedfe0' : '#5F6368', lineHeight: 'var(--label-line-height)', flexShrink: 0, width: 'var(--label-width)' }}>Last modified</span>
                    <span className="preview-overview-value" style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--value-font-size)', fontWeight: 400, color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', lineHeight: 'var(--value-line-height)', flex: 1, wordBreak: 'break-word' }}>
                      {updateDate} {updateTime}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="preview-overview-row" style={{ display: 'flex', alignItems: 'baseline', padding: 'var(--row-padding)', gap: 'var(--row-gap)' }}>
                    <span style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--label-font-size)', fontWeight: 500, color: mode === 'dark' ? '#dedfe0' : '#5F6368', lineHeight: 'var(--label-line-height)', flexShrink: 0, width: 'var(--label-width)' }}>Location</span>
                    <span className="preview-overview-value" style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--value-font-size)', fontWeight: 400, color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', lineHeight: 'var(--value-line-height)', flex: 1, wordBreak: 'break-word' }}>
                      {previewData.entrySource.location || '-'}
                    </span>
                  </div>

                  {/* Contact(s) */}
                  <div className="preview-overview-row" style={{ display: 'flex', alignItems: 'baseline', padding: 'var(--row-padding)', gap: 'var(--row-gap)' }}>
                    <span style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--label-font-size)', fontWeight: 500, color: mode === 'dark' ? '#dedfe0' : '#5F6368', lineHeight: 'var(--label-line-height)', flexShrink: 0, width: 'var(--label-width)' }}>Contact(s)</span>
                    <span className="preview-overview-value" style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--value-font-size)', fontWeight: 400, color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', lineHeight: 'var(--value-line-height)', flex: 1, wordBreak: 'break-word', minWidth: 0 }}>
                      {entryStatus === 'succeeded' && contacts.length > 0 ? (
                        <span style={{ display: 'inline' }}>
                          <span>{getDisplayName(contacts[0])}</span>
                          {contacts.length > 1 && (
                            <Tooltip
                              title={
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>
                                  {contacts.slice(1).map((contact: any, index: any) => (
                                    <Typography key={index} sx={{ fontFamily: '"Google Sans Text", sans-serif', fontSize: '12px' }}>
                                      {getDisplayName(contact)}
                                    </Typography>
                                  ))}
                                </Box>
                              }
                            >
                              <span style={{ fontWeight: 500, color: mode === 'dark' ? '#8ab4f8' : '#022FCD', cursor: 'pointer', marginLeft: '4px' }}>
                                +{contacts.length - 1}
                              </span>
                            </Tooltip>
                          )}
                        </span>
                      ) : '-'}
                    </span>
                  </div>

                  {/* Parent */}
                  <div className="preview-overview-row" style={{ display: 'flex', alignItems: 'baseline', padding: 'var(--row-padding)', gap: 'var(--row-gap)' }}>
                    <span style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--label-font-size)', fontWeight: 500, color: mode === 'dark' ? '#dedfe0' : '#5F6368', lineHeight: 'var(--label-line-height)', flexShrink: 0, width: 'var(--label-width)' }}>Parent</span>
                    <Tooltip title={getName(previewData.parentEntry, '/') || '-'} arrow>
                      <span className="preview-overview-value" style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--value-font-size)', fontWeight: 400, color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', lineHeight: 'var(--value-line-height)', flex: 1, wordBreak: 'break-word' }}>
                        {getName(previewData.parentEntry, '/') || '-'}
                      </span>
                    </Tooltip>
                  </div>

                  {/* Project */}
                  <div className="preview-overview-row" style={{ display: 'flex', alignItems: 'baseline', padding: 'var(--row-padding)', gap: 'var(--row-gap)' }}>
                    <span style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--label-font-size)', fontWeight: 500, color: mode === 'dark' ? '#dedfe0' : '#5F6368', lineHeight: 'var(--label-line-height)', flexShrink: 0, width: 'var(--label-width)' }}>Project</span>
                    <Tooltip title={projectDisplayName} arrow>
                      <span className="preview-overview-value" style={{ fontFamily: '"Google Sans", sans-serif', fontSize: 'var(--value-font-size)', fontWeight: 400, color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', lineHeight: 'var(--value-line-height)', flex: 1, wordBreak: 'break-word' }}>
                        {projectDisplayName}
                      </span>
                    </Tooltip>
                  </div>
                </>
              )}
            </div>
          )}
          {tabValue === 1 && getEntryType(previewData.name, '/') == 'Tables' && (
              <>
                {entryStatus === 'succeeded' ? (
                  schemaData.length > 0 ? (
                    <div>
                      <SchemaFilter
                        entry={entry}
                        onFilteredEntryChange={setFilteredSchemaEntry}
                        isPreview={true}
                      />
                      {schema}
                    </div>
                  ) : (
                    <div style={{padding:"var(--empty-content-padding)", textAlign: "center", fontSize: "var(--empty-content-font-size)", color: mode === 'dark' ? '#9aa0a6' : "#0C1226CC"}}>
                      No Schema Data available for this table
                    </div>
                  )
                ) : (
                  schema
                )}
              </>
          )}
          {tabValue === aspectsTabIndex && (
              <>
                {entryStatus === 'succeeded' ? (
                  hasAnnotations ? (
                    <div>
                        <AnnotationFilter
                          entry={entry}
                          onFilteredEntryChange={setFilteredAnnotationEntry}
                          onCollapseAll={handleAnnotationCollapseAll}
                          onExpandAll={handleAnnotationExpandAll}
                          isPreview={true}
                        />
                        {annotationTab}
                    </div>
                  ) : (
                    <div style={{padding:"var(--empty-content-padding)", textAlign: "center", fontSize: "var(--empty-content-font-size)", color: mode === 'dark' ? '#9aa0a6' : "#0C1226CC"}}>
                      No Aspects Data available for this table
                    </div>
                  )
                ) : (
                  annotationTab
                )}
              </>
          )}
        </Box>
      </div>
    );
  }

  return (
    <>
      <div className="preview-card" style={{
        background: mode === 'dark' ? '#131314' : '#FFF',
        height: isGlossary ? '100%' : 'calc(100vh - 3.9rem - 40px)',
        padding: 'var(--preview-padding)',
        borderRadius: 'var(--preview-radius)',
        border: mode === 'dark' ? '1px solid #3c4043' : '1px solid #DADCE0',
        boxSizing: 'border-box',
        marginTop: '8px',
        marginLeft: '0',
        width: '100%',
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        overflow: "hidden"
      }}>
        {preview}
      </div>

      {/* Portal: Backdrop + Submit Access + Notification rendered at body level to escape parent stacking context */}
      {createPortal(
        <>
          {/* Backdrop Overlay */}
          {isSubmitAccessOpen && (
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
          {previewData && (<SubmitAccess
            isOpen={isSubmitAccessOpen}
            onClose={handleCloseSubmitAccess}
            assetName={previewData?.entrySource?.displayName?.length > 0 ? previewData?.entrySource?.displayName : getName(previewData.name || '', '/')}
            entry={entry}
            onSubmitSuccess={handleSubmitSuccess}
            previewData={previewData ?? null}
          />)}

          {/* Notification Bar */}
          <NotificationBar
            isVisible={isNotificationVisible}
            onClose={handleCloseNotification}
            message={notificationMessage}
          />
        </>,
        document.body
      )}
    </>
  );
};

export default ResourcePreview;