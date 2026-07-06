import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Skeleton
} from '@mui/material';
import { ContentCopy, Close, Check, Schedule } from '@mui/icons-material';
import { Highlight, themes } from 'prism-react-renderer';
// import { useAppSelector } from '../../app/store';

/**
 * @file QueryPanel.tsx
 * @description
 * This component renders a side panel that displays detailed information about a
 * data lineage "query" or "process" node.
 *
 * It operates based on the `queryPanelDataStatus`:
 * - **'loading'**: Displays a simple "Loading..." text.
 * - **'succeeded'**: Parses the provided `queryPanelData` (which is expected
 * to contain `processDetails`, `jobDetails`, and `processRuns`) and
 * displays a two-tab interface:
 *
 * 1.  **"Details" Tab**: Shows metadata about the process, such as its name,
 * type, and associated BigQuery Job ID. It also displays the full
 * SQL query string in a `<pre>` block with a "Copy to Clipboard" button.
 * 2.  **"Runs" Tab**: Lists historical executions (runs) of the process. Each
 * run displays its status (e.g., 'COMPLETED') and a "More" button.
 * Clicking "More" opens a `Dialog` (modal) with in-depth details for
 * that specific run (e.g., start/end times).
 *
 * The panel includes a close button ('X') that triggers the `onClose` callback.
 *
 * @param {QueryPanelProps} props - The props for the component.
 * @param {string | undefined} props.queryPanelDataStatus - The current data
 * fetching status (e.g., 'loading', 'succeeded', 'failed').
 * @param {any | null} props.queryPanelData - The raw data object for the
 * query node. The component expects this to contain `processDetails`,
 * `jobDetails`, and `processRuns` when the status is 'succeeded'.
 * @param {() => void} [props.onClose] - (Optional) Callback function to be
 * invoked when the close icon is clicked.
 * @param {React.CSSProperties} [props.css] - (Optional) Additional CSS
 * styles to be applied to the main container `Box`.
 *
 * @returns {React.ReactElement} A React element. It renders a loading
 * message or the complete query details panel with its tabs and modal logic.
 */

interface QueryPanelProps {
  queryPanelDataStatus: string | undefined;
  queryPanelData: any|null;
  onClose?: () => void;
  css?: React.CSSProperties;
}

