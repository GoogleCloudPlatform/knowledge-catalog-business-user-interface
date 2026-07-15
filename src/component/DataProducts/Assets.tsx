import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  Skeleton
} from '@mui/material';
import { useSelector } from 'react-redux';
import DataProductAssets from './DataProductAssets';
import { useAuth } from '../../auth/AuthProvider';
import axios from 'axios';

/**
 * @file DetailPageOverview.tsx
 * @summary Renders the "Overview" tab content for the data entry detail page.
 *
 * @description
 * This component displays a detailed overview of a specific data entry.
 * It's structured using a `Grid` layout with a main left panel (9 columns)
 * and a right sidebar (3 columns).
 *
 * **Left Panel:**
 * - **Details Accordion**: Shows key metadata like description, system, status,
 * location, and copyable identifiers (Resource, FQN).
 * - **Table Info Accordion** (Conditional): Rendered only if the entry is a
 * table (`getEntryType(entry.name, '/') == 'Tables'`). Contains tabs for:
 * - **Schema**: Displays the table schema using the `Schema` component,
 * with filtering provided by `SchemaFilter`.
 * - **Sample Data**: Displays sample rows (if `sampleTableData` is provided)
 * using `TableView`, with filtering provided by `TableFilter`. Handles
 * data structure validation and potential errors during rendering.
 * - **Documentation Accordion**: Renders documentation content (potentially HTML)
 * from the entry's overview aspect.
 *
 * **Right Sidebar:**
 * - **Contacts Accordion**: Lists associated contacts with roles, using the
 * `Avatar` component.
 * - **Info Accordion**: Displays creation and last modification timestamps.
 * - **Usage Metrics Accordion**: Shows metrics like Execution Time, Total Queries,
 * and Refresh Time, extracted from the entry's usage aspect.
 * - **Labels Accordion**: Displays key-value labels associated with the entry
 * as styled chips (grid layout).
 *
 * The component uses several helper components (`Schema`, `TableView`, `Avatar`,
 * `SchemaFilter`, `TableFilter`) and utility functions (`getFormattedDateTimeParts`,
 * `getEntryType`, `hasData`). It also includes a recursive `FieldRenderer` to
 * display various data types (string, number, list, struct) appropriately.
 * It leverages the `useNotification` hook to provide feedback when identifiers
 * are copied to the clipboard.
 * Accordions are conditionally expanded by default based on whether they contain
 * data (`hasData` helper).
 *
 * @param {object} props - The props for the DetailPageOverview component.
 * @param {any} props.entry - The main data entry object containing all details,
 * aspects (schema, contacts, usage, overview), and metadata.
 * @param {any} [props.sampleTableData] - Optional. An array of sample row data,
 * typically used when the entry is a table.
 * @param {React.CSSProperties} props.css - Optional CSS properties to apply
 * to the root `div` container.
 *
 * @returns {JSX.Element} The rendered React component for the Overview tab.
 */

