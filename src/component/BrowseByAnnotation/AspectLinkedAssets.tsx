import React, { useState, useMemo, useEffect } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { Close, Tune } from "@mui/icons-material";
import ResourceViewer from "../Common/ResourceViewer";
import FilterDropdown from "../Filter/FilterDropDown";
import { typeAliases } from "../../utils/resourceUtils";
import AspectLinkedAssetsSkeleton from "./AspectLinkedAssetsSkeleton";
import FilterBar, { FilterBarChips } from '../Common/FilterBar';
import type { ActiveFilter as FilterBarActiveFilter } from '../Common/FilterBar';
import { formatAspectValue } from '../../utils/aspectValueUtils';

interface AspectLinkedAssetsProps {
  linkedAssets: any[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  idToken: string;
  isPreviewOpen?: boolean;
  onAssetPreviewChange: (data: any | null) => void;
  resourcesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  isSidebarOpen?: boolean;
  onSidebarToggle?: (open: boolean) => void;
  // The value of the aspect field currently being browsed, per entry name.
  // Only ever passed here (Browse by Annotations) - other ResourceViewer call
  // sites (Search, Data Products) never pass it, so their table is unaffected.
  aspectValueColumn?: { label: string; valuesByEntry: Record<string, unknown> };
  // The currently-browsed field's Dataplex schema type ('string' | 'enum' |
  // ...) and, when it's an enum, its fixed set of allowed values - drives
  // whether the "Aspect Value" filter below is free-text or a category
  // picker (which still allows typing). Kept separate from aspectValueColumn
  // (rather than folded into it) so ResourceViewer/SearchTableView/
  // SearchEntriesCard, which also type that prop, need no changes.
  aspectFieldType?: string;
  aspectEnumValues?: string[];
}

const AspectLinkedAssets: React.FC<AspectLinkedAssetsProps> = ({
  linkedAssets,
  searchTerm,
  onSearchTermChange,
  idToken,
  isPreviewOpen,
  onAssetPreviewChange,
  resourcesStatus,
  isSidebarOpen,
  onSidebarToggle,
  aspectValueColumn,
  aspectFieldType,
  aspectEnumValues,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [filterBarActiveFilters, setFilterBarActiveFilters] = useState<FilterBarActiveFilter[]>([]);
  const [assetViewMode, setAssetViewMode] = useState<"list" | "table">("list");
  const [assetPageSize, setAssetPageSize] = useState(20);
  const [assetPreviewData, setAssetPreviewData] = useState<any | null>(null);
  const isSmallScreen = useMediaQuery('(max-width: 1280px)');

  const isEnumAspectValue = aspectFieldType === 'enum' && Array.isArray(aspectEnumValues) && aspectEnumValues.length > 0;
  // Booleans aren't Dataplex enums (no schema-provided enumValues), but have
  // exactly two known values - same category-picker-with-typing treatment as
  // enum, just with a hardcoded options list instead of one read from the
  // aspect type's schema. Every other field type (string, int, datetime, ...)
  // is unaffected and stays plain free-text, as before.
  const isBooleanAspectValue = aspectFieldType === 'bool' || aspectFieldType === 'boolean';
  const isCategoryAspectValue = isEnumAspectValue || isBooleanAspectValue;
  const aspectCategoryValues = isBooleanAspectValue ? ['true', 'false'] : (aspectEnumValues ?? []);

  useEffect(() => {
    if (isPreviewOpen === false) {
      setAssetPreviewData(null);
    }
  }, [isPreviewOpen]);

  // The "Aspect Value" filter is specific to whichever sub-type/field is
  // currently being browsed - switching to a different one makes any active
  // value filter meaningless (e.g. "HIGH" selected under one field has no
  // relation to a different field's values), so clear it rather than let it
  // silently and confusingly carry over. Name/Description filters are
  // unrelated to the selected field and are intentionally left alone.
  useEffect(() => {
    setFilterBarActiveFilters((prev) => prev.filter((f) => f.property !== 'Aspect Value'));
  }, [aspectValueColumn?.label]);

  useEffect(() => {
    if (isSmallScreen && isSidebarOpen) {
      setIsFilterOpen(false);
    }
  }, [isSmallScreen, isSidebarOpen]);

  const filteredLinkedAssets = useMemo(() => {
    let assets = linkedAssets || [];

    // Apply FilterBar active filters
    if (filterBarActiveFilters.length > 0) {
      assets = assets.filter((asset: any) => {
        const name = asset.dataplexEntry?.entrySource?.displayName || "";
        const description = asset.dataplexEntry?.entrySource?.description || "";
        // Formatted the same way it's displayed (column/chip), so the filter
        // always matches exactly what's shown on screen - including '—' for
        // an entry whose value hasn't loaded yet or isn't set, which simply
        // won't match a real search term.
        const aspectValue = aspectValueColumn
          ? formatAspectValue(aspectValueColumn.valuesByEntry[asset.dataplexEntry?.name])
          : "";

        const filterGroups: FilterBarActiveFilter[][] = [];
        let currentGroup: FilterBarActiveFilter[] = [];
        filterBarActiveFilters.forEach((filter) => {
          if (filter.isOr && currentGroup.length > 0) {
            filterGroups.push(currentGroup);
            currentGroup = [filter];
          } else {
            currentGroup.push(filter);
          }
        });
        if (currentGroup.length > 0) filterGroups.push(currentGroup);

        return filterGroups.some(group =>
          group.every(filter =>
            filter.values.some(value => {
              const lower = value.toLowerCase();
              switch (filter.property) {
                case 'Name': return name.toLowerCase().includes(lower);
                case 'Description': return description.toLowerCase().includes(lower);
                // Same substring match as every other property here - a
                // clicked enum option matches exactly (values don't overlap
                // in practice), and free-typed partial text still works.
                case 'Aspect Value': return aspectValue.toLowerCase().includes(lower);
                default: return name.toLowerCase().includes(lower) || description.toLowerCase().includes(lower);
              }
            })
          )
        );
      });
    }

    if (activeFilters.length > 0) {
      const systemFilters = activeFilters.filter(
        (f: any) => f.type === "system"
      );
      const typeFilters = activeFilters.filter(
        (f: any) => f.type === "typeAliases"
      );
      const projectFilters = activeFilters.filter(
        (f: any) => f.type === "project"
      );
      const aspectFilters = activeFilters.filter(
        (f: any) => f.type === "aspectType"
      );

      assets = assets.filter((asset: any) => {
        // Product Filter
        if (systemFilters.length > 0) {
          const system =
            asset.dataplexEntry?.entrySource?.system?.toLowerCase() || "";
          // "Dataplex" and "Dataplex Universal Catalog" are both surfaced by the API
          // as the "Knowledge Catalog" product (matches resourcesSlice.ts's query-side mapping).
          const PRODUCT_API_NAMES: Record<string, string[]> = { "Knowledge Catalog": ["Dataplex Universal Catalog", "Dataplex"] };
          const match = systemFilters.some((filter: any) => {
            if (filter.name === "Others") return true;
            const apiNames = PRODUCT_API_NAMES[filter.name] || [filter.name];
            return apiNames.some((apiName) => system === apiName.toLowerCase());
          });
          if (!match) return false;
        }

        // Asset Type Filter
        if (typeFilters.length > 0) {
          const entryTypeStr =
            asset.dataplexEntry?.entryType?.toLowerCase() || "";
          const match = typeFilters.some((filter: any) => {
            const filterName = filter.name.toLowerCase();
            const hyphenatedName = filterName.replace(/\s+/g, "-");
            return (
              entryTypeStr.includes(hyphenatedName) ||
              entryTypeStr.includes(filterName)
            );
          });
          if (!match) return false;
        }

        // Project Filter
        if (projectFilters.length > 0) {
          const resourcePath = asset.dataplexEntry?.entrySource?.resource || "";
          const linkedPath = asset.linkedResource || "";
          const match = projectFilters.some((filter: any) => {
            if (filter.name === "Others") return true;
            return (
              resourcePath.includes(filter.name) ||
              linkedPath.includes(filter.name)
            );
          });
          if (!match) return false;
        }

        // Aspect Filter
        if (aspectFilters.length > 0) {
          const aspects = asset.dataplexEntry?.aspects || {};
          const match = aspectFilters.some((filter: any) =>
            Object.keys(aspects).some((key) =>
              key.toLowerCase().includes(filter.name.toLowerCase())
            )
          );
          if (!match) return false;
        }

        return true;
      });
    }

    return assets;
  }, [linkedAssets, filterBarActiveFilters, activeFilters, aspectValueColumn]);

  const handleRemoveChip = (filter: FilterBarActiveFilter) => {
    if (filter.id) {
      setFilterBarActiveFilters(prev => prev.filter(f => f.id !== filter.id));
    } else {
      setFilterBarActiveFilters(prev => prev.filter(f => f.property !== filter.property || f.id));
    }
  };

  const handlePreviewDataChange = (data: any | null) => {
    setAssetPreviewData(data);
    onAssetPreviewChange(data);
    if (data) setIsFilterOpen(false);
  };

  if (resourcesStatus === 'loading') {
    return <AspectLinkedAssetsSkeleton />;
  }

  if (!linkedAssets || linkedAssets.length === 0) {
    return (
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
          No linked assets available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          borderRadius: "16px",
          overflow: "visible",
          bgcolor: "transparent",
          display: "flex",
          flexDirection: "row",
          gap: "16px",
        }}
      >
        {/* LEFT SECTION: Filter Card (Collapsible) */}
        <Box
          sx={{
            width: isFilterOpen ? "clamp(230px, 18vw, 280px)" : "0px",
            minWidth: isFilterOpen ? "clamp(230px, 18vw, 280px)" : "0px",
            transition:
              "width 0.3s ease, min-width 0.3s ease, padding 0.3s ease, opacity 0.3s ease",
            opacity: isFilterOpen ? 1 : 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: isFilterOpen ? "20px" : "0px",
            marginTop: "8px",
            gap: "20px",
            backgroundColor: "#F4F5FA",
            border: isFilterOpen ? "1px solid #DADCE0" : "none",
            borderRadius: "20px",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              overflowY: "auto",
            }}
          >
            <FilterDropdown
              filters={activeFilters}
              onFilterChange={(newFilters) => setActiveFilters(newFilters)}
              isGlossary={true}
            />
          </div>
        </Box>

        {/* RIGHT SECTION: Search + List */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* Resource Viewer Content */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ResourceViewer
              resources={filteredLinkedAssets}
              resourcesStatus={resourcesStatus}
              resourcesTotalSize={filteredLinkedAssets.length}
              previewData={assetPreviewData}
              onPreviewDataChange={handlePreviewDataChange}
              viewMode={assetViewMode}
              onViewModeChange={setAssetViewMode}
              selectedTypeFilter={null}
              onTypeFilterChange={() => {}}
              typeAliases={typeAliases}
              id_token={idToken}
              pageSize={assetPageSize}
              setPageSize={setAssetPageSize}
              requestItemStore={filteredLinkedAssets}
              handlePagination={() => {}}
              aspectValueColumn={aspectValueColumn}
              showFilters={true}
              showSortBy={true}
              showResultsCount={false}
              hideMostRelevant={true}
              isGlossary={true}
              customFilters={
                <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", minWidth: 0, flex: 1 }}>
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
                      border: isFilterOpen ? "none" : "1px solid #022FCD",
                      borderRadius: "59px",
                      background: isFilterOpen ? "#022FCD" : "none",
                      color: isFilterOpen ? "#EDF2FC" : "#022FCD",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                      flexGrow: 0,
                    }}
                    onClick={() => {
                      const newFilterState = !isFilterOpen;
                      setIsFilterOpen(newFilterState);
                      if (newFilterState) {
                        setAssetPreviewData(null);
                        onAssetPreviewChange(null);
                        if (isSmallScreen) onSidebarToggle?.(false);
                      }
                    }}
                  >
                    {isFilterOpen ? <Close style={{ width: "16px", height: "16px", flexShrink: 0, flexGrow: 0 }} /> : <Tune style={{ width: "16px", height: "16px", flexShrink: 0, flexGrow: 0 }} />}
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
                  <FilterBar
                    filterText={searchTerm}
                    onFilterTextChange={onSearchTermChange}
                    propertyNames={[
                      { name: 'Name', mode: 'text' as const },
                      { name: 'Description', mode: 'text' as const },
                      ...(aspectValueColumn ? [{
                        name: 'Aspect Value',
                        // Enum/boolean field: show as a selectable category
                        // list (via getPropertyValues below) while 'both'
                        // still allows typing. Every other field type: free
                        // text only, same as before.
                        mode: isCategoryAspectValue ? 'both' as const : 'text' as const,
                      }] : []),
                    ]}
                    getPropertyValues={(property) =>
                      property === 'Aspect Value' && isCategoryAspectValue ? aspectCategoryValues : []
                    }
                    activeFilters={filterBarActiveFilters}
                    onActiveFiltersChange={setFilterBarActiveFilters}
                    marginLeft="0px"
                    placeholder="Filter linked assets by name or description"
                    sx={{ flex: 1, minWidth: 0 }}
                    hideChips
                    showTextInFilterMenu
                  />
                </div>
              }
              customFilterChips={
                <FilterBarChips
                  activeFilters={filterBarActiveFilters}
                  onRemoveFilter={handleRemoveChip}
                  onRemoveOrConnector={(filter) => setFilterBarActiveFilters(prev => prev.map(f => f.id === filter.id ? { ...f, isOr: false } : f))}
                />
              }
              headerStyle={{ paddingTop: '2px' }}
              containerStyle={{
                height: "100%",
                border: "none",
                margin: 0,
                backgroundColor: "transparent",
                width: "100%",
              }}
              contentStyle={{
                minHeight: "auto",
                maxHeight: "100%",
                margin: 0,
                padding: 0,
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AspectLinkedAssets;
