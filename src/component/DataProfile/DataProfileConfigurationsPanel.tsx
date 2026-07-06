import React from 'react';
import {
  Box,
  Typography,
  IconButton
} from '@mui/material';
import {
  Close,
  HelpOutline,
} from '@mui/icons-material';
import {
  getFormattedDateTimeParts
} from '../../utils/resourceUtils';

/**
 * @file DataProfileConfigurationsPanel.tsx
 * @summary Renders a slide-out side panel displaying the configuration of a Data Profile scan.
 *
 * @description
 * This component renders a side panel that slides in from the right side of the
 * screen. It is controlled by the `isOpen` prop.
 *
 * It displays a read-only view of the configuration settings for a specific
 * Knowledge Catalog Data Scan, which is passed in via the `dataProfileScan` prop.
 *
 * The panel shows key-value pairs for various scan settings, such as:
 * - Scope
 * - Row Filter
 * - Sampling Size
 * - Results Exported To
 * - Last Run Status (with a status icon)
 * - Last Run Time
 *
 * It includes a header with a "Close" button that triggers the `onClose` callback.
 *
 * @param {object} props - The props for the DataProfileConfigurationsPanel component.
 * @param {boolean} props.isOpen - A boolean flag that controls whether the
 * panel is visible (slid in) or hidden (slid out).
 * @param {() => void} props.onClose - A callback function that is executed
 * when the "Close" (X) icon button is clicked.
 * @param {any} props.dataProfileScan - The full data scan object (fetched from
 * the API) containing the configuration details to be displayed.
 *
 * @returns {JSX.Element} A React component rendering the slide-out panel.
 */

interface DataProfileConfigurationsPanelProps {
  onClose: () => void;
  dataProfileScan: any;
}

const capitalizeFirstLetter = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const DataProfileConfigurationsPanel: React.FC<DataProfileConfigurationsPanelProps> = ({ onClose, dataProfileScan }) => {
  const { date: updateDate, time: updateTime } = getFormattedDateTimeParts(dataProfileScan.jobs[0]?.startTime.seconds);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0px 20px 20px',
        gap: '20px',
        height: '100%',
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 20px 20px 0px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Typography sx={{
            fontSize: '18px',
            fontWeight: 500,
            color: '#1F1F1F',
            lineHeight: '1.33em'
          }}>
            Configurations
          </Typography>
          <HelpOutline sx={{ fontSize: '16px', color: '#1F1F1F' }} />
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: '#1F1F1F',
            width: '24px',
            height: '24px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <Close sx={{ fontSize: '24px' }} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* First Row */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'stretch',
          alignItems: 'stretch',
          height: '68px'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0'
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Scope
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1F1F1F',
              lineHeight: '1.43em'
            }}>
              Entire data
            </Typography>
          </Box>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0',
            minWidth: 0
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Row Filter
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1F1F1F',
              lineHeight: '1.43em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block'
            }}>
              { dataProfileScan.scan?.dataProfileSpec?.rowFilter != "" ? dataProfileScan.scan?.dataProfileSpec?.rowFilter : '-'}
            </Typography>
          </Box>
        </Box>

        {/* Second Row */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'stretch',
          alignItems: 'stretch',
          height: '68px'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0'
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Increment Column
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1F1F1F',
              lineHeight: '1.43em'
            }}>
              -
            </Typography>
          </Box>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0'
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Sampling Size
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1F1F1F',
              lineHeight: '1.43em'
            }}>
              { dataProfileScan.scan?.dataProfileSpec?.samplingPercent ? (dataProfileScan.scan?.dataProfileSpec?.samplingPercent)+'%' : '--'}
            </Typography>
          </Box>
        </Box>

        {/* Third Row */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'stretch',
          alignItems: 'stretch',
          height: '68px'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0'
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Increment Start
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1F1F1F',
              lineHeight: '1.43em'
            }}>
              -
            </Typography>
          </Box>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0',
            minWidth: 0
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Results Exported To
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1F1F1F',
              lineHeight: '1.43em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block'
            }}>
              {dataProfileScan.scan?.resultsTable ?? '-'}
            </Typography>
          </Box>
        </Box>

        {/* Fourth Row */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'stretch',
          alignItems: 'stretch',
          height: '68px'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0'
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Increment End
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1F1F1F',
              lineHeight: '1.43em'
            }}>
              -
            </Typography>
          </Box>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0'
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Last Run Status
            </Typography>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Box sx={{
                width: '14px',
                height: '14px',
                backgroundColor: '#128937',
                borderRadius: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="14" height="14" rx="7" fill="#128937"/>
                  <path d="M5.76783 10C5.69499 10 5.62418 9.98543 5.55539 9.9563C5.4866 9.92716 5.42387 9.88346 5.36722 9.82519L3.16995 7.56512C3.05665 7.44858 3 7.30706 3 7.14057C3 6.97409 3.05665 6.83257 3.16995 6.71603C3.28326 6.59949 3.41882 6.54122 3.57663 6.54122C3.73445 6.54122 3.87405 6.59949 3.99545 6.71603L5.76783 8.53907L10.0167 4.18126C10.13 4.06472 10.2656 4.00436 10.4234 4.0002C10.5812 3.99604 10.7167 4.05639 10.83 4.18126C10.9433 4.2978 11 4.43931 11 4.6058C11 4.77229 10.9433 4.9138 10.83 5.03034L6.16844 9.82519C6.11179 9.88346 6.04906 9.92716 5.98027 9.9563C5.91148 9.98543 5.84067 10 5.76783 10Z" fill="white"/>
                </svg>
              </Box>
              <Typography sx={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#022FCD',
                lineHeight: '1.43em',
                // textDecoration: 'underline'
              }}>
                {capitalizeFirstLetter(dataProfileScan.jobs[0]?.state)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Fifth Row */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'stretch',
          alignItems: 'stretch',
          height: '68px'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0'
          }}></Box>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '4px',
            padding: '14px 20px 14px 0px',
            flex: 1,
            borderBottom: '1px solid #DADCE0'
          }}>
            <Typography sx={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '1.45em',
              letterSpacing: '0.1px'
            }}>
              Last Run Time
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1F1F1F',
              lineHeight: '1.43em'
            }}>
              {updateDate}
              {' '}
              {updateTime}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DataProfileConfigurationsPanel;
