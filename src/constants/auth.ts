/**
 * @file auth.ts
 * @description Authentication and session management configuration constants
 */

export const AUTH_CONFIG = {
  // Token lifetime (1 hour = 3600 seconds)
  TOKEN_LIFETIME_SECONDS: 3600,

  // Warning threshold before token expires (5 minutes in milliseconds)
  TOKEN_WARNING_THRESHOLD_MS: 5 * 60 * 1000,

  // Interval for checking token validity (30 seconds)
  TOKEN_CHECK_INTERVAL_MS: 30 * 1000,

  // Warning period duration (5 minutes in milliseconds) - used for countdown display
  WARNING_DURATION_MS: 5 * 60 * 1000,

  // Interval for checking session/token validity (30 seconds)
  SESSION_CHECK_INTERVAL_MS: 30000,

  // Timeout for silent authentication attempts (10 seconds)
  SILENT_AUTH_TIMEOUT_MS: 10000,

  // SessionStorage key for storing redirect URL
  REDIRECT_URL_STORAGE_KEY: 'dataplex_auth_redirect_url',

  // LocalStorage keys for session management
  STORAGE_KEYS: {
    SESSION_EXPIRED: 'session_expired_flag',
    SESSION_RENEWED: 'session_renewed_signal',
  },

  // Whitelist of allowed redirect paths (security: prevent open redirect)
  ALLOWED_REDIRECT_PATHS: [
    '/home',
    '/search',
    '/view-details',
    '/admin-panel',
    '/browse-by-annotation',
    '/glossaries',
    '/guide',
    '/help-support',
  ],

  // Paths that should never be preserved (prevent redirect loops)
  BLOCKED_REDIRECT_PATHS: [
    '/login',
    '/permission-required',
    '/',
  ],
} as const;

/**
 * OAuth scopes required by the application.
 * Checked against granted scopes at login time.
 */
export const REQUIRED_SCOPES = import.meta.env.VITE_IS_SERVICE_ACCOUNT ? [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
] as const : [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/bigquery',
  'https://www.googleapis.com/auth/dataplex.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
] as const;

/** IAM permissions required to use the application (user must have ALL) */
export const REQUIRED_PERMISSIONS = [
  'dataplex.lakes.get',
  'dataplex.lakes.list',
  'dataplex.zones.get',
  'dataplex.zones.list',
  'dataplex.assets.get',
  'dataplex.assets.list',
  'dataplex.entryGroups.get',
  'dataplex.entryGroups.list',
  'dataplex.entries.get',
  'dataplex.entries.list',
  'dataplex.aspectTypes.get',
  'dataplex.aspectTypes.list',
  'dataplex.entryTypes.get',
  'dataplex.entryTypes.list',
] as const;
