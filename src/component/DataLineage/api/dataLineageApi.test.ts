import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';

const mockPost = vi.fn();
const mockGet = vi.fn();
vi.mock('axios', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    default: { ...actual.default, post: (...a: any[]) => mockPost(...a), get: (...a: any[]) => mockGet(...a), isCancel: actual.default.isCancel },
  };
});

import {
  getBigQueryJob,
  getEntryByFqn,
  getProcess,
  linksToLineageLinks,
  listLineageEvents,
  listRuns,
  searchLineage,
  toApiError,
} from './dataLineageApi';

const axiosError = (status: number, data: any = {}) =>
  new AxiosError('fail', 'ERR', undefined, undefined, { status, data, statusText: '', headers: {}, config: {} as any } as any);

const PARENT = 'projects/p/locations/us';

describe('searchLineage', () => {
  beforeEach(() => { mockPost.mockReset(); mockGet.mockReset(); });

  it('posts a searchLineageStreaming request with limits, locations and filters', async () => {
    mockPost.mockResolvedValueOnce({ data: { links: [{ source: { fullyQualifiedName: 'a' }, target: { fullyQualifiedName: 'b' } }], unreachable: ['x'], truncated: true } });
    const res = await searchLineage({
      parent: PARENT,
      entities: [{ fullyQualifiedName: 'bigquery:p.d.t', field: ['id'] }],
      direction: 'UPSTREAM',
      maxDepth: 3,
      filters: { startTime: '2024-01-01T00:00:00Z', dependencyTypes: ['EXACT_COPY'], projects: ['projects/p'], locations: ['eu', 'us'] },
    }, 'tok');
    const [url, body, config] = mockPost.mock.calls[0];
    expect(url).toContain('/data-lineage/search-lineage');
    expect(body).toMatchObject({
      parent: PARENT,
      locations: ['us', 'eu'],
      direction: 'UPSTREAM',
      rootCriteria: { entities: { entities: [{ fullyQualifiedName: 'bigquery:p.d.t', field: ['id'] }] } },
      limits: { maxDepth: 3, maxResults: 1000, maxProcessPerLink: 5 },
      filters: { timeRange: { startTime: '2024-01-01T00:00:00Z' }, dependencyTypes: ['EXACT_COPY'], projects: ['projects/p'] },
    });
    expect(config.headers.Authorization).toBe('Bearer tok');
    expect(res).toEqual({ links: expect.any(Array), unreachable: ['x'], truncated: true });
  });

  it('omits filters when none are set', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    const res = await searchLineage({ parent: PARENT, entities: [{ fullyQualifiedName: 'x' }], direction: 'DOWNSTREAM' }, 'tok');
    expect(mockPost.mock.calls[0][1].filters).toBeUndefined();
    expect(res).toEqual({ links: [], unreachable: [], truncated: false });
  });

  it('falls back to searchLinks + batchSearchLinkProcesses on 404', async () => {
    mockPost
      .mockRejectedValueOnce(axiosError(404))
      .mockResolvedValueOnce({ data: { links: [{ name: 'projects/p/locations/us/links/l1', source: { fullyQualifiedName: 'a' }, target: { fullyQualifiedName: 'b' } }] } })
      .mockResolvedValueOnce({ data: { processLinks: [{ process: 'projects/p/locations/us/processes/q', links: [{ link: 'projects/p/locations/us/links/l1' }] }] } });
    const res = await searchLineage({ parent: PARENT, entities: [{ fullyQualifiedName: 'b' }], direction: 'UPSTREAM' }, 'tok');
    expect(mockPost.mock.calls[1][0]).toContain('/data-lineage/search-links');
    expect(mockPost.mock.calls[1][1]).toEqual({ parent: PARENT, target: { fullyQualifiedName: 'b' } });
    expect(mockPost.mock.calls[2][0]).toContain('/data-lineage/link-processes');
    expect(res.links[0].processes).toEqual([{ process: { name: 'projects/p/locations/us/processes/q' } }]);
    expect(res.links[0].depth).toBe(1);
  });

  it('uses source for downstream fallback', async () => {
    mockPost.mockRejectedValueOnce(axiosError(501)).mockResolvedValueOnce({ data: { links: [] } });
    await searchLineage({ parent: PARENT, entities: [{ fullyQualifiedName: 'a' }], direction: 'DOWNSTREAM' }, 'tok');
    expect(mockPost.mock.calls[1][1]).toEqual({ parent: PARENT, source: { fullyQualifiedName: 'a' } });
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('rethrows non-fallback errors', async () => {
    mockPost.mockRejectedValueOnce(axiosError(403, { details: 'denied' }));
    await expect(searchLineage({ parent: PARENT, entities: [{ fullyQualifiedName: 'a' }], direction: 'DOWNSTREAM' }, 'tok')).rejects.toBeTruthy();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});

describe('other endpoints', () => {
  beforeEach(() => { mockGet.mockReset(); });

  it('getProcess / listRuns / listLineageEvents / getBigQueryJob / getEntryByFqn', async () => {
    mockGet.mockResolvedValue({ data: { name: 'n', runs: [{ name: 'r' }], nextPageToken: 't', lineageEvents: [{ name: 'e' }] } });
    expect((await getProcess('projects/p/locations/us/processes/1', 'tok')).name).toBe('n');
    expect(mockGet.mock.calls[0][1].params).toEqual({ name: 'projects/p/locations/us/processes/1' });
    expect(await listRuns('proc', 'tok', 'pt')).toEqual({ runs: [{ name: 'r' }], nextPageToken: 't' });
    expect(mockGet.mock.calls[1][1].params).toEqual({ process: 'proc', pageToken: 'pt', pageSize: 25 });
    expect((await listLineageEvents('run', 'tok')).lineageEvents).toEqual([{ name: 'e' }]);
    await getBigQueryJob({ projectId: 'p', jobId: 'j', location: 'US' }, 'tok');
    expect(mockGet.mock.calls[3][0]).toContain('/data-lineage/bigquery-job');
    expect(mockGet.mock.calls[3][1].params).toEqual({ projectId: 'p', jobId: 'j', location: 'US' });
    await getEntryByFqn('bigquery:p.d.t', 'tok');
    expect(mockGet.mock.calls[4][1].params).toEqual({ fqn: 'bigquery:p.d.t' });
  });
});

describe('toApiError / linksToLineageLinks', () => {
  it('maps statuses', () => {
    expect(toApiError(axiosError(403, { details: 'denied' })).type).toBe('PERMISSION_DENIED');
    expect(toApiError(axiosError(403, { details: 'Data Lineage API has not been used in project 1' })).type).toBe('API_DISABLED');
    expect(toApiError(axiosError(404)).type).toBe('NOT_FOUND');
    expect(toApiError(axiosError(400, { details: 'bad' }))).toMatchObject({ type: 'BAD_REQUEST', message: 'bad' });
    expect(toApiError(axiosError(500, { details: 'boom' }))).toMatchObject({ type: 'UNKNOWN', message: 'boom' });
    expect(toApiError(new Error('x'))).toMatchObject({ type: 'UNKNOWN', message: 'x' });
  });

  it('converts links', () => {
    const out = linksToLineageLinks([
      { name: 'projects/p/locations/eu/links/1', source: { fullyQualifiedName: 'a' }, target: { fullyQualifiedName: 'b' }, startTime: 's' },
    ], {});
    expect(out[0]).toMatchObject({ location: 'eu', depth: 1, startTime: 's', processes: [] });
  });
});
