import React from "react";
import { Box, Skeleton } from "@mui/material";

/**
 * @file GlossariesCategoriesTermsSkeleton.tsx
 * @summary Skeleton loader for Categories and Terms tabs in Glossaries
 *
 * @description
 * Displays a skeleton loading state matching the GlossariesCategoriesTerms
 * component layout with search bar, sort controls, and a grid of card placeholders.
 */

const GlossariesCategoriesTermsSkeleton: React.FC = () => {
  return (
    <Box sx={{ height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Header Section (Search/Sort) Skeleton */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            mb: 3,
            flexShrink: 0,
          }}
        >
          {/* Search Bar / FilterBar Skeleton */}
          <Skeleton
            variant="rounded"
            width={320}
            height={36}
            sx={{ borderRadius: "8px" }}
          />
          {/* Sort Controls Skeleton (matching the new 36px high pill) */}
          <Skeleton 
            variant="rounded" 
            width={140} 
            height={36} 
            sx={{ borderRadius: "7.5px" }} 
          />
        </Box>

        {/* Cards Grid Skeleton */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "16px",
            width: "100%",
            overflowY: "auto",
            minHeight: 0,
            pb: 2,
            px: 1,
            mx: -1,
            pt: 1,
            mt: -1,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Box
              key={i}
              sx={{
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                height: "132px",
                p: "16px",
                display: "flex",
                flexDirection: "column",
                backgroundColor: '#FFF'
              }}
            >
              {/* Card Header with Icon and Title */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                }}
              >
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="text" width="60%" height={24} />
              </Box>
              {/* Description Lines */}
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="80%" height={20} />
              </Box>
              {/* Footer with Time */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: 1,
                }}
              >
                <Skeleton variant="circular" width={16} height={16} />
                <Skeleton variant="text" width={100} height={16} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default GlossariesCategoriesTermsSkeleton;