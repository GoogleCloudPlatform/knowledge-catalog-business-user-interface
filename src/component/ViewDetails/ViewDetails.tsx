import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Box, IconButton, Tab, Tabs, Skeleton } from '@mui/material'
import { ArrowBack, KeyboardArrowUp, KeyboardArrowDown, DashboardOutlined, Inventory2Outlined, BadgeOutlined, TimelineOutlined, WorkspacePremiumOutlined, CategoryOutlined, ArticleOutlined } from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ConditionalTooltip from '../Common/ConditionalTooltip'
import CustomTabPanel from '../TabPanel/CustomTabPanel'
import PreviewAnnotation from '../Annotation/PreviewAnnotation'
import AnnotationFilter from '../Annotation/AnnotationFilter'
import Tag from '../Tags/Tag'
import DetailPageOverview from '../DetailPageOverview/DetailPageOverview'
import DetailPageOverviewSkeleton from '../DetailPageOverview/DetailPageOverviewSkeleton'
import Lineage from '../Lineage'
import DataQuality from '../DataQuality/DataQuality'
import DataProfile from '../DataProfile/DataProfile'
import EntryList from '../EntryList/EntryList'
import type { AppDispatch } from '../../app/store'
import { getSampleData } from '../../features/sample-data/sampleDataSlice'
import { popFromHistory, pushToHistory, fetchEntry, fetchEntryLinks } from '../../features/entry/entrySlice'
import type { GlossaryItem } from '../Glossaries/GlossaryDataType'
import { fetchAllDataScans, selectAllScans, selectAllScansStatus } from '../../features/dataScan/dataScanSlice';
import { useAuth } from '../../auth/AuthProvider'
import { getName, getEntryType, generateBigQueryLink, hasValidAnnotationData, generateLookerStudioLink, getAssetIcon  } from '../../utils/resourceUtils'
import { getGlossaryMuiIcon, isGlossaryAssetType, assetNameToGlossaryType } from '../../constants/glossaryIcons'
import { findItem } from '../../utils/glossaryUtils';
import {
  fetchViewDetailsTermRelationships,
  fetchViewDetailsEntryDetails,
  fetchViewDetailsChildren
} from '../../features/glossaries/glossariesSlice';
import GlossariesCategoriesTerms from '../Glossaries/GlossariesCategoriesTerms';
import GlossariesCategoriesTermsSkeleton from '../Glossaries/GlossariesCategoriesTermsSkeleton';
import GlossariesLinkedAssets from '../Glossaries/GlossariesLinkedAssets';
import GlossariesSynonyms from '../Glossaries/GlossariesSynonyms';
import GlossariesSynonymsSkeleton from '../Glossaries/GlossariesSynonymsSkeleton';
import ResourcePreview from '../Common/ResourcePreview';
import TableInsights from '../TableInsights/TableInsights'
import { useNoAccess } from '../../contexts/NoAccessContext';
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

// Helper function to determine glossary entry type
const getGlossaryType = (entry: any): 'glossary' | 'category' | 'term' | null => {
  if (!entry?.entryType) return null;

  const entryTypeStr = entry.entryType.toLowerCase();

  if (entryTypeStr.includes('glossary') && !entryTypeStr.includes('category') && !entryTypeStr.includes('term')) {
    return 'glossary';
  }
  if (entryTypeStr.includes('category')) {
    return 'category';
  }
  if (entryTypeStr.includes('term')) {
    return 'term';
  }

  return null;
};

