import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  Drawer
} from '@mui/material';
import {
  InfoOutline
} from '@mui/icons-material';
import ConfigurationsPanel from './ConfigurationsPanel';
import { useAccessRequest } from '../../contexts/AccessRequestContext';

interface DataQualityStatusProps {
  dataQualityScan: any;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return { color: '#128937', dotShadow: '0px 0px 0px 2px #E6F4EA' };
  if (score >= 40) return { color: '#E37400', dotShadow: '0px 0px 0px 2px #FEF7E0' };
  return { color: '#C5221F', dotShadow: '0px 0px 0px 2px #FCE8E6' };
};

const DataQualityStatus: React.FC<DataQualityStatusProps> = ({ dataQualityScan }) => {
  const [isConfigurationsOpen, setIsConfigurationsOpen] = useState(false);
  const { setAccessPanelOpen } = useAccessRequest();

  useEffect(() => {
    setAccessPanelOpen(isConfigurationsOpen);
  }, [isConfigurationsOpen, setAccessPanelOpen]);

  const dataQualityResult = dataQualityScan.scan?.dataQualityResult || dataQualityScan.jobs?.[0]?.dataQualityResult;
  const overallScore = dataQualityResult?.score ?? 0;
  const scoreStyle = getScoreColor(overallScore);
  const passedRulesCount = dataQualityResult?.rules?.filter((r: any) => r.passed)?.length ?? 0;
  const dimensions = dataQualityResult?.dimensions || [];

  const getDimensionScore = (name: string) => {
    const dim = dimensions.find((d: any) => d.dimension?.name === name);
    if (!dim) return null;
    return { score: dim.score, passed: dim.passed };
  };

  const validityDim = getDimensionScore('VALIDITY');
  const uniquenessDim = getDimensionScore('UNIQUENESS');
  const completenessDim = getDimensionScore('COMPLETENESS');

  const dimensionMetrics = [
    { label: 'Validity', data: validityDim },
    { label: 'Uniqueness', data: uniquenessDim },
    { label: 'Completeness', data: completenessDim },
  ].filter(m => m.data !== null);

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      padding: "16px 20px",
      backgroundColor: "#FFFFFF",
      border: "1px solid #E8EEF5",
      borderRadius: "16px",
      overflow: "hidden",
      width: "100%",
      boxSizing: "border-box",
      marginBottom: "16px",
      gap: "16px"
    }}>
      {/* Header Row */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}>
        <Typography sx={{
          fontFamily: '"Google Sans", sans-serif',
          fontWeight: 500,
          fontSize: "16px",
          lineHeight: "1.33em",
          color: "#1F1F1F",
          textTransform: "capitalize",
        }}>
          Data Quality Status
        </Typography>
        <Button
          onClick={() => setIsConfigurationsOpen(true)}
          endIcon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.91 5.59L11.5 10.17L6.91 14.75L8.33 16.17L14.33 10.17L8.33 4.17L6.91 5.59Z" fill="#0B57D0"/>
            </svg>
          }
          sx={{
            textTransform: 'none',
            fontSize: '14px',
            fontWeight: 500,
            color: '#0B57D0',
            padding: '6px 0px',
            minWidth: 'auto',
            '& .MuiButton-endIcon': { marginLeft: '2px' },
            '&:hover': {
              backgroundColor: 'transparent',
              textDecoration: 'underline'
            }
          }}
        >
          Configurations
        </Button>
      </Box>

      {/* Metrics Row */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Overall Score Card */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '8px 20px',
          gap: '8px',
          border: '1px solid #E9EEF6',
          borderRadius: '10px',
          backgroundColor: '#FFFFFF',
          minWidth: '115px',
          height: '72px',
        }}>
          <Typography sx={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#575757',
            lineHeight: '18px',
          }}>
            Overall Score
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box sx={{
              width: '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: scoreStyle.color,
              boxShadow: scoreStyle.dotShadow,
            }} />
            <Typography sx={{
              fontSize: '18px',
              fontWeight: 500,
              color: scoreStyle.color,
              lineHeight: '24px',
            }}>
              {`${Math.floor(overallScore * 100) / 100}%`}
            </Typography>
          </Box>
        </Box>

        {/* Other Metrics */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
        }}>
          {/* Passed Rules */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '10px 20px',
            gap: '4px',
            borderRight: '1px solid #E9EEF6',
            height: '68px',
          }}>
            <Typography sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#575757',
              lineHeight: '18px',
            }}>
              Passed Rules
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1F1F1F',
              lineHeight: '24px',
            }}>
              {passedRulesCount}
            </Typography>
          </Box>

          {/* Dimension Metrics */}
          {dimensionMetrics.map((metric, index) => (
            <Box
              key={metric.label}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 20px',
                gap: '4px',
                borderRight: index < dimensionMetrics.length - 1 ? '1px solid #E9EEF6' : 'none',
                height: '68px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Typography sx={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#575757',
                  lineHeight: '18px',
                }}>
                  {metric.label}
                </Typography>
                <Tooltip title={`${metric.label} score for this data quality scan`} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                  <InfoOutline sx={{ width: '16px', height: '16px', color: '#575757' }} />
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4.8px' }}>
                {metric.data!.passed && (
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="9" cy="9" r="9" fill="#128937"/>
                    <path d="M7.41 12.84C7.33 12.84 7.25 12.82 7.18 12.79C7.11 12.76 7.04 12.71 6.98 12.65L4.6 10.2C4.48 10.07 4.42 9.92 4.42 9.74C4.42 9.56 4.48 9.41 4.6 9.28C4.72 9.16 4.87 9.1 5.04 9.1C5.21 9.1 5.36 9.16 5.49 9.28L7.41 11.27L12.01 6.53C12.13 6.41 12.28 6.34 12.45 6.34C12.62 6.34 12.77 6.4 12.9 6.53C13.02 6.66 13.08 6.81 13.08 6.99C13.08 7.17 13.02 7.32 12.9 7.45L7.84 12.65C7.78 12.71 7.71 12.76 7.64 12.79C7.57 12.82 7.49 12.84 7.41 12.84Z" fill="white"/>
                  </svg>
                )}
                <Typography sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1F1F1F',
                  lineHeight: '24px',
                }}>
                  {typeof metric.data!.score === 'number'
                    ? `${Math.floor(metric.data!.score * 100) / 100}%`
                    : '-'}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Configurations Drawer */}
      <Drawer
        anchor="right"
        open={isConfigurationsOpen}
        onClose={() => setIsConfigurationsOpen(false)}
        PaperProps={{
          sx: {
            width: '38.25rem',
            backgroundColor: '#ffffff',
            boxShadow: '-0.25rem 0rem 0.5rem rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <ConfigurationsPanel
          onClose={() => setIsConfigurationsOpen(false)}
          dataQualtyScan={dataQualityScan}
        />
      </Drawer>
    </Box>
  );
};

export default DataQualityStatus;
