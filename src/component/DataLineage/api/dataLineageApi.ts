/**
 * @file dataLineageApi.ts
 * @description Typed client for the backend Data Lineage REST proxy routes.
 * `searchLineage` uses projects.locations.searchLineageStreaming and, if that
 * method is unavailable (400/404/501), falls back to single-hop searchLinks +
 * batchSearchLinkProcesses while returning the same LineageLink shape.
 */
import axios, { AxiosError } from 'axios';
import { URLS } from '../../../constants/urls';
import type {
  BigQueryJobSummary,
  CatalogEntryLike,
  EntityReference,
  LineageDirection,
  LineageEvent,
  LineageFilters,
  LineageLink,
  LineageProcess,
  LineageRun,
  Link,
  SearchLineageResult,
} from '../types';

export interface ApiError {
  type: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'API_DISABLED' | 'BAD_REQUEST' | 'UNKNOWN';
  status?: number;
  message: string;
}

const authHeaders = (idToken: string) => ({
  headers: {
    'Content-Type': 'application/json',
    Authorization: idToken ? `Bearer ${idToken}` : '',
  },
});

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof AxiosError || (error as { isAxiosError?: boolean })?.isAxiosError) {
    const e = error as AxiosError<{ details?: string; error?: string }>;
    const status = e.response?.status;
    const details: string = e.response?.data?.details || e.response?.data?.error || e.message;
    if (status === 403) {
      const disabled = /has not been used|is disabled|SERVICE_DISABLED/i.test(details || '');
      return {
        type: disabled ? 'API_DISABLED' : 'PERMISSION_DENIED',
        status,
        message: disabled
          ? 'The Data Lineage API is not enabled for this project.'
          : "You don't have permission to view lineage for this resource.",
      };
    }
    if (status === 404) return { type: 'NOT_FOUND', status, message: details || 'Not found' };
    if (status === 400) return { type: 'BAD_REQUEST', status, message: details || 'Bad request' };
    return { type: 'UNKNOWN', status, message: details || 'An unknown error occurred' };
  }
  return { type: 'UNKNOWN', message: (error as Error)?.message || 'An unknown error occurred' };
};

export interface SearchLineageParams {
  parent: string;
  entities: EntityReference[];
  direction: LineageDirection;
  maxDepth?: number;
  maxResults?: number;
  maxProcessPerLink?: number;
  filters?: LineageFilters;
}

const buildFilters = (filters?: LineageFilters) => {
  if (!filters) return undefined;
  const out: Record<string, unknown> = {};
  if (filters.startTime || filters.endTime) {
    // The API currently accepts at most one bound; prefer startTime.
    out.timeRange = filters.startTime ? { startTime: filters.startTime } : { endTime: filters.endTime };
  }
  if (filters.dependencyTypes?.length) out.dependencyTypes = filters.dependencyTypes;
  if (filters.projects?.length) out.projects = filters.projects;
  return Object.keys(out).length ? out : undefined;
};

/** Convert searchLinks results (+process map) into LineageLink objects. */
export const linksToLineageLinks = (
  links: Link[],
  processByLink: Record<string, string[]>,
): LineageLink[] =>
  links.map((l) => ({
    name: l.name,
    source: l.source,
    target: l.target,
    depth: 1,
    location: l.name?.split('/')[3],
    startTime: l.startTime,
    endTime: l.endTime,
    dependencyInfo: l.dependencyInfo,
    processes: (processByLink[l.name] || []).map((name) => ({ process: { name } })),
  }));

const FALLBACK_STATUSES = new Set([400, 404, 405, 501]);

