import {Box, CircularProgress, Tooltip, Typography} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Tag from '../Tags/Tag';
import { DateRangeOutlined, LocationOnOutlined, LockOutlined } from '@mui/icons-material';
import BigQueryProductIcon from '../../assets/svg/BigQuery.svg';
import LookerStudioIcon from "/assets/svg/looker-icon.svg";
import './SearchEntriesCard.css';
import { type SxProps, type Theme } from '@mui/material/styles';
import { fetchEntry, checkEntryAccess, clearHistory } from '../../features/entry/entrySlice';
import type { AppDispatch } from '../../app/store';
import { generateBigQueryLink, generateLookerStudioLink, getEntryType } from '../../utils/resourceUtils';
import { debounce } from '../../utils/debounce';
import DatabaseIcon from '../../assets/svg/database_icon.svg';
import BucketIcon from '../../assets/svg/bucket_icon.svg';
import ClusterIcon from '../../assets/svg/cluster_icon.svg';
import CodeAssetIcon from '../../assets/svg/code_asset_icon.svg';
import ConnectionIcon from '../../assets/svg/connection_icon.svg';
import DashboardIcon from '../../assets/svg/dashboard_icon.svg';
import DashboardElementIcon from '../../assets/svg/dashboard_element_icon.svg';
import DataExchangeIcon from '../../assets/svg/data_exchange_icon.svg';
import DataStreamIcon from '../../assets/svg/data_stream_icon.svg';
import DatabaseSchemaIcon from '../../assets/svg/database_schema_icon.svg';
import DatasetIcon from '../../assets/svg/dataset_icon.svg';
import ExploreIcon from '../../assets/svg/explore_icon.svg';
import FeatureGroupIcon from '../../assets/svg/feature_group_icon.svg';
import FeatureOnlineStoreIcon from '../../assets/svg/feature_online_store_icon.svg';
import ViewIcon from '../../assets/svg/view_icon.svg';
import FilesetIcon from '../../assets/svg/fileset_icon.svg';
import FolderIcon from '../../assets/svg/folder_icon.svg';
import FunctionIcon from '../../assets/svg/function_icon.svg';
import { isGlossaryAssetType, getGlossaryMuiIcon, assetNameToGlossaryType } from '../../constants/glossaryIcons';
import ListingIcon from '../../assets/svg/listing_icon.svg';
import LookIcon from '../../assets/svg/look_icon.svg';
import ModelIcon from '../../assets/svg/model_icon.svg';
import RepositoriesIcon from '../../assets/svg/repositories_icon.svg';
import GenericIcon from '../../assets/svg/generic_icon.svg';
import SchedulerIcon from '../../assets/svg/scheduler_icon.svg';
import TableIcon from '../../assets/svg/table_icon.svg';

/**
 * @file SearchEntriesCard.tsx
 * @description
 * This component renders a single card (row) for displaying a data entry in a
 * search results list.
 *
 * It visualizes key metadata from the `entry` prop, including:
 * 1.  **Icon**: A product-specific icon (e.g., BigQuery, Dataplex) derived
 * from the entry's system name.
 * 2.  **Name**: The display name of the entry.
 * 3.  **Tags**: `Tag` components for the system (e.g., "BigQuery") and the
 * entry type (e.g., "Table").
 * 4.  **Metadata**: The last modified date and the asset's location.
 * 5.  **Description**: A truncated (2-line) description of the entry.
 *
 * The component supports visual selection (`isSelected`), a double-click
 * action (`onDoubleClick`), and various props to control its hover effects
 * and border styling.
 *
 * @param {SearchEntriesCardProps} props - The props for the component.
 * @param {any} props.entry - The data entry object containing all the
 * metadata to be displayed.
 * @param {SxProps<Theme>} [props.sx] - (Optional) Material-UI SX props to
 * apply custom styling to the root `Box` container.
 * @param {boolean} [props.isSelected=false] - (Optional) If true, the card
 * is rendered with a selected (blue) background.
 * @param {(entry: any) => void} [props.onDoubleClick] - (Optional) A callback
 * function that is triggered when the card is double-clicked.
 * @param {boolean} [props.disableHoverEffect=false] - (Optional) If true,
 * the default "lift" on hover is disabled.
 * @param {boolean} [props.hideTopBorderOnHover=false] - (Optional) If true,
 * the top border rule on hover is suppressed.
 * @param {number} [props.index] - (Optional) The index of the card in the
 * list, used to suppress the top border for the first item (index 0).
 *
 * @returns {React.ReactElement} A React element representing the search entry card.
 */

// import { useFavorite } from '../../hooks/useFavorite';
interface SearchEntriesCardProps {
  // handleClick: any | (() => void); // Function to handle search, can be any function type
  entry: any; // text to be displayed on the button
  sx?: SxProps<Theme>; // Optional CSS properties for the button
  isSelected?: boolean; // Whether this card is currently selected
  onDoubleClick?: (entry: any) => void; // Function to handle double-click
  disableHoverEffect?: boolean;
  hideTopBorderOnHover?: boolean;
  index?: number;
  onNavigateToTab?: (entry: any, tabName: string) => void;
  id_token?: string;
  onRequestAccess?: (entry: any) => void;
}

