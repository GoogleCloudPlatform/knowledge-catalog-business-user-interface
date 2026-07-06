import React from 'react';
import { Box, Skeleton } from '@mui/material';

const cardSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: '24px',
  gap: '16px',
  width: '100%',
  boxSizing: 'border-box',
  background: '#FFFFFF',
  border: '1px solid #ECEEF4',
  borderRadius: '12px',
} as const;

/** Mirrors the icon + title + help-icon header used by the insights cards. */
const SectionHeaderSkeleton: React.FC = () => (
  <>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
      <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: '6px', flexShrink: 0 }} />
      <Skeleton variant="text" width={160} height={24} />
      <Skeleton variant="circular" width={16} height={16} />
    </Box>
    <Skeleton variant="rectangular" width="100%" height={1} sx={{ mt: '-4px' }} />
  </>
);

const TableInsightsSkeleton: React.FC = () => {
  return (
    <Box className="insights-skeleton" sx={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Table Description Section Skeleton */}
      <Box className="insights-section" sx={cardSx}>
        <SectionHeaderSkeleton />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="95%" height={20} />
            <Skeleton variant="text" width="80%" height={20} />
          </Box>
          {/* "View column descriptions" link */}
          <Skeleton variant="text" width={150} height={16} />
        </Box>
      </Box>

      {/* Generated Queries Section Skeleton */}
      <Box className="insights-section" sx={cardSx}>
        <SectionHeaderSkeleton />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          {/* Filter Bar */}
          <Skeleton variant="rounded" width="100%" height={32} sx={{ maxWidth: '350px', borderRadius: '54px' }} />

          {/* Date Group Headers */}
          {[1, 2, 3].map((item) => (
            <Box
              key={item}
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
            >
              <Skeleton variant="text" width={220} height={24} />
              <Skeleton variant="circular" width={24} height={24} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default TableInsightsSkeleton;
