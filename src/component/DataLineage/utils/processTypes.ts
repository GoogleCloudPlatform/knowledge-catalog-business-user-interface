/**
 * @file processTypes.ts
 * @description Helpers to describe lineage processes (by origin source type)
 * and to locate a BigQuery job for BigQuery-originated processes/runs.
 */
import type { LineageProcess, LineageRun, OriginSourceType } from '../types';
import BigQueryIcon from '../../../assets/svg/BigQuery.svg';
import DataprocIcon from '../../../assets/svg/Dataproc.svg';
import VertexIcon from '../../../assets/svg/vertex.svg';
import LookerIcon from '../../../assets/svg/aspect-looker-icon.svg';
import DashboardIcon from '../../../assets/svg/dashboard_icon.svg';
import SchedulerIcon from '../../../assets/svg/scheduler_icon.svg';
import DataStreamIcon from '../../../assets/svg/data_stream_icon.svg';
import QueryIcon from '../../../assets/svg/query-icon.svg';
import CodeAssetIcon from '../../../assets/svg/code_asset_icon.svg';

export interface ProcessTypeInfo {
  label: string;
  icon: string;
  color: string;
}

const PROCESS_TYPES: Record<OriginSourceType, ProcessTypeInfo> = {
  BIGQUERY: { label: 'BigQuery job', icon: BigQueryIcon, color: '#1A73E8' },
  DATAFLOW: { label: 'Dataflow job', icon: DataStreamIcon, color: '#0F9D58' },
  COMPOSER: { label: 'Composer (Airflow) task', icon: SchedulerIcon, color: '#7B1FA2' },
  DATA_FUSION: { label: 'Data Fusion pipeline', icon: DataStreamIcon, color: '#00897B' },
  DATAPROC: { label: 'Dataproc job', icon: DataprocIcon, color: '#E65100' },
  LOOKER_STUDIO: { label: 'Looker Studio', icon: DashboardIcon, color: '#4285F4' },
  LOOKER_CORE: { label: 'Looker', icon: LookerIcon, color: '#5F6368' },
  VERTEX_AI: { label: 'Vertex AI pipeline', icon: VertexIcon, color: '#1967D2' },
  CUSTOM: { label: 'Custom / OpenLineage', icon: CodeAssetIcon, color: '#795548' },
  SOURCE_TYPE_UNSPECIFIED: { label: 'Process', icon: QueryIcon, color: '#D58813' },
};

export const getProcessTypeInfo = (process?: LineageProcess): ProcessTypeInfo =>
  PROCESS_TYPES[(process?.origin?.sourceType as OriginSourceType) || 'SOURCE_TYPE_UNSPECIFIED']
  || PROCESS_TYPES.SOURCE_TYPE_UNSPECIFIED;

/** Attribute values may be plain JSON values or protobuf Value wrappers. */
export const attributeToString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  const v = value as Record<string, unknown>;
  if ('stringValue' in v) return String(v.stringValue);
  if ('numberValue' in v) return String(v.numberValue);
  if ('boolValue' in v) return String(v.boolValue);
  return JSON.stringify(value);
};

export const getProcessDisplayName = (process?: LineageProcess): string => {
  if (!process) return 'Process';
  if (process.displayName) return process.displayName;
  const id = process.name?.split('/').pop();
  return id || 'Process';
};

const findAttr = (attrs: Record<string, unknown> | undefined, keys: string[]): string | undefined => {
  if (!attrs) return undefined;
  for (const k of keys) {
    const v = attributeToString(attrs[k]);
    if (v) return v;
  }
  return undefined;
};

export interface BigQueryJobRef {
  projectId: string;
  jobId: string;
  location?: string;
}

/**
 * Locate a BigQuery job for a run (preferred) or process.
 * BigQuery processes report `bigquery_job_id` (process) and origin name
 * `projects/{p}/locations/{l}` style or `{project}:{location}`.
 */
export const getBigQueryJobRef = (
  process?: LineageProcess,
  run?: LineageRun,
): BigQueryJobRef | null => {
  if (!process) return null;
  const isBigQuery = process.origin?.sourceType === 'BIGQUERY'
    || Boolean(findAttr(process.attributes, ['bigquery_job_id']));
  if (!isBigQuery) return null;

  const rawJobId = findAttr(run?.attributes, ['bigquery_job_id', 'job_id'])
    || findAttr(process.attributes, ['bigquery_job_id', 'job_id']);
  if (!rawJobId) return null;

  let projectId: string | undefined;
  let location: string | undefined;
  let jobId = rawJobId;

  // "project:location.job_id" (BigQuery fully qualified job id)
  const fq = rawJobId.match(/^([^:]+(?::[^:.]+)?):([^.]+)\.(.+)$/);
  if (fq) {
    projectId = fq[1];
    location = fq[2];
    jobId = fq[3];
  }

  const originName = process.origin?.name || '';
  if (!projectId) {
    const m = originName.match(/^projects\/([^/]+)\/locations\/([^/]+)/);
    if (m) {
      projectId = m[1];
      location = location || m[2];
    } else if (originName.includes(':')) {
      const [p, l] = originName.split(':');
      projectId = p;
      location = location || l;
    }
  }
  if (!projectId) {
    // Fall back to the process project.
    projectId = process.name?.split('/')[1];
    location = location || process.name?.split('/')[3];
  }
  if (!projectId) return null;
  return { projectId, jobId, location };
};

export const bigQueryJobConsoleUrl = (ref: BigQueryJobRef): string =>
  `https://console.cloud.google.com/bigquery?project=${encodeURIComponent(ref.projectId)}`
  + `&j=bq:${encodeURIComponent(ref.location || 'US')}:${encodeURIComponent(ref.jobId)}&page=queryresults`;
