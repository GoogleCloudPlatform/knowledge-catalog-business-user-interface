import React, { useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { Close, Tune } from "@mui/icons-material";
import ResourceViewer from "../Common/ResourceViewer";
import FilterDropdown from "../Filter/FilterDropDown";
import { typeAliases } from "../../utils/resourceUtils";
import FilterBar, { FilterBarChips } from '../Common/FilterBar';
import type { ActiveFilter as FilterBarActiveFilter } from '../Common/FilterBar';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchEntry, clearHistory } from '../../features/entry/entrySlice';
import type { AppDispatch } from '../../app/store';

interface DataProductAssetsProps {
  linkedAssets: any[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  idToken: string;
  onAssetPreviewChange: (data: any | null) => void;
}

const DataProductAssets: React.FC<DataProductAssetsProps> = ({
  linkedAssets,
  searchTerm,
  onSearchTermChange,
  idToken,
  onAssetPreviewChange,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [filterBarActiveFilters, setFilterBarActiveFilters] = useState<FilterBarActiveFilter[]>([]);
  const [assetPageSize, setAssetPageSize] = useState(20);
  const [assetPreviewData, setAssetPreviewData] = useState<any | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

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
          No assets available for this Data Product.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <Box 
        sx={{ 
          display: "flex", 
          alignItems: "center",
          gap: "12px", 
          width: "100%", 
          paddingLeft: "20px",
          paddingRight: "20px",
          paddingTop: "16px",
          paddingBottom: "8px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <span
          style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: "0px 16px",
            gap: "8px",
            height: "32px",
            border: isFilterOpen ? "none" : "1px solid #022FCD",
            borderRadius: "59px",
            background: isFilterOpen ? "#022FCD" : "#FFFFFF",
            color: isFilterOpen ? "#EDF2FC" : "#022FCD",
            cursor: "pointer",
            transition: "all 0.2s ease",
            flexShrink: 0,
          }}
          onClick={() => {
            const newFilterState = !isFilterOpen;
            setIsFilterOpen(newFilterState);
            if (newFilterState) {
              setAssetPreviewData(null);
              onAssetPreviewChange(null);
            }
          }}
        >
          {isFilterOpen ? (
            <Close style={{ width: "18px", height: "18px" }} />
          ) : (
            <Tune style={{ width: "18px", height: "18px" }} />
          )}
          <span style={{
            fontFamily: '"Google Sans", sans-serif',
            fontWeight: 500,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
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
          placeholder="Filter assets by name or description"
          sx={{ flex: 1, minWidth: 0, backgroundColor: 'transparent' }}
          hideChips
          showTextInFilterMenu
        />
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          borderRadius: "16px",
          overflow: "visible",
          bgcolor: "#F7F9F9",
          display: "flex",
          flexDirection: "row",
          gap: "8px",
        }}
      >
        {/* LEFT SECTION: Filter Card (Collapsible) */}
        <Box
          sx={{
            height: "100%",
            width: isFilterOpen ? "clamp(230px, 18vw, 280px)" : "0px",
            minWidth: isFilterOpen ? "clamp(230px, 18vw, 280px)" : "0px",
            transition: "all 0.3s ease",
            opacity: isFilterOpen ? 1 : 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: isFilterOpen ? "20px" : "0px",
            marginTop: "10px",
            marginLeft: isFilterOpen ? "20px" : "0px",
            gap: "20px",
            backgroundColor: "#F2F4FC",
            border: isFilterOpen ? "1px solid #DADCE0" : "none",
            borderRadius: "20px",
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
            paddingRight: "20px",
            transition: "padding 0.3s ease",
          }}
        >
          {/* Resource Viewer Content */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ResourceViewer
              resources={filteredLinkedAssets}
              resourcesStatus="succeeded"
              resourcesTotalSize={filteredLinkedAssets.length}
              previewData={assetPreviewData}
              onPreviewDataChange={handlePreviewDataChange}
              viewMode="table"
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
              headerStyle={{ paddingTop: '2px', backgroundColor: '#F7F9F9' }}
              isDataProduct={true}
              hideViewToggle={true}
              onViewDetails={(entry) => {
                dispatch(clearHistory());
                dispatch(fetchEntry({ entryName: entry.name, id_token: idToken }));
                navigate('/view-details');
              }}
              
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
                backgroundColor: "#F7F9F9",
                width: "auto",
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

export default DataProductAssets;