async function searchLinksFallback(
  params: SearchLineageParams,
  idToken: string,
  signal?: AbortSignal,
): Promise<SearchLineageResult> {
  const all: Link[] = [];
  let truncated = false;
  for (const entity of params.entities) {
    const body: Record<string, unknown> = { parent: params.parent };
    if (params.direction === 'DOWNSTREAM') body.source = entity;
    else body.target = entity;
    const resp = await axios.post(URLS.API_URL + URLS.DATA_LINEAGE_SEARCH_LINKS, body, { ...authHeaders(idToken), signal });
    all.push(...(resp.data?.links || []));
    truncated = truncated || Boolean(resp.data?.truncated);
  }
  const processByLink: Record<string, string[]> = {};
  if (all.length) {
    try {
      const pr = await axios.post(
        URLS.API_URL + URLS.DATA_LINEAGE_LINK_PROCESSES,
        { parent: params.parent, links: all.map((l) => l.name) },
        { ...authHeaders(idToken), signal },
      );
      (pr.data?.processLinks || []).forEach((p: { process: string; links?: { link: string }[] }) => {
        (p.links || []).forEach((li) => {
          processByLink[li.link] = [...(processByLink[li.link] || []), p.process];
        });
      });
    } catch {
      // Processes are optional; continue without them.
    }
  }
  return { links: linksToLineageLinks(all, processByLink), unreachable: [], truncated };
}

export async function searchLineage(
  params: SearchLineageParams,
  idToken: string,
  signal?: AbortSignal,
): Promise<SearchLineageResult> {
  const location = params.parent.split('/')[3];
  const locations = Array.from(new Set([location, ...(params.filters?.locations || [])].filter(Boolean)));
  const body = {
    parent: params.parent,
    locations,
    direction: params.direction,
    rootCriteria: { entities: { entities: params.entities } },
    limits: {
      maxDepth: params.maxDepth ?? 1,
      maxResults: params.maxResults ?? 1000,
      maxProcessPerLink: params.maxProcessPerLink ?? 5,
    },
    filters: buildFilters(params.filters),
  };
  try {
    const resp = await axios.post(URLS.API_URL + URLS.DATA_LINEAGE_SEARCH, body, { ...authHeaders(idToken), signal });
    return {
      links: resp.data?.links || [],
      unreachable: resp.data?.unreachable || [],
      truncated: Boolean(resp.data?.truncated),
    };
  } catch (error) {
    const status = (error as AxiosError)?.response?.status;
    // Fallback only applies to single-hop, unfiltered asset/column searches.
    if (status && FALLBACK_STATUSES.has(status) && !axios.isCancel(error)) {
      return searchLinksFallback(params, idToken, signal);
    }
    throw error;
  }
}

export async function getProcess(name: string, idToken: string, signal?: AbortSignal): Promise<LineageProcess> {
  const resp = await axios.get(URLS.API_URL + URLS.DATA_LINEAGE_PROCESS, {
    ...authHeaders(idToken),
    params: { name },
    signal,
  });
  return resp.data;
}

export async function listRuns(
  process: string,
  idToken: string,
  pageToken?: string,
  signal?: AbortSignal,
): Promise<{ runs: LineageRun[]; nextPageToken?: string }> {
  const resp = await axios.get(URLS.API_URL + URLS.DATA_LINEAGE_RUNS, {
    ...authHeaders(idToken),
    params: { process, pageToken, pageSize: 25 },
    signal,
  });
  return { runs: resp.data?.runs || [], nextPageToken: resp.data?.nextPageToken };
}

export async function listLineageEvents(
  run: string,
  idToken: string,
  pageToken?: string,
  signal?: AbortSignal,
): Promise<{ lineageEvents: LineageEvent[]; nextPageToken?: string }> {
  const resp = await axios.get(URLS.API_URL + URLS.DATA_LINEAGE_EVENTS, {
    ...authHeaders(idToken),
    params: { run, pageToken },
    signal,
  });
  return { lineageEvents: resp.data?.lineageEvents || [], nextPageToken: resp.data?.nextPageToken };
}

export async function getBigQueryJob(
  ref: { projectId: string; jobId: string; location?: string },
  idToken: string,
  signal?: AbortSignal,
): Promise<BigQueryJobSummary> {
  const resp = await axios.get(URLS.API_URL + URLS.DATA_LINEAGE_BQ_JOB, {
    ...authHeaders(idToken),
    params: ref,
    signal,
  });
  return resp.data;
}

/** Catalog entry lookup by FQN (existing backend route; kept out of Redux). */
export async function getEntryByFqn(fqn: string, idToken: string, signal?: AbortSignal): Promise<CatalogEntryLike> {
  const resp = await axios.get(URLS.API_URL + URLS.GET_ENTRY_BY_FQN, {
    ...authHeaders(idToken),
    params: { fqn },
    signal,
  });
  return resp.data;
}
