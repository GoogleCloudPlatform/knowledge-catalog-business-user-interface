import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import NothingImage from "../../assets/images/nothing-image.png";

import { ArrowBack, KeyboardArrowUp, KeyboardArrowDown, Close, FormatListBulleted, DashboardOutlined, CategoryOutlined, ArticleOutlined, Inventory2Outlined } from "@mui/icons-material";
import { type GlossaryItem, type FilterChip, type FilterFieldType, FILTER_FIELD_LABELS } from "./GlossaryDataType";
import PreviewAnnotation from "../Annotation/PreviewAnnotation";
import AnnotationFilter from "../Annotation/AnnotationFilter";
import ResourcePreview from "../Common/ResourcePreview";
import { hasValidAnnotationData } from "../../utils/resourceUtils";
import { useDispatch, useSelector } from "react-redux";
import { type AppDispatch } from "../../app/store";
import {
  fetchGlossaries,
  fetchGlossaryChildren,
  fetchTermRelationships,
  fetchGlossaryEntryDetails,
  filterGlossaries,
  setActiveFilters,
  clearFilters,
  setGlossarySelectedId,
  setGlossaryExpandedIds,
  setGlossaryTabValue,
} from "../../features/glossaries/glossariesSlice";
import { getProjects } from "../../features/projects/projectsSlice";
import { setSideNavOpen } from "../../features/search/searchSlice";
import { useAuth } from "../../auth/AuthProvider";
import ShimmerLoader from "../Shimmer/ShimmerLoader";
import GlossariesPageSkeleton from "./GlossariesPageSkeleton";
import {
  extractGlossaryId,
  normalizeId,
  getAllAncestorIds,
  findItem,
  getBreadcrumbs,
  collectAllIds,
  collectAncestorIdsOfMatches,
} from "../../utils/glossaryUtils";
import { getIcon } from "./glossaryUIHelpers";
import { GLOSSARY_COLORS } from "../../constants/glossaryIcons";
import ThemedIconContainer from "../Common/ThemedIconContainer";
import SidebarItem from "./SidebarItem";
import GlossariesCategoriesTerms from "./GlossariesCategoriesTerms";
import GlossariesSynonyms from "./GlossariesSynonyms";
import GlossariesLinkedAssets from "./GlossariesLinkedAssets";
import FilterBar, { FilterBarChips } from "../Common/FilterBar";
import type { ActiveFilter } from "../Common/FilterBar";
import DetailPageOverview from "../DetailPageOverview/DetailPageOverview";

/**
 * Transforms a GlossaryItem into the entry format expected by DetailPageOverview.
 * Maps glossary-specific fields to the standard entry structure.
 */