const QueryPanel: React.FC<QueryPanelProps> = ({ queryPanelDataStatus, queryPanelData, onClose, css }) => {
  const [openRunsModal, setOpenRunsModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [queryDetails, setQueryDetails] = useState<any>(null);
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [runsData, setRunsData] = useState<any[]>([]);

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

    return `${date} ${time}`; 
  };


//   const entry = useAppSelector((state) => state.entry.items);

  // Dummy data for query details
  useEffect(() => {
    if(queryPanelDataStatus === 'succeeded'){
      setQueryDetails({
        name: queryPanelData?.processDetails?.name,
        processType: queryPanelData?.processDetails?.displayName,
        bigQueryJobId: queryPanelData?.processDetails?.attributes?.bigquery_job_id?.stringValue,
        status: queryPanelData?.jobDetails[1]?.status?.state,
        startTime: getFormattedDateTimeParts(queryPanelData?.jobDetails[1]?.statistics?.startTime),
        endTime: getFormattedDateTimeParts(queryPanelData?.jobDetails[1]?.statistics?.endTime),
        duration: (queryPanelData?.jobDetails[1]?.statistics?.finalExecutionDurationMs/1000),
        bytesProcessed: queryPanelData?.jobDetails[1]?.statistics?.totalBytesProcessed,
        rowsProcessed: '',
        cost: ''
      });

      setSqlQuery(queryPanelData?.jobDetails[1]?.configuration?.query?.query);

      let count = 0;
      let d : any[] = [];
      let runs : any[] = queryPanelData?.processRuns;
      runs.forEach((r:any) => {
          d = [...d, {
            id: count+1,
            runId: 'run_00'+ ++count,
            bigQueryJobId: r.displayName,
            name: r.name,
            status: r.state,
            startTime: getFormattedDateTimeParts(r.startTime.seconds),
            endTime: getFormattedDateTimeParts(r.endTime.seconds),//'May 21, 2025, 12:15:33 AM',
            duration: r.endTime.seconds - r.startTime.seconds,
            rowsProcessed: '',
            //jobLink: queryPanelData?.jobDetails[1]?.selfLink
          }];
      });
      setRunsData(d);
    }

  }, [queryPanelDataStatus]);
  

  const handleOpenRunDetails = (run: any) => {
    setSelectedRun(run);
    setOpenRunsModal(true);
  };

  const handleCloseRunsModal = () => {
    setOpenRunsModal(false);
    setSelectedRun(null);
  };

  return queryPanelDataStatus === 'loading' ? (
      <Box sx={{ 
        width: '23.75rem', 
        background: '#ffffff', 
        border: '1px solid #DADCE0',
        borderRadius: '0.5rem',
        height: 'calc(100vh - 12.5rem)',
        overflow: 'hidden', // Hide scrollbars during load
        flex: '0 0 auto',
        ...css 
      }}>
        {/* Panel Header (REAL) */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '1.25rem',
          background: '#F8FAFD'
        }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 500, 
            color: '#1a1a1a',
            fontSize: '20px',
            lineHeight: '28px'
          }}>
            Query
          </Typography>
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

        {/* Content Container (REAL) */}
        <Box sx={{ paddingLeft: '0.75rem', paddingRight: '1.25rem' }}>
          {/* Tabs (REAL, but disabled) */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: '16px' }}>
            <Tabs 
              value={0} // Default to the first tab
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  minHeight: '48px',
                  color: '#666',
                  minWidth: 0,
                  marginRight: '16px',
                  '&:last-child': {
                    marginRight: 0
                  },
                  padding: '12px 16px',
                  '&.Mui-selected': {
                    color: '#1976d2',
                    fontWeight: 600
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'transparent',
                  height: '5px',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: '16px',
                    right: '16px',
                    bottom: '-2px',
                    height: '5px',
                    backgroundColor: '#ffffff',
                    borderTop: '4px solid #1976d2',
                    borderRadius: '2.5px 2.5px 0 0'
                  }
                }
              }}
            >
              <Tab label="Details" disabled />
              <Tab label="Runs" disabled />
            </Tabs>
          </Box>

          {/* Tab Content (SKELETON with REAL LABELS) */}
          {/* This part is new */}
          <Box sx={{ background: '#ffffff' }}>
            {/* General Details Section */}
            <Box sx={{ marginBottom: '24px' }}>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'flex-start',
                padding: '12px 12px',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#1F1F1F', 
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  minWidth: '120px',
                  flexShrink: 0
                }}>
                  Name
                </Typography>
                {/* Skeleton for the value */}
                <Skeleton variant="text" sx={{ fontSize: '14px', lineHeight: '18px' }} width="60%" />
              </Box>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '12px 12px',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#1F1F1F', 
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  minWidth: '120px',
                  flexShrink: 0
                }}>
                  Process type
                </Typography>
                {/* Skeleton for the value */}
                <Skeleton variant="text" sx={{ fontSize: '13px', lineHeight: '18px' }} width="40%" />
              </Box>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '12px 12px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#1F1F1F', 
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  minWidth: '120px',
                  flexShrink: 0
                }}>
                  BigQuery_Job_ID
                </Typography>
                {/* Skeleton for the value */}
                <Skeleton variant="text" sx={{ fontSize: '13px', lineHeight: '18px' }} width="70%" />
              </Box>
            </Box>

            {/* Query Section Skeleton */}
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height={150} 
              sx={{ 
                borderRadius: '8px', 
                padding: '16px' 
              }} 
            />
          </Box>
        </Box>
      </Box>
    ) :(
    <>
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
          background: '#F8FAFD'
        }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 500, 
            color: '#1a1a1a',
            fontSize: '20px',
            lineHeight: '28px'
          }}>
            Query
          </Typography>
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

        {/* Content Container */}
        <Box sx={{ paddingLeft: '0.75rem', paddingRight: '1.25rem' }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: '16px' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => {setActiveTab(newValue); console.log(e);}}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  minHeight: '48px',
                  color: '#666',
                  minWidth: 0,
                  marginRight: '16px',
                  '&:last-child': {
                    marginRight: 0
                  },
                  padding: '12px 16px',
                  '&.Mui-selected': {
                    color: '#1976d2',
                    fontWeight: 600
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'transparent',
                  height: '5px',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: '16px',
                    right: '16px',
                    bottom: '-2px',
                    height: '5px',
                    backgroundColor: '#ffffff',
                    borderTop: '4px solid #1976d2',
                    borderRadius: '2.5px 2.5px 0 0'
                  }
                }
              }}
            >
              <Tab label="Details" />
              <Tab label="Runs" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          {activeTab === 0 && (
            <Box sx={{ background: '#ffffff' }}>
              {/* General Details Section */}
              <Box sx={{ marginBottom: '24px' }}>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px 12px',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Typography variant="caption" sx={{ 
                    color: '#1F1F1F', 
                    fontSize: '12px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    minWidth: '120px',
                    flexShrink: 0
                  }}>
                    Name
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    color: '#333',
                    lineHeight: '18px',
                    wordBreak: 'break-all',
                    flex: 1
                  }}>
                    {queryDetails?.name}
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 12px',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Typography variant="caption" sx={{ 
                    color: '#1F1F1F', 
                    fontSize: '12px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    minWidth: '120px',
                    flexShrink: 0
                  }}>
                    Process type
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#333',
                    lineHeight: '18px',
                    flex: 1
                  }}>
                    {queryDetails?.processType}
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 12px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <Typography variant="caption" sx={{ 
                    color: '#1F1F1F', 
                    fontSize: '12px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    minWidth: '120px',
                    flexShrink: 0
                  }}>
                    BigQuery_Job_ID
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#333',
                    lineHeight: '18px',
                    flex: 1,
                    wordBreak: 'break-all',
                  }}>
                    {queryDetails?.bigQueryJobId}
                  </Typography>
                </Box>
              </Box>

              {/* Query Section */}
              {queryPanelData?.processDetails?.displayName === 'Query' && (
                <Box sx={{ 
                  position: 'relative'
                }}>
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard.writeText(sqlQuery)}
                    sx={{
                      position: 'absolute',
                      top: '8px', 
                      right: '8px',
                      background: '#ffffff',
                      border: '1px solid #e0e0e0',
                      width: '24px',
                      height: '24px',
                      '&:hover': {
                        background: '#f0f0f0'
                      },
                      zIndex: 1
                    }}
                  >
                    <ContentCopy sx={{ fontSize: 14, color: '#666' }} />
                  </IconButton>
                  
                  <Highlight theme={themes.nightOwlLight} code={sqlQuery || ''} language="sql">
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                      <Box
                        component="pre"
                        className={className}
                        sx={{
                          ...style, 
                          padding: '16px',
                          margin: 0,
                          borderRadius: '8px',
                          overflow: 'auto',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {tokens.map((line, i) => (
                          <div {...getLineProps({ line, key: i })}>
                            {line.map((token, key) => (
                              <span {...getTokenProps({ token, key })} />
                            ))}
                          </div>
                        ))}
                      </Box>
                    )}
                  </Highlight>
                </Box>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ background: '#ffffff' }}>
              {/* Table Header */}
              <Box sx={{ 
                display: 'flex',
                borderBottom: '1px solid #f0f0f0',
                padding: '12px 16px',
                background: '#fafafa',
                gap: '16px'
              }}>
                <Box sx={{ 
                  minWidth: '75px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Typography variant="caption" sx={{ 
                    color: '#666', 
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>
                    State
                  </Typography>
                </Box>
                <Box sx={{ 
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Typography variant="caption" sx={{ 
                    color: '#666', 
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>
                    Display Name
                  </Typography>
                </Box>
              </Box>

              {/* Table Rows */}
              {runsData.map((run) => (
                <Box key={run.id} sx={{ 
                  display: 'flex',
                  borderBottom: '1px solid #f0f0f0',
                  padding: '12px 16px',
                  alignItems: 'center',
                  gap: '16px',
                  '&:hover': {
                    background: '#f8f9fa'
                  }
                }}>
                  <Box sx={{ 
                    minWidth: '75px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1 
                  }}>
                    <Box sx={{ 
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: run.status === 'COMPLETED' ? '#4caf50' : '#ff9800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {run.status === 'COMPLETED' ? (
                        <Check sx={{ fontSize: '10px', color: '#ffffff' }} />
                      ) : (
                        <Schedule sx={{ fontSize: '10px', color: '#ffffff' }} />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontSize: '10px', 
                      fontWeight: 500, 
                      color: '#333'
                    }}>
                      {run.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    flex: 1,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '10px', 
                      fontWeight: 500, 
                      color: '#333',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}>
                      {run.bigQueryJobId || run.runId}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleOpenRunDetails(run)}
                      sx={{ 
                        fontSize: '11px',
                        color: '#1976d2',
                        textTransform: 'none',
                        minWidth: 'auto',
                        padding: '4px 8px',
                        marginLeft: '16px'
                      }}
                    >
                      More
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Run Details Modal */}
      <Dialog
        open={openRunsModal}
        onClose={handleCloseRunsModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '18px', lineHeight: '24px'}}>
            Run Details
          </Typography>
          <IconButton onClick={handleCloseRunsModal}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: '24px' }}>
          {selectedRun && (
            <Box>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'flex-start',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#666', 
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  minWidth: '80px',
                  flexShrink: 0
                }}>
                  Name
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  color: '#333',
                  lineHeight: '18px',
                  wordBreak: 'break-all',
                  flex: 1
                }}>
                  {selectedRun.name}
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#666', 
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  minWidth: '80px',
                  flexShrink: 0
                }}>
                  State
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Box sx={{ 
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: selectedRun.status === 'COMPLETED' ? '#4caf50' : '#ff9800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedRun.status === 'COMPLETED' ? (
                      <Check sx={{ fontSize: '10px', color: '#ffffff' }} />
                    ) : (
                      <Schedule sx={{ fontSize: '10px', color: '#ffffff' }} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#333'
                  }}>
                    {selectedRun.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#666', 
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  minWidth: '80px',
                  flexShrink: 0
                }}>
                  Job name
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  color: '#1976d2',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  flex: 1,
                  wordBreak: 'break-all',
                }}>
                  {selectedRun.bigQueryJobId}
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#666', 
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  minWidth: '80px',
                  flexShrink: 0
                }}>
                  Start time
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  color: '#333',
                  lineHeight: '18px',
                  flex: 1
                }}>
                  {selectedRun.startTime}
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#666', 
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  minWidth: '80px',
                  flexShrink: 0
                }}>
                  End time
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  color: '#333',
                  lineHeight: '18px',
                  flex: 1
                }}>
                  {selectedRun.endTime}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QueryPanel;
