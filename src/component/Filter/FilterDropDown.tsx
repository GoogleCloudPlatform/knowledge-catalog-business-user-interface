import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import BigQueryIcon from '../../assets/svg/BigQuery.svg';
import AnalyticsHubIcon from '../../assets/svg/analytics-hub.svg';
import CloudSQLIcon from '../../assets/svg/cloud-sql.svg';
import DataformIcon from '../../assets/svg/dataform_logo.svg';
import OthersIcon from '../../assets/svg/others.svg';
import CloudBigTableIcon from '../../assets/svg/CloudBigTable.svg';
import CloudPubSubIcon from '../../assets/svg/cloudpub_sub.svg';
import CloudSpannerIcon from '../../assets/svg/CloudSpanner.svg';
import CloudStorageIcon from '../../assets/svg/CloudStorage.svg';
import DataplexIcon from '../../assets/svg/Dataplex.svg';
import DataprocIcon from '../../assets/svg/Dataproc.svg';
import VertexIcon from '../../assets/svg/vertex.svg';
import FilterAspectsIcon from '../../assets/svg/filter-aspects-icon.svg';
import FilterAssetIcon from '../../assets/svg/filter-asset-icon.svg';
import FilterProductIcon from '../../assets/svg/filter-product-icon.svg';
import FilterProjectIcon from '../../assets/svg/filter-project-icon.svg';
import { useAuth } from '../../auth/AuthProvider';
import FilterAnnotationsMultiSelect from './FilterAnnotationsMultiSelect';
import FilterSubAnnotationsPanel from './FilterSubAnnotationsPanel';
import axios from 'axios';
import { URLS } from '../../constants/urls';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { getProjects } from '../../features/projects/projectsSlice';
import { getAssetIcon } from '../../utils/resourceUtils';
import DatabaseSchemaBlueIcon from '../../assets/svg/database_schema_icon_blue.svg';
import { isGlossaryAssetType, getGlossaryMuiIcon, assetNameToGlossaryType } from '../../constants/glossaryIcons';

/**
 * @file FilterDropdown.tsx
 * @description
 * This component renders the main filter sidebar for the application. It displays
 * filter options grouped into expandable accordions: "Aspects" (Annotations),
 * "Assets", "Products", and "Projects".
 *
 * Key functionalities include:
 * 1.  **Filter Selection**: Allows users to select/deselect filters via checkboxes.
 * 2.  **Parent Communication**: Uses the `onFilterChange` prop to notify the parent
 * component of any changes to the selected filters.
 * 3.  **Redux Integration**:
 * - Reads `searchTerm` and `searchType` from the Redux store.
 * - Automatically selects "Asset" filters if the `searchTerm` matches an asset name.
 * - Automatically selects a "Product" filter if the `searchType` is set to a
 * specific product.
 * - Dispatches filter changes back to the Redux store.
 * 4.  **Dynamic Data**: Populates "Aspects" and "Projects" from the `user.appConfig`
 * provided by the `useAuth` hook.
 * 5.  **Advanced Filter Modals**:
 * - Renders a "See...more" button for categories with many items, which opens
 * the `FilterAnnotationsMultiSelect` modal.
 * - For "Aspects", it shows an "edit" icon that opens the
 * `FilterSubAnnotationsPanel`, allowing for more granular,
 * field-level filtering. This panel fetches sub-annotation data via an API call.
 * 6.  **Iconography**: Uses helper functions (`getProductIcon`, `getAssetIcon`) to
 * display appropriate icons for "Product" and "Asset" filter items.
 *
 * @param {FilterProps} props - The props for the component.
 * @param {any[]} [props.filters] - An optional array of the currently selected
 * filter objects, used to initialize and sync the component's state.
 * @param {(selectedFilters: any[]) => void} props.onFilterChange - A callback
 * function that is invoked with the complete array of selected filters whenever
 * a selection is made, cleared, or modified.
 *
 * @returns {React.ReactElement} A React element rendering the filter sidebar UI.
 * Returns an empty fragment (`<></>`) during a brief loading state after
 * clearing filters.
 */

//interface for the filter dropdown Props
interface FilterProps {
  filters?: any[];
  onFilterChange: (selectedFilters: any[]) => void;
  isGlossary? : boolean;
  onClose?: () => void;
  availableTypeAliases?: { name: string; count: number }[];
  onTypeAliasClick?: (type: string) => void;
  resourcesTotalSize?: number;
  resourcesStatus?: string;
}

