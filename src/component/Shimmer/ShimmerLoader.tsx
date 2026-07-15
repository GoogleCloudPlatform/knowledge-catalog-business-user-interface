import React from 'react';
import { Box, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';import { useSelector } from 'react-redux';

/**
 * @file ShimmerLoader.tsx
 * @description
 * This component renders a "shimmer" loading placeholder, commonly used to
 * indicate that content is being fetched. It displays a repeating pattern of
 * greyed-out shapes that mimic the structure of the content being loaded,
 * along with a sweeping gradient animation to create the shimmer effect.
 *
 * It supports three distinct visual types:
 * - **'list' (default)**: Renders placeholders that resemble a search result
 * card (icon, title, description, tags).
 * - **'table'**: Renders placeholders that resemble table rows.
 * - **'card'**: Renders simple rectangular placeholders.
 *
 * The number of items rendered is configurable via the `count` prop.
 *
 * @param {ShimmerLoaderProps} props - The props for the component.
 * @param {number} [props.count=6] - (Optional) The number of shimmer items
 * to render. Defaults to 6.
 * @param {'list' | 'table' | 'card'} [props.type='list'] - (Optional) The
 * visual style of the shimmer loader. Defaults to 'list'.
 *
 * @returns {React.ReactElement} A React element (`Box`) containing the
 * specified number of shimmer placeholders in the chosen style.
 */

interface ShimmerLoaderProps {
  count?: number;
  type?: 'list' | 'table' | 'card'| 'simple-list'| 'header'| 'title' | 'search-card' | 'search-table' | 'preview-schema';
}

const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({ count = 6, type = 'list' }) => {
  const mode = useSelector((state: any) => state.user?.mode) as string | undefined;
  const isDark = mode === 'dark';
  const shapeBg = isDark ? '#3c4043' : '#F0F0F0';
  const cardBg = isDark ? '#131314' : '#ffffff';
  const borderColor = isDark ? '#3c4043' : '#DADCE0';
  const borderColorAlt = isDark ? '#3c4043' : '#E0E0E0';
  const shimmerGradient = isDark
    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)'
    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)';
  const shimmerGradientAlt = isDark
    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)'
    : 'linear-gradient(90deg, transparent, rgba(240,240,240,0.8), transparent)';

  const renderTitleShimmer = () => (
    <>
      <Box 
        sx={{ 
          width: '250px', // Typical length for a title
          height: '24px', // Matches h5 line-height/font-size
          backgroundColor: shapeBg, 
          borderRadius: '4px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
          {/* Shimmer Animation Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: shimmerGradient,
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } }
            }}
          />
      </Box>
    </>
  );
  const renderHeaderShimmer = () => (
    <>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, // Matches the gap={1} in your real header
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
          {/* Shimmer Animation Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: shimmerGradientAlt,
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } }
            }}
          />

          {/* Icon Placeholder: 24px square (matching your medium icon) */}
          <Box 
            sx={{ 
              width: 24, 
              height: 24, 
              backgroundColor: shapeBg, 
              borderRadius: '4px',
              flexShrink: 0 
            }} 
          />
          
          {/* Title Placeholder: Mimics h5 text height */}
          <Box 
            sx={{ 
              width: '200px', 
              height: '24px', 
              backgroundColor: shapeBg, 
              borderRadius: '4px' 
            }} 
          />
      </Box>
    </>
  );
  const renderSimpleListShimmer = () => (
    <>
      {[...Array(count)].map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
            padding: '8px 12px', // Minimal padding
            // No border, No background color, No box shadow
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Shimmer Animation */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: shimmerGradientAlt, // Lighter gradient for white bg
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } }
            }}
          />

          {/* Icon placeholder (Circle or small square) */}
          <Box
            sx={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: shapeBg,
              flexShrink: 0
            }}
          />

          {/* Text placeholder (Line) */}
          <Box
            sx={{
              width: '70%',
              height: '14px',
              backgroundColor: shapeBg,
              borderRadius: '4px'
            }}
          />
        </Box>
      ))}
    </>
  );
  const renderListShimmer = () => (
    <>
      {[...Array(count)].map((_, index) => (
        <Box
          key={index}
          sx={{
            marginBottom: '10px',
            backgroundColor: cardBg,
            borderRadius: '8px',
            padding: '16px',
            border: `1px solid ${borderColorAlt}`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Shimmer Animation */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: shimmerGradient,
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': {
                '0%': {
                  left: '-100%'
                },
                '100%': {
                  left: '100%'
                }
              }
            }}
          />
          
          {/* Shimmer Content Structure */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            {/* Icon placeholder */}
            <Box
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: shapeBg,
                flexShrink: 0
              }}
            />
            
            {/* Title placeholder */}
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  width: '60%',
                  height: '16px',
                  backgroundColor: shapeBg,
                  borderRadius: '4px',
                  marginBottom: '4px'
                }}
              />
              <Box
                sx={{
                  width: '40%',
                  height: '12px',
                  backgroundColor: shapeBg,
                  borderRadius: '4px'
                }}
              />
            </Box>
          </Box>
          
          {/* Description placeholder */}
          <Box
            sx={{
              width: '80%',
              height: '12px',
              backgroundColor: shapeBg,
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          />
          
          {/* Tags placeholder */}
          <Box sx={{ display: 'flex', gap: '8px' }}>
            <Box
              sx={{
                width: '60px',
                height: '20px',
                backgroundColor: shapeBg,
                borderRadius: '12px'
              }}
            />
            <Box
              sx={{
                width: '80px',
                height: '20px',
                backgroundColor: shapeBg,
                borderRadius: '12px'
              }}
            />
          </Box>
        </Box>
      ))}
    </>
  );

  const renderTableShimmer = () => (
    <>
      {[...Array(count)].map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: `1px solid ${borderColorAlt}`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Shimmer Animation */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: shimmerGradient,
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': {
                '0%': {
                  left: '-100%'
                },
                '100%': {
                  left: '100%'
                }
              }
            }}
          />
          
          {/* Table row content */}
          <Box sx={{ display: 'flex', gap: '16px', width: '100%' }}>
            <Box
              sx={{
                width: '30%',
                height: '16px',
                backgroundColor: shapeBg,
                borderRadius: '4px'
              }}
            />
            <Box
              sx={{
                width: '25%',
                height: '16px',
                backgroundColor: shapeBg,
                borderRadius: '4px'
              }}
            />
            <Box
              sx={{
                width: '25%',
                height: '16px',
                backgroundColor: shapeBg,
                borderRadius: '4px'
              }}
            />
            <Box
              sx={{
                width: '20%',
                height: '16px',
                backgroundColor: shapeBg,
                borderRadius: '4px'
              }}
            />
          </Box>
        </Box>
      ))}
    </>
  );

  const renderCardShimmer = () => (
    <>
      {[...Array(count)].map((_, index) => (
        <Box
          key={index}
          sx={{
            backgroundColor: cardBg,
            borderRadius: '8px',
            padding: '16px',
            border: `1px solid ${borderColorAlt}`,
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '16px'
          }}
        >
          {/* Shimmer Animation */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: shimmerGradient,
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': {
                '0%': {
                  left: '-100%'
                },
                '100%': {
                  left: '100%'
                }
              }
            }}
          />
          
          {/* Card content */}
          <Box
            sx={{
              width: '70%',
              height: '20px',
              backgroundColor: shapeBg,
              borderRadius: '4px',
              marginBottom: '12px'
            }}
          />
          <Box
            sx={{
              width: '90%',
              height: '14px',
              backgroundColor: shapeBg,
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          />
          <Box
            sx={{
              width: '60%',
              height: '14px',
              backgroundColor: shapeBg,
              borderRadius: '4px'
            }}
          />
        </Box>
      ))}
    </>
  );

  const renderSearchCardShimmer = () => (
    <>
      {[...Array(count)].map((_, index) => (
        <Box
          key={index}
          sx={{
            backgroundColor: cardBg,
            borderRadius: '16px',
            padding: '12px 16px',
            border: `1px solid ${borderColor}`,
            height: '120px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '11px',
          }}
        >
          {/* Shimmer Animation */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: shimmerGradient,
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } },
              zIndex: 1,
            }}
          />

          {/* Row 1: Icon + Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box sx={{ width: '24px', height: '24px', backgroundColor: shapeBg, borderRadius: '4px', flexShrink: 0 }} />
            <Box sx={{ width: '250px', height: '16px', backgroundColor: shapeBg, borderRadius: '4px' }} />
          </Box>

          {/* Row 2: Description */}
          <Box sx={{ width: '75%', height: '14px', backgroundColor: shapeBg, borderRadius: '4px' }} />

          {/* Row 3: Tags + Date + Location */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box sx={{ width: '70px', height: '24px', backgroundColor: shapeBg, borderRadius: '38px' }} />
            <Box sx={{ width: '85px', height: '24px', backgroundColor: shapeBg, borderRadius: '38px' }} />
            <Box sx={{ width: '90px', height: '14px', backgroundColor: shapeBg, borderRadius: '4px' }} />
            <Box sx={{ width: '80px', height: '14px', backgroundColor: shapeBg, borderRadius: '4px' }} />
          </Box>
        </Box>
      ))}
    </>
  );

 const renderSearchTableShimmer = () => (
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
        maxWidth: '100%',
      }}
    >
      <Table sx={{ width: '100%', tableLayout: 'fixed' }} aria-label="search results table skeleton">
        <colgroup>
          <col style={{ width: '25%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '15%' }} />
        </colgroup>
        <TableHead>
          <TableRow
            sx={{
              position: 'relative',
              height: '48px',
              '& .MuiTableCell-root': {
                borderBottom: 'none',
                padding: '12px 20px 4px',
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
            {['Name', 'Description', 'Type', 'Location', 'Last modified'].map((header) => (
              <TableCell
                key={header}
                sx={{
                  fontFamily: '"Google Sans", sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isDark ? '#dedfe0' : '#444746',
                  whiteSpace: 'nowrap',
                  ...(header === 'Last modified' && { textAlign: 'right' }),
                }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: count }).map((_, index) => (
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
              {/* Name */}
              <TableCell sx={{ padding: '10px 20px' }}>
                <Skeleton variant="text" width={`${60 + (index % 3) * 15}%`} height={20} />
              </TableCell>

              {/* Description */}
              <TableCell sx={{ padding: '10px 20px' }}>
                <Skeleton variant="text" width={`${70 + (index % 2) * 10}%`} height={20} />
              </TableCell>

              {/* Type */}
              <TableCell sx={{ padding: '10px 20px' }}>
                <Box sx={{ display: 'flex', gap: '8px' }}>
                  <Skeleton variant="rounded" width={56} height={20} sx={{ borderRadius: '8px' }} />
                  <Skeleton variant="rounded" width={48} height={20} sx={{ borderRadius: '8px' }} />
                </Box>
              </TableCell>

              {/* Location */}
              <TableCell sx={{ padding: '10px 20px' }}>
                <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: '12px' }} />
              </TableCell>

              {/* Last Modified */}
              <TableCell sx={{ padding: '10px 20px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Skeleton variant="text" width="80%" height={20} />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderPreviewSchemaShimmer = () => (
    <Box
      sx={{
        backgroundColor: cardBg,
        borderRadius: '0px',
        boxShadow: 'none',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header Row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: '12px',
            right: '0px',
            height: '1px',
            backgroundColor: borderColor,
          },
        }}
      >
        {/* Name header - 40% */}
        <Box sx={{ width: '40%', padding: '12px 20px 4px' }}>
          <Box sx={{ width: '40px', height: '12px', backgroundColor: shapeBg, borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: shimmerGradient, animation: 'shimmer 1.5s infinite', '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } } }} />
          </Box>
        </Box>
        {/* Type header - 30% */}
        <Box sx={{ width: '30%', padding: '12px 20px 4px' }}>
          <Box sx={{ width: '32px', height: '12px', backgroundColor: shapeBg, borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: shimmerGradient, animation: 'shimmer 1.5s infinite', '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } } }} />
          </Box>
        </Box>
        {/* Mode header - 30% */}
        <Box sx={{ width: '30%', padding: '12px 20px 4px' }}>
          <Box sx={{ width: '36px', height: '12px', backgroundColor: shapeBg, borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: shimmerGradient, animation: 'shimmer 1.5s infinite', '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } } }} />
          </Box>
        </Box>
      </Box>

      {/* Data Rows */}
      {[...Array(count)].map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: '40px',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: '12px',
              right: '0px',
              height: '1px',
              backgroundColor: borderColor,
            },
          }}
        >
          {/* Shimmer Animation */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: shimmerGradient,
              animation: 'shimmer 1.5s infinite',
              '@keyframes shimmer': { '0%': { left: '-100%' }, '100%': { left: '100%' } },
              zIndex: 1,
            }}
          />

          {/* Name cell - 40% */}
          <Box sx={{ width: '40%', padding: '10px 20px' }}>
            <Box sx={{ width: `${60 + (index % 3) * 15}%`, height: '14px', backgroundColor: shapeBg, borderRadius: '4px' }} />
          </Box>

          {/* Type cell - 30% (chip shape) */}
          <Box sx={{ width: '30%', padding: '10px 20px' }}>
            <Box sx={{ width: `${50 + (index % 2) * 12}px`, height: '20px', backgroundColor: shapeBg, borderRadius: '8px' }} />
          </Box>

          {/* Mode cell - 30% */}
          <Box sx={{ width: '30%', padding: '10px 20px' }}>
            <Box sx={{ width: `${50 + (index % 3) * 10}%`, height: '14px', backgroundColor: shapeBg, borderRadius: '4px' }} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderShimmer = () => {
    switch (type) {
      case 'title':
        return renderTitleShimmer();
      case 'header':
        return renderHeaderShimmer();
      case 'simple-list':
        return renderSimpleListShimmer();
      case 'search-card':
        return renderSearchCardShimmer();
      case 'search-table':
        return renderSearchTableShimmer();
      case 'preview-schema':
        return renderPreviewSchemaShimmer();
      case 'table':
        return renderTableShimmer();
      case 'card':
        return renderCardShimmer();
      case 'list':
      default:
        return renderListShimmer();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {renderShimmer()}
    </Box>
  );
};

export default ShimmerLoader;