const ViewDetails = () => {
  const { user } = useAuth();
  const entry = useSelector((state: any) => state.entry.items);
  const entryStatus = useSelector((state: any) => state.entry.status);
  const entryError = useSelector((state: any) => state.entry.error);
  const entryHistory = useSelector((state: any) => state.entry.history);
  const entryLinks = useSelector((state: any) => state.entry.entryLinks) as GlossaryItem[];
  const entryLinksStatus = useSelector((state: any) => state.entry.entryLinksStatus);
  const { triggerNoAccess } = useNoAccess();
  const sampleData = useSelector((state: any) => state.sampleData.items);
  const sampleDataStatus = useSelector((state: any) => state.sampleData.status);
  const glossaryItems = useSelector((state: any) => state.glossaries.viewDetailsItems);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const id_token = user?.token || '';
  const allScans = useSelector(selectAllScans);
  const allScansStatus = useSelector(selectAllScansStatus);
  const initialTabName = (location.state as any)?.tabName as string | undefined;
  const tabNameApplied = React.useRef(false);
  const [tabValue, setTabValue] = React.useState(0);
  const [sampleTableData, setSampleTableData] = React.useState<any>();
  const [filteredEntry, setFilteredEntry] = useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());
  const [dqScanName, setDqScanName] = useState<string | null>(null);
  const [dpScanName, setDpScanName] = useState<string | null>(null);
  const [tableInsightsScanName, setTableInsightsScanName] = useState<string | null>(null);

  const [glossaryType, setGlossaryType] = useState<'glossary' | 'category' | 'term' | null>(null);
  const [termsSearch, setTermsSearch] = useState('');
  const [termsSortBy, setTermsSortBy] = useState<'name' | 'lastModified'>('name');
  const [termsSortOrder, setTermsSortOrder] = useState<'asc' | 'desc'>('asc');
  const [contentSearchTerm, setContentSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<'name' | 'lastModified'>('name');
  const [relationFilter, setRelationFilter] = useState<'all' | 'synonym' | 'related'>('all');
  const [fetchedEntryId, setFetchedEntryId] = useState<string | null>(null);
  const [assetPreviewData, setAssetPreviewData] = useState<any | null>(null);
  const [isAssetPreviewOpen, setIsAssetPreviewOpen] = useState(false);
  const [lockedEntry, setLockedEntry] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 200);
    }
  }, []);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const handleAnnotationCollapseAll = () => {
    setExpandedAnnotations(new Set());
  };

  const handleAnnotationExpandAll = () => {
    if (entry?.aspects) {
      const number = getEntryType(entry.name, '/');
      const annotationKeys = Object.keys(entry.aspects)
        .filter(key =>
          key !== `${number}.global.schema` &&
          key !== `${number}.global.overview` &&
          key !== `${number}.global.contacts` &&
          key !== `${number}.global.usage`
        )
        .filter(key => hasValidAnnotationData(entry.aspects![key])); // Only expand those with data
      setExpandedAnnotations(new Set(annotationKeys));
    }
  };
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // Auto-close asset preview on tab switch
    if (isAssetPreviewOpen) {
      setIsAssetPreviewOpen(false);
      setAssetPreviewData(null);
    }
  };
  

  const tabProps = (index: number)  => {
    return {
        id: `tab-${index}`,
        'aria-controls': `tabpanel-${index}`,
    };
  }

  const goBack = () => {
    // Check if we have entry history to go back to
    if (entryHistory && entryHistory.length > 0) {
      // Pop the last entry from history and set it as current
      dispatch(popFromHistory());
    } else {
      // If no history, fall back to browser navigation
      navigate(-1);
    }
  };

  // Glossary-specific helper functions
  const handleSortDirectionToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleResourceClick = (id: string) => {
    dispatch(pushToHistory());

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
  };

  // Helper function to sort items
  const sortItems = useCallback((items: any[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.displayName.toLowerCase();
        const nameB = b.displayName.toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else {
        const dateA = a.lastModified || 0;
        const dateB = b.lastModified || 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });
  }, [sortBy, sortOrder]);

  // Glossary data computation with useMemo
  const currentGlossaryItem = useMemo(() => {
    if (!glossaryType || !entry) return null;
    // Use entry.entrySource.resource as the ID to find in the glossariesSlice tree
    const resourceId = entry.entrySource?.resource || entry.name;
    return findItem(glossaryItems, resourceId);
  }, [glossaryType, entry, glossaryItems]);

  const categories = useMemo(() => {
    return currentGlossaryItem?.children?.filter((c: any) => c.type === 'category') || [];
  }, [currentGlossaryItem]);

  const terms = useMemo(() => {
    const getAllTerms = (node: any): any[] => {
      let allTerms: any[] = [];
      if (node?.children) {
        node.children.forEach((child: any) => {
          if (child.type === 'term') allTerms.push(child);
          allTerms = [...allTerms, ...getAllTerms(child)];
        });
      }
      return allTerms;
    };
    return currentGlossaryItem ? getAllTerms(currentGlossaryItem) : [];
  }, [currentGlossaryItem]);

  const relations = useMemo(() => {
    return currentGlossaryItem?.relations || [];
  }, [currentGlossaryItem]);

  const filteredCategories = useMemo(() => {
    const filtered = categories.filter((c: any) =>
      c.displayName.toLowerCase().includes(contentSearchTerm.toLowerCase())
    );
    return sortItems(filtered);
  }, [categories, contentSearchTerm, sortBy, sortOrder]);

  const filteredTerms = useMemo(() => {
    const filtered = terms.filter((t: any) =>
      t.displayName.toLowerCase().includes(contentSearchTerm.toLowerCase())
    );
    return sortItems(filtered);
  }, [terms, contentSearchTerm, sortBy, sortOrder]);

  // Sorted & searched linked terms for the new "Terms" tab
  const sortedEntryLinks = useMemo(() => {
    const list = (entryLinks || []).filter((t) =>
      (t.displayName || '').toLowerCase().includes(termsSearch.toLowerCase())
    );
    return [...list].sort((a, b) => {
      if (termsSortBy === 'name') {
        const nameA = (a.displayName || '').toLowerCase();
        const nameB = (b.displayName || '').toLowerCase();
        return termsSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      const dateA = a.lastModified || 0;
      const dateB = b.lastModified || 0;
      return termsSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [entryLinks, termsSearch, termsSortBy, termsSortOrder]);

  // Check if glossary data is still loading
  const isGlossaryDataLoading = useMemo(() => {
    if (!glossaryType) return false;

    // If we don't have the item in the tree yet, it's loading
    if (!currentGlossaryItem) return true;

    // For glossary/category, check if children have been loaded
    if ((glossaryType === 'glossary' || glossaryType === 'category') && !currentGlossaryItem.children) {
      return true;
    }

    // For terms, check if relations have been loaded
    if (glossaryType === 'term' && !currentGlossaryItem.relations) {
      return true;
    }

    return false;
  }, [glossaryType, currentGlossaryItem]);

  // Lock the current entry when preview opens to prevent ViewDetails from updating
  useEffect(() => {
    if (isAssetPreviewOpen && !lockedEntry) {
      // Lock the current entry when preview opens
      setLockedEntry(entry);
    } else if (!isAssetPreviewOpen && lockedEntry) {
      // Unlock when preview closes
      setLockedEntry(null);
    }
  }, [isAssetPreviewOpen, entry, lockedEntry]);

  // Use locked entry for display when preview is open, otherwise use current entry
  const displayEntry = lockedEntry || entry;
  const bigQueryLink = generateBigQueryLink(displayEntry);
  const lookerLink = generateLookerStudioLink(displayEntry);

  const headerDescription = displayEntry?.entrySource?.description || '';

let annotationTab = (
  <Box sx={{ 
    flex: 1, 
    overflowY: "auto", 
    minHeight: 0,
    border: '1px solid #DADCE0',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginRight: '8px',
    marginTop: '12px' 
  }}>
    <PreviewAnnotation
      entry={filteredEntry || displayEntry}
      css={{
        width: "100%",
        border: "none",
        margin: 0,
        background: "transparent",
        borderRadius: "0px",
        height: "auto",
        overflow: "visible",
      }}
      isTopComponent={true}
      expandedItems={expandedAnnotations}
      setExpandedItems={setExpandedAnnotations}
      isGlossary={true} 
    />
  </Box>
);

let overviewTab = <DetailPageOverview entry={displayEntry} css={{width:"100%"}} sampleTableData={sampleTableData} noTopSpacing={true}/>;
  
//   useEffect(() => {
//     if(getEntryType(entry.name, '/') == 'Tables') {
//         // schema = <Schema entry={entry} css={{width:"100%"}} />;
//         dispatch(getSampleData({fqn: entry.fullyQualifiedName, id_token: id_token}));
//     }
//   }, []);

  useEffect(() => {
    // Only fetch if we have a token and haven't fetched yet
    if (id_token){ // && allScansStatus === 'idle') {
      dispatch(fetchAllDataScans({ id_token: id_token, projectId: entry?.entrySource?.resource.split('/')[1] || '' }));
    }
  }, []);//[dispatch, id_token, allScansStatus]);

useEffect(() => {
    // Don't update scans if preview is open
    if (isAssetPreviewOpen) return;

    if (
      entryStatus === 'succeeded' &&
      allScansStatus === 'succeeded' &&
      entry?.entrySource?.resource &&
      allScans
    ) {

      const resourceName = entry.entrySource.resource;

      // Find the Data Quality scan
      const dqScan = allScans.filter(
        (scan: any) =>
          scan.data.resource === "//bigquery.googleapis.com/" + resourceName && scan.type === 'DATA_QUALITY'
      );
      let dqNScan = dqScan.length > 0 ? dqScan.reduce((latest:any, current:any) => {
        return new Date(current.updateTime.seconds * 1000) < new Date(latest.updateTime.seconds * 1000) ? current : latest;
      }) : null;
      setDqScanName(dqNScan ? dqNScan.name : null);

      // Find the Data Profile scan
      const dpScan = allScans.filter(
        (scan: any) =>
          scan.data.resource === "//bigquery.googleapis.com/" + resourceName && scan.type === 'DATA_PROFILE'
      );
      let dpNScan = dpScan.length > 0 ? dpScan.reduce((latest:any, current:any) => {
        return new Date(current.updateTime.seconds * 1000) < new Date(latest.updateTime.seconds * 1000) ? current : latest;
      }) : null;
      setDpScanName(dpNScan ? dpNScan.name : null);

      const tableInsightsScanFiltered = allScans.filter(
        (scan: any) =>{
          console.log("Checking scan:", scan.name, "for resource:", resourceName, "with type:", scan.type);
          return (scan.data.resource === '//bigquery.googleapis.com/'+resourceName && (scan.type === 'DATA_DOCUMENTATION' || scan.type === 4))
        }
      );
      console.log("Table Insights Scans filtered:", tableInsightsScanFiltered);

      let tableInsightsScan = tableInsightsScanFiltered.length > 0 ? tableInsightsScanFiltered.reduce((latest:any, current:any) => {
        return new Date(current.updateTime.seconds * 1000) < new Date(latest.updateTime.seconds * 1000) ? current : latest;
      }) : null;

      console.log("Table Insights Scans found:", tableInsightsScan);

      setTableInsightsScanName(tableInsightsScan ? tableInsightsScan?.name : null);
      console.log(`tableInsightsScanName for resource [${resourceName}]:`, tableInsightsScanName);
    }
  }, [entry, entryStatus, allScans, allScansStatus, entry?.entrySource?.resource, isAssetPreviewOpen]);
  useEffect(() => {
    if(sampleDataStatus === 'succeeded') {
        // schema = <Schema entry={entry} css={{width:"100%"}} />;
        if(entry.entrySource?.system) {
          if(entry.entrySource?.system.toLowerCase() === 'bigquery'){
            setSampleTableData(sampleData);
            //console.log("Sample Data:", sampleData);
          }
        }
    }
  }, [sampleData]);

  useEffect(() => {
  // Don't update loading state if preview is open (to prevent navigation appearance)
  if (isAssetPreviewOpen) return;

  if(entryStatus === 'loading') {
      setLoading(true);
  }
  if(entryStatus === 'succeeded') {
      // schema = <Schema entry={entry} css={{width:"100%"}} />;
      setLoading(false);
      if(getEntryType(entry.name, '/') == 'Tables' && entry.entrySource?.system != undefined && entry.entrySource?.system != "undefined" && entry.entrySource?.system.toLowerCase() === 'bigquery') {
        dispatch(getSampleData({fqn: entry.fullyQualifiedName, id_token: id_token}));
      }
      // console.log("loader:", loading);
  }
}, [entryStatus, isAssetPreviewOpen]);

  // Show no-access modal when entry fetch returns PERMISSION_DENIED
  useEffect(() => {
    if (entryStatus === 'failed' && entryError?.type === 'PERMISSION_DENIED') {
      triggerNoAccess({ message: entryError.message });
    }
  }, [entryStatus, entryError, triggerNoAccess]);

  // Handle case where entry is already loaded from persistence
  useEffect(() => {
    // Don't update if preview is open
    if (isAssetPreviewOpen) return;

    if (entry && entryStatus === 'succeeded' && !loading) {
      // Entry is already loaded, no need to show loading state
      setLoading(false);
    }
  }, [entry, entryStatus, loading, isAssetPreviewOpen]);

  // Detect glossary type and fetch glossary-specific data
  useEffect(() => {
    // Don't fetch data if preview is open (to prevent navigation appearance)
    if (isAssetPreviewOpen) return;

    if (entry && entryStatus === 'succeeded') {
      const type = getGlossaryType(entry);
      setGlossaryType(type);

      if (type && user?.token) {
        const resourceId = entry.entrySource?.resource || entry.name;

        // Only fetch if we haven't fetched this entry yet
        if (fetchedEntryId !== resourceId) {
          setFetchedEntryId(resourceId);

          // Fetch entry details (description, longDescription, contacts, labels, aspects)
          dispatch(fetchViewDetailsEntryDetails({
            entryName: entry.name,
            id_token: user.token
          }));

          // For glossary/category, fetch children (categories and terms)
          if (type === 'glossary' || type === 'category') {
            dispatch(fetchViewDetailsChildren({
              parentId: resourceId,
              id_token: user.token
            }));
          }

          // For terms, fetch relationships (linked assets, synonyms, related terms)
          if (type === 'term') {
            dispatch(fetchViewDetailsTermRelationships({
              termId: resourceId,
              id_token: user.token
            }));
          }
        }
      }
    }
  }, [entry, entryStatus, user?.token, dispatch, fetchedEntryId, isAssetPreviewOpen]);

  // Reset tab value and glossary-specific state when entry changes
  useEffect(() => {
    // Don't reset if preview is open (to prevent navigation appearance)
    if (isAssetPreviewOpen) return;

    if (entry) {
      setTabValue(0);
      setContentSearchTerm('');
      setRelationFilter('all');
      setFetchedEntryId(null);
      setAssetPreviewData(null);
      setIsAssetPreviewOpen(false);
      setTermsSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.name]);

  // Fetch linked glossary terms via lookupEntryLinks for non-glossary entries
  useEffect(() => {
    if (isAssetPreviewOpen) return;
    if (!entry?.name || !id_token || entryStatus !== 'succeeded') return;
    const gType = getGlossaryType(entry);
    const isGlossaryLike = gType === 'glossary' || gType === 'category' || gType === 'term';
    if (!isGlossaryLike) {
      dispatch(fetchEntryLinks({ entryName: entry.name, id_token }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.name, entryStatus, id_token, isAssetPreviewOpen, dispatch]);

  // Resolve a tab name (e.g. 'aspects', 'lineage') to a numeric index based on entry type
  const resolveTabName = (tabName: string): number => {
    const type = getEntryType(entry.name, '/');
    const isBigQueryTable = type === 'Tables' && entry.entrySource?.system?.toLowerCase() === 'bigquery';
    const gType = getGlossaryType(entry);

    if (isBigQueryTable) {
      const map: Record<string, number> = { overview: 0, aspects: 1, terms: 2, lineage: 3, dataProfile: 4, dataQuality: 5, insights: 6 };
      return map[tabName] ?? 0;
    }
    if (type === 'Datasets') {
      const map: Record<string, number> = { overview: 0, entryList: 1, aspects: 2, terms: 3, insights: 4 };
      return map[tabName] ?? 0;
    }
    if (gType === 'glossary' || gType === 'category') {
      const map: Record<string, number> = { overview: 0, categories: 1, terms: 2, aspects: 3 };
      return map[tabName] ?? 0;
    }
    if (gType === 'term') {
      const map: Record<string, number> = { overview: 0, linkedAssets: 1, synonyms: 2, aspects: 3 };
      return map[tabName] ?? 0;
    }
    // Default (non-Entries types get Glossary Terms tab)
    if (type === 'Entries') {
      const map: Record<string, number> = { overview: 0, aspects: 1 };
      return map[tabName] ?? 0;
    }
    const map: Record<string, number> = { overview: 0, aspects: 1, terms: 2 };
    return map[tabName] ?? 0;
  };

  // Apply tabName from route state when the new entry finishes loading
  useEffect(() => {
    if (!tabNameApplied.current && initialTabName && entryStatus === 'succeeded' && entry) {
      setTabValue(resolveTabName(initialTabName));
      tabNameApplied.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryStatus, initialTabName, entry]);

  // Lineage tab with full Lineage component
  const lineageTab = <Lineage entry={displayEntry}/>;

  // Terms tab content for non-glossary entries (linked glossary terms via lookupEntryLinks)
  const linkedTermsTab = (
    entryLinksStatus === 'loading' ? (
      <Box sx={{ height: '100%' }}>
        <GlossariesCategoriesTermsSkeleton />
      </Box>
    ) : (
      <Box sx={{ height: '100%', minHeight: 'calc(100vh - 350px)' }}>
        <GlossariesCategoriesTerms
          mode="terms"
          items={sortedEntryLinks}
          searchTerm={termsSearch}
          onSearchTermChange={setTermsSearch}
          sortBy={termsSortBy}
          sortOrder={termsSortOrder}
          onSortByChange={setTermsSortBy}
          onSortOrderToggle={() => setTermsSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
          onItemClick={handleResourceClick}
        />
      </Box>
    )
  );

  // Entry-type icon (glossary MUI icon or asset image), reused in header card + compact sticky header
  const renderEntryIcon = () => {
    const rawType = displayEntry?.entryType?.split('-').length > 1
      ? displayEntry.entryType.split('-').pop()!
      : displayEntry?.name?.split('/').at(-2) ?? '';
    const iconType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
    if (isGlossaryAssetType(iconType)) {
      return getGlossaryMuiIcon(assetNameToGlossaryType(iconType), {
        size: '24px',
        color: '#022FCD',
      });
    }
    return (
      <Box
        component="img"
        src={getAssetIcon(iconType)}
        alt="Entry type icon"
        sx={{
          width: "24px",
          height: "24px",
          filter: "brightness(0) saturate(100%) invert(14%) sepia(97%) saturate(3439%) hue-rotate(231deg) brightness(87%) contrast(100%)"
        }}
      />
    );
  };

  // CTA buttons (Open in BigQuery / Explore in Looker), reused in header card + compact sticky header
const ctaButtons = (
    <>
      <Box
        component="button"
        disabled={!bigQueryLink}
        onClick={() => bigQueryLink && window.open(bigQueryLink, '_blank')}
        sx={{
          background: "transparent",
          border: "1px solid #DADCE0",
          borderRadius: "100px",
          cursor: bigQueryLink ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "10px 16px",
          transition: "background-color 0.2s ease",
          opacity: bigQueryLink ? 1 : 0.5,
          '&:hover': {
            backgroundColor: bigQueryLink ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
          },
          flex: 1,
          fontFamily: '"Google Sans", sans-serif',
          fontSize: '14px',
          fontWeight: 600,
          color: '#022FCD',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
        <img
          src={getAssetIcon('Big Query Product')}
          alt="Open in BQ"
          style={{ width: "20px", height: "20px", flexShrink: 0 }}
        />
        <span style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Open in BigQuery
        </span>
      </Box>
      <Box
        component="button"
        disabled={!lookerLink}
        onClick={() => lookerLink && window.open(lookerLink, '_blank')}
        sx={{
          background: "transparent",
          border: "1px solid #DADCE0",
          borderRadius: "100px",
          cursor: lookerLink ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "10px 16px",
          transition: "background-color 0.2s ease",
          opacity: lookerLink ? 1 : 0.5,
          '&:hover': {
            backgroundColor: lookerLink ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
          },
          flex: 1,
          fontFamily: '"Google Sans", sans-serif',
          fontSize: '14px',
          fontWeight: 600,
          color: '#022FCD',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
        <img
          src="/assets/svg/looker-icon.svg"
          alt="Open in Looker"
          style={{ width: "20px", height: "20px", flexShrink: 0 }}
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Explore in Looker
        </span>
      </Box>
    </>
  );

  const showCta = displayEntry.entrySource?.system?.toLowerCase() === 'bigquery';

  const headerTitle = displayEntry.entrySource.displayName.length > 0
    ? displayEntry.entrySource.displayName
    : getName(displayEntry.name || '', '/');

  // Dynamic tab items, reused in the normal nav bar + compact sticky tab bar
  const tabItems = getEntryType(displayEntry.name, '/') === 'Tables' && displayEntry.entrySource?.system.toLowerCase() === 'bigquery' ? [
    <Tab key="overview" icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Overview" {...tabProps(0)} />,
    <Tab key="annotations" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span>} iconPosition="start" label="Aspects" {...tabProps(1)} />,
    <Tab key="terms" icon={<ArticleOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Glossary Terms" {...tabProps(2)} />,
    <Tab key="lineage" icon={<TimelineOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Lineage" {...tabProps(3)} />,
    <Tab key="dataProfile" icon={<BadgeOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Data Profile" {...tabProps(4)} />,
    <Tab key="dataQuality" icon={<WorkspacePremiumOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Data Quality" {...tabProps(5)} />,
    <Tab key="insights" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>query_stats</span>} iconPosition="start" label="Insights" {...tabProps(6)} />,
  ] : getEntryType(displayEntry.name, '/') === 'Datasets' ? [
    <Tab key="overview" icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Overview" {...tabProps(0)} />,
    <Tab key="entryList" icon={<Inventory2Outlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Entry List" {...tabProps(1)} />,
    <Tab key="annotations" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span>} iconPosition="start" label="Aspects" {...tabProps(2)} />,
    <Tab key="terms" icon={<ArticleOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Glossary Terms" {...tabProps(3)} />,
    <Tab key="insights" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>query_stats</span>} iconPosition="start" label="Insights" {...tabProps(4)} />
  ] : glossaryType === 'glossary' || glossaryType === 'category' ? [
    <Tab key="overview" icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Overview" {...tabProps(0)} />,
    <Tab key="categories" icon={<CategoryOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Categories" {...tabProps(1)} />,
    <Tab key="terms" icon={<ArticleOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Terms" {...tabProps(2)} />,
    <Tab key="annotations" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span>} iconPosition="start" label="Aspects" {...tabProps(3)} />
  ] : glossaryType === 'term' ? [
    <Tab key="overview" icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Overview" {...tabProps(0)} />,
    <Tab key="linkedAssets" icon={<Inventory2Outlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Linked Assets" {...tabProps(1)} />,
    <Tab key="synonyms" icon={<ArticleOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Synonyms & Related Terms" {...tabProps(2)} />,
    <Tab key="annotations" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span>} iconPosition="start" label="Aspects" {...tabProps(3)} />
  ] : getEntryType(displayEntry.name, '/') === 'Entries' ? [
    <Tab key="overview" icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Overview" {...tabProps(0)} />,
    <Tab key="annotations" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span>} iconPosition="start" label="Aspects" {...tabProps(1)} />,
  ] : [
    <Tab key="overview" icon={<DashboardOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Overview" {...tabProps(0)} />,
    <Tab key="annotations" icon={<span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span>} iconPosition="start" label="Aspects" {...tabProps(1)} />,
    <Tab key="terms" icon={<ArticleOutlined sx={{ fontSize: "20px" }} />} iconPosition="start" label="Glossary Terms" {...tabProps(2)} />,
  ];

  return (
    <div ref={scrollContainerRef} onScroll={handleScroll} style={{display: "flex", flexDirection: "column", padding: "0px 0", background:"#F7F9F9", height: "100%", overflowY: "auto" }}>
      {loading ? (
        <div style={{display: "flex", flexDirection: "column", flex: 1}}>
          
          {/* Mock Back Button Space (to match unscrolled loaded state) */}
          <div style={{ padding: "16px 20px 8px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <Skeleton variant="circular" width={30} height={30} />
            <Skeleton variant="text" width={40} height={24} />
          </div>

          <div style={{display: "flex", flexDirection: "row", gap: "2px"}}>
            <div style={{display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: 'hidden'}}>
              <div style={{ padding: "0px 20px", display: "flex", flexDirection: "column", marginBottom: "20px" }}>
                
                {/* Header Card Skeleton */}
                <Box sx={{
                    position: "relative",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    padding: "24px",
                    gap: "20px",
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)",
                    width: "100%",
                }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "20px", width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: "8px" }} />
                      <Skeleton variant="text" width={300} height={40} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Skeleton variant="rounded" width={80} height={22} sx={{ borderRadius: '8px' }} />
                        <Skeleton variant="rounded" width={80} height={22} sx={{ borderRadius: '8px' }} />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <Skeleton variant="text" width="70%" height={20} />
                    <Skeleton variant="text" width="50%" height={20} />
                  </Box>
                </Box>
              </div>

              {/* Navigation Tab Bar Skeleton */}
              <Box sx={{ paddingLeft: "20px", display: "flex", gap: "24px", alignItems: "center", height: "47px" }}>
                <Skeleton variant="text" width={80} height={24} />
                <Skeleton variant="text" width={70} height={24} />
                <Skeleton variant="text" width={65} height={24} />
                <Skeleton variant="text" width={90} height={24} />
              </Box>

              {/* Tab Content Skeleton */}
              <div style={{paddingTop:"0px", marginTop:"0px", marginLeft: "20px", marginRight: "20px", paddingBottom: "2rem", borderTop: "1px solid #E0E0E0"}}>
                <DetailPageOverviewSkeleton />
              </div>
            </div>
          </div>
        </div>
      ) : (<>
                        {/* Sticky header - collapses to compact header (icon + title + CTA + tabs) when scrolled */}
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
                            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", marginBottom:"5px" }}>
                              {/* Scrolled State: Compact Header */}
                              <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", width: "100%", gap: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "100%", gap: "16px", minWidth: 0 }}>
                                  <IconButton
                                    onClick={goBack}
                                    sx={{ p: '4px', flexShrink: 0, '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                                  >
                                    <ArrowBack style={{ fontSize: "24px", color: "#1F1F1F" }} />
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
                                    {renderEntryIcon()}
                                  </Box>

                                  <ConditionalTooltip text={headerTitle}>
                                    <label style={{
                                        fontFamily: '"Google Sans", sans-serif',
                                        color: "#1F1F1F",
                                        fontSize: "20px",
                                        fontWeight: 500,
                                        lineHeight: "28px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        display: "block",
                                    }}>
                                        {headerTitle}
                                    </label>
                                </ConditionalTooltip>
                                </div>

                                {showCta && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                    {ctaButtons}
                                  </div>
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
                                <Tabs
                                  value={tabValue}
                                  onChange={handleTabChange}
                                  variant="scrollable"
                                  scrollButtons="auto"
                                >
                                  {tabItems}
                                </Tabs>
                              </Box>
                            </div>
                          ) : (
                            /* Unscrolled State: Just the Back Button */
                            <div
                                onClick={goBack}
                                style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", width: "fit-content" }}
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
                                    <ArrowBack style={{ fontSize: "24px", color: "#1F1F1F" }} />
                                </IconButton>
                                <span style={{
                                    marginLeft: "8px",
                                    fontFamily: "'Product Sans Medium', 'Google Sans', sans-serif",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    lineHeight: "40px",
                                    color: "#1F1F1F",
                                    userSelect: "none"
                                }}>
                                    Back
                                </span>
                            </div>
                          )}
                        </div>

            {/* Flex row for content + preview sidebar */}
            <div style={{display: "flex", flexDirection: "row", gap: "2px"}}>
            <div style={{display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: 'hidden'}}>
              <div style={{ padding: "0px 20px", display: "flex", flexDirection: "column", marginBottom:"20px"}}>

                {/* Header Card */}
                <div style={{
                    position: "relative",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    padding: "24px",
                    gap: "20px",
                    background: "#ffffff", //"linear-gradient(88.29deg, #F6F7FF 0%, #F6FFFC 105.88%)",
                    borderRadius: "16px",
                    width: "100%",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)",
                }}>
                    {/* Top Row: Icon, Title and Tags */}
                    <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "100%", gap: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                            {/* Entry Type Icon Block */}
                            <Box sx={{
                                width: "48px",
                                height: "48px",
                                background: "#EAEEFA",
                                borderRadius: "8px",
                                border: "1.25px solid #FFFFFF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                overflow: "hidden"
                            }}>
                                {renderEntryIcon()}
                            </Box>
                            {/* Title */}
                            <ConditionalTooltip text={headerTitle}>
                              <label style={{
                                  fontFamily: '"Google Sans", sans-serif',
                                  color: "#1F1F1F",
                                  fontSize: "24px",
                                  fontWeight: "500",
                                  lineHeight: "32px",
                                  maxWidth: '500px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: "block",
                              }}>
                                  {headerTitle}
                              </label>
                          </ConditionalTooltip>
                            {/* Tags */}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <Tag
                                    text={(() => { const sys = displayEntry.entrySource.system; if (!sys) return 'Custom'; const lower = sys.toLowerCase(); if (lower === 'dataplex universal catalog' || lower === 'dataplex') return 'Knowledge Catalog'; if (lower === 'bigquery') return 'BigQuery'; return sys.replace("_", " ").replace("-", " ").toLowerCase(); })()}
                                    css={{
                                        fontFamily: '"Google Sans", sans-serif',
                                        backgroundColor: 'rgba(7, 106, 255, 0.1)',
                                        color: '#076AFF',
                                        borderRadius: '12px',
                                        padding: '3px 8px',
                                        height: '22px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        border: '1px solid rgba(7, 106, 255, 0.2)',
                                        textTransform: 'capitalize',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        display: 'flex',
                                        letterSpacing: '0.2px',
                                        lineHeight: 1
                                    }}
                                />
                                <Tag
                                    text={(() => {
                                        const rawType = displayEntry?.entryType?.split('-').length > 1
                                            ? displayEntry.entryType.split('-').pop()!
                                            : displayEntry?.name?.split('/').at(-2) ?? '';
                                        return rawType.charAt(0).toUpperCase() + rawType.slice(1);
                                    })()}
                                    css={{
                                        fontFamily: '"Google Sans", sans-serif',
                                        backgroundColor: 'rgba(7, 106, 255, 0.1)',
                                        color: '#076AFF',
                                        borderRadius: '12px',
                                        padding: '3px 8px',
                                        height: '22px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        border: '1px solid rgba(7, 106, 255, 0.2)',
                                        textTransform: 'capitalize',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        display: 'flex',
                                        letterSpacing: '0.2px',
                                        lineHeight: 1
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Top-right CTA Buttons */}
                    {showCta && (
                      <div style={{ position: "absolute", top: "24px", right: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
                        {ctaButtons}
                      </div>
                    )}

                    {/* Description with Show more/less */}
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
                                      lineHeight: "20px"
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
                            No description provided for this asset.
                        </div>
                      )}
                    </div>
                </div>
              </div>

              {/* Navigation Tab Bar */}
              <div style={{ paddingTop: "0px", marginTop: "0px", opacity: isScrolled ? 0 : 1, pointerEvents: isScrolled ? "none" : "auto", transition: "opacity 0.2s ease" }}>
                <Box
                  sx={{
                    width: "100%",
                  }}
                >
                  <Box
                    sx={{
                      paddingLeft: "20px",
                      position: "relative",
                      "& .MuiTabs-root": {
                        minHeight: "47px",
                        height: "47px",
                        "& .MuiTabs-flexContainer": {
                          gap: "4px",
                        },
                      },
                      "& .MuiTab-root": {
                        fontFamily: '"Google Sans", sans-serif',
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0C1226",
                        textTransform: "none",
                        minHeight: "47px",
                        padding: "0px 16px",
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
                        <Tabs value={tabValue}
                          onChange={handleTabChange}
                          aria-label="basic tabs"
                          TabIndicatorProps={{
                            children: <span className="indicator" />,
                          }}
                        >
                            {tabItems}
                        </Tabs>
                    </Box>
                </Box>
            </div>

           {/* Tab Content */}
            <div style={{paddingTop:"0px", marginTop:"0px", marginLeft: "20px", marginRight: "20px", paddingBottom: "2rem", borderTop: "1px solid #E0E0E0"}}>
                    <CustomTabPanel value={tabValue} index={0}>
                        {overviewTab}
                    </CustomTabPanel>
                    {getEntryType(entry.name, '/') === 'Tables' && entry.entrySource?.system.toLowerCase() === 'bigquery' ? (
                      <>
                        <CustomTabPanel value={tabValue} index={1}>
                            <AnnotationFilter
                              entry={displayEntry}
                              onFilteredEntryChange={setFilteredEntry}
                              sx={{width: "100%" }}
                              onCollapseAll={handleAnnotationCollapseAll}
                              onExpandAll={handleAnnotationExpandAll}
                            />
                            {annotationTab}
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={2}>
                            {linkedTermsTab}
                        </CustomTabPanel>
                       <CustomTabPanel value={tabValue} index={3}>
                            {lineageTab}
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={4}>
                            <DataProfile scanName={dpScanName} allScansStatus={allScansStatus} />
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={5}>
                            <DataQuality scanName={dqScanName} allScansStatus={allScansStatus} />
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={6}>
                            <TableInsights entry={entry} scanName={tableInsightsScanName} />
                        </CustomTabPanel>
                      </>
                    ) : getEntryType(entry.name, '/') === 'Datasets' ? (
                      <>
                        <CustomTabPanel value={tabValue} index={1}>
                            <EntryList entry={displayEntry}/>
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={2}>
                            <AnnotationFilter
                              entry={displayEntry}
                              onFilteredEntryChange={setFilteredEntry}
                              sx={{}}
                              onCollapseAll={handleAnnotationCollapseAll}
                              onExpandAll={handleAnnotationExpandAll}
                            />
                            {annotationTab}
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={3}>
                            {linkedTermsTab}
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={4}>
                            <TableInsights entry={entry} scanName={tableInsightsScanName} />
                        </CustomTabPanel>
                      </>
                    ) : glossaryType === 'glossary' || glossaryType === 'category' ? (
                      <>
                        <CustomTabPanel value={tabValue} index={1}>
                          {isGlossaryDataLoading ? (
                            <Box sx={{ height: '100%' }}>
                              <GlossariesCategoriesTermsSkeleton />
                            </Box>
                          ) : (
                            <Box sx={{ height: '100%', minHeight: 'calc(100vh - 350px)' }}>
                              <GlossariesCategoriesTerms
                                mode="categories"
                                items={filteredCategories}
                                searchTerm={contentSearchTerm}
                                onSearchTermChange={setContentSearchTerm}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortByChange={setSortBy}
                                onSortOrderToggle={handleSortDirectionToggle}
                                onItemClick={handleResourceClick}
                              />
                            </Box>
                          )}
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={2}>
                          {isGlossaryDataLoading ? (
                            <Box sx={{ height: '100%' }}>
                              <GlossariesCategoriesTermsSkeleton />
                            </Box>
                          ) : (
                            <Box sx={{ height: '100%', minHeight: 'calc(100vh - 350px)' }}>
                              <GlossariesCategoriesTerms
                                mode="terms"
                                items={filteredTerms}
                                searchTerm={contentSearchTerm}
                                onSearchTermChange={setContentSearchTerm}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortByChange={setSortBy}
                                onSortOrderToggle={handleSortDirectionToggle}
                                onItemClick={handleResourceClick}
                              />
                            </Box>
                          )}
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={3}>
                            <AnnotationFilter
                              entry={displayEntry}
                              onFilteredEntryChange={setFilteredEntry}
                              sx={{}}
                              onCollapseAll={handleAnnotationCollapseAll}
                              onExpandAll={handleAnnotationExpandAll}
                            />
                            {annotationTab}
                        </CustomTabPanel>
                      </>
                    ) : glossaryType === 'term' ? (
                      <>
                        <CustomTabPanel value={tabValue} index={1}>
                          <Box sx={{ height: '100%', minHeight: 'calc(100vh - 350px)', marginTop: '-10px' }}>
                            <GlossariesLinkedAssets
                              isLoading={isGlossaryDataLoading}
                              linkedAssets={currentGlossaryItem?.linkedAssets || []}
                              searchTerm={contentSearchTerm}
                              onSearchTermChange={setContentSearchTerm}
                              idToken={id_token}
                              onAssetPreviewChange={(data) => {
                                setAssetPreviewData(data);
                                setIsAssetPreviewOpen(!!data);
                              }}
                            />
                          </Box>
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={2}>
                          {isGlossaryDataLoading ? (
                            <Box sx={{ height: '100%' }}>
                              <GlossariesSynonymsSkeleton />
                            </Box>
                          ) : (
                            <Box sx={{ height: '100%', minHeight: 'calc(100vh - 350px)' }}>
                              <GlossariesSynonyms
                                relations={relations}
                                searchTerm={contentSearchTerm}
                                onSearchTermChange={setContentSearchTerm}
                                relationFilter={relationFilter}
                                onRelationFilterChange={setRelationFilter}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortByChange={setSortBy}
                                onSortOrderToggle={handleSortDirectionToggle}
                                onItemClick={handleResourceClick}
                              />
                            </Box>
                          )}
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={3}>
                            <AnnotationFilter
                              entry={displayEntry}
                              onFilteredEntryChange={setFilteredEntry}
                              sx={{}}
                              onCollapseAll={handleAnnotationCollapseAll}
                              onExpandAll={handleAnnotationExpandAll}
                            />
                            {annotationTab}
                        </CustomTabPanel>
                      </>
                    ) : getEntryType(entry.name, '/') === 'Entries' ? (
                      <>
                        <CustomTabPanel value={tabValue} index={1}>
                            <AnnotationFilter
                              entry={displayEntry}
                              onFilteredEntryChange={setFilteredEntry}
                              sx={{}}
                              onCollapseAll={handleAnnotationCollapseAll}
                              onExpandAll={handleAnnotationExpandAll}
                            />
                            {annotationTab}
                        </CustomTabPanel>
                      </>
                    ) : (
                      <>
                        <CustomTabPanel value={tabValue} index={1}>
                            <AnnotationFilter
                              entry={displayEntry}
                              onFilteredEntryChange={setFilteredEntry}
                              sx={{}}
                              onCollapseAll={handleAnnotationCollapseAll}
                              onExpandAll={handleAnnotationExpandAll}
                            />
                            
                            {annotationTab}
                        </CustomTabPanel>
                        <CustomTabPanel value={tabValue} index={2}>
                            {linkedTermsTab}
                        </CustomTabPanel>
                      </>
                    )}
          </div>
        </div>
      {/* Asset Preview Panel - Sticky Sidebar */}
      <Box
        sx={{
          width: isAssetPreviewOpen ? "clamp(300px, 22vw, 360px)" : "0px",
          minWidth: isAssetPreviewOpen ? "clamp(300px, 22vw, 360px)" : "0px",
          height: "calc(100vh - 180px)",
          position: "sticky",
          top: "100px",
          marginTop: "0px",
          borderRadius: "20px",
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
            // Close the preview panel
            setIsAssetPreviewOpen(false);
            setAssetPreviewData(null);
            // Navigate to the asset using handleResourceClick
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
      </>
      )}
    </div>
  )
}

export default ViewDetails;