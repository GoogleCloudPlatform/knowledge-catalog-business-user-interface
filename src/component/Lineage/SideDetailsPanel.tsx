import React, { useEffect, useState } from 'react';
import {
  Typography,
  Grid,
  Tooltip,
  Box,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Skeleton
} from '@mui/material';
import {ContentCopy, Close } from '@mui/icons-material';
import PreviewAnnotation from '../Annotation/PreviewAnnotation';
import Schema from '../Schema/Schema';
import SchemaFilter from '../Schema/SchemaFilter';
import AnnotationFilter from '../Annotation/AnnotationFilter';
import { getName, hasValidAnnotationData } from '../../utils/resourceUtils';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * @file SideDetailsPanel.tsx
 * @description
 * This component renders a side panel (often used in a master-detail view) that
 * displays comprehensive details for a single data entry provided via props.
 *
 * The component's display is contingent on the `sidePanelDataStatus`:
 * - **'loading'**: It shows a "Loading..." message.
 * - **'failed'**: It shows an error message (e.g., "You don't have access...").
 * - **'succeeded' (or default)**: It renders a three-tab interface.
 *
 * The tabs are:
 * 1.  **"Asset Info"**: Displays general metadata about the asset, such as
 * system, row/column counts, timestamps, labels, and identifiers (FQN,
 * Resource) with copy-to-clipboard functionality.
 * 2.  **"Aspects"**: Integrates the `AnnotationFilter` and `PreviewAnnotation`
 * components to show a filterable and collapsible list of the entry's
 * annotations (aspects).
 * 3.  **"Schema"**: Integrates the `SchemaFilter` and `Schema` components to
 * display a filterable view of the entry's data schema.
 *
 * @param {SideDetailsPanelProps} props - The props for the component.
 * @param {any} [props.sidePanelData] - (Optional) The data entry object
 * (conforming to `EntryData`) whose details are to be displayed.
 * @param {string} [props.sidePanelDataStatus] - (Optional) The loading
 * status of the data (e.g., 'loading', 'succeeded', 'failed'). This dictates
 * whether a loader, error message, or the data is shown.
 * @param {() => void} [props.onClose] - (Optional) A callback function that
 * is executed when the user clicks the 'X' (close) icon.
 * @param {React.CSSProperties} [props.css] - (Optional) Custom CSS styles
 * to be applied to the main component `Box`.
 *
 * @returns {React.ReactElement} A React element rendering the side panel UI,
 * which varies based on the `sidePanelDataStatus`.
 */

interface EntryData {
  name?: string;
  entryType?: string;
  fullyQualifiedName?: string;
  createTime?: { seconds?: number };
  updateTime?: { seconds?: number };
  entrySource: {
    system?: string;
    resource?: string;
    rowCount?: number;
    labels?: Record<string, string>;
    displayName: string;
  };
  aspects?: Record<string, any>;
}

interface SideDetailsPanelProps {
  sidePanelData?: any;
  sidePanelDataStatus?: string;
  openSchemaInSidePanel?: boolean;
  onClose?: () => void;
  css?: React.CSSProperties;
}

