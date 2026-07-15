import React from 'react';
import { Box, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelector } from 'react-redux';

const COLUMN_WIDTHS = ['23.01%', '26.55%', '21.24%', '11.50%', '7.08%', '10.62%'];
const HEADERS = ['Name', 'Description', 'Owner', 'Location', 'Assets', 'Last modified'];
const SKELETON_ROWS = 6;

const DataProductsTableViewSkeleton: React.FC = () => {
  const mode = useSelector((state: any) => state.user.mode) as string;
  const isDark = mode === 'dark';

  return (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: isDark ? '#131314' : '#FFFFFF',
        borderRadius: '16px',
        border: isDark ? '1px solid #3c4043' : '1px solid #E8EEF5',
        boxShadow: 'none',
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        overflowX: 'auto',
        width: '100%',
        margin: 'auto',
        maxWidth: '100%',
      }}
    >
      <Table sx={{ width: '100%', tableLayout: 'fixed', minWidth: '810px' }} aria-label="data products table skeleton">
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow
            sx={{
              position: 'relative',
              '& .MuiTableCell-root': {
                borderBottom: 'none',
                padding: '12px 20px 4px',
              },
              '& .MuiTableCell-root:first-of-type': {
                paddingLeft: '20px',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: '0px',
                right: '0px',
                height: '1px',
                backgroundColor: isDark ? '#3c4043' : '#DADCE0',
              },
            }}
          >
            {HEADERS.map((header) => (
              <TableCell
                key={header}
                sx={{
                  fontFamily: '"Google Sans", sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isDark ? '#dedfe0' : '#444746',
                  whiteSpace: 'nowrap', // This prevents the text from stacking
                  ...(header === 'Last modified' && { textAlign: 'right' }),
                }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
            <TableRow
              key={index}
              sx={{
                position: 'relative',
                height: '60px',
                '& .MuiTableCell-root': {
                  borderBottom: 'none',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: '0px',
                  right: '0px',
                  height: '1px',
                  backgroundColor: isDark ? '#3c4043' : '#E8EEF5',
                },
                '&:last-child::after': { display: 'none' }
              }}
            >
              {/* 1. Name */}
              <TableCell sx={{ padding: '10px 20px', paddingLeft: '20px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: '8px', flexShrink: 0 }} />
                  <Skeleton variant="text" width="60%" height={20} />
                </Box>
              </TableCell>

              {/* 2. Description */}
              <TableCell sx={{ padding: '10px 20px' }}>
                <Skeleton variant="text" width="80%" height={20} />
              </TableCell>

              {/* 3. Owner */}
              <TableCell sx={{ padding: '10px 20px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Skeleton variant="circular" width={28} height={28} sx={{ flexShrink: 0 }} />
                  <Skeleton variant="text" width="50%" height={20} />
                </Box>
              </TableCell>

              {/* 4. Location */}
              <TableCell sx={{ padding: '10px 20px' }}>
               <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: '3.5px' }} />
              </TableCell>

              {/* 5. Assets */}
              <TableCell sx={{ padding: '10px 20px' }}>
                 <Skeleton variant="text" width="40%" height={20} />
              </TableCell>

              {/* 7. Last Modified */}
              <TableCell sx={{ padding: '10px 20px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Skeleton variant="text" width="60%" height={20} />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataProductsTableViewSkeleton;