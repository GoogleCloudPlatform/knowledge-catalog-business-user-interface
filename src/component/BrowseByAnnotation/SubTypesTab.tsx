import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import AnnotationSubitemIcon from '../../assets/svg/annotation-subitem.svg';
import ThemedIconContainer from '../Common/ThemedIconContainer';
import TypeIcon from '../../assets/svg/type-icon.svg';
import FilterBar from '../Common/FilterBar';
import type { ActiveFilter, PropertyConfig } from '../Common/FilterBar';

// Helper function to format type display
const formatTypeDisplay = (type: string, stringType?: string): string => {
  if (type === 'string') {
    if (stringType === 'richText') return 'Text (Rich Text)';
    if (stringType === 'resource') return 'Text (Resource)';
    if (stringType === 'url') return 'Text (URL)';
    return 'Text';
  }

  const typeDisplayMap: Record<string, string> = {
    'bool': 'Boolean',
    'int': 'Integer',
    'enum': 'Enum',
    'record': 'Record',
    'array': 'Array',
    'map': 'Map',
    'double': 'Double',
    'float': 'Float',
  };

  return typeDisplayMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

interface SubTypesTabProps {
  items: any[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sortBy: 'name' | 'assets' | 'type';
  sortOrder: 'asc' | 'desc';
  onSortByChange: (value: 'name' | 'assets' | 'type') => void;
  onSortOrderToggle: () => void;
  onItemClick: (item: any) => void;
}

const FILTER_PROPERTIES: PropertyConfig[] = [
  { name: 'Name', mode: 'text' },
  { name: 'Description', mode: 'text' },
  { name: 'Type', mode: 'dropdown' },
];

const SubTypesTab: React.FC<SubTypesTabProps> = ({
  items,
  sortBy,
  sortOrder,
  onSortByChange,
  onItemClick,
}) => {
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [filterText, setFilterText] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sortMenuWidth, setSortMenuWidth] = useState<number>(0);

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
    setSortMenuWidth(event.currentTarget.clientWidth);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortSelect = (criteria: 'name' | 'assets' | 'type') => {
    if (criteria !== sortBy) {
      onSortByChange(criteria);
    }
    handleSortClose();
  };

  // Get unique type values for dropdown
  const getPropertyValues = (property: string): string[] => {
    if (property === 'Type') {
      const types = new Set<string>();
      items.forEach((item) => {
        const formatted = formatTypeDisplay(item.type || 'string', item.stringType);
        types.add(formatted);
      });
      return Array.from(types).sort();
    }
    return [];
  };

  // Helper function to check if an item matches a single filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchesFilter = (item: any, filter: ActiveFilter): boolean => {
    return filter.values.some(value => {
      const lower = value.toLowerCase();
      switch (filter.property) {
        case 'Name':
          return (item.displayName || item.title || '').toLowerCase().includes(lower);
        case 'Description':
          return (item.description || '').toLowerCase().includes(lower);
        case 'Type': {
          const formatted = formatTypeDisplay(item.type || 'string', item.stringType);
          return formatted === value;
        }
        default:
          return true;
      }
    });
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Apply filter chips with AND/OR logic
    if (activeFilters.length > 0) {
      // Split filters into groups separated by OR
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
      if (currentGroup.length > 0) {
        filterGroups.push(currentGroup);
      }

      filtered = items.filter((item) => {
        return filterGroups.some((group) => {
          return group.every((filter) => matchesFilter(item, filter));
        });
      });
    }

    // Sort items
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.displayName || a.title).localeCompare(b.displayName || b.title);
          break;
        case 'assets':
          comparison = (b.fieldValues || 0) - (a.fieldValues || 0);
          break;
        case 'type':
          comparison = (a.type || 'string').localeCompare(b.type || 'string');
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [items, activeFilters, sortBy, sortOrder]);

  const hasFilters = activeFilters.length > 0 || filterText.trim().length > 0;

  return (
    <Box sx={{ height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Header Section (Filter/Sort) */}
        {items.length > 0 && (
          <>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                mb: 2,
                flexShrink: 0,
              }}
            >
              <FilterBar
                filterText={filterText}
                onFilterTextChange={setFilterText}
                propertyNames={FILTER_PROPERTIES}
                getPropertyValues={getPropertyValues}
                activeFilters={activeFilters}
                onActiveFiltersChange={setActiveFilters}
                marginLeft="0px"
                placeholder="Filter Sub Types"
                endContent={
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
                          {sortBy === "name" ? "Name" : sortBy === "assets" ? "Assets" : "Type"}
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
                }
              />
            </Box>
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
                onClick={() => handleSortSelect("assets")}
                sx={{
                  fontSize: '14px',
                  fontFamily: '"Google Sans Text", sans-serif',
                  fontWeight: sortBy === 'assets' ? '600' : '400',
                  color: sortBy === 'assets' ? '#022FCD' : '#0C1226',
                  backgroundColor: sortBy === 'assets' ? '#F8FAFD' : 'transparent',
                }}
              >
                Assets
              </MenuItem>
              <MenuItem
                onClick={() => handleSortSelect("type")}
                sx={{
                  fontSize: '14px',
                  fontFamily: '"Google Sans Text", sans-serif',
                  fontWeight: sortBy === 'type' ? '600' : '400',
                  color: sortBy === 'type' ? '#022FCD' : '#0C1226',
                  backgroundColor: sortBy === 'type' ? '#F8FAFD' : 'transparent',
                }}
              >
                Type
              </MenuItem>
            </Menu>
          </>
        )}
        {/* Conditional Body: Empty State OR Grid */}
        {filteredAndSortedItems.length === 0 ? (
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
              {hasFilters ? "No sub types match the filter criteria." : "No Sub Types Available."}
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
            {filteredAndSortedItems.map((item: any, index: number) => (
              <Card
                key={index}
                variant="outlined"
                onClick={() => onItemClick(item)}
                sx={{
                  borderRadius: "16px",
                  height: "134px",
                  overflow: "hidden",
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
                  {/* Header: Icon + Title */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <ThemedIconContainer iconColor="#F9AB00" size="small">
                      <img
                        src={AnnotationSubitemIcon}
                        alt=""
                        style={{ width: '18px', height: '18px' }}
                      />
                    </ThemedIconContainer>
                    <Tooltip
                      title={item.displayName || item.title}
                      placement="top"
                      enterDelay={500}
                      arrow
                    >
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
                        {item.displayName || item.title}
                      </Typography>
                    </Tooltip>
                  </Box>

                  {/* Description: 2-line ellipsis */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "Google Sans",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "20px",
                      color: "#575757",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.description || "No description"}
                  </Typography>

                  {/* Footer: Asset count + Type badge */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    {item.isCountLoading ? (
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "rgba(7, 106, 255, 0.1)",
                          border: "1px solid rgba(7, 106, 255, 0.2)",
                          borderRadius: "12px",
                          padding: "4px 12px",
                          alignSelf: "flex-start",
                        }}
                      >
                        <CircularProgress
                          size={12}
                          thickness={4}
                          sx={{ color: "#076AFF" }}
                        />
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
                          Loading
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: "rgba(7, 106, 255, 0.1)",
                          border: "1px solid rgba(7, 106, 255, 0.2)",
                          borderRadius: "12px",
                          padding: "4px 12px",
                          alignSelf: "flex-start",
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
                          {`${item.fieldValues || 0} asset${(item.fieldValues || 0) !== 1 ? 's' : ''}`}
                        </Typography>
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 0,
                        gap: "5px",
                        height: "16px",
                      }}
                    >
                      <img
                        src={TypeIcon}
                        alt=""
                        style={{ width: '16px', height: '16px' }}
                      />
                      <Typography
                        sx={{
                          fontFamily: "Google Sans Text",
                          fontWeight: 500,
                          fontSize: "12px",
                          lineHeight: "16px",
                          color: "#575757",
                        }}
                      >
                        {formatTypeDisplay(item.type, item.stringType)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SubTypesTab;