// Function to get icon for product
const getProductIcon = (productName: string) => {
  switch (productName) {
    case 'Analytics Hub':
      return AnalyticsHubIcon;
    case 'BigQuery':
      return BigQueryIcon;
    case 'Cloud BigTable':
      return CloudBigTableIcon;
    case 'Cloud Pub/Sub':
      return CloudPubSubIcon;
    case 'Cloud Spanner':
      return CloudSpannerIcon;
    case 'Cloud Storage':
      return CloudStorageIcon;
    case 'Cloud SQL':
      return CloudSQLIcon;
    case 'Dataform':
      return DataformIcon;
    case 'Dataplex':
      return DataplexIcon;
    case 'Knowledge Catalog':
      return DataplexIcon;
    case 'Dataproc Metastore':
      return DataprocIcon;
    case 'Vertex AI':
      return VertexIcon;
    default:
      return OthersIcon;
  }
};


const getSectionIcon = (title: string): string | null => {
  switch (title) {
    case 'Aspects':
      return FilterAspectsIcon;
    case 'Assets':
      return FilterAssetIcon;
    case 'Products':
      return FilterProductIcon;
    case 'Projects':
      return FilterProjectIcon;
    default:
      return null;
  }
};


const FilterDropdown: React.FC<FilterProps> = ({ filters , onFilterChange, isGlossary = false, onClose }) => {
  // const [anchorEl, setAnchorEl] = useState(null);
  // const [selectedCategory, setSelectedCategory] = useState(null);

 let assets:any = {
    title: 'Assets',
    items: [
      {
        "name": "Bucket",
        "type": "typeAliases"
      },
      {
        "name": "Cluster",
        "type": "typeAliases"
      },
      {
        "name": "Code asset",
        "type": "typeAliases"
      },
      {
        "name": "Connection",
        "type": "typeAliases"
      },
      {
        "name": "Dashboard",
        "type": "typeAliases"
      },
      {
        "name": "Dashboard element",
        "type": "typeAliases"
      },
      {
        "name": "Data exchange",
        "type": "typeAliases"
      },
      {
        "name": "Data source connection",
        "type": "typeAliases"
      },
      {
        "name": "Data stream",
        "type": "typeAliases"
      },
      {
        "name": "Database",
        "type": "typeAliases"
      },
      {
        "name": "Database schema",
        "type": "typeAliases"
      },
      {
        "name": "Dataset",
        "type": "typeAliases"
      },
      {
        "name": "Explore",
        "type": "typeAliases"
      },
      {
        "name": "Feature group",
        "type": "typeAliases"
      },
      {
        "name": "Feature online store",
        "type": "typeAliases"
      },
      {
        "name": "Feature view",
        "type": "typeAliases"
      },
      {
        "name": "Fileset",
        "type": "typeAliases"
      },
      {
        "name": "Folder",
        "type": "typeAliases"
      },
      {
        "name": "Function",
        "type": "typeAliases"
      },
      {
        "name": "Glossary",
        "type": "typeAliases"
      },
      {
        "name": "Glossary Category",
        "type": "typeAliases"
      },
      {
        "name": "Glossary Term",
        "type": "typeAliases"
      },
      {
        "name": "Listing",
        "type": "typeAliases"
      },
      {
        "name": "Look",
        "type": "typeAliases"
      },
      {
        "name": "Model",
        "type": "typeAliases"
      },
      {
        "name": "Repository",
        "type": "typeAliases"
      },
      {
        "name": "Resource",
        "type": "typeAliases"
      },
      {
        "name": "Routine",
        "type": "typeAliases"
      },
      {
        "name": "Service",
        "type": "typeAliases"
      },
      {
        "name": "Table",
        "type": "typeAliases"
      },
      {
        "name": "View",
        "type": "typeAliases"
      },
      {
        "name": "Other",
        "type": "typeAliases"
      }
    ],
    defaultExpanded: false,
  };
  let products:any = {
    title: 'Products',
    items: [
      {
        "name": "Analytics Hub",
        "type": "system"
      },
      {
        "name": "BigQuery",
        "type": "system"
      },
      {
        "name": "Cloud BigTable",
        "type": "system"
      },
      {
        "name": "Cloud Pub/Sub",
        "type": "system"
      },
      {
        "name": "Cloud Spanner",
        "type": "system"
      },
      {
        "name": "Cloud SQL",
        "type": "system"
      },
      {
        "name": "Dataform",
        "type": "system"
      },
      {
        "name": "Knowledge Catalog",
        "type": "system"
      },
      {
        "name": "Dataproc Metastore",
        "type": "system"
      },
      {
        "name": "Vertex AI",
        "type": "system"
      },
      {
        "name": "Others",
        "type": "system"
      }
    ],
    defaultExpanded: false,
  };
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((state: any) => state.user.mode) as string;
  const searchTerm = useSelector((state: any) => state.search.searchTerm);
  const searchSubmitted = useSelector((state: any) => state.search.searchSubmitted);
  const projectsLoaded = useSelector((state: any) => state.projects.isloaded);
  const projectsList = useSelector((state: any) => state.projects.items);
  const [loading, setLoading] = useState(false);
  let annotations:any = {
    title: 'Aspects',
    items: [
    ],
    defaultExpanded: false,
  };
 
  
  let projects:any = {
    title: 'Projects',
    items: [],
    defaultExpanded: false,
  };
  if(annotations && user?.appConfig && user?.appConfig.aspects && Array.isArray(user?.appConfig.aspects)){
    const seen = new Set<string>();
    annotations.items = user?.appConfig.aspects
      .map((aspect:any) => ({
        name: aspect.dataplexEntry.entrySource.displayName || (aspect.dataplexEntry.name ? aspect.dataplexEntry.name.split('/').pop() : ''),
        type: "aspectType",
        data: aspect.dataplexEntry
      }))
      .filter((item: { name: string; type: string; data: Record<string, unknown> }) => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });
  }
  if(projects && user?.appConfig && user?.appConfig.projects && Array.isArray(user?.appConfig.projects)){
    let plist:any = projectsLoaded ? projectsList : user?.appConfig.projects;
    let p:any = plist.map((project:any) => ({
      name: project.projectId,
      type: "project",
      data: {}
    }));

    projects.items = [
      ...p, 
      {
        name: 'Others',
        type: "project",
        data: {}
      }
    ];
  }


  const [filterData, setFilterData] = useState<any[]>(
    isGlossary
      ? [products, assets, projects]
      : [products, assets, annotations, projects]
  );

  const [showSubAnnotationsPanel, setShowSubAnnotationsPanel] = useState(false);
  const [selectedAnnotationForSubPanel, setSelectedAnnotationForSubPanel] = useState<string>('');
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<string>('');
  const [multiselectPosition, setMultiselectPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedSubAnnotations, setSelectedSubAnnotations] = useState<any[]>([]);
  const [clickPosition, setClickPosition] = useState<{ top: number; right: number } | undefined>(undefined);
  const [subAnnotationData, setSubAnnotationData] = useState<any[]>([]);
  const [subAnnotationsloaded, setSubAnnotationsloaded] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<any[]>(filters ?? []);
  const selectedFiltersRef = useRef(selectedFilters);
  selectedFiltersRef.current = selectedFilters;

  useEffect(() => {
    if(!projectsLoaded) {
      dispatch(getProjects({ id_token: user?.token }));
    }
  }, []);

  useEffect(() => {
    if(projectsLoaded){
      let plist:any = projectsList;
      let p:any = plist.map((project:any) => ({
        name: project.projectId,
        type: "project",
        data: {}
      }));
      setFilterData((prevData:any) => prevData.map((filterCategory:any) => {
        if(filterCategory.title === 'Projects'){
          return { ...filterCategory, items: [...p, { name: 'Others', type: "project", data: {} }] };
        }
        return filterCategory;
      }));
    }
  }, [projectsLoaded]);
  // Keep internal selection in sync with parent-provided filters
  useEffect(() => {
    setSelectedFilters(filters ?? []);
  }, [filters]);

  // Auto-select/clear filters when search is explicitly submitted (Enter or autocomplete select)
  useEffect(() => {
    if (!searchSubmitted) return;
    if (isGlossary) return;

    const currentFilters = selectedFiltersRef.current;

    if (searchTerm && searchTerm.length >= 3) {
      // Check for matching asset (typeAliases)
      const matchingAsset = assets.items.find((asset: any) =>
        asset.name.toLowerCase() === searchTerm.toLowerCase()
      );

      // Check for matching product (system), including aliases for renamed products
      const PRODUCT_SEARCH_ALIASES: Record<string, string> = {
        "dataplex universal catalog": "Knowledge Catalog",
      };
      const matchingProduct = products.items.find((product: any) =>
        product.name.toLowerCase() === searchTerm.toLowerCase()
      ) || products.items.find((product: any) =>
        PRODUCT_SEARCH_ALIASES[searchTerm.toLowerCase()] === product.name
      );

      if (matchingAsset) {
        // Clear ALL existing filters, set only the matching asset filter
        const updatedFilters = [{ name: matchingAsset.name, type: matchingAsset.type, data: matchingAsset.data }];
        if (JSON.stringify(updatedFilters) !== JSON.stringify(currentFilters)) {
          setSelectedFilters(updatedFilters);
          onFilterChange(updatedFilters);
        }
      } else if (matchingProduct) {
        // Clear ALL existing filters, set only the matching product filter
        const updatedFilters = [{ name: matchingProduct.name, type: matchingProduct.type, data: matchingProduct.data }];
        if (JSON.stringify(updatedFilters) !== JSON.stringify(currentFilters)) {
          setSelectedFilters(updatedFilters);
          onFilterChange(updatedFilters);
        }
      } else {
        // No matching asset or product — clear typeAliases filters only
        const nonAssetFilters = currentFilters.filter((f: any) => f.type !== 'typeAliases');
        if (nonAssetFilters.length !== currentFilters.length) {
          setSelectedFilters(nonAssetFilters);
          onFilterChange(nonAssetFilters);
        }
      }
    } else {
      // Search term empty/short — clear typeAliases filters
      const nonAssetFilters = currentFilters.filter((f: any) => f.type !== 'typeAliases');
      if (nonAssetFilters.length !== currentFilters.length) {
        setSelectedFilters(nonAssetFilters);
        onFilterChange(nonAssetFilters);
      }
    }

    dispatch({ type: 'search/setSearchSubmitted', payload: false });
  }, [searchSubmitted]);



  useEffect(() => {
    // Re-construct projects list
    let plist:any = projectsLoaded ? projectsList : (user?.appConfig?.projects || []);
    let pItems = plist.map((project:any) => ({
      name: project.projectId,
      type: "project",
      data: {}
    }));
    
    pItems.push({ name: 'Others', type: "project", data: {} });

    const newProjects = { ...projects, items: pItems };

    setFilterData(
      isGlossary
        ? [products, assets, newProjects]
        : [products, assets, annotations, newProjects]
    );
    
  }, [projectsLoaded, user?.appConfig]);

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'Aspects': false,
    'Assets': false,
    'Products': false,
    'Projects': false
  });

  // Auto-expand accordions when search term exists or specific product is selected

