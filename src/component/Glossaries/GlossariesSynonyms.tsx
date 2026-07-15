import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  DateRangeOutlined,
  ExpandMore,
} from "@mui/icons-material";
import { type GlossaryRelation } from "./GlossaryDataType";
import { getIcon } from "./glossaryUIHelpers";
import { getFormattedDateTimeParts } from "../../utils/resourceUtils";
import FilterBar from '../Common/FilterBar';
import type { ActiveFilter, PropertyConfig } from '../Common/FilterBar';

interface GlossariesSynonymsProps {
  relations: GlossaryRelation[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  relationFilter: "all" | "synonym" | "related";
  onRelationFilterChange: (value: "all" | "synonym" | "related") => void;
  sortBy: "name" | "lastModified";
  sortOrder: "asc" | "desc";
  onSortByChange: (value: "name" | "lastModified") => void;
  onSortOrderToggle?: () => void;
  onItemClick: (id: string) => void;
}

const FILTER_PROPERTIES: PropertyConfig[] = [
  { name: 'Name', mode: 'text' },
  { name: 'Description', mode: 'text' },
];

const GlossariesSynonyms: React.FC<GlossariesSynonymsProps> = ({
  relations,
  searchTerm,
  onSearchTermChange,
  relationFilter,
  onRelationFilterChange,
  sortBy,
  sortOrder,
  onSortByChange,
  onItemClick,
}) => {
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [sortMenuWidth, setSortMenuWidth] = useState<number>(0);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
    setSortMenuWidth(event.currentTarget.clientWidth);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortSelect = (criteria: "name" | "lastModified") => {
    if (criteria !== sortBy) {
      onSortByChange(criteria);
    }
    handleSortClose();
  };

  const sortItems = (items: GlossaryRelation[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === "name") {
        const nameA = a.displayName.toLowerCase();
        const nameB = b.displayName.toLowerCase();
        if (sortOrder === "asc") return nameA.localeCompare(nameB);
        return nameB.localeCompare(nameA);
      } else {
        const dateA = a.lastModified || 0;
        const dateB = b.lastModified || 0;
        if (sortOrder === "asc") return dateA - dateB;
        return dateB - dateA;
      }
    });
  };

  // searchedRelations is used for chip counts (type filter not applied)
  const searchedRelations = useMemo(() => {
    if (activeFilters.length === 0) return relations;
    return relations.filter((r) => {
      const filterGroups: ActiveFilter[][] = [];
      let currentGroup: ActiveFilter[] = [];
      activeFilters.forEach((filter) => {
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
              case 'Name': return r.displayName.toLowerCase().includes(lower);
              case 'Description': return (r.description || '').toLowerCase().includes(lower);
              default: return r.displayName.toLowerCase().includes(lower) || (r.description || '').toLowerCase().includes(lower);
            }
          })
        )
      );
    });
  }, [relations, activeFilters]);

  // filteredRelations is used for display (type filter + active filters applied)
  const filteredRelations = useMemo(() => {
    let filtered = relations.filter((r) => {
      const matchesType = relationFilter === "all" || r.type === relationFilter;
      return matchesType;
    });

    // Apply active filters (from FilterBar chips)
    if (activeFilters.length > 0) {
      filtered = filtered.filter(r => {
        const filterGroups: ActiveFilter[][] = [];
        let currentGroup: ActiveFilter[] = [];
        activeFilters.forEach((filter) => {
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
                case 'Name': return r.displayName.toLowerCase().includes(lower);
                case 'Description': return (r.description || '').toLowerCase().includes(lower);
                default: return r.displayName.toLowerCase().includes(lower) || (r.description || '').toLowerCase().includes(lower);
              }
            })
          )
        );
      });
    }

    return sortItems(filtered);
  }, [relations, relationFilter, activeFilters, sortBy, sortOrder]);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header Section (Search/Chips) */}
      <Box sx={{ mb: 3 }}>
        <FilterBar
          filterText={searchTerm}
          onFilterTextChange={onSearchTermChange}
          propertyNames={FILTER_PROPERTIES}
          activeFilters={activeFilters}
          onActiveFiltersChange={setActiveFilters}
          marginLeft="0px"
          placeholder="Filter synonyms and related terms"
          showTextInFilterMenu
          endContent={
            <Box sx={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip
                  label={`All (${searchedRelations.length})`}
                  onClick={() => onRelationFilterChange("all")}
                  sx={{
                    fontSize: 12,
                    bgcolor: relationFilter === "all" ? "#e8f0fe" : "transparent",
                    color: relationFilter === "all" ? "#1967d2" : "#1F1F1F",
                    fontWeight: relationFilter === "all" ? 500 : 300,
                    border: relationFilter === "all" ? "none" : "1px solid #dadce0",
                  }}
                />
                <Chip
                  label={`Synonyms (${
                    searchedRelations.filter((r) => r.type === "synonym").length
                  })`}
                  onClick={() => onRelationFilterChange("synonym")}
                  sx={{
                    fontSize: 12,
                    bgcolor:
                      relationFilter === "synonym" ? "#e8f0fe" : "transparent",
                    color: relationFilter === "synonym" ? "#1967d2" : "#1F1F1F",
                    fontWeight: relationFilter === "synonym" ? 500 : 300,
                    border:
                      relationFilter === "synonym" ? "none" : "1px solid #dadce0",
                  }}
                />
                <Chip
                  label={`Related Terms (${
                    searchedRelations.filter((r) => r.type === "related").length
                  })`}
                  onClick={() => onRelationFilterChange("related")}
                  sx={{
                    fontSize: 12,
                    bgcolor:
                      relationFilter === "related" ? "#e8f0fe" : "transparent",
                    color: relationFilter === "related" ? "#1967d2" : "#1F1F1F",
                    fontWeight: relationFilter === "related" ? 500 : 300,
                    border:
                      relationFilter === "related" ? "none" : "1px solid #dadce0",
                  }}
                />
              </Box>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <Box
                  onClick={handleSortClick}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "fit-content",
                    height: "36px",
                    background: "#FFFFFF",
                    border: "1px solid #D6D9E8",
                    borderRadius: "7.5px",
                    padding: "0 12px", 
                    gap: "6px",
                    cursor: "pointer",
                    boxSizing: "border-box"
                  }}
                >
                  <Typography sx={{ 
                    fontSize: "14px", 
                    fontFamily: '"Google Sans", sans-serif',
                    whiteSpace: "nowrap"
                  }}>
                    <span style={{ color: "#6A6E7C", fontWeight: 400 }}>
                      Sort by&nbsp;
                    </span>
                    <span style={{ color: "#0C1226", fontWeight: 600 }}>
                      {sortBy === 'name' ? 'Name' : 'Last modified'}
                    </span>
                  </Typography>
                  
                  <ExpandMore
                    sx={{
                      color: "#6A6E7C",
                      transform: sortAnchorEl ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s ease",
                    }}
                  />
                </Box>
              </div>
            </Box>
          }
        />
          <Menu
            anchorEl={sortAnchorEl}
            open={Boolean(sortAnchorEl)}
            onClose={handleSortClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
              style: {
                marginTop: '4px',
                borderRadius: '8px',
                boxShadow: '0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
                width: sortMenuWidth > 0 ? `${sortMenuWidth}px` : 'auto', 
              },
            }}
          >
          <MenuItem
            onClick={() => handleSortSelect("name")}
            sx={{
              fontSize: '14px',
              fontFamily: '"Google Sans Text", sans-serif',
              fontWeight: sortBy === 'name' ? '600' : '400',
              color: sortBy === 'name' ? '#022FCD' : '#0C1226',
              backgroundColor: sortBy === 'name' ? '#F8FAFD' : 'transparent',
            }}
          >
            Name
          </MenuItem>
          <MenuItem
            onClick={() => handleSortSelect("lastModified")}
            sx={{
              fontSize: '14px',
              fontFamily: '"Google Sans Text", sans-serif',
              fontWeight: sortBy === 'lastModified' ? '600' : '400',
              color: sortBy === 'lastModified' ? '#022FCD' : '#0C1226',
              backgroundColor: sortBy === 'lastModified' ? '#F8FAFD' : 'transparent',
            }}
          >
            Last modified
          </MenuItem>
        </Menu>
      </Box>

      {/* Conditional Body */}
      {filteredRelations.length === 0 ? (
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
            No matching synonyms or related terms found
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "16px",
            width: "100%",
            overflowY: "auto",
            minHeight: 0,
            pb: 2,
            px: 1,
            mx: -1,
            pt: 1,
            mt: -1,
          }}
        >
          {filteredRelations.map((rel) => (
            <Card
              key={rel.id}
              onClick={() => onItemClick(rel.id)}
              variant="outlined"
              sx={{
                borderRadius: "16px",
                height: "200px",
                cursor: "pointer",
                transition: "box-shadow 0.2s, border-color 0.2s, transform 0.2s",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  boxShadow: "0 4px 8px 0 rgba(60,64,67,0.15)",
                  borderColor: "#0B57D0",
                  transform: "scale(1.02)",
                },
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  p: "16px",
                  "&:last-child": { pb: "16px" },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2.5,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      overflow: "hidden",
                    }}
                  >
                    {getIcon("term", "medium")}
                    <Typography
                      variant="h6"
                      noWrap
                      sx={{
                        fontFamily: "Google Sans",
                        fontSize: "16px",
                        fontWeight: 500,
                        lineHeight: "24px",
                        letterSpacing: "0.15px",
                        color: "#1F1F1F",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {rel.displayName}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: "rgba(7, 106, 255, 0.1)",
                      border: "1px solid rgba(7, 106, 255, 0.2)",
                      borderRadius: "12px",
                      padding: "4px 12px",
                      flexShrink: 0,
                      ml: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"Google Sans", sans-serif',
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#076AFF",
                        letterSpacing: "0.2px",
                        lineHeight: 1,
                      }}
                    >
                      {rel.type === "synonym" ? "Synonym" : "Related"}
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "Google Sans",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "24px",
                    color: "#2D2F35",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    wordBreak: "break-word",
                  }}
                >
                  {rel.description || "No description"}
                </Typography>
                <Divider sx={{ mt: "auto", mb: 1 }} />
                <Tooltip title="Last modified">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      width: "fit-content",
                    }}
                  >
                    <DateRangeOutlined sx={{ fontSize: 16, color: "#979DA2" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: '"Product Sans", sans-serif',
                        fontWeight: 400,
                        fontSize: "14px",
                        color: "#979DA2",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(() => {
                        const { date } = getFormattedDateTimeParts(
                          rel.lastModified
                        );
                        return date;
                      })()}
                    </Typography>
                  </Box>
                </Tooltip>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default GlossariesSynonyms;
