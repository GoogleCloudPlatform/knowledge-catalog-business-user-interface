import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockSearchLineage = vi.fn();
const mockGetProcess = vi.fn();
vi.mock('../api/dataLineageApi', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    searchLineage: (...a: any[]) => mockSearchLineage(...a),
    getProcess: (...a: any[]) => mockGetProcess(...a),
  };
});

import { useDataLineageGraph, toEntities } from './useDataLineageGraph';

const ROOT = 'bigquery:p.d.root';
const entry = { name: 'projects/p/locations/us/entryGroups/@bigquery/entries/x', fullyQualifiedName: ROOT };
const link = (s: string, t: string, extra: any = {}) => ({ source: { fullyQualifiedName: s }, target: { fullyQualifiedName: t }, depth: 1, ...extra });

describe('toEntities', () => {
  it('builds asset and column entity references', () => {
    expect(toEntities(ROOT, 'ASSET', ['a'])).toEqual([{ fullyQualifiedName: ROOT }]);
    expect(toEntities(ROOT, 'COLUMN', [])).toEqual([{ fullyQualifiedName: ROOT, field: ['*'] }]);
    expect(toEntities(ROOT, 'COLUMN', ['*', 'a'])).toEqual([{ fullyQualifiedName: ROOT, field: ['*'] }]);
    expect(toEntities(ROOT, 'COLUMN', ['a', 'b.c'])).toEqual([
      { fullyQualifiedName: ROOT, field: ['a'] },
      { fullyQualifiedName: ROOT, field: ['b', 'c'] },
    ]);
    expect(toEntities(ROOT, 'COLUMN', Array.from({ length: 30 }, (_, i) => `c${i}`))).toHaveLength(20);
  });
});

describe('useDataLineageGraph', () => {
  beforeEach(() => {
    mockSearchLineage.mockReset();
    mockGetProcess.mockReset();
    mockGetProcess.mockImplementation((name: string) => Promise.resolve({ name, displayName: 'Proc', origin: { sourceType: 'BIGQUERY' } }));
  });

  it('loads upstream and downstream on mount', async () => {
    mockSearchLineage.mockImplementation((params: any) => Promise.resolve({
      links: params.direction === 'UPSTREAM'
        ? [link('bigquery:p.d.up', ROOT, { processes: [{ process: { name: 'projects/p/locations/us/processes/1' } }] })]
        : [link(ROOT, 'bigquery:p.d.down')],
      unreachable: params.direction === 'UPSTREAM' ? ['projects/1/locations/eu'] : [],
      truncated: false,
    }));
    const { result } = renderHook(() => useDataLineageGraph(entry, 'tok'));
    await waitFor(() => expect(result.current.status).toBe('succeeded'));
    expect(mockSearchLineage).toHaveBeenCalledTimes(2);
    const [params, token] = mockSearchLineage.mock.calls[0];
    expect(params).toMatchObject({ parent: 'projects/p/locations/us', entities: [{ fullyQualifiedName: ROOT }], maxDepth: 1 });
    expect(token).toBe('tok');
    expect(Object.keys(result.current.graph.assets)).toHaveLength(3);
    expect(result.current.unreachable).toEqual(['projects/1/locations/eu']);
    await waitFor(() => {
      const edge = Object.values(result.current.graph.edges).find((e) => e.processes.length);
      expect(edge?.processes[0].displayName).toBe('Proc');
    });
    expect(mockGetProcess).toHaveBeenCalledTimes(1);
  });

  it('only searches one direction when filtered and passes depth/filters', async () => {
    mockSearchLineage.mockResolvedValue({ links: [], unreachable: [], truncated: true });
    const { result } = renderHook(() => useDataLineageGraph(entry, 'tok'));
    await waitFor(() => expect(result.current.status).toBe('succeeded'));
    mockSearchLineage.mockClear();
    act(() => result.current.setOptions({ direction: 'DOWNSTREAM', depth: 3, filters: { projects: ['projects/x'] } }));
    await waitFor(() => expect(mockSearchLineage).toHaveBeenCalledTimes(1));
    expect(mockSearchLineage.mock.calls[0][0]).toMatchObject({ direction: 'DOWNSTREAM', maxDepth: 3, filters: { projects: ['projects/x'] } });
    await waitFor(() => expect(result.current.truncated).toBe(true));
  });

  it('uses column entities in column mode', async () => {
    mockSearchLineage.mockResolvedValue({ links: [], unreachable: [], truncated: false });
    const { result } = renderHook(() => useDataLineageGraph(entry, 'tok'));
    await waitFor(() => expect(result.current.status).toBe('succeeded'));
    mockSearchLineage.mockClear();
    act(() => result.current.setOptions({ level: 'COLUMN', columns: ['user_id'] }));
    await waitFor(() => expect(mockSearchLineage).toHaveBeenCalled());
    expect(mockSearchLineage.mock.calls[0][0].entities).toEqual([{ fullyQualifiedName: ROOT, field: ['user_id'] }]);
    await waitFor(() => expect(result.current.graph.assets[ROOT].columns).toEqual(['user_id']));
  });

  it('expands and collapses a node', async () => {
    mockSearchLineage.mockImplementation((params: any) => Promise.resolve({
      links: params.direction === 'DOWNSTREAM' && params.entities[0].fullyQualifiedName === ROOT ? [link(ROOT, 'bigquery:p.d.down')] : [],
      unreachable: [],
      truncated: false,
    }));
    const { result } = renderHook(() => useDataLineageGraph(entry, 'tok'));
    await waitFor(() => expect(result.current.status).toBe('succeeded'));

    mockSearchLineage.mockResolvedValueOnce({ links: [link('bigquery:p.d.down', 'gcs:bucket')], unreachable: [], truncated: false });
    await act(async () => { await result.current.expandNode('bigquery:p.d.down', 'DOWNSTREAM'); });
    expect(mockSearchLineage.mock.calls[mockSearchLineage.mock.calls.length - 1][0]).toMatchObject({ entities: [{ fullyQualifiedName: 'bigquery:p.d.down' }], direction: 'DOWNSTREAM', maxDepth: 1 });
    expect(result.current.graph.assets['gcs:bucket']).toBeDefined();
    expect(result.current.graph.assets['bigquery:p.d.down'].downstreamExpanded).toBe(true);
    expect(result.current.expanding['bigquery:p.d.down']).toBeUndefined();

    act(() => result.current.collapseNode('bigquery:p.d.down', 'DOWNSTREAM'));
    expect(result.current.graph.assets['gcs:bucket']).toBeUndefined();
  });

  it('reports errors on failed loads and supports retry', async () => {
    mockSearchLineage.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: { details: 'denied' } }, message: 'x' });
    const { result } = renderHook(() => useDataLineageGraph(entry, 'tok'));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error?.type).toBe('PERMISSION_DENIED');
    mockSearchLineage.mockResolvedValue({ links: [], unreachable: [], truncated: false });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('succeeded'));
  });

  it('re-roots and resets', async () => {
    mockSearchLineage.mockResolvedValue({ links: [], unreachable: [], truncated: false });
    const { result } = renderHook(() => useDataLineageGraph(entry, 'tok'));
    await waitFor(() => expect(result.current.status).toBe('succeeded'));
    act(() => result.current.setRoot('gcs:bucket'));
    await waitFor(() => expect(result.current.graph.rootFqn).toBe('gcs:bucket'));
    expect(result.current.graph.assets['gcs:bucket'].isRoot).toBe(true);
    act(() => result.current.reset());
    await waitFor(() => expect(result.current.graph.rootFqn).toBe(ROOT));
  });
});
