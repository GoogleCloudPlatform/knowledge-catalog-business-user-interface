import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Paper,
  Tooltip,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import AnnotationsIconBlue from '../../assets/svg/annotations-icon-blue.svg';
import AnnotationSubitemIcon from '../../assets/svg/annotation-subitem.svg';
import ShimmerLoader from '../Shimmer/ShimmerLoader';
import { useSelector } from 'react-redux';
import FilterBar, { FilterBarChips } from '../Common/FilterBar';
import type { ActiveFilter } from '../Common/FilterBar';

/**
 * @file SideNav.tsx
 * @summary Renders the side navigation panel for the "Browse by Aspect" (Annotation) page.
 *
 * @description
 * This component displays a list of "Aspects" (from the `annotationsData` prop)
 * using Material-UI `ListItemButton` components with a pill-shaped design matching
 * the Glossary sidebar. Only one aspect can be expanded at a time, which is managed
 * by the internal `expandedItem` state.
 *
 * Each expanded aspect reveals a list of its `subItems`. When a user clicks on a `subItem`:
 * 1.  It calls the `onItemClick` prop function, passing the parent aspect item.
 * 2.  It calls the `onSubItemClick` prop function, passing the specific sub-item
 * that was clicked.
 *
 * These callbacks allow the parent component to navigate to the ResourceViewer.
 *
 * @param {object} props - The props for the SideNav component.
 * @param {any} props.selectedItem - The currently selected top-level aspect item.
 * @param {(item: any) => void} props.onItemClick - Callback function when an aspect is clicked.
 * @param {any} props.selectedSubItem - The currently selected sub-item.
 * @param {(subItem: any) => void} props.onSubItemClick - Callback function when a sub-item is clicked.
 * @param {any[]} props.annotationsData - The array of aspect objects to be rendered.
 *
 * @returns {JSX.Element} The rendered React component for the side navigation bar.
 */

const DATE_PROPERTIES = ['Created on', 'Created before', 'Created after'];

