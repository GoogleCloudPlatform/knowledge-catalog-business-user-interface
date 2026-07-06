import React, { useState, useMemo, useEffect } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { Close, Tune } from "@mui/icons-material";
import ResourceViewer from "../Common/ResourceViewer";
import FilterDropdown from "../Filter/FilterDropDown";
import { typeAliases } from "../../utils/resourceUtils";
import FilterBar, { FilterBarChips } from '../Common/FilterBar';
import type { ActiveFilter as FilterBarActiveFilter } from '../Common/FilterBar';

interface GlossariesLinkedAssetsProps {
  linkedAssets: any[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  idToken: string;
  onAssetPreviewChange: (data: any | null) => void;
  isSidebarOpen?: boolean;
  onSidebarToggle?: (open: boolean) => void;
  isLoading?: boolean;
}

const GlossariesLinkedAssets: React.FC<GlossariesLinkedAssetsProps> = ({
  linkedAssets,
  searchTerm,
  onSearchTermChange,
  idToken,
  onAssetPreviewChange,
  isSidebarOpen,
  onSidebarToggle,
  isLoading = false,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [filterBarActiveFilters, setFilterBarActiveFilters] = useState<FilterBarActiveFilter[]>([]);
  const [assetViewMode, setAssetViewMode] = useState<"list" | "table">("list");
  const [assetPageSize, setAssetPageSize] = useState(20);
  const [assetPreviewData, setAssetPreviewData] = useState<any | null>(null);
  const isSmallScreen = useMediaQuery('(max-width: 1280px)');

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
          const PRODUCT_API_NAMES: Record<string, string> = { "Knowledge Catalog": "Dataplex Universal Catalog" };
          const match = systemFilters.some((filter: any) => {
            if (filter.name === "Others") return true;
            const apiName = PRODUCT_API_NAMES[filter.name] || filter.name;
            return system === apiName.toLowerCase();
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
  }, [linkedAssets, filterBarActiveFilters, activeFilters]);

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

  if (!isLoading && (!linkedAssets || linkedAssets.length === 0)) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: "400px",
          opacity: 1,
          gap: 2,
        }}
      >
        <Typography variant="body1" color="#0C1226CC">
          No linked assets available for this term
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
          gap: isFilterOpen ? "16px" : "0px",
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
              isGlossary={true}
              resources={filteredLinkedAssets}
              resourcesStatus={isLoading ? "loading" : "succeeded"}
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
              showFilters={true}
              showSortBy={true}
              showResultsCount={false}
              hideMostRelevant={true}
              headerStyle={{ paddingTop: '2px' }}
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
                    ]}
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

export default GlossariesLinkedAssets;