// const getProductIcon = (productName: string) => {
//   switch (productName) {
//     case 'ANALYTICS_HUB':
//       return AnalyticsHubIcon;
//     case 'BIGQUERY':
//       return BigQueryIcon;
//     case 'CLOUD_BIGTABLE':
//       return CloudBigTableIcon;
//     case 'CLOUD_PUBSUB':
//       return CloudPubSubIcon;
//     case 'CLOUD_SPANNER':
//       return CloudSpannerIcon;
//     case 'CLOUD_STORAGE':
//       return CloudStorageIcon;
//     case 'CLOUD_SQL':
//       return CloudSQLIcon;
//     case 'DATAFORM':
//       return DataformIcon;
//     case 'DATAPLEX':
//       return DataplexIcon;
//     case 'DATAPLEX_UNIVERSAL_CATALOG':
//       return DataplexIcon;
//     case 'DATAPROC_METASTORE':
//       return DataprocIcon;
//     case 'VERTEX_AI':
//       return VertexIcon;
//     default:
//       return OthersIcon;
//   }
// };

const getAssetIcon = (assetName: string) => {
  switch (assetName) {
    case 'Bucket':
      return BucketIcon;
    case 'Cluster':
      return ClusterIcon;
    case 'Code asset':
      return CodeAssetIcon;
    case 'Connection':
      return ConnectionIcon;
    case 'Dashboard':
      return DashboardIcon;
    case 'Dashboard element':
      return DashboardElementIcon;
    case 'Data exchange':
    case 'Exchange':
      return DataExchangeIcon;
    case 'Data source connection':
      return ConnectionIcon;
    case 'Data stream':
      return DataStreamIcon;
    case 'Database':
      return DatabaseIcon;
    case 'Database schema':
      return DatabaseSchemaIcon;
    case 'Dataset':
      return DatasetIcon;
    case 'Explore':
      return ExploreIcon;
    case 'Feature group':
      return FeatureGroupIcon;
    case 'Feature online store':
      return FeatureOnlineStoreIcon;
    case 'Feature view':
      return ViewIcon;
    case 'Fileset':
      return FilesetIcon;
    case 'Folder':
      return FolderIcon;
    case 'Function':
      return FunctionIcon;
    case 'Listing':
      return ListingIcon;
    case 'Look':
      return LookIcon;
    case 'Model':
      return ModelIcon;
    case 'Repository':
      return RepositoriesIcon;
    case 'View':
      return ViewIcon;
    case 'Resource':
      return GenericIcon;
    case 'Routine':
      return SchedulerIcon;
    case 'Table':
      return TableIcon;
    default:
      return GenericIcon;
  }
};
const SearchEntriesCard: React.FC<SearchEntriesCardProps> = ({ entry, sx, isSelected = false, onDoubleClick, disableHoverEffect: _disableHoverEffect = false, hideTopBorderOnHover: _hideTopBorderOnHover = false, index: _index, onNavigateToTab, id_token = '', onRequestAccess}) => {
  const entryData = entry;//useState<any>(entry);
  //const [parentName, setParentName] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [entryType, setEntryType] = useState<string>('');
  const [modifiedDate, setModifiedDate] = useState<string>('');
  const [systemName, setSystemName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  // isHovered state removed — hover visuals now handled by CSS for instant response

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const mode = useSelector((state: any) => state.user.mode) as string;
  const accessCheckCache = useSelector((state: any) => state.entry.accessCheckCache) ?? {};
  const entryAccessStatus = accessCheckCache[entry.name]?.status as string | undefined;
  const isAccessConfirmed = entryAccessStatus === 'succeeded';
  const isAccessLoading = entryAccessStatus === 'loading';
  const hasBigQueryTable = entry.name && getEntryType(entry.name, '/') === 'Tables'
    && entry.entrySource?.system?.toLowerCase() === 'bigquery';
  const bigQueryLink = generateBigQueryLink(entry);
  const lookerStudioLink = generateLookerStudioLink(entry);

  const debouncedCheckAccess = useMemo(
    () => debounce((entryName: string, token: string) => {
      dispatch(checkEntryAccess({ entryName, id_token: token }));
    }, 600),
    [dispatch]
  );
  
  // Use shared favorite state
  // const { isFavorite, toggleFavorite } = useFavorite(entry.name);
  //const [avatarColors, setAvatarColors] = useState<{bg: string, text: string}>({bg: '#E3F2FD', text: '#1976D2'});

  // Function to generate random theme colors
  // const generateRandomColors = () => {
  //   const themeColors = [
  //     { bg: '#E3F2FD', text: '#1976D2' }, // Blue theme
  //     { bg: '#E8F5E8', text: '#388E3C' }, // Green theme
  //     { bg: '#FFF3E0', text: '#F57C00' }, // Orange theme
  //     { bg: '#F3E5F5', text: '#7B1FA2' }, // Purple theme
  //     { bg: '#FCE4EC', text: '#C2185B' }, // Pink theme
  //     { bg: '#E0F2F1', text: '#00796B' }, // Teal theme
  //     { bg: '#FFF8E1', text: '#F9A825' }, // Amber theme
  //     { bg: '#FFEBEE', text: '#D32F2F' }, // Red theme
  //     { bg: '#E1F5FE', text: '#0288D1' }, // Light Blue theme
  //     { bg: '#F1F8E9', text: '#689F38' }, // Light Green theme
  //     { bg: '#FFF2CC', text: '#F57F17' }, // Yellow theme
  //     { bg: '#EFEBE9', text: '#5D4037' }, // Brown theme
  //   ];
    
  //   const randomIndex = Math.floor(Math.random() * themeColors.length);
  //   return themeColors[randomIndex];
  // };


//   const getNames = (namePath: string = '' , separator: string = '' ) => {
//     const segments: string[] = namePath.split(separator);
//     //let eType = segments[segments.length - 2];
//     return segments[segments.length - 1];
//     //setParentName(segments[segments.length - 3] !== import.meta.env.VITE_GCP_PROJECT_ID ? segments[segments.length - 3] : '');
//   };

  // const handleFavoriteClick = (event: React.MouseEvent) => {
  //   event.stopPropagation(); // Prevent triggering the parent onClick
  //   const newStatus = toggleFavorite();
  //   console.log('Favorite toggled for:', name, 'New state:', newStatus);
  // };
  const capitalizeFirstLetter = (string: string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  useEffect(() => {
    // getNames(entry.name, '/');
    // setName(entry.entrySource.displayName.length > 0 ? entry.entrySource.displayName : getNames(entry.name || '', '/'));
    let calculatedName = '';
    if (entry.entrySource.displayName && entry.entrySource.displayName.length > 0) {
      calculatedName = entry.entrySource.displayName;
    } else if (entry.name) {
      const segments = entry.name.split('/');
      calculatedName = segments[segments.length - 1];
    }
    setName(calculatedName);
    const rawSystem = entry.entrySource.system ?? 'Custom';
    const SYSTEM_DISPLAY_NAMES: Record<string, string> = { "dataplex universal catalog": "Knowledge Catalog", "dataplex": "Knowledge Catalog" };
    setSystemName(SYSTEM_DISPLAY_NAMES[rawSystem.toLowerCase()] || rawSystem);
    setEntryType(entry.entryType.split('-').length > 1 ? entry.entryType.split('-').pop() : entry.name.split('/').at(-2).charAt(0).toUpperCase() + entry.name.split('/').at(-2).slice(1));
    const myDate = (typeof entry.updateTime !== 'string') ? new Date(entry.updateTime.seconds * 1000) : new Date(entry.updateTime);
    const formattedDate = new Intl.DateTimeFormat('en-US', { month: "short" , day: "numeric", year: "numeric" }).format(myDate);
    setModifiedDate(formattedDate);
    setDescription(entry.entrySource.description ?? '');
    
    // Generate random avatar colors for this card
    //setAvatarColors(generateRandomColors());
  }, [entry]);

  return (
    <>
      <Box sx={{
        flex: '1 1 auto',
        minWidth: 0,
        ...sx,
      }}>
        <Box
          onDoubleClick={() => onDoubleClick?.(entry)}
          onMouseEnter={() => {
            if (!accessCheckCache[entry.name]) {
              debouncedCheckAccess(entry.name, id_token);
            }
          }}
          sx={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: isSelected ? (mode === 'dark' ? '#004a76' : '#EDF2FC') : (mode === 'dark' ? '#131314' : '#FFFFFF'),
            border: isSelected ? (mode === 'dark' ? '1px solid #8ab4f8' : '1px solid #022FCD') : (mode === 'dark' ? '1px solid #3c4043' : '1px solid #DADCE0'),
            borderRadius: '16px',
            height: '120px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
          className={`entriesHoverEffect${isSelected ? ' selected' : ''}`}
          >
          {/* Row 1: Icon + Title + Action Icons */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flex: 'none',
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: '8px',
              flex: '1 1 auto',
              minWidth: 0,
            }}>
              {isGlossaryAssetType(capitalizeFirstLetter(entryType)) ? (
                getGlossaryMuiIcon(assetNameToGlossaryType(capitalizeFirstLetter(entryType)), {
                  size: '24px',
                  color: '#022FCD',
                })
              ) : getAssetIcon(capitalizeFirstLetter(entryType)) ? (
                <img
                  src={getAssetIcon(capitalizeFirstLetter(entryType))!}
                  alt={capitalizeFirstLetter(entryType)}
                  style={{
                    width: '24px',
                    height: '24px',
                    flex: '0 0 auto',
                    // Tint the asset-type SVG to #076AFF
                    filter: 'brightness(0) saturate(100%) invert(14%) sepia(97%) saturate(3439%) hue-rotate(231deg) brightness(87%) contrast(100%)',
                  }}
                />
              ) : null}
              <Typography component="span"
                  variant="heading2Medium"
                  sx={{
                    color: mode === 'dark' ? '#e3e3e3' : '#1F1F1F',
                    fontSize: "16px",
                    fontFamily: '"Google Sans", sans-serif',
                    fontWeight: 500,
                    flex: '1 1 auto',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                  {name}
                </Typography>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              flex: '0 0 auto',
              gap: '20px',
            }}>
              {/* Aspects — always shown */}
              {isAccessConfirmed ? (
                <Tooltip title="Aspects" arrow placement="top">
                  <Box component="span" sx={{ cursor: 'pointer', display: 'flex', padding: '6px', margin: '-6px', borderRadius: '50%', transition: 'background-color 0.2s ease', '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' } }} onClick={(e) => { e.stopPropagation(); onNavigateToTab?.(entry, 'aspects'); }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <mask id="mask_aspects" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20"><rect width="20" height="20" fill="#D9D9D9"/></mask>
                      <g mask="url(#mask_aspects)"><path d="M3.33464 17.5C2.8763 17.5 2.48394 17.3368 2.15755 17.0104C1.83116 16.684 1.66797 16.2917 1.66797 15.8333V4.16667C1.66797 3.70833 1.83116 3.31597 2.15755 2.98958C2.48394 2.66319 2.8763 2.5 3.33464 2.5H16.668C17.1263 2.5 17.5187 2.66319 17.8451 2.98958C18.1714 3.31597 18.3346 3.70833 18.3346 4.16667V15.8333C18.3346 16.2917 18.1714 16.684 17.8451 17.0104C17.5187 17.3368 17.1263 17.5 16.668 17.5H3.33464ZM3.33464 15.8333H16.668V4.16667H3.33464V15.8333ZM5.0013 14.1667H15.0013V12.5H5.0013V14.1667ZM5.0013 10.8333H8.33464V5.83333H5.0013V10.8333ZM10.0013 10.8333H15.0013V9.16667H10.0013V10.8333ZM10.0013 7.5H15.0013V5.83333H10.0013V7.5Z" fill="#575757"/></g>
                    </svg>
                  </Box>
                </Tooltip>
              ) : isAccessLoading ? (
                <CircularProgress size={16} sx={{ color: '#575757' }} />
              ) : (
                <span style={{ display: 'flex', opacity: 0.4 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <mask id="mask_aspects_d" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20"><rect width="20" height="20" fill="#D9D9D9"/></mask>
                    <g mask="url(#mask_aspects_d)"><path d="M3.33464 17.5C2.8763 17.5 2.48394 17.3368 2.15755 17.0104C1.83116 16.684 1.66797 16.2917 1.66797 15.8333V4.16667C1.66797 3.70833 1.83116 3.31597 2.15755 2.98958C2.48394 2.66319 2.8763 2.5 3.33464 2.5H16.668C17.1263 2.5 17.5187 2.66319 17.8451 2.98958C18.1714 3.31597 18.3346 3.70833 18.3346 4.16667V15.8333C18.3346 16.2917 18.1714 16.684 17.8451 17.0104C17.5187 17.3368 17.1263 17.5 16.668 17.5H3.33464ZM3.33464 15.8333H16.668V4.16667H3.33464V15.8333ZM5.0013 14.1667H15.0013V12.5H5.0013V14.1667ZM5.0013 10.8333H8.33464V5.83333H5.0013V10.8333ZM10.0013 10.8333H15.0013V9.16667H10.0013V10.8333ZM10.0013 7.5H15.0013V5.83333H10.0013V7.5Z" fill="#575757"/></g>
                  </svg>
                </span>
              )}
              {/* Lineage — only for BigQuery Tables */}
              {hasBigQueryTable && (
                isAccessConfirmed ? (
                  <Tooltip title="Lineage" arrow placement="top">
                    <Box component="span" sx={{ cursor: 'pointer', display: 'flex', padding: '6px', margin: '-6px', borderRadius: '50%', transition: 'background-color 0.2s ease', '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' } }} onClick={(e) => { e.stopPropagation(); onNavigateToTab?.(entry, 'lineage'); }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <mask id="mask_lineage" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20"><rect width="20" height="20" fill="#D9D9D9"/></mask>
                        <g mask="url(#mask_lineage)"><path d="M9.9987 18.75C9.1237 18.75 8.38411 18.4479 7.77995 17.8437C7.17578 17.2396 6.8737 16.5 6.8737 15.625C6.8737 14.9028 7.08898 14.2674 7.51953 13.7188C7.95009 13.1701 8.4987 12.7986 9.16536 12.6042V10.8333H4.16536V7.5H2.08203V1.66667H7.91536V7.5H5.83203V9.16667H14.1654V7.39583C13.4987 7.20139 12.9501 6.82986 12.5195 6.28125C12.089 5.73264 11.8737 5.09722 11.8737 4.375C11.8737 3.5 12.1758 2.76042 12.7799 2.15625C13.3841 1.55208 14.1237 1.25 14.9987 1.25C15.8737 1.25 16.6133 1.55208 17.2174 2.15625C17.8216 2.76042 18.1237 3.5 18.1237 4.375C18.1237 5.09722 17.9084 5.73264 17.4779 6.28125C17.0473 6.82986 16.4987 7.20139 15.832 7.39583V10.8333H10.832V12.6042C11.4987 12.7986 12.0473 13.1701 12.4779 13.7188C12.9084 14.2674 13.1237 14.9028 13.1237 15.625C13.1237 16.5 12.8216 17.2396 12.2174 17.8437C11.6133 18.4479 10.8737 18.75 9.9987 18.75ZM14.9987 5.83333C15.4015 5.83333 15.7452 5.69097 16.0299 5.40625C16.3147 5.12153 16.457 4.77778 16.457 4.375C16.457 3.97222 16.3147 3.62847 16.0299 3.34375C15.7452 3.05903 15.4015 2.91667 14.9987 2.91667C14.5959 2.91667 14.2522 3.05903 13.9674 3.34375C13.6827 3.62847 13.5404 3.97222 13.5404 4.375C13.5404 4.77778 13.6827 5.12153 13.9674 5.40625C14.2522 5.69097 14.5959 5.83333 14.9987 5.83333ZM3.7487 5.83333H6.2487V3.33333H3.7487V5.83333ZM9.9987 17.0833C10.4015 17.0833 10.7452 16.941 11.0299 16.6563C11.3147 16.3715 11.457 16.0278 11.457 15.625C11.457 15.2222 11.3147 14.8785 11.0299 14.5938C10.7452 14.309 10.4015 14.1667 9.9987 14.1667C9.59592 14.1667 9.25217 14.309 8.96745 14.5938C8.68273 14.8785 8.54036 15.2222 8.54036 15.625C8.54036 16.0278 8.68273 16.3715 8.96745 16.6563C9.25217 16.941 9.59592 17.0833 9.9987 17.0833Z" fill="#575757"/></g>
                      </svg>
                    </Box>
                  </Tooltip>
                ) : isAccessLoading ? (
                  <CircularProgress size={16} sx={{ color: '#575757' }} />
                ) : (
                  <span style={{ display: 'flex', opacity: 0.4 }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <mask id="mask_lineage_d" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20"><rect width="20" height="20" fill="#D9D9D9"/></mask>
                      <g mask="url(#mask_lineage_d)"><path d="M9.9987 18.75C9.1237 18.75 8.38411 18.4479 7.77995 17.8437C7.17578 17.2396 6.8737 16.5 6.8737 15.625C6.8737 14.9028 7.08898 14.2674 7.51953 13.7188C7.95009 13.1701 8.4987 12.7986 9.16536 12.6042V10.8333H4.16536V7.5H2.08203V1.66667H7.91536V7.5H5.83203V9.16667H14.1654V7.39583C13.4987 7.20139 12.9501 6.82986 12.5195 6.28125C12.089 5.73264 11.8737 5.09722 11.8737 4.375C11.8737 3.5 12.1758 2.76042 12.7799 2.15625C13.3841 1.55208 14.1237 1.25 14.9987 1.25C15.8737 1.25 16.6133 1.55208 17.2174 2.15625C17.8216 2.76042 18.1237 3.5 18.1237 4.375C18.1237 5.09722 17.9084 5.73264 17.4779 6.28125C17.0473 6.82986 16.4987 7.20139 15.832 7.39583V10.8333H10.832V12.6042C11.4987 12.7986 12.0473 13.1701 12.4779 13.7188C12.9084 14.2674 13.1237 14.9028 13.1237 15.625C13.1237 16.5 12.8216 17.2396 12.2174 17.8437C11.6133 18.4479 10.8737 18.75 9.9987 18.75ZM14.9987 5.83333C15.4015 5.83333 15.7452 5.69097 16.0299 5.40625C16.3147 5.12153 16.457 4.77778 16.457 4.375C16.457 3.97222 16.3147 3.62847 16.0299 3.34375C15.7452 3.05903 15.4015 2.91667 14.9987 2.91667C14.5959 2.91667 14.2522 3.05903 13.9674 3.34375C13.6827 3.62847 13.5404 3.97222 13.5404 4.375C13.5404 4.77778 13.6827 5.12153 13.9674 5.40625C14.2522 5.69097 14.5959 5.83333 14.9987 5.83333ZM3.7487 5.83333H6.2487V3.33333H3.7487V5.83333ZM9.9987 17.0833C10.4015 17.0833 10.7452 16.941 11.0299 16.6563C11.3147 16.3715 11.457 16.0278 11.457 15.625C11.457 15.2222 11.3147 14.8785 11.0299 14.5938C10.7452 14.309 10.4015 14.1667 9.9987 14.1667C9.59592 14.1667 9.25217 14.309 8.96745 14.5938C8.68273 14.8785 8.54036 15.2222 8.54036 15.625C8.54036 16.0278 8.68273 16.3715 8.96745 16.6563C9.25217 16.941 9.59592 17.0833 9.9987 17.0833Z" fill="#575757"/></g>
                    </svg>
                  </span>
                )
              )}
              {/* Data Quality — only for BigQuery Tables */}
              {hasBigQueryTable && (
                isAccessConfirmed ? (
                  <Tooltip title="Data Quality" arrow placement="top">
                    <Box component="span" sx={{ cursor: 'pointer', display: 'flex', padding: '6px', margin: '-6px', borderRadius: '50%', transition: 'background-color 0.2s ease', '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' } }} onClick={(e) => { e.stopPropagation(); onNavigateToTab?.(entry, 'dataQuality'); }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 7.52083C11.2361 7.52083 12.4792 7.33681 13.7292 6.96875C14.9792 6.60069 15.6806 6.22917 15.8333 5.85417C15.6806 5.45139 14.9826 5.06944 13.7396 4.70833C12.4965 4.34722 11.25 4.16667 10 4.16667C8.73611 4.16667 7.49653 4.34375 6.28125 4.69792C5.06597 5.05208 4.36111 5.4375 4.16667 5.85417C4.36111 6.22917 5.06597 6.60069 6.28125 6.96875C7.49653 7.33681 8.73611 7.52083 10 7.52083ZM15 19.1667C13.8472 19.1667 12.8646 18.7604 12.0521 17.9479C11.2396 17.1354 10.8333 16.1528 10.8333 15C10.8333 13.8472 11.2396 12.8646 12.0521 12.0521C12.8646 11.2396 13.8472 10.8333 15 10.8333C16.1528 10.8333 17.1354 11.2396 17.9479 12.0521C18.7604 12.8646 19.1667 13.8472 19.1667 15C19.1667 16.1528 18.7604 17.1354 17.9479 17.9479C17.1354 18.7604 16.1528 19.1667 15 19.1667ZM9.22917 15.8125C9.27083 16.1181 9.33333 16.4097 9.41667 16.6875C9.5 16.9653 9.60417 17.2361 9.72917 17.5C8.71528 17.4861 7.77083 17.3889 6.89583 17.2083C6.02083 17.0278 5.25694 16.7882 4.60417 16.4896C3.95139 16.191 3.4375 15.8437 3.0625 15.4479C2.6875 15.0521 2.5 14.625 2.5 14.1667V5.83333C2.5 4.91667 3.23264 4.13194 4.69792 3.47917C6.16319 2.82639 7.93056 2.5 10 2.5C12.0694 2.5 13.8368 2.82639 15.3021 3.47917C16.7674 4.13194 17.5 4.91667 17.5 5.83333V9.72917C17.2361 9.60417 16.9653 9.5 16.6875 9.41667C16.4097 9.33333 16.125 9.27083 15.8333 9.22917V7.9375C15.1111 8.34028 14.25 8.64583 13.25 8.85417C12.25 9.0625 11.1667 9.16667 10 9.16667C8.81944 9.16667 7.72917 9.0625 6.72917 8.85417C5.72917 8.64583 4.875 8.34028 4.16667 7.9375V10.0417C4.875 10.6944 5.78125 11.1285 6.88542 11.3437C7.98958 11.559 9.02778 11.6667 10 11.6667H10.2292C10.0486 11.9167 9.89236 12.1806 9.76042 12.4583C9.62847 12.7361 9.51389 13.0278 9.41667 13.3333C8.36111 13.2778 7.38194 13.1493 6.47917 12.9479C5.57639 12.7465 4.80556 12.4653 4.16667 12.1042V14.1667C4.26389 14.3472 4.47222 14.5313 4.79167 14.7188C5.11111 14.9063 5.5 15.0729 5.95833 15.2187C6.41667 15.3646 6.92708 15.4896 7.48958 15.5938C8.05208 15.6979 8.63194 15.7708 9.22917 15.8125Z" fill="#575757"/>
                        <path d="M13.8863 16.3455L12.4384 14.8976L11.9453 15.3872L13.8863 17.3281L18.053 13.1615L17.5634 12.6719L13.8863 16.3455Z" fill="white"/>
                      </svg>
                    </Box>
                  </Tooltip>
                ) : isAccessLoading ? (
                  <CircularProgress size={16} sx={{ color: '#575757' }} />
                ) : (
                  <span style={{ display: 'flex', opacity: 0.4 }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 7.52083C11.2361 7.52083 12.4792 7.33681 13.7292 6.96875C14.9792 6.60069 15.6806 6.22917 15.8333 5.85417C15.6806 5.45139 14.9826 5.06944 13.7396 4.70833C12.4965 4.34722 11.25 4.16667 10 4.16667C8.73611 4.16667 7.49653 4.34375 6.28125 4.69792C5.06597 5.05208 4.36111 5.4375 4.16667 5.85417C4.36111 6.22917 5.06597 6.60069 6.28125 6.96875C7.49653 7.33681 8.73611 7.52083 10 7.52083ZM15 19.1667C13.8472 19.1667 12.8646 18.7604 12.0521 17.9479C11.2396 17.1354 10.8333 16.1528 10.8333 15C10.8333 13.8472 11.2396 12.8646 12.0521 12.0521C12.8646 11.2396 13.8472 10.8333 15 10.8333C16.1528 10.8333 17.1354 11.2396 17.9479 12.0521C18.7604 12.8646 19.1667 13.8472 19.1667 15C19.1667 16.1528 18.7604 17.1354 17.9479 17.9479C17.1354 18.7604 16.1528 19.1667 15 19.1667ZM9.22917 15.8125C9.27083 16.1181 9.33333 16.4097 9.41667 16.6875C9.5 16.9653 9.60417 17.2361 9.72917 17.5C8.71528 17.4861 7.77083 17.3889 6.89583 17.2083C6.02083 17.0278 5.25694 16.7882 4.60417 16.4896C3.95139 16.191 3.4375 15.8437 3.0625 15.4479C2.6875 15.0521 2.5 14.625 2.5 14.1667V5.83333C2.5 4.91667 3.23264 4.13194 4.69792 3.47917C6.16319 2.82639 7.93056 2.5 10 2.5C12.0694 2.5 13.8368 2.82639 15.3021 3.47917C16.7674 4.13194 17.5 4.91667 17.5 5.83333V9.72917C17.2361 9.60417 16.9653 9.5 16.6875 9.41667C16.4097 9.33333 16.125 9.27083 15.8333 9.22917V7.9375C15.1111 8.34028 14.25 8.64583 13.25 8.85417C12.25 9.0625 11.1667 9.16667 10 9.16667C8.81944 9.16667 7.72917 9.0625 6.72917 8.85417C5.72917 8.64583 4.875 8.34028 4.16667 7.9375V10.0417C4.875 10.6944 5.78125 11.1285 6.88542 11.3437C7.98958 11.559 9.02778 11.6667 10 11.6667H10.2292C10.0486 11.9167 9.89236 12.1806 9.76042 12.4583C9.62847 12.7361 9.51389 13.0278 9.41667 13.3333C8.36111 13.2778 7.38194 13.1493 6.47917 12.9479C5.57639 12.7465 4.80556 12.4653 4.16667 12.1042V14.1667C4.26389 14.3472 4.47222 14.5313 4.79167 14.7188C5.11111 14.9063 5.5 15.0729 5.95833 15.2187C6.41667 15.3646 6.92708 15.4896 7.48958 15.5938C8.05208 15.6979 8.63194 15.7708 9.22917 15.8125Z" fill="#575757"/>
                      <path d="M13.8863 16.3455L12.4384 14.8976L11.9453 15.3872L13.8863 17.3281L18.053 13.1615L17.5634 12.6719L13.8863 16.3455Z" fill="white"/>
                    </svg>
                  </span>
                )
              )}
            </div>
          </div>

          {/* Row 2: Description */}
          <p style={{
            padding: 0,
            margin: 0,
            fontSize: "14px",
            color: mode === 'dark' ? '#dedfe0' : '#575757',
            lineHeight: '20px',
            height: '20px',
            flex: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 400,
          }}>
            {description.length > 0 ? description : "No Description Available"}
          </p>

          {/* Row 3: Tags + Date + Location + Hover Actions */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: 'space-between',
            gap: '8px',
            flex: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <Tag text={(() => {
                  return systemName.toLowerCase() === 'bigquery' ? 'BigQuery' : systemName.replace("_", " ").replace("-", " ").toLowerCase();
                })()} className="asset-tag" css={{
                  fontFamily: '"Google Sans", sans-serif',
                  color: '#076AFF',
                  background: 'rgba(7, 106, 255, 0.1)',
                  border: '1px solid rgba(7, 106, 255, 0.2)',
                  margin: 0,
                  height: 'auto',
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: '0.2px',
                  lineHeight: 1,
                  borderRadius: '12px',
                  textTransform: "capitalize",
                  flexShrink: 0,
                  cursor: 'default',
                  transition: 'none',
                }}/>
                <Tag text={entryType} className="asset-tag" css={{
                  fontFamily: '"Google Sans", sans-serif',
                  color: '#076AFF',
                  background: 'rgba(7, 106, 255, 0.1)',
                  border: '1px solid rgba(7, 106, 255, 0.2)',
                  margin: 0,
                  height: 'auto',
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: '0.2px',
                  lineHeight: 1,
                  borderRadius: '12px',
                  textTransform: 'capitalize',
                  flexShrink: 0,
                  cursor: 'default',
                  transition: 'none',
                }}/>
              </div>
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#F5FEF8',
                border: '1px solid #C4E9D8',
                borderRadius: '12px',
                padding: '0px 8px',
                height: '24px',
                flex: '0 1 auto',
                minWidth: 0,
              }}>
                <LocationOnOutlined sx={{ fontSize: '14px', color: '#027E4C', flexShrink: 0 }} />
                <Tooltip title={entryData.entrySource.location} arrow placement='top'>
                  <Typography component="span" sx={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#027E4C',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {entryData.entrySource.location.charAt(0).toUpperCase() + entryData.entrySource.location.slice(1)}
                  </Typography>
                </Tooltip>
              </Box>
              <Tooltip title={`Last Modified: ${modifiedDate}`} arrow placement='top'>
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  flex: '0 0 auto',
                  gap: '4px'
                }}>
                  <DateRangeOutlined style={{ fontSize: 16, color: '#979DA2' }}/>
                  <span style={{
                    color: '#979DA2',
                    whiteSpace: 'nowrap',
                    fontFamily: '"Product Sans", sans-serif',
                    fontWeight: 400,
                    fontSize: '14px',
                  }}>{modifiedDate}</span>
                </span>
              </Tooltip>
            </div>

            {/* Hover Action Buttons */}
              <div className="hover-actions" style={{
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}>
                {/* Open in BigQuery */}
                {entry.entrySource?.system?.toLowerCase() === 'bigquery' && (
                  isAccessConfirmed ? (
                    bigQueryLink ? (
                      <Tooltip title="Open in BigQuery" arrow placement="top">
                        <Box
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); window.open(bigQueryLink, '_blank'); }}
                          sx={{
                            width: '32px',
                            height: '32px',
                            border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                            borderRadius: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            transition: 'background-color 0.2s ease',
                            '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' },
                          }}
                        >
                          <img src={BigQueryProductIcon} alt="BigQuery" style={{ width: '20px', height: '20px' }} />
                        </Box>
                      </Tooltip>
                    ) : (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                        borderRadius: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                        opacity: 0.4,
                      }}>
                        <img src={BigQueryProductIcon} alt="BigQuery" style={{ width: '20px', height: '20px' }} />
                      </div>
                    )
                  ) : isAccessLoading ? (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                      borderRadius: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}>
                      <CircularProgress size={16} sx={{ color: '#575757' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                      borderRadius: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      opacity: 0.4,
                    }}>
                      <img src={BigQueryProductIcon} alt="BigQuery" style={{ width: '20px', height: '20px' }} />
                    </div>
                  )
                )}

                {/* Explore with Looker Studio */}
                {entry.entrySource?.system?.toLowerCase() === 'bigquery' && (
                  isAccessConfirmed ? (
                    lookerStudioLink ? (
                      <Tooltip title="Explore with Looker Studio" arrow placement="top">
                        <Box
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); window.open(lookerStudioLink, '_blank'); }}
                          sx={{
                            width: '32px',
                            height: '32px',
                            border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                            borderRadius: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            transition: 'background-color 0.2s ease',
                            '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' },
                          }}
                        >
                          <img src={LookerStudioIcon} alt="Looker Studio" style={{ width: '20px', height: '20px' }} />
                        </Box>
                      </Tooltip>
                    ) : (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                        borderRadius: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                        opacity: 0.4,
                      }}>
                        <img src={LookerStudioIcon} alt="Looker Studio" style={{ width: '20px', height: '20px' }} />
                      </div>
                    )
                  ) : isAccessLoading ? (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                      borderRadius: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}>
                      <CircularProgress size={16} sx={{ color: '#575757' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                      borderRadius: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      opacity: 0.4,
                    }}>
                      <img src={LookerStudioIcon} alt="Looker Studio" style={{ width: '20px', height: '20px' }} />
                    </div>
                  )
                )}

                {/* Details Button */}
                {isAccessConfirmed ? (
                  <Box
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); dispatch(clearHistory()); dispatch(fetchEntry({ entryName: entry.name, id_token })); navigate('/view-details'); }}
                    sx={{
                      height: '32px',
                      padding: '6px 12px',
                      background: mode === 'dark' ? '#a7c6fa' : '#022FCD',
                      borderRadius: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      transition: 'background-color 0.2s ease',
                      '&:hover': { backgroundColor: mode === 'dark' ? '#8fb8f0' : '#2c4ecaff' },
                    }}
                  >
                    <span className="view-details-text" style={{
                      fontFamily: '"Google Sans", sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '20px',
                      letterSpacing: '0.1px',
                      color: mode === 'dark' ? '#072e6f' : '#F0F4F8',
                      whiteSpace: 'nowrap',
                    }}>
                      Details
                    </span>
                  </Box>
                ) : isAccessLoading ? (
                  <div style={{
                    height: '32px',
                    padding: '6px 12px',
                    background: mode === 'dark' ? '#a7c6fa' : '#2c4ecaff',
                    borderRadius: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}>
                    <CircularProgress size={16} sx={{ color: '#F0F4F8' }} />
                  </div>
                ) : (
                  <div style={{
                    height: '32px',
                    padding: '6px 12px',
                    background: mode === 'dark' ? '#a7c6fa' : '#2c4ecaff',
                    borderRadius: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    opacity: 0.4,
                  }}>
                    <span className="view-details-text" style={{
                      fontFamily: '"Google Sans", sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '20px',
                      letterSpacing: '0.1px',
                      color: mode === 'dark' ? '#072e6f' : '#F0F4F8',
                      whiteSpace: 'nowrap',
                    }}>
                      Details
                    </span>
                  </div>
                )}

                {/* Request Access Button */}
                <Box
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRequestAccess?.(entry); }}
                  sx={{
                    height: '32px',
                    padding: '6px 12px',
                    background: 'transparent',
                    border: mode === 'dark' ? '1px solid #5f6368' : '1px solid #C5C7C5',
                    borderRadius: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' },
                  }}
                >
                  <LockOutlined sx={{ fontSize: '16px', color: mode === 'dark' ? '#9aa0a6' : '#575757', flexShrink: 0 }} />
                  <span style={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0.1px',
                    color: mode === 'dark' ? '#9aa0a6' : '#575757',
                    whiteSpace: 'nowrap',
                  }}>
                    Request Access
                  </span>
                </Box>
              </div>
          </div>
        </Box>
      </Box>
    </>
  )
};
export default SearchEntriesCard;