import React from 'react';
import { Box, Skeleton, Divider } from '@mui/material';

const DataQualitySkeleton: React.FC = () => {
  return (
    <Box
      data-testid="data-quality-skeleton"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '0 1.25rem 1.25rem 1.25rem',
        height: '100%',
        minHeight: '31.25rem',
        marginLeft: '-1.25rem',
        width: 'calc(100% + 2.5rem)',
      }}
    >
      {/* DataQualityStatus Skeleton - Top Section */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Skeleton variant="text" width={160} height={24} />
          <Skeleton variant="text" width={120} height={24} />
        </Box>

        {/* Metrics Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Overall Score Card */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px 20px',
            border: '1px solid #E9EEF6',
            borderRadius: '10px',
            minWidth: '115px',
            height: '72px',
            justifyContent: 'center',
          }}>
            <Skeleton variant="text" width={75} height={18} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton variant="circular" width={8} height={8} />
              <Skeleton variant="text" width={47} height={24} />
            </Box>
          </Box>

          {/* Passed Rules */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '10px 20px',
            borderRight: '1px solid #E9EEF6',
            height: '68px',
            justifyContent: 'center',
          }}>
            <Skeleton variant="text" width={72} height={18} />
            <Skeleton variant="text" width={20} height={24} />
          </Box>

          {/* Dimension metrics */}
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '10px 20px',
              borderRight: i < 3 ? '1px solid #E9EEF6' : 'none',
              height: '68px',
              justifyContent: 'center',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Skeleton variant="text" width={70} height={18} />
                <Skeleton variant="circular" width={16} height={16} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Skeleton variant="circular" width={16} height={16} />
                <Skeleton variant="text" width={50} height={24} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* CurrentRules Skeleton - Bottom Section */}
      <Box sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "0px",
        flex: "none",
        alignSelf: "stretch",
        flexGrow: 0,
        border: "1px solid #ECEEF4",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        width: "100%",
        minWidth: 0,
        marginBottom: "10px",
      }}>
        {/* Header */}
        <Box sx={{
          display: "flex",
          alignItems: "center",
          padding: "24px 24px 16px 24px",
          width: "100%",
          boxSizing: "border-box",
          justifyContent: "space-between",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: '6px' }} />
            <Skeleton variant="text" width={140} height={24} />
            <Skeleton variant="circular" width={18} height={18} />
          </Box>
        </Box>

        <Divider sx={{ width: "calc(100% - 48px)", borderColor: "#E8EBEF", margin: "0px 24px" }} />

        {/* Filter Bar + Table */}
        <Box sx={{ padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
          {/* Filter Bar */}
          <Box sx={{ padding: '8px 0' }}>
            <Skeleton variant="rounded" width={280} height={36} sx={{ borderRadius: '8px' }} />
          </Box>

          {/* Table Header */}
          <Box sx={{
            display: 'flex',
            padding: '6px 12px',
            borderBottom: '1px solid #DADCE0',
          }}>
            {/* Expand icon placeholder */}
            <Box sx={{ width: '28px', flexShrink: 0 }} />
            {['12%', '10%', '12%', '8%', '9%', '12%', '10%', '8%', '8%'].map((w, i) => (
              <Box key={i} sx={{ width: w, px: 0.5 }}>
                <Skeleton variant="text" width="80%" height={18} />
              </Box>
            ))}
            <Box sx={{ flex: 1, px: 0.5 }}>
              <Skeleton variant="text" width="60%" height={18} />
            </Box>
          </Box>

          {/* Table Rows */}
          {[1, 2, 3, 4, 5].map((row) => (
            <Box
              key={row}
              sx={{
                display: 'flex',
                alignItems: 'center',
                minHeight: '52px',
                padding: '0px 12px',
                borderBottom: row < 5 ? '1px solid #DADCE0' : 'none',
              }}
            >
              {/* Expand icon placeholder */}
              <Box sx={{ width: '28px', flexShrink: 0 }}>
                <Skeleton variant="circular" width={16} height={16} />
              </Box>
              {['12%', '10%', '12%', '8%', '9%', '12%', '10%', '8%', '8%'].map((w, i) => (
                <Box key={i} sx={{ width: w, px: 0.5 }}>
                  <Skeleton variant="text" width="70%" height={16} />
                </Box>
              ))}
              <Box sx={{ flex: 1, px: 0.5 }}>
                <Skeleton variant="text" width="50%" height={16} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default DataQualitySkeleton;