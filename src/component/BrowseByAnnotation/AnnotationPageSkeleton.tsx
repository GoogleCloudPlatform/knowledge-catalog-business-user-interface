import React from 'react';
import { Box, Skeleton } from '@mui/material';
import DetailPageOverviewSkeleton from '../DetailPageOverview/DetailPageOverviewSkeleton';

/**
 * Full-page skeleton loader for the BrowseByAnnotation page.
 * Matches the header layout (title, description, stats bar, tabs)
 * plus the DetailPageOverviewSkeleton body.
 */
const AnnotationPageSkeleton: React.FC = () => {
  return (
    <>
      {/* Header section */}
      <Box sx={{ flexShrink: 0 }}>
        {/* Row 0: Sections button */}
        <Box sx={{ padding: '12px 20px 0px' }}>
          <Skeleton variant="rounded" width={105} height={32} sx={{ borderRadius: '59px' }} />
        </Box>
        <Box
          sx={{
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: '20px',
            margin: '20px 20px 15px 20px',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #ECEEF4',
          }}
        >
          {/* Row 1: Title - icon + title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', minHeight: '40px' }}>
            <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: '10px', flexShrink: 0 }} />
            <Skeleton variant="text" width={300} height={36} />
          </Box>

          {/* Row 2: Description */}
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="text" width="80%" height={20} />
            <Skeleton variant="text" width="50%" height={20} />
          </Box>
        </Box>
        {/* Row 3: Tabs */}
        <Box sx={{ 
            display: 'flex', 
            gap: '40px', 
            paddingLeft: '1.75rem',
            minHeight: '47px',
            alignItems: 'center' 
          }}>
          <Skeleton variant="text" width={80} height={20} sx={{ borderRadius: '4px' }} />
          <Skeleton variant="text" width={80} height={20} sx={{ borderRadius: '4px' }} />
        </Box>
        <Box sx={{ mx: '20px', borderBottom: '1px solid #DADCE0' }} />
      </Box>

      {/* Row 5: Body */}
      <Box sx={{ p: '0px 20px 20px 20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <DetailPageOverviewSkeleton />
      </Box>
    </>
  );
};

export default AnnotationPageSkeleton;
