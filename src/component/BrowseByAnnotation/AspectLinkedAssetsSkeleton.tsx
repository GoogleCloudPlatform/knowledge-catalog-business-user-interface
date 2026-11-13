import React from "react";
import { Box, Skeleton } from "@mui/material";

/**
 * @file AspectLinkedAssetsSkeleton.tsx
 * @summary Skeleton loader for Linked Assets view in Browse by Annotation
 *
 * @description
 * Displays a skeleton loading state matching the AspectLinkedAssets
 * component layout with filter button, search bar, and a list of card placeholders.
 * Shows while linked assets are being fetched.
 */

const AspectLinkedAssetsSkeleton: React.FC = () => {
  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          borderRadius: "16px",
          overflow: "visible",
          bgcolor: "transparent",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Toolbar Skeleton: Filter Button + Search */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            mb: 2,
            pt: 1,
          }}
        >
          {/* Filter Button Skeleton */}
          <Skeleton
            variant="rounded"
            width={40}
            height={32}
            sx={{ borderRadius: "59px", mr: 1 }}
          />

          {/* Search Bar Skeleton */}
          <Skeleton
            variant="rounded"
            width={309}
            height={32}
            sx={{ borderRadius: "54px" }}
          />
        </Box>

        {/* Resource Cards Skeleton — mirrors SearchEntriesCard.tsx's layout
            (icon+title+action-icon row, single description line, tag/location/date row)
            so the skeleton doesn't jump in shape once real cards render. */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Box
              key={i}
              sx={{
                marginBottom: "10px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "12px 16px",
                border: "1px solid #DADCE0",
                height: "120px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Shimmer Animation */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: "-100%",
                  width: "100%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                  animation: "shimmer 1.5s infinite",
                  "@keyframes shimmer": {
                    "0%": { left: "-100%" },
                    "100%": { left: "100%" },
                  },
                }}
              />

              {/* Row 1: icon + title (left), action icon (right) */}
              {/* Note: flexShrink/flexGrow used instead of the `flex: 'none'` shorthand —
                  that shorthand triggers a jsdom/cssstyle getComputedStyle bug in tests
                  (crashes on any property access once the rule exists), unrelated to
                  real browsers, but avoided here to keep the test suite stable. */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexGrow: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 auto", minWidth: 0 }}>
                  <Skeleton variant="rounded" width={24} height={24} sx={{ borderRadius: "4px", flexShrink: 0 }} />
                  <Skeleton variant="text" width="45%" height={24} />
                  {/* Reserves space for the "Aspect Value" chip (SearchEntriesCard)
                      so the row doesn't jump in shape once real cards render. */}
                  <Skeleton variant="rounded" width={72} height={20} sx={{ borderRadius: "8px", flexShrink: 0 }} />
                </Box>
                <Skeleton variant="circular" width={20} height={20} sx={{ flexShrink: 0 }} />
              </Box>

              {/* Row 2: description (single line, matches the real card's nowrap+ellipsis text) */}
              <Skeleton variant="text" width="80%" height={20} sx={{ flexShrink: 0, flexGrow: 0 }} />

              {/* Row 3: system/type tags + location pill + date */}
              <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexGrow: 0 }}>
                <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: "12px" }} />
                <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: "12px" }} />
                <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: "12px" }} />
                <Skeleton variant="text" width={70} height={20} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default AspectLinkedAssetsSkeleton;
