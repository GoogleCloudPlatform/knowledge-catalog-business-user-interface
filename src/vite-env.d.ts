/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_VERSION: string;
  readonly VITE_ADMIN_EMAIL: string;
  readonly VITE_GOOGLE_PROJECT_ID: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_REDIRECT_URI: string;
  readonly VITE_FEATURE_DARK_MODE: string;
  readonly VITE_FEATURE_REQUEST_ACCESS: string;
  readonly VITE_FEATURE_LEGACY_LINEAGE_TAB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
