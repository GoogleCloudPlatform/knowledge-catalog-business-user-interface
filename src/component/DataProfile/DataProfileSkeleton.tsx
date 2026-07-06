import React from 'react';
import { Box, Skeleton, Divider } from '@mui/material';

// Matches COLUMN_CONFIGS initial widths from DataProfile.tsx
const COL_WIDTHS = [140, 90, 85, 105, 260, 390];
const EXPAND_W = 28;
const TOTAL_W = COL_WIDTHS.reduce((s, w) => s + w, 0) + EXPAND_W + 24;

const DataProfileSkeleton: React.FC = () => {
  return (
    <Box data-testid="data-profile-skeleton" sx={{ flex: 1, position: 'relative' }}>
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
        {/* Card Header — matching new Data Products style */}
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
          <Skeleton variant="text" width={110} height={20} />
        </Box>

        <Divider sx={{ width: "calc(100% - 48px)", borderColor: "#E8EBEF", margin: "0px 24px" }} />

        {/* Content */}
        <Box sx={{ padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
          {/* FilterBar skeleton */}
          <Box sx={{ padding: '8px 0' }}>
            <Skeleton variant="rounded" width={280} height={36} sx={{ borderRadius: '8px' }} />
          </Box>

          {/* Table scroll wrapper */}
          <Box sx={{ overflow: 'hidden' }}>
            <Box sx={{
              width: '100%',
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 420px)',
            }}>
              {/* Header row */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                padding: '0px 12px',
                borderBottom: '1px solid #DADCE0',
                minWidth: `${TOTAL_W}px`,
              }}>
                {/* Expand icon placeholder */}
                <Box sx={{ width: `${EXPAND_W}px`, flexShrink: 0 }} />

                {/* Column Name */}
                <Box sx={{ width: `${COL_WIDTHS[0]}px`, flexShrink: 0, padding: '8px 8px' }}>
                  <Skeleton variant="text" width={80} height={16} />
                </Box>
                {/* Type */}
                <Box sx={{ width: `${COL_WIDTHS[1]}px`, flexShrink: 0, padding: '8px 8px 8px 12px' }}>
                  <Skeleton variant="text" width={28} height={16} />
                </Box>
                {/* Null % */}
                <Box sx={{ width: `${COL_WIDTHS[2]}px`, flexShrink: 0, padding: '8px 8px 8px 12px' }}>
                  <Skeleton variant="text" width={36} height={16} />
                </Box>
                {/* Unique % */}
                <Box sx={{ width: `${COL_WIDTHS[3]}px`, flexShrink: 0, padding: '8px 8px 8px 12px' }}>
                  <Skeleton variant="text" width={48} height={16} />
                </Box>
                {/* Statistics */}
                <Box sx={{ width: `${COL_WIDTHS[4]}px`, flexShrink: 0, padding: '8px 8px 8px 12px' }}>
                  <Skeleton variant="text" width={64} height={16} />
                </Box>
                {/* Top 10 values */}
                <Box sx={{ width: `${COL_WIDTHS[5]}px`, flexShrink: 0, padding: '8px 8px 8px 12px' }}>
                  <Skeleton variant="text" width={80} height={16} />
                </Box>
              </Box>

              {/* Body rows */}
              <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: `${TOTAL_W}px` }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      minHeight: '52px',
                      padding: '0px 12px',
                      position: 'relative',
                      ...(i < 4 && {
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '1px',
                          backgroundColor: '#DADCE0',
                        },
                      }),
                    }}
                  >
                    {/* Expand icon */}
                    <Box sx={{ width: `${EXPAND_W}px`, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      <Skeleton variant="circular" width={16} height={16} />
                    </Box>

                    {/* Column Name */}
                    <Box sx={{ width: `${COL_WIDTHS[0]}px`, flexShrink: 0, paddingLeft: '8px', paddingRight: '4px' }}>
                      <Skeleton variant="text" width={`${65 + (i % 3) * 15}%`} height={16} />
                    </Box>

                    {/* Type badge */}
                    <Box sx={{ width: `${COL_WIDTHS[1]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px' }}>
                      <Skeleton variant="rounded" width={56} height={20} sx={{ borderRadius: '8px' }} />
                    </Box>

                    {/* Null % */}
                    <Box sx={{ width: `${COL_WIDTHS[2]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px' }}>
                      <Skeleton variant="text" width={36} height={16} />
                    </Box>

                    {/* Unique % */}
                    <Box sx={{ width: `${COL_WIDTHS[3]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px' }}>
                      <Skeleton variant="text" width={40} height={16} />
                    </Box>

                    {/* Statistics — inline key [value] pairs */}
                    <Box sx={{ width: `${COL_WIDTHS[4]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Skeleton variant="text" width={44} height={14} />
                      <Skeleton variant="text" width={28} height={14} />
                      <Skeleton variant="text" width={44} height={14} />
                      <Skeleton variant="text" width={28} height={14} />
                    </Box>

                    {/* Top 10 values — bar chart hint */}
                    <Box sx={{ width: `${COL_WIDTHS[5]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px' }}>
                      <Skeleton variant="text" width={130} height={14} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DataProfileSkeleton;