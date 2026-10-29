export const FEATURE_FLAGS = {
  enableRequestAccess: import.meta.env.VITE_FEATURE_REQUEST_ACCESS ? import.meta.env.VITE_FEATURE_REQUEST_ACCESS !== 'false' : false,
  // The original "Lineage" tab on /view-details, superseded by "Lineage (V2 Preview)".
  // Hidden by default; set VITE_FEATURE_LEGACY_LINEAGE_TAB="true" to show it again.
  enableLegacyLineageTab: import.meta.env.VITE_FEATURE_LEGACY_LINEAGE_TAB === 'true',
} as const;