const transformGlossaryToEntry = (item: GlossaryItem) => {
  // Build labels object from array (e.g., ["key:value"] -> { key: "value" })
  const labelsObject = (item.labels || []).reduce((acc, label) => {
    const [key, ...valueParts] = label.split(':');
    const value = valueParts.join(':');
    if (key && value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  // Build contacts array in the format expected by DetailPageOverview
  const contactsArray = (item.contacts || []).map(contact => ({
    structValue: {
      fields: {
        name: { stringValue: contact, kind: 'stringValue' },
        role: { stringValue: 'Contact', kind: 'stringValue' }
      }
    }
  }));

  return {
    name: item.id,
    entryType: `glossary/${item.type}`,
    fullyQualifiedName: item.id,
    createTime: null,
    updateTime: item.lastModified ? { seconds: item.lastModified } : null,
    entrySource: {
      description: item.description || '',
      system: item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : '',
      location: item.location || '-',
      resource: item.id,
      displayName: item.displayName,
      labels: labelsObject
    },
    aspects: {
      [`${item.type}.global.overview`]: {
        data: {
          fields: {
            content: {
              stringValue: item.longDescription || 'No Documentation Available',
              kind: 'stringValue'
            }
          }
        }
      },
      [`${item.type}.global.contacts`]: {
        data: {
          fields: {
            identities: {
              listValue: {
                values: contactsArray
              }
            }
          }
        }
      }
    }
  };
};

/**
 * @file Glossaries.tsx
 * @description
 * This component renders the main interface for the Business Glossary module,
 * utilizing a split-pane layout to manage and view hierarchical business data.
 *
 * It is a smart container deeply integrated with the Redux `glossaries` and `projects`
 * slices to handle asynchronous data fetching, caching, and state management.
 *
 * Key functionalities include:
 * 1.  Hierarchical Sidebar: Displays a searchable, recursive tree structure
 * (Glossary -> Category -> Term). It handles lazy loading of children nodes
 * upon expansion to optimize performance.
 * 2.  Polymorphic Detail View: The main content area adapts based on the
 * selected item type (Glossary, Category, or Term), rendering specific tabs
 * such as Overview, Categories, Terms, Linked Assets, Synonyms, and Aspects.
 * 3.  Linked Asset Management: For 'Term' items, it integrates the
 * `ResourceViewer` and `ResourcePreview` components to display and filter
 * associated data assets from the catalog.
 * 4.  Search & Filtering: Implements local filtering for content lists
 * (Categories/Terms) and specific relationship filtering (Synonyms/Related),
 * along with global search capabilities within the sidebar.
 * 5.  Navigation Handling: Manages breadcrumb navigation, automatic tree
 * expansion based on selection, and deep-linking logic via URL or internal IDs.
 *
 * @returns {React.ReactElement} A React element rendering the complete Business
 * Glossaries page layout including the sidebar, main content tabs, and asset preview panels.
 */

const LABEL_TO_FIELD: Record<string, FilterFieldType> = {
  'Name': 'name',
  'Parent': 'parent',
  'Synonym': 'synonym',
  'Contact': 'contact',
  'Labels': 'labels',
  'Aspect': 'aspect',
};

const chipToActiveFilter = (chip: FilterChip): ActiveFilter => ({
  id: chip.id,
  property: chip.showFieldLabel === false ? '' : FILTER_FIELD_LABELS[chip.field],
  values: [chip.value],
  isOr: chip.connector === 'OR',
});

const activeFilterToChip = (filter: ActiveFilter): FilterChip => ({
  id: filter.id || `filter-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  field: LABEL_TO_FIELD[filter.property] || 'name',
  value: filter.values[0] || '',
  displayLabel: filter.property ? `${filter.property}: ${filter.values[0]}` : filter.values[0],
  connector: filter.isOr ? 'OR' : undefined,
  showFieldLabel: !!filter.property,
});

const Glossaries = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const {
    glossaryItems,
    status,
    filteredTreeItems,
    filterStatus,
    activeFilters,
    accessDeniedItemId,
  } = useSelector((state: any) => state.glossaries);
  const projectsLoaded = useSelector((state: any) => state.projects.isloaded);

  const reduxSelectedId = useSelector((state: any) => state.glossaries.selectedId) as string;
  const reduxExpandedIds = useSelector((state: any) => state.glossaries.expandedIds) as string[];
  const reduxTabValue = useSelector((state: any) => state.glossaries.tabValue) as number;

  const [selectedId, _setSelectedId] = useState<string>(reduxSelectedId);
  const [expandedIds, _setExpandedIds] = useState<Set<string>>(new Set(reduxExpandedIds));
  const [tabValue, _setTabValue] = useState(reduxTabValue);

  // Stable wrapper functions that sync local state to Redux
  const setSelectedId = useCallback((id: string) => {
    _setSelectedId(id);
    dispatch(setGlossarySelectedId(id));
  }, [dispatch]);
  const setExpandedIds = useCallback((ids: Set<string>) => {
    _setExpandedIds(ids);
    dispatch(setGlossaryExpandedIds(Array.from(ids)));
  }, [dispatch]);
  const setTabValue = useCallback((val: number) => {
    _setTabValue(val);
    dispatch(setGlossaryTabValue(val));
  }, [dispatch]);
  const [glossaryFilterText, setGlossaryFilterText] = useState('');

  const handleFilterBarChange = useCallback((newFilters: ActiveFilter[]) => {
    const chips = newFilters.map(activeFilterToChip);
    dispatch(setActiveFilters(chips));
    if (chips.length > 0 && user?.token) {
      dispatch(filterGlossaries({ filters: chips, id_token: user.token }));
    } else {
      dispatch(clearFilters());
    }
  }, [dispatch, user?.token]);

  const handleRemoveFilterChip = useCallback((filter: ActiveFilter) => {
    const remaining = activeFilters.filter((f: FilterChip) => f.id !== filter.id);
    dispatch(setActiveFilters(remaining));
    if (remaining.length > 0 && user?.token) {
      dispatch(filterGlossaries({ filters: remaining, id_token: user.token }));
    } else {
      dispatch(clearFilters());
    }
  }, [dispatch, activeFilters, user?.token]);

  const handleRemoveOrConnector = useCallback((filter: ActiveFilter) => {
    const updated = activeFilters.map((f: FilterChip) =>
      f.id === filter.id ? { ...f, connector: undefined } : f
    );
    dispatch(setActiveFilters(updated));
    if (updated.length > 0 && user?.token) {
      dispatch(filterGlossaries({ filters: updated, id_token: user.token }));
    }
  }, [dispatch, activeFilters, user?.token]);

  const [contentSearchTerm, setContentSearchTerm] = useState("");
  const [relationFilter, setRelationFilter] = useState<
    "all" | "synonym" | "related"
  >("all");
  const [filteredAnnotationEntry, setFilteredAnnotationEntry] =
    useState<any>(null);
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(
    new Set()
  );
  const [assetPreviewData, setAssetPreviewData] = useState<any | null>(null);
  const [isAssetPreviewOpen, setIsAssetPreviewOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortBy, setSortBy] = useState<"name" | "lastModified">("lastModified");
  const fetchedParentIds = React.useRef(new Set<string>(
    glossaryItems
      .filter((item: GlossaryItem) => item.children && item.children.length > 0)
      .map((item: GlossaryItem) => item.id)
  ));
  const manualSelectionId = React.useRef<string | null>(null);
  const wasSearching = React.useRef(false);
  const initialFilterExpansionSet = React.useRef(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isSmallScreen = useMediaQuery('(max-width: 1280px)');

  // Use filtered tree when filters are active, otherwise use all glossary items
  const displayGlossaries = useMemo(() => {
    if (activeFilters.length > 0) {
      return filteredTreeItems; // Return filtered items (empty or not) when filters are active
    }
    return glossaryItems;
  }, [activeFilters, filteredTreeItems, glossaryItems]);

  useEffect(() => {
    if (!projectsLoaded && user?.token) {
      dispatch(getProjects({ id_token: user?.token }));
    }
  }, [dispatch, projectsLoaded, user?.token]);

  useEffect(() => {
    if (glossaryItems.length === 0 && status === "idle" && user?.token) {
      dispatch(fetchGlossaries({ id_token: user?.token }));
    }
  }, [dispatch, glossaryItems.length, status, user?.token]);

  useEffect(() => {
    if (displayGlossaries.length > 0 && !selectedId) {
      setSelectedId(displayGlossaries[0].id);
    }
  }, [displayGlossaries, selectedId]);

  useEffect(() => {
    if (glossaryItems.length > 0 && !selectedId) {
      const firstId = glossaryItems[0].id;
      setSelectedId(firstId);
      // Also fetch details for the first item immediately
      setIsContentLoading(true);
      dispatch(fetchGlossaryEntryDetails({ entryName: firstId, id_token: user?.token }))
        .unwrap()
        .finally(() => setIsContentLoading(false));
    }
  }, [glossaryItems, selectedId, dispatch, user?.token]);

  // Reset sidebar when navigating away from Glossaries
  useEffect(() => {
    return () => {
      dispatch(setSideNavOpen(true));
    };
  }, [dispatch]);

  // --- Sort Handlers ---
  const handleSortDirectionToggle = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const sortItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === "name") {
        const nameA = a.displayName.toLowerCase();
        const nameB = b.displayName.toLowerCase();
        if (sortOrder === "asc") return nameA.localeCompare(nameB);
        return nameB.localeCompare(nameA);
      } else {
        // Last Modified (Number)
        const dateA = a.lastModified || 0;
        const dateB = b.lastModified || 0;
        if (sortOrder === "asc") return dateA - dateB; // Oldest first
        return dateB - dateA; // Newest first
      }
    });
  };

  // filteredGlossaries is now the same as displayGlossaries since server-side filtering is used
  const filteredGlossaries = displayGlossaries;

  const getAllTerms = (node: GlossaryItem): GlossaryItem[] => {
    let allTerms: GlossaryItem[] = [];
    if (node.children) {
      node.children.forEach((child) => {
        if (child.type === "term") {
          allTerms.push(child);
        }
        allTerms = [...allTerms, ...getAllTerms(child)];
      });
    }
    return allTerms;
  };

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return findItem(glossaryItems, selectedId);
  }, [selectedId, glossaryItems]);

  // Reset description expanded state when selected item changes
  useEffect(() => {
    setDescriptionExpanded(false);
  }, [selectedId]);


  const breadcrumbs = useMemo(() => {
    if (!selectedId) return [];
    return getBreadcrumbs(glossaryItems, selectedId) || []; // Use glossaryItems
  }, [selectedId, glossaryItems]);

  const categories =
    selectedItem?.children?.filter((c) => c.type === "category") || [];
  const terms = useMemo(
    () => (selectedItem ? getAllTerms(selectedItem) : []),
    [selectedItem]
  );
  const relations = useMemo(
    () => selectedItem?.relations || [],
    [selectedItem]
  );
  const isTerm = selectedItem?.type === "term";

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setContentSearchTerm("");
  };

  const handleToggle = (id: string) => {
    const newExpanded = new Set(expandedIds);
    const item = findItem(displayGlossaries, id);

    if (!newExpanded.has(id)) {
      // Opening logic
      const isRootGlossary = glossaryItems.some(
        (g: GlossaryItem) => g.id === id
      );

      if (isRootGlossary && activeFilters.length === 0) {
        // Collapse all other root glossaries
        glossaryItems.forEach((g: GlossaryItem) => {
          if (g.id !== id && newExpanded.has(g.id)) {
            newExpanded.delete(g.id);
          }
        });
      }

      // If expanding and no children, fetch them
      if (item && (!item.children || item.children.length === 0)) {
        dispatch(
          fetchGlossaryChildren({
            parentId: id,
            id_token: user?.token,
          })
        );
      }
      newExpanded.add(id);
    } else {
      // Closing logic
      newExpanded.delete(id);

      if (item && item.children) {
        const descendantIds = collectAllIds(item.children);
        descendantIds.forEach((childId) => newExpanded.delete(childId));
      }
    }
    setExpandedIds(newExpanded);
  };

  const handleNavigate = async (rawTargetId: string) => {
    // 0. Normalize ID to ensure it matches the Sidebar Tree format (Resource Name)
    const targetId = normalizeId(rawTargetId);

    // 1. Try to find the item in the current tree
    const targetItem = findItem(displayGlossaries, targetId);

    // 2. If not found, it might be in a collapsed glossary we haven't fetched yet
    if (!targetItem) {
      const parentGlossaryId = extractGlossaryId(targetId);

      if (parentGlossaryId) {
        setIsSidebarLoading(true);
        try {
          // Fetch the children of the parent glossary
          await dispatch(
            fetchGlossaryChildren({
              parentId: parentGlossaryId,
              id_token: user?.token,
            })
          ).unwrap();

          const newExpanded = new Set(expandedIds);
          newExpanded.add(parentGlossaryId);
          setExpandedIds(newExpanded);
        } catch (error) {
          console.error("Failed to load parent glossary children", error);
        } finally {
          setIsSidebarLoading(false);
        }
      }
    }

    // 3. Proceed with standard navigation logic
    setSelectedId(targetId);
    setTabValue(0);
    setContentSearchTerm("");

    setIsContentLoading(true);

    // Fetch entry details
    dispatch(
      fetchGlossaryEntryDetails({
        entryName: targetId,
        id_token: user?.token,
      })
    )
      .unwrap()
      .catch((err) => {
        console.warn(
          "Failed to fetch details for navigation target",
          targetId,
          err
        );
      })
      .finally(() => {
        setIsContentLoading(false);
      });

    // If it's a TERM, fetch relationships
    if (targetId.includes("/terms/")) {
      dispatch(
        fetchTermRelationships({
          termId: targetId,
          id_token: user?.token,
        })
      );
    }
  };


  useEffect(() => {
    if (glossaryItems.length > 0 && user?.token) {
      glossaryItems.forEach((item: GlossaryItem, index: number) => {
        // Only target top-level Glossaries
        if (item.type === "glossary") {
          // Check if we haven't fetched this one yet
          if (!fetchedParentIds.current.has(item.id)) {
            // Mark as fetched immediately to prevent re-entry
            fetchedParentIds.current.add(item.id);

            // If children are empty, fetch them
            if (!item.children || item.children.length === 0) {
              // Only trigger loading state for the first item to control sidebar shimmer
              if (index === 0) setIsSidebarLoading(true);

              dispatch(
                fetchGlossaryChildren({
                  parentId: item.id,
                  id_token: user?.token,
                })
              )
                .unwrap() // Unwrap allows us to chain .finally/then on the thunk result
                .finally(() => {
                  if (index === 0) setIsSidebarLoading(false);
                });
            }
          }
        }
      });
    }
  }, [glossaryItems, dispatch, user?.token]);

  // --- Filter & Sort ---
  const filteredCategories = useMemo(() => {
    return sortItems([...categories]);
  }, [categories, sortOrder]);

  const filteredTerms = useMemo(() => {
    return sortItems([...terms]);
  }, [terms, sortOrder]);

  const hasVisibleAspects = useMemo(() => {
    const aspects = selectedItem?.aspects;
    if (!aspects) return false;

    return Object.keys(aspects).some((key) => {
      const isSchema = key.endsWith(".global.schema");
      const isOverview = key.endsWith(".global.overview");
      const isContacts = key.endsWith(".global.contacts");
      const isUsage = key.endsWith(".global.usage");
      const isGlossaryTermAspect = key.endsWith(".global.glossary-term-aspect");

      if (
        isSchema ||
        isOverview ||
        isContacts ||
        isUsage ||
        isGlossaryTermAspect
      ) {
        return false;
      }

      return hasValidAnnotationData(aspects[key]);
    });
  }, [selectedItem]);

  const handleAnnotationCollapseAll = () => {
    setExpandedAnnotations(new Set());
  };

  const handleAnnotationExpandAll = () => {
  if (selectedItem?.aspects) {
    setExpandedAnnotations(new Set(Object.keys(selectedItem.aspects)));
  }
};

  useEffect(() => {
    setAssetPreviewData(null);
    setIsAssetPreviewOpen(false);
  }, [selectedId]);

  // Expand only ancestors of matched items when filters are active (not the matched items themselves)
  useEffect(() => {
    if (activeFilters.length > 0) {
      wasSearching.current = true;
      // Only set initial expansion when filters are first applied, not on every filteredGlossaries change
      if (!initialFilterExpansionSet.current && filteredGlossaries.length > 0) {
        const ancestorIds = collectAncestorIdsOfMatches(filteredGlossaries);
        setExpandedIds(new Set(ancestorIds));
        initialFilterExpansionSet.current = true;
      }
    } else if (wasSearching.current) {
      // Filters were just cleared - collapse all except path to selected item
      wasSearching.current = false;
      initialFilterExpansionSet.current = false; // Reset for next filter session
      if (selectedId) {
        const ancestors = getAllAncestorIds(glossaryItems, selectedId);
        const newExpanded = new Set(ancestors);
        const currentItem = findItem(glossaryItems, selectedId);
        if (currentItem && (currentItem.type === "glossary" || currentItem.type === "category")) {
          newExpanded.add(selectedId);
        }
        setExpandedIds(newExpanded);
      } else {
        setExpandedIds(new Set());
      }
    }
  }, [activeFilters, filteredGlossaries, selectedId, glossaryItems]);

  useEffect(() => {
    if (activeFilters.length === 0 && selectedId) {
      if (manualSelectionId.current === selectedId && !wasSearching.current) {
        return;
      }

      wasSearching.current = false;
      const ancestors = getAllAncestorIds(glossaryItems, selectedId);
      const newExpanded = new Set(ancestors);

      const currentItem = findItem(glossaryItems, selectedId);
      if (
        currentItem &&
        (currentItem.type === "glossary" || currentItem.type === "category")
      ) {
        newExpanded.add(selectedId);
      }
      setExpandedIds(newExpanded);
    }
  }, [selectedId, glossaryItems, activeFilters]);

  const shouldShowSidebarShimmer =
    status === "loading" ||
    isSidebarLoading ||
    filterStatus === "loading" ||
    (glossaryItems.length > 0 &&
      glossaryItems[0].type === "glossary" &&
      (!glossaryItems[0].children || glossaryItems[0].children.length === 0) &&
      !fetchedParentIds.current.has(glossaryItems[0].id));

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        px: 0,
        pb: 0,
        pt: 0,
        backgroundColor: "#f8fafc",
        height: "calc(100vh - 72px)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR CARD - Fixed Position */}
      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          left: isSidebarOpen ? "96px" : "-252px",
          top: "65px", 
          width: "252px",
          height: "calc(100vh - 72px)", 
          backgroundColor: "#F4F5FA",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          overflowY: "auto",
          scrollbarWidth: "none",
          borderRadius: 0,
          zIndex: 1100,
          transition: "left 0.3s ease-in-out",
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          position: "sticky",
          top: 0,
          zIndex: 1,
          backgroundColor: "#F4F5FA",
          padding: "20px 20px 0 20px",
          boxSizing: "border-box",
        }}>
          <Typography sx={{
            fontWeight: 500,
            fontSize: "16px",
            lineHeight: "24px",
            color: "#0C1226",
            fontFamily: '"Google Sans", sans-serif',
          }}>Business Glossaries</Typography>
        </div>
        <Box sx={{ pt: '12px', pb: '8px', px: '20px' }}>
          <FilterBar
            filterText={glossaryFilterText}
            onFilterTextChange={setGlossaryFilterText}
            propertyNames={[
              { name: 'Name', mode: 'text' as const },
              { name: 'Parent', mode: 'text' as const },
              { name: 'Synonym', mode: 'text' as const },
              { name: 'Contact', mode: 'text' as const },
              { name: 'Labels', mode: 'text' as const },
              { name: 'Aspect', mode: 'text' as const },
            ]}
            activeFilters={activeFilters.map(chipToActiveFilter)}
            onActiveFiltersChange={handleFilterBarChange}
            defaultProperty="Name"
            placeholder="Filter Glossaries"
            marginLeft="0px"
            isPreview
            hideChips
            showTextInFilterMenu
          />
          <FilterBarChips
            activeFilters={activeFilters.map(chipToActiveFilter)}
            onRemoveFilter={handleRemoveFilterChip}
            onRemoveOrConnector={handleRemoveOrConnector}
            marginLeft="0px"
          />
        </Box>
        <List sx={{ overflowY: "auto", flex: 1, pt: 0, px: 0, scrollbarWidth: "none" }}>
          {shouldShowSidebarShimmer ? (
            <Box sx={{ px: 2, pt: 1 }}>
              <ShimmerLoader count={6} type="simple-list" />
            </Box>
          ) : (
            <>
              {filteredGlossaries.map((item: GlossaryItem) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={(id) => {
                    manualSelectionId.current = id;
                    handleNavigate(id);
                    handleToggle(id);
                  }}
                  onToggle={handleToggle}
                />
              ))}
              {filteredGlossaries.length === 0 && (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="#0C1226CC">
                    No results found
                  </Typography>
                </Box>
              )}
            </>
          )}
        </List>
      </Paper>

      {/* MAIN CONTENT CARD - Shifted right for fixed sidebar */}
      <Paper
        elevation={0}
        sx={{
          marginLeft: isSidebarOpen ? "252px" : "0px",
          width: isSidebarOpen ? "calc(100% - 252px)" : "100%",
          height: "calc(100vh - 72px)",
          borderRadius: "0px",
          backgroundColor: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          transition: "margin-left 0.3s ease-in-out, width 0.3s ease-in-out",
        }}
      >
        {(status === "loading" && !selectedItem) || isContentLoading ? (
          <GlossariesPageSkeleton />
        ) : (
        <>
        {/* HEADER SECTION */}
        <Box
          sx={{
            flexShrink: 0,
          }}
        >
          {/* Sections Toggle Button */}
          <Box sx={{ padding: "12px 20px 0px" }}>
            <span
              style={{
                boxSizing: "border-box",
                display: "inline-flex",
                flexDirection: "row",
                alignItems: "center",
                padding: "8px 13px",
                gap: "8px",
                height: "32px",
                border: isSidebarOpen ? "none" : "1px solid #022FCD",
                borderRadius: "59px",
                background: isSidebarOpen ? "#022FCD" : "none",
                color: isSidebarOpen ? "#EDF2FC" : "#022FCD",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newState = !isSidebarOpen;
                setIsSidebarOpen(newState);
                if (isSmallScreen && newState) {
                  setAssetPreviewData(null);
                  setIsAssetPreviewOpen(false);
                }
              }}
            >
              {isSidebarOpen ? <Close style={{ width: "16px", height: "16px", flexShrink: 0 }} /> : <FormatListBulleted style={{ width: "16px", height: "16px", flexShrink: 0 }} />}
              <span style={{
                fontFamily: '"Google Sans", sans-serif',
                fontWeight: 500,
                fontSize: "12px",
                lineHeight: "16px",
                letterSpacing: "0.1px",
                whiteSpace: "nowrap",
              }}>Sections</span>
            </span>
          </Box>

          {/* Header Card (Breadcrumbs, Title, Description) */}
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
              flexGrow: 0,
            }}
          >
            {/* Breadcrumbs/Title Row */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                width: "100%",
                minHeight: "40px",
              }}
            >
              {(
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {breadcrumbs.length > 1 && (
                      <IconButton
                        sx={{ p: '4px', width: '40px', height: '40px', borderRadius: '50%', color: '#1F1F1F', transition: 'background-color 0.2s', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                        onClick={() => {
                          setSelectedId(breadcrumbs[breadcrumbs.length - 2].id);
                          setTabValue(0);
                        }}
                      >
                        <ArrowBack style={{ fontSize: "24px" }} />
                      </IconButton>
                    )}
                    <ThemedIconContainer iconColor={GLOSSARY_COLORS[selectedItem?.type || "term"]}>
                      {getIcon(selectedItem?.type || "term", "medium")}
                    </ThemedIconContainer>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                      <Tooltip title={selectedItem?.displayName || ''} arrow placement="top">
                        <label style={{
                          fontFamily: '"Google Sans", sans-serif',
                              color: "#1F1F1F",
                              fontSize: "24px",
                              fontWeight: "500",
                              lineHeight: "32px",
                        }}>
                          {selectedItem?.displayName}
                        </label>
                      </Tooltip>
                    </div>
                  </div>
                </>
              )}
            </Box>

            {/* Description Section */}
            {selectedItem && (
              <div style={{ width: "100%" }}>
                {selectedItem.description ? (
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
                      {(selectedItem.description).trim()}
                    </div>
                    {(selectedItem.description).trim().length > 600 && (
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
                    No description provided for this glossary item.
                  </div>
                )}
              </div>
            )}
          </Box>

          {/* Tabs */}
          {(selectedItem && !selectedItem.aspects && accessDeniedItemId !== selectedId) ||
          (selectedItem?.type === "term" && !selectedItem.relations && accessDeniedItemId !== selectedId) ? (
            // Tabs Shimmer: Horizontal row of placeholders to prevent layout jump
            <Box
              sx={{
                paddingBottom: "8px",
                paddingLeft: "36px",
                display: "flex",
                gap: "40px",
              }}
            >
              <Box sx={{ width: "100px" }}>
                <ShimmerLoader count={1} type="title" />
              </Box>
            </Box>
          ) : (
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
                  gap: "4px",
                  "&.Mui-selected": {
                    color: "#022FCD",
                  },
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
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons={false}
                aria-label="glossary tabs"
                TabIndicatorProps={{
                  children: <span className="indicator" />,
                }}
              >
                {[
                  { label: "Overview", hide: false, icon: <DashboardOutlined sx={{ fontSize: "20px" }} /> },
                  { label: "Categories", hide: isTerm, icon: <CategoryOutlined sx={{ fontSize: "20px" }} /> },
                  { label: "Terms", hide: isTerm, icon: <ArticleOutlined sx={{ fontSize: "20px" }} /> },
                  { label: "Linked Assets", hide: !isTerm, icon: <Inventory2Outlined sx={{ fontSize: "20px" }} />},
                  { 
                    label: "Synonyms & Related Terms", 
                    hide: !isTerm, 
                    icon: <span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>match_word</span> 
                  },
                  { 
                    label: "Aspects", 
                    hide: !isTerm, 
                    icon: <span className="material-symbols-outlined" style={{ fontSize: "20px", display: "inline-block", verticalAlign: "middle" }}>newsmode</span> 
                  },
                ].map((tab, index) => {
                  if (tab.hide) return null;
                  return (
                    <Tab
                      key={index}
                      value={index}
                      label={tab.label}
                      icon={tab.icon}
                      iconPosition="start"
                    />
                  );
                })}
              </Tabs>
            </Box>
          )}
          <Box sx={{ mx: "20px", borderBottom: "1px solid #DADCE0" }} />
        </Box>

        {/* CONTENT BODY */}
        {selectedItem ? (
          <Box sx={{ p: "0px 20px 20px 20px", pt: tabValue !== 0 ? "20px" : "0px", overflowY: "hidden", flex: 1 }}>
            {tabValue === 0 && (
              <Box
                sx={{
                  height: "100%",
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                <DetailPageOverview
                  entry={transformGlossaryToEntry(selectedItem)}
                  css={{ width: "100%" }}
                  accessDenied={accessDeniedItemId === selectedId}
                />
              </Box>
            )}

            {!isTerm && tabValue === 1 && (
              <GlossariesCategoriesTerms
                mode="categories"
                items={filteredCategories}
                searchTerm={contentSearchTerm}
                onSearchTermChange={setContentSearchTerm}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={setSortBy}
                onSortOrderToggle={handleSortDirectionToggle}
                onItemClick={handleNavigate}
              />
            )}

            {!isTerm && tabValue === 2 && (
              <GlossariesCategoriesTerms
                mode="terms"
                items={filteredTerms}
                searchTerm={contentSearchTerm}
                onSearchTermChange={setContentSearchTerm}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={setSortBy}
                onSortOrderToggle={handleSortDirectionToggle}
                onItemClick={handleNavigate}
              />
            )}
            {/* TAB 3: LINKED ASSETS */}
            {isTerm && tabValue === 3 && (
              <GlossariesLinkedAssets
                linkedAssets={selectedItem.linkedAssets || []}
                searchTerm={contentSearchTerm}
                onSearchTermChange={setContentSearchTerm}
                idToken={user?.token || ""}
                onAssetPreviewChange={(data) => {
                  setAssetPreviewData(data);
                  setIsAssetPreviewOpen(!!data);
                  if (isSmallScreen && data) {
                    dispatch(setSideNavOpen(false));
                  }
                }}
                isSidebarOpen={isSidebarOpen}
                onSidebarToggle={(open) => dispatch(setSideNavOpen(open))}
              />
            )}
            {isTerm && tabValue === 4 && (
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
                onItemClick={handleNavigate}
              />
            )}
            {/* TAB 5: ASPECTS */}
            {isTerm && tabValue === 5 && (
              <Box sx={{ height: "100%" }}>
                {hasVisibleAspects ? (
                  <Box
                    sx={{
                      overflow: "hidden",
                      maxHeight: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Aspect Filter Component */}
                    <Box sx={{ flexShrink: 0 }}>
                      <AnnotationFilter
                        entry={selectedItem}
                        onFilteredEntryChange={setFilteredAnnotationEntry}
                        onCollapseAll={handleAnnotationCollapseAll}
                        onExpandAll={handleAnnotationExpandAll}
                      />
                    </Box>

                    {/* Aspect List Component */}
                    <Box sx={{ 
                      flex: 1, 
                      overflowY: "auto", 
                      minHeight: 0,
                      border: '1px solid #DADCE0',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      overflow: 'hidden',
                      marginTop: '12px'
                    }}>
                      <PreviewAnnotation
                        entry={filteredAnnotationEntry || selectedItem}
                        css={{
                          border: "none",
                          margin: 0,
                          background: "transparent",
                          borderRadius: "0px",
                          height: "auto",
                          overflow: "visible",
                        }}
                        expandedItems={expandedAnnotations}
                        setExpandedItems={setExpandedAnnotations}
                        isGlossary={true}
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      opacity: 1,
                      gap: 2,
                    }}
                  >
                    <Typography variant="body1" color="#0C1226CC">
                      No aspects available for this term
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ p: 5, textAlign: "center", opacity: 1 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <img
                src={NothingImage}
                alt="Select an item"
                style={{ width: "200px", marginBottom: "16px" }}
              />
            </Box>
          </Box>
        )}
        </>
        )}
      </Paper>
      {/* 3. RESOURCE PREVIEW CARD */}
      {isTerm && tabValue === 3 && (
        <Paper
          elevation={0}
          sx={{
            width: isAssetPreviewOpen ? "clamp(300px, 22vw, 360px)" : "0px",
            minWidth: isAssetPreviewOpen ? "clamp(300px, 22vw, 360px)" : "0px",

            height: "calc(100vh - 100px)",
            borderRadius: "0px",
            backgroundColor: "transparent",
            border: "transparent",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
            transition:
              "width 0.3s ease-in-out, min-width 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-left 0.3s ease-in-out",
            marginLeft: isAssetPreviewOpen ? "2px" : 0,
            marginRight: isAssetPreviewOpen ? "16px" : 0,
            opacity: isAssetPreviewOpen ? 1 : 0,
            borderWidth: isAssetPreviewOpen ? undefined : 0,
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
            id_token={user?.token || ""}
            isGlossary={true}
          />
        </Paper>
      )}
    </Box>
  );
};

export default Glossaries;
