/**
 * @file types.ts
 * @description Type definitions for the Data Lineage tab. API types mirror the
 * Data Lineage REST API v1 discovery document (datalineage.googleapis.com).
 */

/** Minimal shape of a Knowledge Catalog entry used by the Data Lineage tab. */
export interface CatalogEntryLike {
  name?: string;
  fullyQualifiedName?: string;
  entryType?: string;
  entrySource?: { system?: string; displayName?: string; [key: string]: unknown };
  aspects?: Record<string, unknown>;
  [key: string]: unknown;
}

export type LineageDirection = 'UPSTREAM' | 'DOWNSTREAM';
export type DirectionFilter = 'BOTH' | LineageDirection;
export type LineageLevel = 'ASSET' | 'COLUMN';
export type DependencyType = 'DEPENDENCY_TYPE_UNSPECIFIED' | 'EXACT_COPY' | 'OTHER';

export interface EntityReference {
  fullyQualifiedName: string;
  field?: string[];
}

export type OriginSourceType =
  | 'SOURCE_TYPE_UNSPECIFIED'
  | 'CUSTOM'
  | 'BIGQUERY'
  | 'DATA_FUSION'
  | 'COMPOSER'
  | 'LOOKER_STUDIO'
  | 'DATAPROC'
  | 'VERTEX_AI'
  | 'DATAFLOW'
  | 'LOOKER_CORE';

export interface Origin {
  sourceType?: OriginSourceType;
  name?: string;
}

export interface LineageProcess {
  name: string;
  displayName?: string;
  attributes?: Record<string, unknown>;
  origin?: Origin;
}

/** Link returned by searchLineageStreaming. */
export interface LineageLink {
  source: EntityReference;
  target: EntityReference;
  depth?: number;
  location?: string;
  processes?: { process?: LineageProcess }[];
  dependencyInfo?: { dependencyType?: DependencyType }[];
  /** Populated by the searchLinks fallback only. */
  name?: string;
  startTime?: string;
  endTime?: string;
}

/** Link returned by searchLinks (fallback path). */
export interface Link {
  name: string;
  source: EntityReference;
  target: EntityReference;
  startTime?: string;
  endTime?: string;
  dependencyInfo?: { dependencyType?: DependencyType }[];
}

export type RunState = 'UNKNOWN' | 'STARTED' | 'COMPLETED' | 'FAILED' | 'ABORTED';

export interface LineageRun {
  name: string;
  displayName?: string;
  attributes?: Record<string, unknown>;
  startTime?: string;
  endTime?: string;
  state?: RunState;
}

export interface LineageEvent {
  name: string;
  links?: { source: EntityReference; target: EntityReference }[];
  startTime?: string;
  endTime?: string;
}

export interface BigQueryJobSummary {
  id?: string;
  jobId?: string;
  projectId?: string;
  location?: string;
  userEmail?: string;
  state?: string;
  errorResult?: { reason?: string; message?: string };
  query?: string;
  statementType?: string;
  destinationTable?: { projectId: string; datasetId: string; tableId: string };
  referencedTables?: { projectId: string; datasetId: string; tableId: string }[];
  creationTime?: string;
  startTime?: string;
  endTime?: string;
  totalBytesProcessed?: string;
  totalSlotMs?: string;
  cacheHit?: boolean;
  finalExecutionDurationMs?: string;
}

export interface LineageFilters {
  /** ISO timestamps; the API allows at most one of start/end. */
  startTime?: string;
  endTime?: string;
  dependencyTypes?: DependencyType[];
  /** e.g. ["projects/my-project"] */
  projects?: string[];
  locations?: string[];
}

export interface SearchLineageResult {
  links: LineageLink[];
  unreachable: string[];
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Graph model
// ---------------------------------------------------------------------------

export interface LineageAssetNode {
  kind: 'asset';
  /** Node id == fully qualified name (deduplicated). */
  id: string;
  fqn: string;
  isRoot: boolean;
  /** Negative = upstream hops, positive = downstream hops, 0 = root. */
  depth: number;
  columns: string[];
  upstreamExpanded: boolean;
  downstreamExpanded: boolean;
  /** false once a fetch in that direction returned no links. */
  hasUpstream: boolean;
  hasDownstream: boolean;
  location?: string;
}

export interface LineageProcessNode {
  kind: 'process';
  id: string;
  process: LineageProcess;
}

export interface LineageEdgeModel {
  id: string;
  source: string;
  target: string;
  sourceField?: string;
  targetField?: string;
  dependencyType?: DependencyType;
  processes: LineageProcess[];
  /** The underlying link (asset <-> asset). */
  link: LineageLink;
  direction: LineageDirection;
}

export interface LineageGraphState {
  rootFqn: string;
  assets: Record<string, LineageAssetNode>;
  /** Unique asset-level (or column-level) links keyed by edge id. */
  edges: Record<string, LineageEdgeModel>;
}

export interface ListRow {
  id: string;
  direction: LineageDirection;
  depth: number;
  sourceFqn: string;
  sourceName: string;
  sourceSystem: string;
  sourceField: string;
  targetFqn: string;
  targetName: string;
  targetSystem: string;
  targetField: string;
  process: string;
  dependencyType: string;
  startTime?: string;
  endTime?: string;
}