const handleCheckboxChange = (filter: any) => {
    const isSelected = selectedFilters.some(item => item.name === filter.name && item.type === filter.type);

    const updatedFilters = isSelected
      ? selectedFilters.filter((f) => !(f.name === filter.name && f.type === filter.type))
      : [...selectedFilters, filter];

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters);

    if (!isGlossary) {
      dispatch({ type: 'search/setSearchFilters', payload: { searchFilters: updatedFilters } });

      if (filter.type === 'system' && filter.name === "BigQuery") {
        if (!updatedFilters.find(item => item.name === filter.name)) {
          dispatch({ type: 'search/setSearchType', payload: { searchType: 'All' } });
        }
      }
    }
  };


  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSections({
      'Products': false,
      'Assets': false,
      'Aspects': false,
      'Projects': false,
      [panel]: isExpanded
    });
  };

  // Removed useEffect to prevent automatic filter changes on mount/unmount

  const handleFilterClear = () => {
    setSelectedFilters([]);
    onFilterChange([]); // Notify parent
    dispatch({ type: 'search/setSearchFilters', payload: { searchFilters: [] } });
    dispatch({ type: 'search/setSearchType', payload: { searchType: 'All' } });
    setLoading(true);
    setTimeout(() => {
      setLoading(false);  
    }, 100); // Simulate loading delay
  };


  const handleViewAllItems = (filterType: string, event: React.MouseEvent) => {
    setCurrentFilterType(filterType);
    
    // Get the position of the clicked accordion to position the modal adjacent to it
    const accordionElement = event.currentTarget.closest('.MuiAccordion-root');
    if (accordionElement) {
      const rect = accordionElement.getBoundingClientRect();
      const headerElement = accordionElement.querySelector('.MuiAccordionSummary-root');
      const headerRect = headerElement ? headerElement.getBoundingClientRect() : rect;
      const expectedModalWidth = 400; 
      const spaceOnRight = window.innerWidth - rect.right;
      
      setMultiselectPosition({
        top: ((headerRect.top + window.scrollY + 341) > window.innerHeight) 
          ? window.innerHeight - 360
          : headerRect.top + window.scrollY,

        left: spaceOnRight > expectedModalWidth + 32 
          ? (rect.right + 16) 
          : Math.max(16, rect.left - expectedModalWidth - 16)
      });
    }
    
    setShowMultiSelect(true);
  };


  const handleMultiSelectChange = (selectedItems: string[]) => {
    console.log('Generic multiselect change:', selectedItems, 'for filter:', currentFilterType);
    
    // Find the current filter data
    const currentFilter = filterData.find((f: any) => f.title === currentFilterType);
    if (!currentFilter) return;

    // Convert selected items to filter format, preserving existing subAnnotationData
    const filterType = currentFilter.items[0]?.type || 'typeAliases';
    const newFilters = selectedItems.map(item => {
      const existing = selectedFilters.find(sf => sf.name === item && sf.type === filterType);
      return existing ?? { name: item, type: filterType };
    });

    // Remove existing filters of this type
    const filteredSelectedFilters = selectedFilters.filter((sf: any) => sf.type !== (currentFilter.items[0]?.type || 'typeAliases'));
    
    // Add new filters
    const updatedFilters = [...filteredSelectedFilters, ...newFilters];
    
    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleCloseMultiSelect = () => {
    setShowMultiSelect(false);
    setCurrentFilterType('');
    setMultiselectPosition(null);
    // Also close the sub-annotations panel if it's open
    if (showSubAnnotationsPanel) {
      handleCloseSubAnnotationsPanel();
    }
  };

  // Mock data for sub-annotations - in real app this would come from API
  const getSubAnnotationsForAnnotation = async (annotationData: any) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${user?.token ?? ''}`;
    
    const response = await axios.post(URLS.API_URL + URLS.GET_ASPECT_DETAIL, {
      name:annotationData.entrySource.resource
    });

    const data = await response.data;
    console.log('filter subannotations', data);
    
    // Transform recordFields to include type information
    // For demo purposes, create sample fields that match the ideal design
    const sampleFields = [
      { name: 'Temaplate_Field', type: 'string' }
    ];
    
    const transformedFields = data.metadataTemplate.recordFields?.map((r: any) => ({
      name: String(r.name || ''),
      displayName: r.annotations?.displayName || undefined,
      type: r.type || 'string', // Default to string if type is not specified
      enumValues: r.enumValues?.length ? r.enumValues.map((val: any) => {
        // API returns enum values as objects with { name, index, deprecated }
        if (typeof val === 'object' && val !== null) {
          return val.name || val.value || val.label || JSON.stringify(val);
        }
        return String(val);
      }) : undefined
    })) || sampleFields;
    
    setSubAnnotationData(transformedFields);
    setSubAnnotationsloaded(true);
  };

  const handleEditNoteClick = (annotationName: string, data:any, event: React.MouseEvent) => {
    setSelectedAnnotationForSubPanel(annotationName);
    setSubAnnotationData([]);
    setSubAnnotationsloaded(false);
    getSubAnnotationsForAnnotation(data);
    
    // Restore previously applied sub-annotation values if they exist
    const existingFilter = selectedFilters.find(filter =>
      filter.name === annotationName && filter.type === 'aspectType'
    );
    setSelectedSubAnnotations(existingFilter?.subAnnotationData ?? []);
    
    const rect = event.currentTarget.getBoundingClientRect();
    setClickPosition({ top: rect.top, right: rect.right });

    setShowSubAnnotationsPanel(true);
  };

  const handleSubAnnotationsChange = (selectedSubAnnotations: any[]) => {
    setSelectedSubAnnotations(selectedSubAnnotations);
    
    // Don't auto-check parent annotation - this will be handled by Apply button
    console.log('Sub-annotations changed for', selectedAnnotationForSubPanel, ':', selectedSubAnnotations);
  };

  const handleCloseSubAnnotationsPanel = () => {
    setShowSubAnnotationsPanel(false);
    setSelectedAnnotationForSubPanel('');
    setClickPosition(undefined);
  };

  const handleSubAnnotationsApply = (appliedSubAnnotations: any[]) => {
    // When Apply button is clicked in FilterSubAnnotationsPanel, check the parent annotation
    if (appliedSubAnnotations.length > 0) {
      const parentAnnotation = {
        name: selectedAnnotationForSubPanel,
        type: 'aspectType',
        subAnnotationData: appliedSubAnnotations // You can include additional data if needed
      };
      
      // Add parent annotation to selected filters if not already present
      if (!selectedFilters.some(filter => filter.name === selectedAnnotationForSubPanel && filter.type === 'aspectType')) {
        const updatedFilters = [...selectedFilters, parentAnnotation];
        setSelectedFilters(updatedFilters);
        onFilterChange(updatedFilters);
      }else{

        const updatedFilters = [...selectedFilters.filter(filter => filter.name !== selectedAnnotationForSubPanel && filter.type === 'aspectType'), parentAnnotation];
        setSelectedFilters(updatedFilters);
        onFilterChange(updatedFilters);
      }
    } else {
      // If no sub-annotations are applied, remove the parent annotation
      const updatedFilters = selectedFilters.filter(filter => 
        !(filter.name === selectedAnnotationForSubPanel && filter.type === 'aspectType')
      );
      setSelectedFilters(updatedFilters);
      onFilterChange(updatedFilters);
    }
    
    // Close the panel
    handleCloseSubAnnotationsPanel();
  };

  // Debug useEffect to monitor selectedFilters changes
  // useEffect(() => {
  //   console.log('selectedFilters changed:', selectedFilters);
  // }, [selectedFilters]);

  // const handleMenuOpen = (event:any) => {
  //   setAnchorEl(event.currentTarget);
  // };

  // const handleMenuClose = () => {
  //   setAnchorEl(null);
  // };

  // const handleMenuItemClick = (category:any) => {
  //   setSelectedCategory(category);
  //   handleMenuClose();
  //   // Apply the filter logic here
  // };

  const currentModalOptions = useMemo(() => {
    if (!currentFilterType || !showMultiSelect) return [];
    
    const filter = filterData.find((f: any) => f.title === currentFilterType);
    return filter?.items.map((item: any) => item.name) || [];
  }, [filterData, currentFilterType, showMultiSelect]);

  return !loading ? (
    <Box
      sx={{
        overflowY: "auto",
        scrollbarWidth: "none", // Firefox
        "&::-webkit-scrollbar": { display: "none" }, // Chrome/Safari
        "-ms-overflow-style": "none", // IE and Edge
        maxHeight: "100%",
        backgroundColor: isGlossary ? "#F2F4FC" : "transparent",
      }}
    >
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: isGlossary ? '0px' : '0px 16px 24px 20px',
        gap: '20px',
      }}>
        {/* Header: Filters / Clear / X */}
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            position: isGlossary ? "relative" : "sticky",
            top: 0,
            zIndex: 1,
            backgroundColor: isGlossary ? "#F2F4FC" : (mode === 'dark' ? '#282a2c' : '#F2F4FC'),
            padding: isGlossary ? "0px" : "24px 0 0 0",
        }}>
            <Typography sx={{fontWeight: 500, fontSize: "16px", lineHeight: "24px", color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', fontFamily: '"Google Sans", sans-serif'}}>Filters</Typography>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '24px' }}>
              <Button onClick={handleFilterClear}
                disabled={selectedFilters.length === 0}
                sx={{
                  fontFamily: '"Google Sans", sans-serif',
                  fontWeight: 700,
                  color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                  fontSize: "12px",
                  lineHeight: "16px",
                  letterSpacing: "0.1px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0px",
                  textTransform: "none",
                  minWidth: "auto",
                  opacity: 1,
                  '&.Mui-disabled': {
                    color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                    opacity: 0.3,
                  },
              }}>Clear</Button>
              {onClose && (
                <IconButton
                  onClick={onClose}
                  size="small"
                  sx={{
                    padding: '8px',
                    color: mode === 'dark' ? '#9aa0a6' : '#575757',
                    '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                  }}
                >
                  <CloseIcon sx={{ fontSize: '16px' }} />
                </IconButton>
              )}
            </div>
        </div>

        {/* Accordion Sections */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          width: "100%",
          padding: 0,
        }}>
        {filterData.map((filter:any) =>
          (
            <Accordion
              key={filter.title}
              expanded={expandedSections[filter.title] || filter.defaultExpanded}
              onChange={handleAccordionChange(filter.title)}
              disableGutters
              sx={{
                    background: 'none',
                    boxShadow: 'none',
                    width: '100%',
                    margin: 0,
                    borderTop: `1px solid ${mode === 'dark' ? '#3c4043' : '#DADCE0'}`,
                    '&:first-of-type': { borderTop: 'none' },
                    borderRadius: '0 !important',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': { margin: 0 },
                    '&:has(.MuiAccordionSummary-root:hover)': { borderColor: 'transparent' },
                    '&:has(.MuiAccordionSummary-root:hover) + .MuiAccordion-root': { borderColor: 'transparent' },
                  }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: mode === 'dark' ? '#9aa0a6' : '#575757', fontSize: '24px' }} />}
                aria-controls={filter.title+"-content"}
                id={filter.title+"-header"}
                sx={{
                  padding: '12px 4px',
                  minHeight: 'unset !important',
                  borderRadius: '8px',
                  '& .MuiAccordionSummary-content': { margin: 0 },
                  '&.Mui-expanded': { minHeight: 'unset !important' },
                  '& .MuiAccordionSummary-expandIconWrapper': { marginRight: 0 },
                  '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(138, 180, 248, 0.16)' : '#D3E3FD' },
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  {getSectionIcon(filter.title) && (
                    <img
                      src={getSectionIcon(filter.title)!}
                      alt=""
                      style={{
                        width: '20px',
                        height: '20px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Typography component="span"
                    sx={{fontWeight: 400, fontSize:"14px", lineHeight:"20px", color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F', fontFamily:'"Product Sans", sans-serif'}}>
                      {filter.title}
                  </Typography>
                </div>
              </AccordionSummary>
              <AccordionDetails sx={{
                padding: '0 0 8px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                fontWeight: '400',
              }}>
                {
                  (filter.title === 'Assets' || filter.title === 'Products' ?
                    filter.items :
                    filter.items.slice(0, 10)
                  ).map((item:any, index: number) => (
                    <Box key={`${filter.title}-${item.name}-${index}`} sx={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      height: '24px',
                      gap: '8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      px: '4px',
                      '&:hover': {
                        backgroundColor: mode === 'dark' ? '#3c4043' : '#E7F0FE',
                      },
                    }}>
                      <FormControlLabel
                        control={
                        <Checkbox
                          checked={selectedFilters.some(i => i.name === item.name && i.type === item.type)}
                          icon={
                            <Box sx={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              border: `2px solid ${mode === 'dark' ? '#9aa0a6' : '#575757'}`,
                            }} />
                          }
                          checkedIcon={
                            <Box sx={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              border: `2px solid ${mode === 'dark' ? '#8ab4f8' : '#022FCD'}`,
                              backgroundColor: mode === 'dark' ? '#8ab4f8' : '#022FCD',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <CheckIcon sx={{ fontSize: '14px', color: mode === 'dark' ? '#1e1f20' : '#FFFFFF' }} />
                            </Box>
                          }
                          sx={{
                            padding: '8px',
                            '& .MuiSvgIcon-root': {
                              width: '18px',
                              height: '18px',
                            },
                          }}
                        />}
                        label={
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flex: '1 1 auto',
                            overflow: 'hidden',
                          }}>
                            {filter.title === 'Products' && getProductIcon(item.name) && (
                              <img
                                src={getProductIcon(item.name)!}
                                alt={item.name}
                                style={{ width: '16px', height: '16px', flexShrink: 0 }}
                              />
                            )}
                            {filter.title === 'Assets' && isGlossaryAssetType(item.name) && (
                              getGlossaryMuiIcon(assetNameToGlossaryType(item.name), {
                                size: '16px',
                                color: '#022FCD',
                              })
                            )}
                            {filter.title === 'Assets' && !isGlossaryAssetType(item.name) && getAssetIcon(item.name) && (
                              <img
                                src={item.name === 'Database schema' ? DatabaseSchemaBlueIcon : getAssetIcon(item.name)!}
                                alt={item.name}
                                style={{ width: '16px', height: '16px', flexShrink: 0 }}
                              />
                            )}
                            <Tooltip title={item.name} disableHoverListener={item.name.length <= 20} arrow placement="top">
                              <span style={{
                                flex: '1 1 auto',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '12px',
                                lineHeight: '16px',
                                color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                                fontWeight: '400',
                                fontFamily: '"Product Sans", sans-serif',
                              }}>
                                {item.name}
                              </span>
                            </Tooltip>
                          </div>
                        }
                        sx={{
                          margin: 0,
                          flex: '1 1 auto',
                          minWidth: 0,
                          overflow: 'hidden',
                          '& .MuiFormControlLabel-label': {
                            flex: '1 1 auto',
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                          },
                        }}
                        onChange={() => handleCheckboxChange(item)}
                      />
                      {filter.title === 'Aspects' && (
                        <EditNoteOutlinedIcon
                          data-testid="edit-note-icon"
                          sx={{ fontSize: '16px', color: mode === 'dark' ? '#9aa0a6' : '#575757', cursor: 'pointer', flexShrink: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditNoteClick(item.name, item.data, e);
                          }}
                        />
                      )}
                    </Box>
                  ))
                }
                {(filter.title !== 'Assets' && filter.title !== 'Products' && (filter.items.length > 10)) && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    padding: 0,
                    marginTop: '4px',
                  }}>
                    <Button
                      onClick={(e) => handleViewAllItems(filter.title, e)}
                      sx={{
                        color: mode === 'dark' ? '#8ab4f8' : '#0B57D0',
                        fontSize: '12px',
                        fontWeight: '400',
                        fontFamily: '"Product Sans", sans-serif',
                        lineHeight: '16px',
                        letterSpacing: '0.1px',
                        textTransform: 'none',
                        padding: '0',
                        paddingLeft: '12px',
                        minWidth: 'auto',
                        justifyContent: 'flex-start',
                        '&:hover': {
                          backgroundColor: 'transparent',
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      Show more
                    </Button>
                  </div>
                )}
              </AccordionDetails>
            </Accordion>
          )
        )}
      </div>

       {/* Other Accordions for different filter types */}


    {/* MultiSelect Modal for all filter types */}
    {showMultiSelect && currentFilterType && multiselectPosition && (
      <FilterAnnotationsMultiSelect
        options={currentModalOptions}
        value={selectedFilters.filter((sf:any) => sf.type === (filterData.find((f:any) => f.title === currentFilterType)?.items[0]?.type || 'typeAliases')).map((sf:any) => sf.name)}
        onChange={handleMultiSelectChange}
        onClose={handleCloseMultiSelect}
        isOpen={showMultiSelect}
        filterType={currentFilterType}
        position={multiselectPosition}
        onEditNote={(optionName, iconTop, modalRight) => {
          const currentFilter = filterData.find((f: { title: string }) => f.title === currentFilterType);
          const item = currentFilter?.items.find((i: { name: string }) => i.name === optionName);
          if (item) {
            setSelectedAnnotationForSubPanel(item.name);
            setSubAnnotationData([]);
            setSubAnnotationsloaded(false);
            getSubAnnotationsForAnnotation(item.data);
            const existingFilter = selectedFilters.find(filter =>
              filter.name === item.name && filter.type === 'aspectType'
            );
            setSelectedSubAnnotations(existingFilter?.subAnnotationData ?? []);
            setClickPosition({ top: iconTop, right: modalRight });
            setShowSubAnnotationsPanel(true);
          }
        }}
      />
    )}

      {/* Sub-Annotations Panel */}
      {showSubAnnotationsPanel && (
        <FilterSubAnnotationsPanel
          annotationName={selectedAnnotationForSubPanel}
          subAnnotations={subAnnotationData}
          subAnnotationsloader={!subAnnotationsloaded}
          selectedSubAnnotations={selectedSubAnnotations}
          onSubAnnotationsChange={handleSubAnnotationsChange}
          onSubAnnotationsApply={handleSubAnnotationsApply}
          onClose={handleCloseSubAnnotationsPanel}
          isOpen={showSubAnnotationsPanel}
          clickPosition={clickPosition}
        />
      )}
    </Box>
    </Box>
  ) : (<></>);
}

export default FilterDropdown;