const isValidDate = (value: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

interface SideNavProps {
  selectedItem: any;
  onItemClick: (item: any) => void;
  selectedSubItem: any;
  onSubItemClick: (subItem: any) => void;
  annotationsData: any[];
  loadingAspectName?: string | null;
  filters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  isOpen?: boolean;
}

const OverflowTooltip: React.FC<{ 
  text: string; 
  enterDelay?: number; 
  children: React.ReactElement<any> 
}> = ({ text, enterDelay = 500, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    // Check if the inner text element is overflowing
    const el = e.currentTarget.querySelector('.MuiTypography-root') || e.currentTarget;
    setShowTooltip(el.scrollWidth > el.clientWidth);
  };

  return (
    <Tooltip 
      title={text} 
      placement="right" 
      enterDelay={enterDelay} 
      arrow 
      disableHoverListener={!showTooltip}
    >
      {React.cloneElement(children, { onMouseEnter: handleMouseEnter })}
    </Tooltip>
  );
};

const SideNav: React.FC<SideNavProps> = ({
  selectedItem,
  onItemClick,
  selectedSubItem,
  onSubItemClick,
  annotationsData,
  loadingAspectName = null,
  filters,
  onFiltersChange,
  isOpen = true,
}) => {
  const mode = useSelector((state: any) => state.user.mode);
  const [expandedItem, setExpandedItem] = React.useState<number | false>(0); // Auto-expand first item
  const [filterText, setFilterText] = useState('');
  const [dateError, setDateError] = useState('');

  const handleAspectClick = (annotation: any, index: number) => {
    // Toggle expansion
    setExpandedItem(expandedItem === index ? false : index);
    // Select the aspect
    onItemClick(annotation);
  };

  const handleSubItemClick = (subItem: any, item: any) => {
    if (selectedItem?.name !== item?.name) {
      onItemClick(item);
    }
    onSubItemClick(subItem);
  };

  const handleFiltersChange = (newFilters: ActiveFilter[]) => {
    // Validate date fields on newly added filters
    if (newFilters.length > filters.length) {
      const newFilter = newFilters[newFilters.length - 1];
      if (DATE_PROPERTIES.includes(newFilter.property) && !isValidDate(newFilter.values[0])) {
        setDateError('Invalid date. Please use YYYY-MM-DD format.');
        return;
      }
    }
    setDateError('');
    onFiltersChange(newFilters);
  };

  const handleRemoveChip = (filter: ActiveFilter) => {
    if (filter.id) {
      onFiltersChange(filters.filter(f => f.id !== filter.id));
    } else {
      onFiltersChange(filters.filter(f => f.property !== filter.property || f.id));
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        left: isOpen ? '96px' : '-252px',
        top: '65px', 
        width: '252px',
        height: 'calc(100vh - 72px)',
        backgroundColor: mode === 'dark' ? '#282a2c' : '#F4F5FA',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        borderRadius: 0,
        zIndex: 1100,
        transition: 'left 0.3s ease-in-out',
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
        backgroundColor: mode === 'dark' ? '#282a2c' : '#F4F5FA',
        padding: "20px 20px 0 20px",
        boxSizing: "border-box",
      }}>
        <Typography sx={{
          fontWeight: 500,
          fontSize: "16px",
          lineHeight: "24px",
          color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
          fontFamily: '"Google Sans", sans-serif',
        }}>Aspects</Typography>
      </div>

      <Box sx={{ pt: '12px', pb: '4px', px: '20px' }}>
        <FilterBar
          filterText={filterText}
          onFilterTextChange={setFilterText}
          propertyNames={[
            { name: 'Name contains', mode: 'text' as const },
            { name: 'Name prefix', mode: 'text' as const },
            { name: 'Location', mode: 'text' as const },
            { name: 'Created on', mode: 'text' as const, hint: 'Format: YYYY-MM-DD' },
            { name: 'Created before', mode: 'text' as const, hint: 'Format: YYYY-MM-DD' },
            { name: 'Created after', mode: 'text' as const, hint: 'Format: YYYY-MM-DD' },
          ]}
          activeFilters={filters}
          onActiveFiltersChange={handleFiltersChange}
          defaultProperty="Name contains"
          placeholder="Filter Aspects"
          marginLeft="0px"
          isPreview
          hideChips
          showTextInFilterMenu
        />
        {dateError && (
          <Typography
            sx={{
              fontFamily: "'Google Sans', sans-serif",
              fontSize: '11px',
              color: '#D93025',
              paddingLeft: '12px',
              marginTop: '4px',
            }}
          >
            {dateError}
          </Typography>
        )}
        <FilterBarChips
          activeFilters={filters}
          onRemoveFilter={handleRemoveChip}
          onRemoveOrConnector={(filter) => onFiltersChange(filters.map(f => f.id === filter.id ? { ...f, isOr: false } : f))}
          marginLeft="0px"
        />
      </Box>

      <List component="div" disablePadding sx={{ overflowY: 'auto', flex: 1, pt: '4px', px: 0, scrollbarWidth: 'none' }}>
        {annotationsData.map((annotation: any, index: number) => {
          const isExpanded = expandedItem === index;
          const isSelected = selectedItem?.name === annotation.name;
          const hasSelectedSubItem = isSelected && !!selectedSubItem; 
          const hasChildren = (annotation.subItems && annotation.subItems.length > 0) || 
                              (loadingAspectName === annotation.name && !annotation.subTypesLoaded);
          const showGroupCard = isExpanded && !hasSelectedSubItem && hasChildren;
          return (
            <Box key={annotation.name || index} sx={{ position: 'relative', mb: 0.5 }}>
              {showGroupCard && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "20px",
                    right: "20px",
                    backgroundColor: "#e8ebf7ff",
                    borderRadius: "16px",
                    zIndex: 0,
                  }}
                />
              )}

              {/* --- 4. Content Layer --- */}
              <Box sx={{ position: "relative", zIndex: 1, pb: showGroupCard ? "6px" : 0 }}>
                {/* Parent Item - Aspect */}
                <ListItemButton
                  selected={isSelected && !selectedSubItem}
                  onClick={() => handleAspectClick(annotation, index)}
                  sx={{
                    ml: '20px',
                    mr: '20px',
                    pl: '8px',
                    pr: '12px',
                    height: '36px',
                    borderRadius: (isSelected && !selectedSubItem) ? '31px' : '20px',
                    mb: 0.5,
                    "&.Mui-selected": {
                      backgroundColor: "#DDE5FC",
                      color: "#0C1226",
                      "&:hover": { backgroundColor: "#DDE5FC" },
                      "& .MuiListItemIcon-root": { color: "#022FCD" },
                      "& .MuiTypography-root": { color: "#0C1226", fontWeight: 500 },
                    },
                    '&:hover': {
                      backgroundColor: (isSelected && !selectedSubItem) ? undefined : '#ced1d3ff',
                      borderRadius: '20px'
                    },
                  }}
                >
                  {/* Chevron Icon */}
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mr: 0.5,
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <ExpandMore
                      sx={{ fontSize: 16, color: '#1F1F1F' }}
                    />
                  </Box>

                  {/* Annotation Icon */}
                  <ListItemIcon sx={{ minWidth: 20, mr: 0.1 }}>
                    <img
                      src={AnnotationsIconBlue}
                      alt=""
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        filter: (isSelected && !selectedSubItem) ? 'none' : 'grayscale(1) brightness(0.2)' 
                      }}
                    />
                  </ListItemIcon>

                  {/* Title */}
                  <OverflowTooltip text={annotation.title} enterDelay={600}>
                    <ListItemText
                      primary={annotation.title}
                      primaryTypographyProps={{
                        fontFamily: 'Product Sans',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0.25px',
                        fontWeight: isExpanded || isSelected ? 500 : 400,
                        color: (isSelected && !selectedSubItem) ? '#0C1226' : '#1F1F1F',
                        noWrap: true,
                      }}
                    />
                  </OverflowTooltip>
                </ListItemButton>

                {/* Sub-Items - Collapsed */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  {loadingAspectName === annotation.name && !annotation.subTypesLoaded ? (
                    <Box sx={{ pl: '40px', pr: '20px', pt: 1 }}>
                      <ShimmerLoader count={4} type="simple-list" />
                    </Box>
                  ) : (
                    <List component="div" disablePadding>
                      {annotation.subItems.map((subItem: any, subIndex: number) => {
                        const isSubItemSelected = selectedSubItem?.title === subItem.title && selectedItem?.name === annotation.name;

                        return (
                          <ListItemButton
                            key={subIndex}
                            selected={isSubItemSelected}
                            onClick={() => handleSubItemClick(subItem, annotation)}
                            sx={{
                              ml: '40px',
                              mr: '20px',
                              pl: '8px',
                              pr: '12px',
                              height: '36px',
                              borderRadius: isSubItemSelected ? '31px' : '20px',
                              mb: 0.5,
                              '&.Mui-selected': {
                                backgroundColor: '#DDE5FC',
                                color: '#0C1226',
                                '&:hover': { backgroundColor: '#DDE5FC' },
                                '& .MuiTypography-root': { color: '#0C1226', fontWeight: 500 },
                              },
                              '&:hover': {
                                backgroundColor: isSubItemSelected ? undefined : '#ced1d3ff',
                                borderRadius: '20px'
                              },
                            }}
                          >
                            {/* Sub-item Icon */}
                            <ListItemIcon sx={{ minWidth: 20, mr: 0.1 }}>
                              <img
                                src={AnnotationSubitemIcon}
                                alt=""
                                style={{ 
                                  width: '12px', 
                                  height: '12px',
                                }}
                              />
                            </ListItemIcon>

                            {/* Sub-item Title */}
                            <OverflowTooltip text={subItem.displayName || subItem.title} enterDelay={500}>
                              <ListItemText
                                primary={subItem.displayName || subItem.title}
                                primaryTypographyProps={{
                                  fontFamily: '"Google Sans", sans-serif',
                                  fontSize: '14px',
                                  lineHeight: '20px',
                                  letterSpacing: '0.25px',
                                  fontWeight: isSubItemSelected ? 500 : 400,
                                  color: isSubItemSelected ? '#0C1226' : '#1F1F1F',
                                  noWrap: true,
                                }}
                              />
                            </OverflowTooltip>
                          </ListItemButton>
                        );
                      })}
                    </List>
                  )}
                </Collapse>
              </Box>
            </Box>
          );
        })}
      </List>
    </Paper>
  );
};

export default SideNav;
