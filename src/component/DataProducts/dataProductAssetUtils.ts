/**
 * @file dataProductAssetUtils.ts
 * @description Helpers for the Data Product "Assets" tab.
 *
 * The data product API (dataAssets) returns each asset as a Google Cloud
 * resource name, e.g. //bigquery.googleapis.com/projects/p/datasets/d/tables/t.
 * The tab enriches assets with their Knowledge Catalog entry (found by fully
 * qualified name), but must still show every asset the API returned - including
 * ones the catalog search cannot resolve.
 */

export interface DataProductAsset {
  name?: string;
  resource?: string;
  [key: string]: unknown;
}

export interface SearchResult {
  dataplexEntry?: {
    name?: string;
    fullyQualifiedName?: string;
    entrySource?: { resource?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const parseResource = (resource: string): { service: string; segments: string[] } | null => {
  const value = String(resource || '');
  const match = value.match(/^\/\/([^/]+)\/(.+)$/);
  if (match) {
    const service = match[1].replace(/\.googleapis\.com$/, '');
    return { service, segments: match[2].split('/').filter(Boolean) };
  }
  // The API can also return BigQuery assets without the //bigquery.googleapis.com
  // prefix (projects/p/datasets/d/tables/t); treat those as BigQuery, as before.
  if (/^projects\/[^/]+\/datasets\//.test(value)) {
    return { service: 'bigquery', segments: value.split('/').filter(Boolean) };
  }
  return null;
};

/** Value following `key` in a resource path (projects/<value>/...). */
const after = (segments: string[], key: string): string | undefined => {
  const i = segments.indexOf(key);
  return i >= 0 ? segments[i + 1] : undefined;
};

/**
 * Knowledge Catalog fully qualified name for a resource, per
 * https://cloud.google.com/dataplex/docs/fully-qualified-names. Returns null
 * when the FQN cannot be derived from the resource name alone.
 */
export const resourceToFqn = (resource: string): string | null => {
  const parsed = parseResource(resource);
  if (!parsed) return null;
  const { service, segments: s } = parsed;
  const project = after(s, 'projects');

  switch (service) {
    case 'bigquery': {
      const dataset = after(s, 'datasets');
      if (!project || !dataset) return null;
      const table = after(s, 'tables');
      const model = after(s, 'models');
      const routine = after(s, 'routines');
      if (routine) return `bigquery:routine:${project}.${dataset}.${routine}`;
      const leaf = table || model;
      return leaf ? `bigquery:${project}.${dataset}.${leaf}` : `bigquery:${project}.${dataset}`;
    }
    case 'storage': {
      const bucket = after(s, 'buckets');
      return bucket ? `gcs:${bucket}` : null;
    }
    case 'pubsub': {
      const topic = after(s, 'topics');
      const subscription = after(s, 'subscriptions');
      if (!project) return null;
      if (topic) return `pubsub:topic:${project}.${topic}`;
      if (subscription) return `pubsub:subscription:${project}.${subscription}`;
      return null;
    }
    case 'bigtable':
    case 'bigtableadmin': {
      const instance = after(s, 'instances');
      const table = after(s, 'tables');
      if (!project || !instance) return null;
      return table ? `bigtable:${project}.${instance}.${table}` : `bigtable:${project}.${instance}`;
    }
    case 'aiplatform': {
      const location = after(s, 'locations');
      const dataset = after(s, 'datasets');
      const featureGroup = after(s, 'featureGroups');
      if (!project || !location) return null;
      if (dataset) return `vertex_ai:dataset:${project}.${location}.${dataset}`;
      if (featureGroup) return `vertex_ai:featuregroup:${project}.${location}.${featureGroup}`;
      return null;
    }
    case 'metastore': {
      const location = after(s, 'locations');
      const svc = after(s, 'services');
      const database = after(s, 'databases');
      const table = after(s, 'tables');
      if (!project || !location || !svc) return null;
      return [`dataproc_metastore:${project}`, location, svc, database, table].filter(Boolean).join('.');
    }
    default:
      return null;
  }
};

/** Resource path without the //service prefix (catalog entries use this form). */
export const resourcePath = (resource: string): string =>
  String(resource || '').replace(/^\/\/[^/]+\//, '');

const SYSTEM_LABELS: Record<string, string> = {
  bigquery: 'BigQuery',
  storage: 'Cloud Storage',
  pubsub: 'Pub/Sub',
  bigtable: 'Bigtable',
  bigtableadmin: 'Bigtable',
  spanner: 'Spanner',
  sqladmin: 'Cloud SQL',
  aiplatform: 'Vertex AI',
  metastore: 'Dataproc Metastore',
  looker: 'Looker',
  alloydb: 'AlloyDB',
};

/** Singular, lower-case type from the last collection in the path ("tables" -> "table"). */
const assetType = (segments: string[]): string => {
  const collection = segments.length >= 2 ? segments[segments.length - 2] : 'resource';
  return collection.replace(/ies$/, 'y').replace(/s$/, '').toLowerCase() || 'resource';
};

/**
 * Search-result-shaped entry for an asset the catalog search did not return,
 * so it is still listed (with the information the data product API provides).
 */
export const buildFallbackAssetEntry = (asset: DataProductAsset): SearchResult => {
  const resource = String(asset.resource || asset.name || '');
  const parsed = parseResource(resource);
  const segments = parsed?.segments ?? resource.split('/').filter(Boolean);
  const service = parsed?.service ?? '';
  const displayName = segments[segments.length - 1] || resource;
  return {
    dataplexEntry: {
      name: resource || String(asset.name || ''),
      fullyQualifiedName: resourceToFqn(resource) ?? '',
      entryType: `entryTypes/${service || 'asset'}-${assetType(segments)}`,
      entrySource: {
        resource: resourcePath(resource),
        displayName,
        system: SYSTEM_LABELS[service] ?? (service || 'Unknown'),
        location: after(segments, 'locations') ?? '',
        description: 'Not found in Knowledge Catalog search - showing the details provided by the data product.',
      },
      aspects: {},
      notInCatalog: true,
    },
  };
};

/**
 * One row per API asset, in API order: the matching catalog entry when the
 * search found one (matched by FQN or resource path), otherwise a fallback row.
 */
export const mergeAssetsWithSearchResults = (
  assets: DataProductAsset[],
  results: SearchResult[],
): SearchResult[] => {
  const byFqn = new Map<string, SearchResult>();
  const byResource = new Map<string, SearchResult>();
  results.forEach((r) => {
    const fqn = r?.dataplexEntry?.fullyQualifiedName;
    const res = r?.dataplexEntry?.entrySource?.resource;
    if (fqn) byFqn.set(fqn, r);
    if (res) byResource.set(resourcePath(res), r);
  });
  const seen = new Set<string>();
  const rows: SearchResult[] = [];
  assets.forEach((asset) => {
    const resource = String(asset?.resource || '');
    const fqn = resourceToFqn(resource);
    const match = (fqn && byFqn.get(fqn)) || byResource.get(resourcePath(resource));
    const row = match ?? buildFallbackAssetEntry(asset);
    const key = String(row.dataplexEntry?.name || resource);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  });
  return rows;
};

/** Split FQNs into search queries small enough for the API. */
export const buildFqnSearchQueries = (fqns: string[], batchSize = 50): string[] => {
  const unique = [...new Set(fqns.filter(Boolean))];
  const queries: string[] = [];
  for (let i = 0; i < unique.length; i += batchSize) {
    queries.push(`fully_qualified_name=(${unique.slice(i, i + batchSize).join(' | ')})`);
  }
  return queries;
};