const StringRenderer = ({ value }:any) => {
  // Check if the string contains HTML tags
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  if (isHtml) {
    // If it's HTML, render it directly. CAUTION: This can be a security risk (XSS) if the HTML is from an untrusted source.
    return <div dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return <span style={{fontSize:"14px", textTransform:"capitalize", padding:"0px 5px"}}>{value}</span>;
};

const NumberRenderer = ({ value }:any) => {
  return <span style={{fontSize:"14px"}}>{value}</span>;
};

const BooleanRenderer = ({ value }:any) => {
  return value ? 
    <span style={{fontSize:"14px"}}>TRUE</span> : 
    <span style={{fontSize:"14px"}}>FALSE</span>;
};

const ListRenderer = ({ values }:any) => {
  return (<>
      {values.map((item:any) => (
            <FieldRenderer field={item} />
      ))}
  </>);
};

const StructRenderer = ({ fields }: any) => {
  return (
    <Box style={{paddingTop:"10px"}}>
      {Object.entries(fields).map(([key, value]) => (
        <div key={key}>
            <span style={{fontWeight:"600", fontSize:"12px", textTransform:"capitalize"}}>{key.replace(/_/g, ' ')}:</span>
            <FieldRenderer field={value} />
        </div>   
      ))}
      <br/>
    </Box>
  );
};

// --- The Main Field Renderer (Component) ---

const FieldRenderer = ({ field } : any) => {
  if (!field || !field.kind) {
    return <span style={{fontSize:"14px"}}>-</span>; 
  }

  switch (field.kind) {
    case 'stringValue':
      return <StringRenderer value={field.stringValue} />;
    case 'numberValue':
      return <NumberRenderer value={field.numberValue} />;
    case 'boolValue':
      return <BooleanRenderer value={field.boolValue} />;
    case 'listValue':
      return <ListRenderer values={field.listValue.values} />;
    case 'structValue':
      return <StructRenderer fields={field.structValue.fields} />;
    default:
      return <span  style={{fontWeight:"500", fontSize:"14px"}}>Unknown kind: {field.kind}</span>;
  }
};

// //interface for the component props
interface AssetsProps {
  entry: any;
  css?: React.CSSProperties; // Optional CSS properties for the button
  onAssetPreviewChange?: (data: any) => void;
}

// Tab component
const Assets: React.FC<AssetsProps> = ({ entry, css, onAssetPreviewChange  }) => {


    //const dispatch = useDispatch<AppDispatch>();
    const {dataProductAssets, dataProductAssetsStatus }= useSelector((state: any) => state.dataProducts);
    const [dataProductsAssetsList, setDataProductsAssetsList] = useState([]);
    const [assetListLoader, setAssetListLoader] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth();
    const id_token = user?.token;
    // const [assetPreviewData, setAssetPreviewData] = useState<any | null>(null);
    // const [isAssetPreviewOpen, setIsAssetPreviewOpen] = useState(false);
      

    const number = entry?.entryType?.split('/')[1];

    useEffect(() => {
        console.log('num', number);
        // Reset loader when loading new data product
        if(dataProductAssetsStatus === 'loading'){
            setAssetListLoader(false);
            return;
        }
        // Handle failed state (API returns error when no assets)
        if(dataProductAssetsStatus === 'failed'){
            setDataProductsAssetsList([]);
            setAssetListLoader(true);
            return;
        }
        if(dataProductAssetsStatus !== 'succeeded') return;
        if(dataProductAssets.length === 0){
            setDataProductsAssetsList([]);
            setAssetListLoader(true);
            return;
        }

        if(dataProductAssetsStatus === 'succeeded' && dataProductAssets.length > 0){
            let a = dataProductAssets.map((item: any) => {
                let p = item.resource.split('projects/')[1].split('/').length == 5 ?
                    `${item.resource.split('projects/')[1].split('/')[0]}.${item.resource.split('projects/')[1].split('/')[2]}.${item.resource.split('projects/')[1].split('/')[4]}`:
                    `${item.resource.split('projects/')[1].split('/')[0]}.${item.resource.split('projects/')[1].split('/')[2]}`;
                let b = item.resource.includes('//') ? item.resource.split('projects/')[0].split('.')[0].slice(2) : 'bigquery';
                return b + ':' + p;
            });
            let searchTerm = 'fully_qualified_name=(' + a.join(' | ');
            searchTerm += ')';
            const requestResourceData = {
                query: searchTerm,
            }
            axios.post(
            `https://dataplex.googleapis.com/v1/projects/${import.meta.env.VITE_GOOGLE_PROJECT_ID}/locations/global:searchEntries`,
                requestResourceData,
                {
                    headers: {
                    Authorization: `Bearer ${user?.token}`,
                    'Content-Type': 'application/json',
                    },
                }
            ).then((response:any) => {
                console.log('fet Ass', response.data);
                //response.data.results.map()
                setDataProductsAssetsList(response.data.results);
                console.log(dataProductsAssetsList);
                setTimeout(() => {
                  setAssetListLoader(true);
                }, 300)
                
            }).catch((error:any) => {
                console.error('Error fetching data product assets details:', error);
            });
        }
    }, [dataProductAssets, dataProductAssetsStatus]);


    // useEffect(() => {
    //     if (entry?.name ==='projects/data-studio-459108/locations/us-central1/entryGroups/@dataplex/entries/projects/1069578231809/locations/us-central1/dataProducts/acme-shopstream-sales-performance') {
    //         setDataProductsAssetsList(acmeAssetsSampleData);
    //     }else if (entry?.name ==='projects/data-studio-459108/locations/us-central1/entryGroups/@dataplex/entries/projects/1069578231809/locations/us-central1/dataProducts/cymbal-customer-experience-and-retention') {
    //         setDataProductsAssetsList(cymbalAssetsSampleData);
    //     } else {
    //         setDataProductsAssetsList([]);
    //     }
    // }, [dataProductAssets]);

    //sorting handlers
    // const handleSortMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    //     setSortAnchorEl(event.currentTarget);
    // };
    
    // const handleSortMenuClose = () => {
    //     setSortAnchorEl(null);
    // };
    
    // const handleSortOptionSelect = (option: 'name' | 'lastModified') => {
    //     setSortBy(option);
    //     //setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    //     setDataProductsAssetsList(dataProductsAssetsList);
    //     handleSortMenuClose();
    // };

    // const sortItems = (items: any[]) => {
    //     return [...items].sort((a, b) => {
    //     if (sortBy === 'name') {
    //         const nameA = a.displayName.toLowerCase();
    //         const nameB = b.displayName.toLowerCase();
    //         if (sortOrder === 'asc') return nameA.localeCompare(nameB);
    //         return nameB.localeCompare(nameA);
    //     } else {
    //         // Last Modified (Number)
    //         const dateA = a.updateTime || 0;
    //         const dateB = b.updateTime || 0;
    //         if (sortOrder === 'asc') return dateA - dateB; // Oldest first
    //         return dateB - dateA; // Newest first
    //     }
    //     });
    // };



  return (
    <div> 
      <Paper
        elevation={0} 
        sx={{ 
          flex: 1,
          borderRadius: '24px', 
          backgroundColor: 'transparent', 
          border: 'transparent',
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          position: 'relative'
        }}
        style={{...css}}
      >
        <Box 
        >
            {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.1, position: 'relative', top: '40px', left: '20px' }}>
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search data products Assets"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '54px',
                            height: '32px',
                            fontFamily: 'Google Sans Text',
                            fontSize: '12px',
                            fontWeight: 500,
                            letterSpacing: '0.1px',
                            marginRight: '10px',
                            color: '#5E5E5E',
                            '& fieldset': { borderColor: '#DADCE0' },
                            '&:hover fieldset': { borderColor: '#A8A8A8' },
                            '&.Mui-focused fieldset': { borderColor: '#022FCD', borderWidth: '1.5px' },
                        },
                        width: '350px',
                        '& .MuiInputBase-input': {
                            padding: '6px 12px',
                            '&::placeholder': {
                                color: '#5E5E5E',
                                opacity: 1,
                            },
                        },
                        boxShadow: 'none',
                    }}
                    InputProps={{
                        startAdornment: <Search sx={{ color: '#575757', fontSize: 20, mr: 1 }} />,
                    }}
                />
                <>
                    {dataProductAssetsStatus === 'succeeded' && dataProductsAssetsList.length > 0 && (() => {
              
                        return (
                            <FilterTag
                                key={`type-All`}
                                handleClick={() => {}}
                                handleClose={() => {}}
                                showCloseButton={false}
                                css={{
                                margin: "0px",
                                textTransform: "capitalize",
                                fontFamily: '"Google Sans Text", sans-serif',
                                fontWeight: 400,
                                fontSize: '12px',
                                letterSpacing: '0.83%',
                                padding: '8px 13px',
                                borderRadius: '59px',
                                gap: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: false ? '#E7F0FE' : 'transparent',
                                color: false ? '#022FCD' : '#1F1F1F',
                                border: false ? 'none' : '1px solid #DADCE0',
                                height: '32px',
                                whiteSpace: 'nowrap'
                                }}
                                text={`All ${dataProductsAssetsList.length}`}
                                />
                            )
                    })}
                    <GridFilterListIcon />
                    <Typography component="span" style={{ margin: "0px 5px", fontSize: "12px", fontWeight: "500" }}>
                        Sort by:
                    </Typography>
                    <Typography 
                    component="span" 
                    style={{ 
                        margin: "0px 5px", 
                        fontSize: "12px", 
                        fontWeight: "500", 
                        display: "flex", 
                        alignItems: "center",
                        cursor: "pointer",
                        color: "#1F1F1F"
                    }}
                    onClick={handleSortMenuClick}
                    >
                        {sortBy === 'name' ? 'Name' : 'Last Modified'} 
                        <KeyboardArrowDown style={{ marginLeft: "2px" }} />
                    </Typography>
                </>

                <Menu
                    anchorEl={sortAnchorEl}
                    open={Boolean(sortAnchorEl)}
                    onClose={() => {console.log("closing")}}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                    }}
                    PaperProps={{
                        style: {
                            marginTop: '4px',
                            borderRadius: '8px',
                            boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            minWidth: '140px'
                        }
                    }}
                >
                    <MenuItem 
                    onClick={() =>{handleSortOptionSelect('name')}}
                    style={{
                        fontSize: '12px',
                        fontWeight: sortBy === 'name' ? '500' : '400',
                        color: sortBy === 'name' ? '#0B57D0' : '#1F1F1F',
                        backgroundColor: sortBy === 'name' ? '#F8FAFD' : 'transparent'
                    }}
                    >
                    Name
                    </MenuItem>
                    <MenuItem 
                    onClick={() => {handleSortOptionSelect('lastModified')}}
                    style={{
                        fontSize: '12px',
                        fontWeight: sortBy === 'lastModified' ? '500' : '400',
                        color: sortBy === 'lastModified' ? '#0B57D0' : '#1F1F1F',
                        backgroundColor: sortBy === 'lastModified' ? '#F8FAFD' : 'transparent'
                    }}
                    >
                    Last Modified
                    </MenuItem>
                </Menu>
                

            </Box> */}


            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                padding: '0px',
                height: '100%',
                overflowY: 'visible',
                backgroundColor: 'transparent'
            }}>
                {
                    !assetListLoader && (
                        <Box sx={{ padding: '10px 20px', width: '100%', boxSizing: 'border-box' }}>
                            {/* Header skeleton: Filter button + Search bar ONLY */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                <Skeleton variant="rounded" width={85} height={32} sx={{ borderRadius: '59px' }} />
                                <Skeleton variant="rounded" width={350} height={32} sx={{ borderRadius: '54px' }} />
                            </Box>
                            
                            {/* Table skeleton */}
                            <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E8EEF5', width: '100%', overflow: 'hidden' }}>
                                {/* Table Header */}
                                <Box sx={{ display: 'flex', padding: '12px 20px', borderBottom: '1px solid #DADCE0', gap: '20px' }}>
                                    <Skeleton variant="text" width="30%" height={20} />
                                    <Skeleton variant="text" width="40%" height={20} />
                                    <Skeleton variant="text" width="15%" height={20} />
                                    <Skeleton variant="text" width="15%" height={20} />
                                </Box>
                                {/* Table Rows */}
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <Box key={index} sx={{ display: 'flex', padding: '16px 20px', borderBottom: index < 5 ? '1px solid #E8EEF5' : 'none', gap: '20px', alignItems: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', width: '30%' }}>
                                            <Skeleton variant="rounded" width={24} height={24} sx={{ borderRadius: '4px', flexShrink: 0 }} />
                                            <Skeleton variant="text" width="70%" height={20} />
                                        </Box>
                                        <Skeleton variant="text" width="40%" height={20} />
                                        <Skeleton variant="text" width="15%" height={20} />
                                        <Skeleton variant="text" width="15%" height={20} />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )
                }
                {(dataProductAssetsStatus === 'succeeded' || dataProductAssetsStatus === 'failed') && dataProductAssets.length === 0 && assetListLoader && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '85px', width: '100%' }}>
                        <Typography variant="body1" sx={{ color: '#0C1226CC' }}>No Data Product Assets found.</Typography>
                    </Box>
                )}
                {dataProductAssetsStatus === 'succeeded' && dataProductAssets.length > 0 && assetListLoader && (
                    // dataProductsAssetsList.map((resource: any, index: number) => {
                    //     console.log("Resource in Data Product Assets:", resource);
                    //     //const isSelected = previewData && previewData.name === resource.dataplexEntry.name;
                    //     //const disableHoverEffect = selectedIndex !== -1 && selectedIndex === index - 1;
                    //     //const hideTopBorder = hoveredIndex === index - 1;
                    //     return (
                    //         <Box
                    //         key={resource.dataplexEntry.name}
                    //         onClick={() => {}}
                    //         onMouseEnter={() => {}}
                    //         onMouseLeave={() => {}}
                    //         sx={{
                    //             backgroundColor: '#ffffff',
                    //             cursor: 'pointer',
                    //             borderRadius: '8px',
                    //             padding: '0px',
                    //             marginLeft: '-0.5rem'
                    //         }}
                    //         >
                    //                 <SearchEntriesCard
                    //                     index={index}
                    //                     entry={resource.dataplexEntry}
                    //                     hideTopBorderOnHover={true}
                    //                     sx={{ backgroundColor: 'transparent', borderRadius: true ? '8px' : '0px', marginTop: false ? '-1px' : '0px',  marginBottom: false ? '-2px' : '10px', border: '1px solid #efefef' }}
                    //                     isSelected={false}
                    //                     onDoubleClick={() => {}}
                    //                     disableHoverEffect={true}
                    //                 />
                    //                 </Box>
                    //             );
                    // })
                    <Box>
                        <DataProductAssets
                        linkedAssets={dataProductsAssetsList || []}
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        idToken={id_token || ''}
                        onAssetPreviewChange={(data) => {
                            onAssetPreviewChange && onAssetPreviewChange(data);
                        }}
                        />
                    </Box>
                )}  
                </Box>
        </Box>
        </Paper>
        </div>
    
  );
}

export default Assets;