const SideDetailsPanel: React.FC<SideDetailsPanelProps> = ({ sidePanelData, sidePanelDataStatus, openSchemaInSidePanel, onClose, css }) => {
  const { showNotification } = useNotification();
  const entry = sidePanelData as EntryData;
  const entryStatus = sidePanelDataStatus;
  const [activeTab, setActiveTab] = useState(openSchemaInSidePanel ? 2 : 0);
  const [filteredSchemaEntry, setFilteredSchemaEntry] = useState<any>(null);
  const [filteredAnnotationEntry, setFilteredAnnotationEntry] = useState<any>(null);
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());

  const handleAnnotationCollapseAll = () => {
    setExpandedAnnotations(new Set());
  };

  const handleAnnotationExpandAll = () => {
    if (entry?.aspects) {
      const number = entry.entryType?.split('/')[1];
      const annotationKeys = Object.keys(entry.aspects)
        .filter(key =>
          key !== `${number}.global.schema` &&
          key !== `${number}.global.overview` &&
          key !== `${number}.global.contacts` &&
          key !== `${number}.global.usage`
        )
        .filter(key => hasValidAnnotationData(entry.aspects![key]));
      setExpandedAnnotations(new Set(annotationKeys));
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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

const { date: createDate, time: createTime } = getFormattedDateTimeParts(entry?.createTime?.seconds);
const { date: updateDate, time: updateTime } = getFormattedDateTimeParts(entry?.updateTime?.seconds);
useEffect(() => {
  setActiveTab(openSchemaInSidePanel == true ? 2 : 0);
}, [openSchemaInSidePanel]);




  const number = entry?.entryType?.split('/')[1];
  const schema = entry?.aspects?.[`${number}.global.schema`]?.data?.fields?.fields?.listValue?.values || [];
  const labels = entry?.entrySource?.labels || {};

  const rowCount = entry?.entrySource?.rowCount || 70;
  const columnCount = schema.length || 40;

  if (entryStatus === 'loading') {
    return (
      <Box sx={{ 
        width: '23.75rem', 
        background: '#ffffff', 
        border: '1px solid #DADCE0',
        borderRadius: '0.5rem',
        height: 'calc(100vh - 12.5rem)',
        overflow: 'hidden', // Hide scrollbar during load
        flex: '0 0 auto',
        ...css 
      }}>
        {/* Panel Header (Skeleton) */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '1.25rem',
          background: '#fafafa'
        }}>
          {/* Skeleton for title */}
          <Skeleton variant="text" sx={{ fontSize: '1.125rem' }} width="60%" />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {onClose && (
              <IconButton 
                onClick={onClose} 
                size="small"
                sx={{ 
                  color: '#666',
                  '&:hover': { 
                    background: '#f0f0f0',
                    color: '#333'
                  }
                }}
              >
                <Close sx={{ fontSize: 20 }} />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Tabs Navigation (Real but disabled) */}
        <Box sx={{ borderBottom: "1px solid #DADCE0", background: "#ffffff" }}>
          <Tabs
            value={0} // Default to first tab
            sx={{
              minHeight: "48px",
              lineHeight: "20px",
              "& .MuiTabs-flexContainer": {
                justifyContent: "space-evenly",
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "transparent",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: "20px",
                  right: "20px",
                  bottom: "-2px",
                  height: "5px",
                  backgroundColor: "#ffffff",
                  borderTop: "4px solid #0B57D0",
                  borderRadius: "2.5px 2.5px 0 0",
                },
              },
              "& .MuiTab-root": {
                fontFamily: "Google sans text, sans-serif",
                fontSize: "14px",
                fontWeight: "500",
                color: "#575757",
                textTransform: "none",
                minHeight: "48px",
                padding: "12px 20px",
                "&.Mui-selected": {
                  color: "#0B57D0",
                  fontWeight: "500",
                },
              },
            }}
          >
            <Tab label="Asset Info" disabled />
            <Tab label="Aspects" disabled />
            <Tab label="Schema" disabled />
          </Tabs>
        </Box>

        {/* Content Container (Skeleton for Asset Info) */}
        <Box sx={{ padding: '1rem' }}>
          <Box>
              <Grid container spacing={0}>
                {/* Row 1: Name / System */}
                <Grid size={6} sx={{ padding: '12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="caption" sx={{ fontFamily: '"Google Sans Text", sans-serif', color: '#575757', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                    Name
                  </Typography>
                  <Skeleton variant="text" sx={{ fontSize: '13px' }} width="80%" />
                </Grid>
                <Grid size={6} sx={{ padding: '12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="caption" sx={{ fontFamily: '"Google Sans Text", sans-serif', color: '#575757', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                    System
                  </Typography>
                  <Skeleton variant="text" sx={{ fontSize: '13px' }} width="50%" />
                </Grid>

                {/* Row 2: Rows / Columns */}
                <Grid size={6} sx={{ padding: '12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="caption" sx={{ fontFamily: '"Google Sans Text", sans-serif', color: '#575757', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                    Rows
                  </Typography>
                  <Skeleton variant="text" sx={{ fontSize: '13px' }} width="40%" />
                </Grid>
                <Grid size={6} sx={{ padding: '12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="caption" sx={{ fontFamily: '"Google Sans Text", sans-serif', color: '#575757', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                    Columns
                  </Typography>
                  <Skeleton variant="text" sx={{ fontSize: '13px' }} width="40%" />
                </Grid>

                {/* Row 3: Creation Time / Last Modification */}
                <Grid size={6} sx={{ padding: '12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="caption" sx={{ fontFamily: '"Google Sans Text", sans-serif', color: '#575757', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                    Creation Time
                  </Typography>
                  <Skeleton variant="text" sx={{ fontSize: '14px' }} width="70%" />
                  <Skeleton variant="text" sx={{ fontSize: '14px' }} width="50%" />
                </Grid>
                <Grid size={6} sx={{ padding: '12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                    Last Modification
                  </Typography>
                  <Skeleton variant="text" sx={{ fontSize: '14px' }} width="70%" />
                  <Skeleton variant="text" sx={{ fontSize: '14px' }} width="50%" />
                </Grid>

                {/* Row 4: Identifiers / Labels */}
                <Grid size={6} sx={{ padding: '12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="caption" sx={{ fontFamily: '"Google Sans Text", sans-serif', color: '#575757', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                    Identifiers
                  </Typography>
                  <Skeleton variant="text" sx={{ fontSize: '14px' }} width="100px" />
                  <Skeleton variant="text" sx={{ fontSize: '14px', mt: 1 }} width="70px" />
                </Grid>
                <Grid size={6} sx={{ padding: '12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <Typography variant="caption" sx={{ fontFamily: '"Google Sans Text", sans-serif', color: '#575757', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                    Labels
                  </Typography>
                  <Skeleton variant="rounded" width={120} height={28} sx={{ borderRadius: '8px' }} />
                </Grid>
              </Grid>
          </Box>
        </Box>
      </Box>
    );
  }

  if (entryStatus === 'failed') {
    return (
      <Box sx={{ 
        width: '23.75rem', 
        background: '#ffffff', 
        border: '1px solid #DADCE0',
        borderRadius: '0.5rem',
        height: 'calc(100vh - 12.5rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        ...css 
      }}>
        <Typography variant="body2" color="text.secondary">You don't have access to this data.</Typography>
      </Box>
    );
  }

  if (!entry) {
    return (
      <Box sx={{ 
        width: '400px', 
        background: '#ffffff', 
        borderLeft: '1px solid #e0e0e0',
        height: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...css 
      }}>
        <Typography variant="body2" color="#0C1226CC">No entry selected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '23.75rem', 
      background: '#ffffff', 
      border: '1px solid #DADCE0',
      borderRadius: '0.5rem',
      height: 'calc(100vh - 12.5rem)',
      overflowY: 'auto',
      flex: '0 0 auto',
      ...css 
    }}>
      {/* Panel Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1.25rem',
        background: '#fafafa'
      }}>
        <Typography variant="heading2Medium" sx={{ 
          fontWeight: 500, 
          color: '#1F1F1F',
          fontSize: '1.125rem',
          lineHeight: 1.4,
          //textTransform:"capitalize",
          width:"300px",
          textOverflow:"ellipses",
          overflow:"hidden"
        }}>
          {entry.entrySource.displayName.length > 0 ? entry.entrySource.displayName : getName(entry.name || '', '/')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* {onToggleQueryPanel && !showQueryPanel && (
            <Button 
              variant="outlined" 
              onClick={onToggleQueryPanel}
              size="small"
              sx={{
                fontSize: '12px',
                padding: '4px 8px',
                minWidth: 'auto',
                height: '28px',
                borderColor: '#DADCE0',
                color: '#575757',
                '&:hover': {
                  borderColor: '#0B57D0',
                  color: '#0B57D0'
                }
              }}
            >
              Query Details
            </Button>
          )} */}
          {onClose && (
            <IconButton 
              onClick={onClose} 
              size="small"
              sx={{ 
                color: '#666',
                '&:hover': { 
                  background: '#f0f0f0',
                  color: '#333'
                }
              }}
            >
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: "1px solid #DADCE0", background: "#ffffff" }}>
        <Tabs
  value={activeTab}
  onChange={handleTabChange}
  sx={{
    minHeight: "48px",
    lineHeight: "20px",
    "& .MuiTabs-flexContainer": {
      justifyContent: "space-evenly",
    },
    "& .MuiTabs-indicator": {
      backgroundColor: "transparent",
      "&::after": {
        content: '""',
        position: "absolute",
        left: "20px",
        right: "20px",
        bottom: "-2px",
        height: "5px",
        backgroundColor: "#ffffff",
        borderTop: "4px solid #0B57D0",
        borderRadius: "2.5px 2.5px 0 0",
      },
    },
    "& .MuiTab-root": {
      fontFamily: "Google sans text, sans-serif",
      fontSize: "14px",
      fontWeight: "500",
      color: "#575757",
      textTransform: "none",
      minHeight: "48px",
      padding: "12px 20px",
      "&.Mui-selected": {
        color: "#0B57D0",
        fontWeight: "500",
      },
    },
  }}
>
  <Tab label="Asset Info" />
  <Tab label="Aspects" />
  <Tab label="Schema" />
</Tabs>      </Box>

      {/* Content Container */}
      <Box sx={{ padding: '1rem', height: 'calc(100% - 120px)', overflowY: 'auto' }}>
        {/* Asset Info Tab Content */}
        {activeTab === 0 && (
          <Box>
              <Grid container spacing={0}>
                <Grid size={6} sx={{ 
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Typography variant="caption" sx={{ 
                    fontFamily: '"Google Sans Text", sans-serif',
                    color: '#575757', 
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    display: 'block'
                  }}>
                    Name
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#333',
                    lineHeight: '18px',
                    width:"150px",
                    // textTransform:"capitalize",
                    textOverflow:"ellipsis",
                    overflow:"hidden"
                  }}>
                    {entry.entrySource.displayName.length > 0 ? entry.entrySource.displayName : getName(entry.name || '', '/')}
                  </Typography>
                </Grid>
                <Grid size={6} sx={{ 
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <Typography variant="caption" sx={{ 
                    fontFamily: '"Google Sans Text", sans-serif',
                    color: '#575757', 
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    display: 'block'
                  }}>
                    System
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#333',
                    lineHeight: '18px'
                  }}>
                    {(() => { const sys = entry.entrySource?.system; if (!sys) return ''; const lower = sys.toLowerCase(); if (lower === 'dataplex universal catalog' || lower === 'dataplex') return 'Knowledge Catalog'; return sys; })()}
                  </Typography>
                </Grid>
                <Grid size={6} sx={{ 
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Typography variant="caption" sx={{ 
                    fontFamily: '"Google Sans Text", sans-serif',
                    color: '#575757', 
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    display: 'block'
                  }}>
                    Rows
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#333',
                    lineHeight: '18px'
                  }}>
                    {rowCount}
                  </Typography>
                </Grid>
                <Grid size={6} sx={{ 
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <Typography variant="caption" sx={{ 
                    fontFamily: '"Google Sans Text", sans-serif',
                    color: '#575757', 
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    display: 'block'
                  }}>
                    Columns
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#333',
                    lineHeight: '18px'
                  }}>
                    {columnCount}
                  </Typography>
                </Grid>
                <Grid size={6} sx={{ 
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Typography variant="caption" sx={{ 
                    fontFamily: '"Google Sans Text", sans-serif',
                    color: '#575757', 
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    display: 'block'
                  }}>
                    Creation Time
                  </Typography>
                  <Typography sx={{
                      fontFamily: '"Google Sans Text", sans-serif',
                      fontWeight: 400,
                      fontSize: "14px",
                      lineHeight: "1.43em",
                      color: "#1F1F1F"
                    }}>
                    {createDate}
                    <br />
                    {createTime}
                </Typography>
                </Grid>
                <Grid size={6} sx={{ 
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <Typography variant="caption" sx={{ 
                    color: '#666', 
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    display: 'block'
                  }}>
                    Last Modification
                  </Typography>
                  <Typography sx={{
                    fontFamily: '"Google Sans Text", sans-serif',
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "1.43em",
                    color: "#1F1F1F"
                  }}>
                    {updateDate}
                    <br />
                    {updateTime}
                </Typography>
                </Grid>
                <Grid size={6} sx={{ 
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Typography variant="caption" sx={{ 
                    fontFamily: '"Google Sans Text", sans-serif',
                    color: '#575757', 
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Identifiers
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 0 }}>
                    <Tooltip title={`Copy Resource to clipboard - ${entry.entrySource?.resource}`} arrow>
                      <Box
                        onClick={() => {
                          showNotification(
                            'Copied to clipboard.',
                            'success',
                            3000,
                            undefined
                          );
                          navigator.clipboard.writeText(entry.entrySource?.resource || '');
                        }}
                        sx={{ 
                          fontSize: '14px', 
                          fontWeight: 700, 
                          color: '#0B57D0',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          padding: '0',
                          borderRadius: '4px'
                        }}
                      >
                        Resources
                        <ContentCopy sx={{ fontSize: 14, color: '#1976d2' }} />
                      </Box>
                    </Tooltip>
                    <Tooltip title={`Copy FQN to clipboard - ${entry.fullyQualifiedName}`} arrow>
                      <Box
                        onClick={() => {
                          showNotification(
                            'Copied to clipboard.',
                            'success',
                            3000,
                            undefined
                          );
                          navigator.clipboard.writeText(entry.fullyQualifiedName || '');
                        }}
                        sx={{ 
                          fontSize: '14px', 
                          fontWeight: 700, 
                          color: '#0B57D0',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          padding: '0',
                          borderRadius: '4px',
                        }}
                      >
                        FQN
                        <ContentCopy sx={{ fontSize: 14, color: '#1976d2' }} />
                      </Box>
                    </Tooltip>
                  </Box>
                </Grid>
                <Grid size={6} sx={{ 
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <Typography variant="caption" sx={{ 
                    fontFamily: '"Google Sans Text", sans-serif',
                    color: '#575757', 
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Labels
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.keys(labels).map((key, index) => (
                      <Tooltip key={index} title={`${key}: ${labels[key]}`} arrow>
                        <Chip
                          label={`${key}: ${labels[key]}`}
                          size="small"
                          sx={{ 
                            fontSize: '12px', 
                            background: '#E7F0FE', 
                            color: '#004A77',
                            maxWidth: '150px',
                            alignSelf: 'flex-start',
                            height: 'auto',
                            fontWeight: 400,
                            fontFamily: 'Google Sans, sans-serif',
                            lineHeight: '1.252em',
                            letterSpacing: '1%',
                            borderRadius: '8px',
                            padding: '8px',
                            gap: '8px',
                            '& .MuiChip-label': {
                              padding: '0',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Grid>
              </Grid>
          </Box>
        )}

        {/* Aspects Tab Content */}
        {activeTab === 1 && (
          <Box sx={{
            background: '#ffffff',
          }}>
            {/* Aspects Filter - Override margin for side panel */}
            <Box sx={{
              '& > div': {
                marginTop: '0px !important',
                border: 'none'
              }
            }}>
              <AnnotationFilter
                entry={entry}
                onFilteredEntryChange={setFilteredAnnotationEntry}
                onCollapseAll={handleAnnotationCollapseAll}
                onExpandAll={handleAnnotationExpandAll}
              />
            </Box>
            <Box sx={{
              background: '#ffffff'
            }}>
              <PreviewAnnotation
                entry={filteredAnnotationEntry || entry}
                css={{
                  border: 'none',
                  margin: 0,
                  background: 'transparent',
                  borderRadius: '0px',
                }}
                expandedItems={expandedAnnotations}
                setExpandedItems={setExpandedAnnotations}
              />
            </Box>
          </Box>
        )}

        {/* Schema Tab Content */}
        {activeTab === 2 && (
          <Box sx={{ 
            borderRadius: '8px', 
            overflow: 'hidden',
            background: '#ffffff'
          }}>
            <SchemaFilter
              entry={entry}
              onFilteredEntryChange={setFilteredSchemaEntry}
              isPreview={true}
            />
            <Schema entry={filteredSchemaEntry || entry} isPreview={true} sx={{ width: "100%", borderTopLeftRadius: '0px', borderTopRightRadius: '0px' }} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SideDetailsPanel;