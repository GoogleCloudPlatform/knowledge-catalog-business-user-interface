import React, { useState, useCallback } from 'react';
import {
  Typography,
  Grid,
  Tooltip,
  Box,
  Divider
} from '@mui/material';
import Schema from '../Schema/Schema';
import SchemaFilter from '../Schema/SchemaFilter';
import FilterBar from '../Common/FilterBar';
import type { ActiveFilter, PropertyConfig } from '../Common/FilterBar';
import type { GridColDef, GridRowsProp } from '@mui/x-data-grid';
import TableView from '../Table/TableView';
import { SchemaOutlined as SchemaIcon, Check as CheckIcon, ContentCopy, ListAltOutlined, LocationOnOutlined, LabelOutlined as LabelIcon } from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { normalizeSystemName } from '../../utils/resourceUtils';

const StringRenderer = ({ value }:any) => {
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  if (isHtml) {
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

const AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg, #1CB5E0 0%, #000851 100%)' }, // Blue hue
  { bg: 'linear-gradient(135deg, #56AB2F 0%, #A8E063 100%)' }, // Green hue
  { bg: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)' }, // Red hue
  { bg: 'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)' }, // Amber hue
];

const getAvatarColor = (email: string, excludeBg?: string): string => {
  const code = email.charCodeAt(0) || 0;
  let idx = code % AVATAR_COLORS.length;
  if (excludeBg && AVATAR_COLORS[idx].bg === excludeBg) {
    idx = (idx + 1) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[idx].bg;
};

interface DataProductOverviewNewProps {
  entry: any;
  entryType?: string|null;
  sampleTableData?: any;
  css: React.CSSProperties;
  labels?: Record<string, string>;
}

const OverflowTooltip: React.FC<{ text: string; children: React.ReactElement<{ onMouseEnter?: React.MouseEventHandler<HTMLElement>; onMouseLeave?: React.MouseEventHandler<HTMLElement> }> }> = ({ text, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    setShowTooltip(el.scrollWidth > el.clientWidth);
  };
  const handleMouseLeave = () => {
    setShowTooltip(false);
  };
  return (
    <Tooltip title={showTooltip ? text : ''} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -8] } }] } }}>
      {React.cloneElement(children, { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave })}
    </Tooltip>
  );
};

