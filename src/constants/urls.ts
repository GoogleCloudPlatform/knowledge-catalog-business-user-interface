const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

// Bootstrap request timeouts. These exist so a request that is accepted but
// never answered can't leave the bootstrap permanently "loading" (no rejection
// means no retry and no give-up). Deliberately not a global axios default, which
// would also cut off legitimately slow searches, data scans and lineage queries.
//
// The two calls have very different cost profiles, so they get separate values.

// /app-configs makes a single capped Resource Manager call — 10s is generous.
export const APP_CONFIG_REQUEST_TIMEOUT_MS = 10000;

// /get-projects walks every page of searchProjects. Measured at ~31s for a
// customer approaching 40,000 projects, so this is ~3x that for headroom.
// Do NOT lower this without re-measuring against the largest known org: too
// short and a healthy-but-slow response is aborted, which surfaces as a bogus
// "could not load projects" error and project names falling back to raw numbers.
export const GET_PROJECTS_REQUEST_TIMEOUT_MS = 90000;

export const URLS = {
    API_URL: API_BASE_URL+ '/' + API_VERSION,
    APP_CONFIG: '/app-configs',
    ADMIN_CONFIGURE: '/admin/configure',
    CHECK_PERMISSIONS: '/check-permissions',
    SEARCH : '/search',
    GET_ENTRY: '/get-entry',
    CHECK_ENTRY_ACCESS: '/check-entry-access',
    GET_ENTRY_BY_FQN: '/get-entry-by-fqn',
    LOOKUP_ENTRY_LINKS: '/lookup-entry-links',
    GET_SAMPLE_DATA: '/get-sample-data',
    BATCH_ASPECTS: '/batch-aspects',
    LINEAGE_SEARCH: '/lineage',
    ENTRY_DATA_QUALITY: '/entry-data-quality',
    GET_DATA_SCAN: '/get-data-scan',
    GET_ALL_DATA_SCANS: '/data-scans',
    GET_ASPECT_DETAIL: '/get-aspect-detail',
    GET_PROCESS_AND_JOB_DETAILS : '/get-process-and-job-details',
    ACCESS_REQUEST : '/access-request',
    GET_PROJECTS: '/get-projects',
    SEND_FEEDBACK: '/send-feedback',
    LINEAGE_SEARCH_COLUMN_LEVEL: '/lineage-column-level',
    GET_SCAN_JOBS: '/get-data-scan-jobs',
    DATA_PRODUCTS: '/data-products',
    DATA_PRODUCT_DETAILS: '/data-product-details',
    DATA_PRODUCT_ASSETS: '/data-product-assets',
    GLOSSARY_CHILDREN: '/glossary-children',
    LOOKUP_ENTRY_REST: '/lookup-entry-rest',
    SEARCH_ENTRIES: '/search-entries',
}