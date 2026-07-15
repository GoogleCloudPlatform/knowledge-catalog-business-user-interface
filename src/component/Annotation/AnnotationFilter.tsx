import React, { useState, useMemo } from 'react';
import {
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  UnfoldLess,
  UnfoldMore
} from '@mui/icons-material';
import FilterBar from '../Common/FilterBar';
import type { ActiveFilter, PropertyConfig } from '../Common/FilterBar';

/**
 * @file AnnotationFilter.tsx
 * @summary Renders a filter bar for a data entry's "aspects" (annotations).
 *
 * @description
 * This component provides a UI for filtering a list of aspects (annotations)
 * associated with a data entry. It offers two primary filtering mechanisms:
 *
 * 1.  **Text Search**: A `TextField` allows users to type and filter aspect names
 * in real-time.
 * 2.  **Dropdown Filter**: A filter icon button opens a cascading `Menu` that
 * allows users to select a property (e.g., "Name") and then check specific
 * aspect names to include in the filter.
 *
 * The component manages the filter state internally and displays active filters
 * as "chips" below the search bar. When filters are applied (either text or
 * dropdown), it computes a `filteredEntry` object containing only the
 * aspects that match the filter criteria (plus essential aspects like schema,
 * overview, etc., which are always included).
 *
 * This `filteredEntry` is then passed back to the parent component via the
 * `onFilteredEntryChange` callback.
 *
 * Additionally, the component includes buttons to trigger `onCollapseAll` and
 * `onExpandAll` functions, which are passed in as props.
 *
 * @param {object} props - The props for the AnnotationFilter component.
 * @param {any} props.entry - The full data entry object, which contains
 * the `aspects` to be filtered.
 * @param {(filteredEntry: any) => void} props.onFilteredEntryChange - Callback
 * function that is invoked whenever the filter changes, passing the newly
 * filtered entry object as an argument.
 * @param {() => void} props.onCollapseAll - Callback function to be executed
 * when the "Collapse All" button is clicked.
 * @param {() => void} props.onExpandAll - Callback function to be executed
 * when the "Expand All" button is clicked.
 * @param {any} [props.sx] - Optional Material-UI `sx` prop to apply custom
 * styles to the main container `Box`.
 *
 * @returns {JSX.Element} The rendered React component for the annotation
 * filter bar and its associated filter menu.
 */

interface AnnotationFilterProps {
  entry: any;
  onFilteredEntryChange: (filteredEntry: any) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  sx?: any;
  isPreview?: boolean;
}

const AnnotationFilter: React.FC<AnnotationFilterProps> = ({
  entry,
  onFilteredEntryChange,
  onCollapseAll,
  onExpandAll,
  sx,
  isPreview = false,
}) => {
  const [filterText, setFilterText] = useState('');
  const [activeAnnotationFilters, setActiveAnnotationFilters] = useState<ActiveFilter[]>([]);

  // State to track expand/collapse status
  const [isExpanded, setIsExpanded] = useState(false);

  // Get annotation names from entry
  const annotationPropertyNames: PropertyConfig[] = [{ name: 'Name', mode: 'text' }];

  // Get all unique annotation names from the entry
  const annotationNames = useMemo(() => {
    if (!entry?.aspects) return [];
    const keys = Object.keys(entry.aspects);
    const number = entry.entryType?.split('/')[1] || entry.type || '0';
    const names = keys
      .filter(key => {
        const aspect = entry.aspects[key];
        return aspect.data !== null
          && key !== `${number}.global.schema`
          && key !== `${number}.global.overview`
          && key !== `${number}.global.contacts`
          && key !== `${number}.global.usage`
          && !key.endsWith('.global.glossary-term-aspect');
      })
      .map(key => {
        const aspectType = entry.aspects[key].aspectType;
        return aspectType ? aspectType.split('/').pop() : key.split('.').shift();
      })

    return Array.from(new Set(names)).sort();
  }, [entry]);

  // Don't render filter if there are no annotations to display
  if (annotationNames.length === 0) {
    return null;
  }

  // Filter annotations based on active filter chips
  const filteredAnnotationNames = useMemo(() => {
    if (activeAnnotationFilters.length === 0) return annotationNames;

    // Group filters by OR separators
    const filterGroups: ActiveFilter[][] = [];
    let currentGroup: ActiveFilter[] = [];
    activeAnnotationFilters.forEach((filter) => {
      if (filter.isOr && currentGroup.length > 0) {
        filterGroups.push(currentGroup);
        currentGroup = [filter];
      } else {
        currentGroup.push(filter);
      }
    });
    if (currentGroup.length > 0) filterGroups.push(currentGroup);

    return annotationNames.filter(name =>
      filterGroups.some(group =>
        group.every(filter =>
          filter.values.some(value =>
            name.toLowerCase().includes(value.toLowerCase())
          )
        )
      )
    );
  }, [annotationNames, activeAnnotationFilters]);

  // Create filtered entry for annotations
  const filteredEntry = useMemo(() => {
    if (!entry?.aspects || activeAnnotationFilters.length === 0) {
      return entry;
    }

    const keys = Object.keys(entry.aspects);
    const number = entry.entryType?.split('/')[1] || entry.type || '0';
    const filteredAspects: any = {};

    keys.forEach(key => {
      const aspect = entry.aspects[key];
      const aspectType = aspect.aspectType;
      const annotationName = aspectType ? aspectType.split('/').pop() : key.split('.').shift();
      if (key === `${number}.global.schema` ||
          key === `${number}.global.overview` ||
          key === `${number}.global.contacts` ||
          key === `${number}.global.usage` ||
          (annotationName && filteredAnnotationNames.includes(annotationName as string))) {
        filteredAspects[key] = aspect;
      }
    });

    return {
      ...entry,
      aspects: filteredAspects
    };
  }, [entry, filteredAnnotationNames, activeAnnotationFilters]);

  // Update parent component when filtered entry changes
  React.useEffect(() => {
    setIsExpanded(false);
  }, [entry]);

  React.useEffect(() => {
    onFilteredEntryChange(filteredEntry);
  }, [filteredEntry, onFilteredEntryChange]);

  const handleToggleExpandCollapse = () => {
    if (isExpanded) {
      onCollapseAll();
    } else {
      onExpandAll();
    }
    setIsExpanded(prev => !prev);
  };

  return (
    <FilterBar
      filterText={filterText}
      onFilterTextChange={setFilterText}
      propertyNames={annotationPropertyNames}
      activeFilters={activeAnnotationFilters}
      onActiveFiltersChange={setActiveAnnotationFilters}
      isPreview={isPreview}
      sx={{ marginBottom: '12px', ...sx }}
      marginLeft="0px"
      filterTooltip="Filter by aspect name"
      showTextInFilterMenu
      endContent={
        <Tooltip title={isExpanded ? "Collapse All" : "Expand All"} arrow>
          <IconButton
            onClick={handleToggleExpandCollapse}
            sx={{
              width: '32px',
              height: '32px',
              border: '1px solid #DADCE0',
              borderRadius: '54px',
              padding: 0,
              flexShrink: 0,
              '&:hover': { backgroundColor: '#F5F5F5' },
            }}
          >
            {!isExpanded
              ? <UnfoldMore sx={{ fontSize: '24px', color: '#1F1F1F' }} />
              : <UnfoldLess sx={{ fontSize: '24px', color: '#1F1F1F' }} />
            }
          </IconButton>
        </Tooltip>
      }
    />
  );
};

export default AnnotationFilter;