const DataProductOverviewNew: React.FC<DataProductOverviewNewProps> = ({ entry, entryType, sampleTableData, css, labels: passedLabels }) => {
  const [sampleDataEnabled, setSampleDataEnabled] = React.useState(false);
  const [filteredSchemaEntry, setFilteredSchemaEntry] = useState<any>(null);
  const [sampleFilterText, setSampleFilterText] = useState('');
  const [sampleActiveFilters, setSampleActiveFilters] = useState<ActiveFilter[]>([]);
  const { showNotification } = useNotification();

  const resolveValue = useCallback((val: any): string => {
    if (val == null) return '';
    if (typeof val === 'object' && val.value !== undefined) return String(val.value);
    if (typeof val === 'object') return '';
    return String(val);
  }, []);

  const getSamplePropertyValues = useCallback((property: string): string[] => {
    if (!Array.isArray(sampleTableData) || sampleTableData.length === 0) return [];
    const values = new Set<string>();
    sampleTableData.forEach((row: any) => {
      if (row && typeof row === 'object' && row[property] != null) {
        const resolved = resolveValue(row[property]);
        if (resolved) values.add(resolved);
      }
    });
    return Array.from(values).sort();
  }, [sampleTableData, resolveValue]);


const getFormattedDateTimeParts = (timestamp: any) => {
  if (!timestamp) {
    return { date: '-', time: '' };
  }

  const myDate = new Date(timestamp * 1000);

  const date = new Intl.DateTimeFormat('en-US', {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(myDate);

  const time = new Intl.DateTimeFormat('en-US', {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(myDate);

  return { date, time };
};

const { date: createDate, time: createTime } = (entryType && entryType=='data-product') ? {date : entry?.createTime.split('T')[0], time:entry?.createTime.split('T')[1]?.slice(0, 8)} : getFormattedDateTimeParts(entry?.createTime?.seconds);
const { date: updateDate, time: updateTime } = (entryType && entryType=='data-product') ? {date : entry?.updateTime.split('T')[0], time:entry?.updateTime.split('T')[1]?.slice(0, 8)} : getFormattedDateTimeParts(entry?.updateTime?.seconds);


  const getEntryType = (namePath: string = '' , separator: string = '' ) => {
    const segments: string[] = namePath.split(separator);
    let eType = segments[segments.length - 2];
    return (`${eType[0].toUpperCase()}${eType.slice(1)}`);
  };

  const number = entry.entryType.split('/')[1];

  let schema = <Schema entry={filteredSchemaEntry || entry} sx={{width:"100%", borderTopRightRadius:"0px", borderTopLeftRadius:"0px"}} />;
  let schemaData = entry.aspects[`${number}.global.schema`]?.data?.fields?.fields?.listValue?.values || [];
  let contacts = entry.aspects[`${number}.global.contacts`]?.data?.fields?.identities?.listValue?.values || [];
  // let usage = entry.aspects[`${number}.global.usage`]?.data?.fields || {};
  let documentation = entry.aspects[`${number}.global.overview`]?.data?.fields?.content?.stringValue || 'No Documentation Available';

  if(entryType && entryType == 'data-product') {
    contacts = entry.aspects[`${number}.global.contacts`]?.data?.identities || [];
    console.log("contact DATA - ", contacts);
    documentation = entry.aspects[`${number}.global.overview`]?.data?.content || 'No Documentation Available';
  }

  const finalLabels = passedLabels || entry.labels || entry.entrySource?.labels || {};

  const firstRow = React.useMemo(() => {
    if (Array.isArray(sampleTableData) && sampleTableData.length > 0 && typeof sampleTableData[0] === 'object') {
      return sampleTableData[0];
    }
    return undefined;
  }, [sampleTableData]);

  const columnKeys = React.useMemo(() => (firstRow ? Object.keys(firstRow) : []), [firstRow]);

  const columns: GridColDef[] = React.useMemo(() => (
    columnKeys.map((key) => ({
      field: key,
      headerName: key,
      flex: 1,
      headerClassName: 'table-bg',
      minWidth: 200
    }))
  ), [columnKeys]);

  const columnProperties: PropertyConfig[] = columnKeys.map(key => ({ name: key, mode: 'both' as const }));

  let sampleDataView = <div style={{padding:"10px"}}>Sample Data is not available.</div>;

  if(sampleTableData && Array.isArray(sampleTableData) && sampleTableData.length > 0) {
    try {
      if (!firstRow || typeof firstRow !== 'object') {
        throw new Error('Invalid sample data structure');
      }

      if (columnKeys.length === 0) {
        throw new Error('No columns found in sample data');
      }

      const hasActiveFilters = sampleActiveFilters.length > 0;
      const filteredSampleData = (() => {
        if (!hasActiveFilters) return sampleTableData;
        return sampleTableData.filter((row: any) => {
          if (!row || typeof row !== 'object') return false;
          return sampleActiveFilters.every(filter =>
            filter.values.some(val => {
              const lower = val.toLowerCase();
              if (!filter.property) {
                // Global search: match across all columns
                return columnKeys.some(col =>
                  resolveValue(row[col]).toLowerCase().includes(lower)
                );
              }
              return resolveValue(row[filter.property]).toLowerCase().includes(lower);
            })
          );
        });
      })();
      const displayData = hasActiveFilters ? filteredSampleData : sampleTableData;

      const displayRows: GridRowsProp = displayData.map((row: any, index: number) => {
        try {
          const rowData = { ...row };
          Object.keys(rowData).forEach((key) => {
            const cellValue = rowData[key];
            if (typeof cellValue === 'object' && cellValue !== null) {
                if ("value" in cellValue) {
                    rowData[key] = cellValue.value;
                }
                else if (Object.keys(cellValue).length === 1) {
                    const singleKey = Object.keys(cellValue)[0];
                    rowData[key] = cellValue[singleKey];
                }
                else {
                    rowData[key] = JSON.stringify(cellValue);
                }
            }
        });
          return ({ ...rowData, id: index + 1 });
        } catch (rowError) {
          console.warn(`Error processing row ${index}:`, rowError);
          return {
            id: index + 1,
            error: 'Row processing failed',
            ...Object.keys(row).reduce((acc, key) => ({ ...acc, [key]: String(row[key] || '') }), {})
          };
        }
      });

      sampleDataView = (
        <>
          <FilterBar
            filterText={sampleFilterText}
            onFilterTextChange={setSampleFilterText}
            propertyNames={columnProperties}
            getPropertyValues={getSamplePropertyValues}
            activeFilters={sampleActiveFilters}
            onActiveFiltersChange={setSampleActiveFilters}
            defaultProperty=""
            placeholder="Enter property name or value"
            marginLeft="20px"
          />
          {displayRows.length === 0 && hasActiveFilters ? (
            <div style={{ padding: '48px', textAlign: 'center', fontSize: '14px', fontFamily: 'Google Sans, sans-serif', color: '#0C1226CC' }}>
              No data matches the applied filters
            </div>
          ) : (
            <TableView
              rows={displayRows}
              columns={columns}
              columnHeaderHeight={37}
              rowHeight={36}
              sx={{
                '& .MuiDataGrid-columnHeader .MuiDataGrid-columnSeparator': {
                  opacity: 0,
                  '&:hover': {
                    opacity: 10,
                  }
                },
                borderTopRightRadius: '0px',
                borderTopLeftRadius: '0px'
              }}
            />
          )}
        </>
      );
    } catch (error) {
      console.error('Error processing sample data:', error);
      sampleDataView = (
        <div style={{padding:"10px", color: "#d32f2f"}}>
          Error loading sample data: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      );
    }
  } else {
    sampleDataView = <div style={{paddingTop:"48px", paddingLeft: "410px", fontSize:'14px', color: "#0C1226CC"}}>No Data available for this table</div>;
  }

  // Reusable card wrapper style
  const cardStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "0px",
    flex: "none",
    alignSelf: "stretch",
    flexGrow: 0,
    border: "1px solid #DADCE0",
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  };

  return (
    <div style={{ width: '100%', ...css }}>
        <Grid
            container
            spacing={0}
            style={{marginBottom:"5px"}}
        >
            {/* left side  */}
            <Grid size={9} sx={{ padding: "0px 0px 10px 0px" }}>
                {/* Documentation Card */}
                <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "24px",
                    gap: "20px",
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#FFFFFF",
                    border: "1px solid #ECEEF4",
                    borderRadius: "12px",
                }}>
                    {/* Header row */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                        <Box sx={{ width: "32px", height: "32px", background: "#EAEEFA", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.9757 3.33366L15.0007 7.35866V16.667H5.00065V3.33366H10.9757ZM11.6673 1.66699H5.00065C4.08398 1.66699 3.33398 2.41699 3.33398 3.33366V16.667C3.33398 17.5837 4.08398 18.3337 5.00065 18.3337H15.0007C15.9173 18.3337 16.6673 17.5837 16.6673 16.667V6.66699L11.6673 1.66699ZM10.0007 11.667C10.9173 11.667 11.6673 10.917 11.6673 10.0003C11.6673 9.08366 10.9173 8.33366 10.0007 8.33366C9.08398 8.33366 8.33398 9.08366 8.33398 10.0003C8.33398 10.917 9.08398 11.667 10.0007 11.667ZM13.334 14.5253C13.334 13.8503 12.934 13.2503 12.3173 12.9837C11.609 12.6753 10.8257 12.5003 10.0007 12.5003C9.17565 12.5003 8.39232 12.6753 7.68398 12.9837C7.06732 13.2503 6.66732 13.8503 6.66732 14.5253V15.0003H13.334V14.5253Z" fill="#022FCD"/>
                            </svg>
                        </Box>
                        <Typography
                            sx={{
                                fontFamily: '"Google Sans", sans-serif',
                                fontWeight: 600,
                                fontSize: "18px",
                                color: "#3D4151",
                            }}
                        >
                            Documentation
                        </Typography>
                    </Box>
                    
                    <Divider sx={{ width: "100%", borderColor: "#E8EBEF", margin: "-4px 0 0 0" }} />
                    
                    {/* Content */}
                    <Box sx={{
                        minHeight: "200px",
                        maxHeight: "calc(100vh - 380px)",
                        overflowY: "auto",
                        width: "100%",
                        boxSizing: "border-box",
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: 'transparent',
                            borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#a1a1a1ff',
                            borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            background: '#7c7c7d',
                        },
                    }}>
                        {documentation === 'No Documentation Available' ? (
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                minHeight: '200px',
                                gap: '8px',
                                padding: '40px 20px',
                                boxSizing: 'border-box',
                            }}>
                                <Typography sx={{
                                    fontFamily: '"Google Sans", sans-serif',
                                    fontWeight: 600,
                                    fontSize: '16px',
                                    color: '#1F1F1F',
                                    textAlign: 'center',
                                }}>
                                    No documentation yet
                                </Typography>
                                <Typography sx={{
                                    fontFamily: '"Google Sans Text", sans-serif',
                                    fontWeight: 400,
                                    fontSize: '14px',
                                    lineHeight: '1.43em',
                                    color: '#7D7D7D',
                                    textAlign: 'center',
                                    maxWidth: '460px',
                                }}>
                                    The owner of this asset hasn&apos;t added documentation.
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    fontFamily: '"Google Sans Text", sans-serif',
                                    fontSize: "14px",
                                    color: "#0C1226CC",
                                    fontWeight: 400,
                                    lineHeight: "1.6em",
                                }}
                                dangerouslySetInnerHTML={{ __html: documentation }}
                            />
                        )}
                    </Box>
                </Box>

                {/* Table Info Card */}
                {getEntryType(entry.name, '/') == 'Tables' ? (
                    <Box sx={cardStyle}>
                        {/* Header row with toggle */}
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "16px 20px",
                            width: "100%",
                            boxSizing: "border-box",
                            justifyContent: "space-between",
                        }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <Box sx={{ width: "32px", height: "32px", background: "#E7F0FE", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <SchemaIcon sx={{ fontSize: "20px", color: "#0B57D0" }} />
                                </Box>
                                <Typography
                                    component="span"
                                    variant="heading2Medium"
                                    sx={{
                                        fontWeight: 400,
                                        fontSize: "18px",
                                        lineHeight: "24px",
                                        color: "#1F1F1F",
                                    }}
                                >
                                    Table Info
                                </Typography>
                            </Box>
                            {/* Segmented Button Toggle */}
                            <Box sx={{ display: "flex" }}>
                                <Box
                                    sx={{
                                        fontSize: "14px",
                                        background: !sampleDataEnabled ? "#C2E7FF" : "transparent",
                                        color: !sampleDataEnabled ? "#004A77" : "#1F1F1F",
                                        padding: "6px 12px",
                                        borderRadius: "100px 0px 0px 100px",
                                        border: "1px solid #575757",
                                        borderRight: "none",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        fontFamily: '"Google Sans", sans-serif',
                                        fontWeight: 500,
                                        lineHeight: "20px",
                                        height: "32px",
                                        boxSizing: "border-box"
                                    }}
                                    onClick={() => setSampleDataEnabled(false)}
                                >
                                    {!sampleDataEnabled && <CheckIcon sx={{ fontSize: "18px", color: "#004A77" }} />}
                                    Schema
                                </Box>
                                <Box
                                    sx={{
                                        fontSize: "14px",
                                        background: sampleDataEnabled ? "#C2E7FF" : "transparent",
                                        color: sampleDataEnabled ? "#004A77" : "#1F1F1F",
                                        padding: "6px 12px",
                                        borderRadius: "0px 100px 100px 0px",
                                        border: "1px solid #575757",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        fontFamily: '"Google Sans", sans-serif',
                                        fontWeight: 500,
                                        lineHeight: "20px",
                                        height: "32px",
                                        boxSizing: "border-box"
                                    }}
                                    onClick={() => setSampleDataEnabled(true)}
                                >
                                    {sampleDataEnabled && <CheckIcon sx={{ fontSize: "18px", color: "#004A77" }} />}
                                    Sample Data
                                </Box>
                            </Box>
                        </Box>
                        <Divider sx={{ width: "100%", borderColor: "#DADCE0" }} />
                        {/* Content */}
                        <Box sx={{
                            minHeight: "200px",
                            maxHeight: "258px",
                            overflowY: "scroll",
                            padding: "0px",
                            width: "100%",
                            '&::-webkit-scrollbar': {
                                width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                                backgroundColor: 'transparent',
                                borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: '#a1a1a1ff',
                                borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                background: '#7c7c7d',
                            },
                        }}>
                            <Box sx={{ padding: "0px 0px 0px 0px"}}>
                                <Box sx={{ padding: "0px 0px 0px 0px" }}>
                                    {!sampleDataEnabled && schemaData.length > 0 &&(
                                        <SchemaFilter
                                          entry={entry}
                                          onFilteredEntryChange={setFilteredSchemaEntry}
                                          sx={{ marginTop: '20px', marginBottom: '8px' }}
                                        />
                                    )}
                                </Box>
                                <Box sx={{ padding: "0px 0px 0px 0px" }}>
                                        {sampleDataEnabled ? (sampleDataView) : (schema)}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                ) : null}
            </Grid>

            {/* Right Sidebar */}
            <Grid size={3} sx={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0px 0px 10px 10px" }}>
                {/* Consolidated Info Card */}
                <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "24px",
                    gap: "16px",
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#FFFFFF",
                    border: "1px solid #ECEEF4",
                    borderRadius: "12px"
                }}>
                    {/* Header */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Box sx={{ width: "32px", height: "32px", background: "#EAEEFA", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <ListAltOutlined sx={{ fontSize: "20px", color: "#022FCD" }} />
                        </Box>
                        <Typography
                            sx={{
                                fontFamily: 'Google Sans',
                                fontWeight: 600,
                                fontSize: "Static/Title Medium/Size",
                                lineHeight: "24px",
                                color: "#3D4151",
                            }}
                        >
                            Info
                        </Typography>
                    </Box>

                    <Divider sx={{ width: "100%", borderColor: "#E8EBEF", margin: "1px 0" }} />

                    {/* Contacts Box */}
                    <Box sx={{
                        width: "100%",
                        border: "1px solid #EAEEFA",
                        borderRadius: "7.5px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        boxSizing: "border-box"
                    }}>
                        {contacts.length > 0 ? (
                            contacts.map((contact: any, index: number) => {
                                const role = entryType && entryType == 'data-product' ? contact.role : contact.structValue.fields.role.stringValue;
                                let rawName = entryType && entryType == 'data-product' ? contact.name : contact.structValue.fields.name.stringValue;
                                const email = rawName.split('<').length > 1 ? rawName.split('<')[1].slice(0, -1) : rawName;
                                const firstColor = index === 0 ? undefined : getAvatarColor(contacts[0].name || contacts[0].structValue?.fields?.name?.stringValue || '');
                                
                                return (
                                    <Box key={`contact-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: "12px" }}>
                                        <Box sx={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: getAvatarColor(email, firstColor),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#FFFFFF',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            fontFamily: 'Roboto, sans-serif',
                                            flexShrink: 0,
                                        }}>
                                            {email.charAt(0).toUpperCase()}
                                        </Box>
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#7D7D7D" }}>
                                                {role}
                                            </Typography>
                                            <OverflowTooltip text={email}>
                                                <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#3D4151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {email.length > 0 ? email : "--"}
                                                </Typography>
                                            </OverflowTooltip>
                                        </Box>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 400, fontSize: "14px", color: "#0C1226CC", textAlign: "center" }}>
                                No contacts assigned.
                            </Typography>
                        )}
                    </Box>

                    {/* Metadata List */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
                        {/* Created */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#7D7D7D" }}>Created</Typography>
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#1F1F1F" }}>{createDate}{createTime ? ` \u00b7 ${createTime}` : ''}</Typography>
                        </Box>

                        {/* Last Modified */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#7D7D7D" }}>Last Modified</Typography>
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#1F1F1F" }}>{updateDate}{updateTime ? ` \u00b7 ${updateTime}` : ''}</Typography>
                        </Box>

                        {/* System */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#7D7D7D" }}>System</Typography>
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#1F1F1F" }}>{normalizeSystemName(entry.entrySource?.system)}</Typography>
                        </Box>

                        {/* Location */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#7D7D7D" }}>Location</Typography>
                            <Box sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#F5FEF8',
                                border: '1px solid #C4E9D8',
                                borderRadius: '12px',
                                padding: '0px 8px',
                                height: '24px',
                            }}>
                                <LocationOnOutlined sx={{ fontSize: '14px', color: '#027E4C', flexShrink: 0 }} />
                                <Typography sx={{
                                    fontFamily: '"Google Sans", sans-serif',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#027E4C',
                                    lineHeight: 1,
                                }}>
                                    {(entry.entrySource?.location || '-')}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Identifiers */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#7D7D7D" }}>Identifiers</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <Tooltip title={entry.entrySource?.resource || ''} arrow>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }} onClick={() => { navigator.clipboard.writeText(entry.entrySource?.resource || ''); showNotification('Copied to clipboard.', 'success', 3000, undefined); }}>
                                        <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "14px", color: "#1F1F1F" }}>Resource</Typography>
                                        <ContentCopy sx={{ fontSize: "16px", color: "#0B57D0" }} />
                                    </Box>
                                </Tooltip>
                            </Box>
                        </Box>
                    </Box>
                </Box>
                {/* Labels Card */}
                <Box sx={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    padding: "24px", gap: "16px", width: "100%", boxSizing: "border-box",
                    background: "#FFFFFF", border: "1px solid #ECEEF4", borderRadius: "12px"
                }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Box sx={{ width: "32px", height: "32px", background: "#EAEEFA", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <LabelIcon sx={{ fontSize: "20px", color: "#0B57D0" }} />
                        </Box>
                        <Typography sx={{ fontFamily: 'Google Sans', fontWeight: 600, fontSize: "18px", color: "#3D4151" }}>
                            Labels
                        </Typography>
                    </Box>
                    <Divider sx={{ width: "100%", borderColor: "#E8EBEF", margin: "1px 0" }} />
                    <Box sx={{ width: "100%", boxSizing: "border-box" }}>
                        {Object.keys(finalLabels).length > 0 ? (
                            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", width: "100%" }}>
                                {Object.keys(finalLabels).map((key, index) => (
                                    <Tooltip key={index} title={`${key}: ${finalLabels[key]}`} arrow>
                                        <Box sx={{
                                            display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center",
                                            padding: "0px 8px", minWidth: 0, height: "20px", borderRadius: "8px", background: "#C2E7FF", cursor: "pointer", boxSizing: "border-box"
                                        }}>
                                            <Typography sx={{
                                                fontFamily: '"Google Sans Medium", "Google Sans", sans-serif', fontWeight: 500, fontSize: "12px",
                                                lineHeight: "1.25em", letterSpacing: "1%", color: "#004A77", textAlign: "left",
                                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%"
                                            }}>
                                                {`${key}: ${finalLabels[key]}`}
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                ))}
                            </Box>
                        ) : (
                            <Typography sx={{ fontFamily: '"Google Sans Text", sans-serif', fontWeight: 400, fontSize: "14px", color: "#0C1226CC", textAlign: "center" }}>
                                No Labels available.
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Grid>
        </Grid>


    </div>
  );
}

export default DataProductOverviewNew;
