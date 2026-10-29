/**
 * @file useDataLineageGraph.ts
 * @description State + data orchestration for the Data Lineage tab. Graph
 * state is local to the tab (no Redux) so it never interferes with the
 * existing Lineage tab or the shared entry slice.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  getProcess,
  searchLineage,
  toApiError,
  type ApiError,
} from '../api/dataLineageApi';
import {
  applyProcessDetails,
  collapseNode as collapseNodeModel,
  createInitialState,
  mergeLinks,
} from '../utils/graphBuilder';
import type {
  DirectionFilter,
  EntityReference,
  LineageDirection,
  LineageFilters,
  LineageGraphState,
  LineageLevel,
  LineageProcess,
  CatalogEntryLike,
} from '../types';
import { getEntryLocation, getLineageParent } from '../utils/eligibility';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface LineageOptions {
  direction: DirectionFilter;
  depth: number;
  level: LineageLevel;
  /** Selected root column paths ("*" = all columns). */
  columns: string[];
  filters: LineageFilters;
}

export const DEFAULT_OPTIONS: LineageOptions = {
  direction: 'BOTH',
  depth: 1,
  level: 'ASSET',
  columns: [],
  filters: {},
};

const MAX_ENTITIES = 20; // API limit for MultipleEntityReference
const MAX_PROCESS_DETAIL_FETCHES = 60;

export const toEntities = (fqn: string, level: LineageLevel, columns: string[]): EntityReference[] => {
  if (level !== 'COLUMN') return [{ fullyQualifiedName: fqn }];
  const cols = columns.length ? columns : ['*'];
  if (cols.includes('*')) return [{ fullyQualifiedName: fqn, field: ['*'] }];
  return cols.slice(0, MAX_ENTITIES).map((c) => ({ fullyQualifiedName: fqn, field: c.split('.') }));
};

export function useDataLineageGraph(entry: CatalogEntryLike, idToken: string) {
  const parent = getLineageParent(entry);
  const entryLocation = getEntryLocation(entry);
  const entryFqn: string = entry?.fullyQualifiedName || '';

  const [rootFqn, setRootFqn] = useState<string>(entryFqn);
  const [options, setOptionsState] = useState<LineageOptions>(DEFAULT_OPTIONS);
  const [graph, setGraph] = useState<LineageGraphState>(() => createInitialState(entryFqn, entryLocation));
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const [unreachable, setUnreachable] = useState<string[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [expanding, setExpanding] = useState<Record<string, LineageDirection | undefined>>({});
  const [reloadKey, setReloadKey] = useState(0);

  const graphRef = useRef<LineageGraphState>(graph);
  /** Apply a graph update synchronously against the latest graph. */
  const commitGraph = useCallback((update: (g: LineageGraphState) => LineageGraphState) => {
    const next = update(graphRef.current);
    graphRef.current = next;
    setGraph(next);
    return next;
  }, []);

  const controllersRef = useRef<Set<AbortController>>(new Set());
  const processCacheRef = useRef<Map<string, LineageProcess | null>>(new Map());

  const abortAll = () => {
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current.clear();
  };

  /** Lazily fetch full process details (displayName/origin) for new processes. */
  const hydrateProcesses = useCallback(async (state: LineageGraphState, signal: AbortSignal) => {
    const names = new Set<string>();
    Object.values(state.edges).forEach((e) => e.processes.forEach((p) => {
      if (p.name && !p.origin && !processCacheRef.current.has(p.name)) names.add(p.name);
    }));
    const toFetch = [...names].slice(0, MAX_PROCESS_DETAIL_FETCHES);
    if (!toFetch.length) {
      const cached = [...processCacheRef.current.values()].filter(Boolean) as LineageProcess[];
      if (cached.length) commitGraph((g) => applyProcessDetails(g, cached));
      return;
    }
    toFetch.forEach((n) => processCacheRef.current.set(n, null));
    const results = await Promise.allSettled(toFetch.map((n) => getProcess(n, idToken, signal)));
    if (signal.aborted) return;
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value?.name) processCacheRef.current.set(r.value.name, r.value);
    });
    const all = [...processCacheRef.current.values()].filter(Boolean) as LineageProcess[];
    commitGraph((g) => applyProcessDetails(g, all));
  }, [idToken, commitGraph]);

  // Initial / option-driven load.
  useEffect(() => {
    if (!rootFqn || !parent) return;
    abortAll();
    const controller = new AbortController();
    controllersRef.current.add(controller);
    const { direction, depth, level, columns, filters } = options;
    const entities = toEntities(rootFqn, level, columns);
    const directions: LineageDirection[] = direction === 'BOTH' ? ['UPSTREAM', 'DOWNSTREAM'] : [direction];

    setStatus('loading');
    setError(null);
    setExpanding({});
    let base = createInitialState(rootFqn, rootFqn === entryFqn ? entryLocation : undefined);
    if (level === 'COLUMN') {
      base.assets[rootFqn].columns = columns.filter((c) => c !== '*');
    }
    // Directions not searched are considered "not expanded" but available.
    commitGraph(() => base);

    Promise.all(directions.map((d) => searchLineage({
      parent,
      entities,
      direction: d,
      maxDepth: depth,
      filters,
    }, idToken, controller.signal).then((res) => ({ d, res }))))
      .then((results) => {
        if (controller.signal.aborted) return;
        const allUnreachable = new Set<string>();
        let anyTruncated = false;
        results.forEach(({ d, res }) => {
          base = mergeLinks(base, res.links, { rootFqns: [rootFqn], direction: d, maxDepth: depth });
          res.unreachable.forEach((u) => allUnreachable.add(u));
          anyTruncated = anyTruncated || res.truncated;
        });
        commitGraph(() => base);
        setUnreachable([...allUnreachable]);
        setTruncated(anyTruncated);
        setStatus('succeeded');
        hydrateProcesses(base, controller.signal).catch(() => undefined);
      })
      .catch((err) => {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        setError(toApiError(err));
        setStatus('failed');
      })
      .finally(() => controllersRef.current.delete(controller));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootFqn, parent, options, reloadKey, idToken]);

  useEffect(() => () => abortAll(), []);

  const expandNode = useCallback(async (fqn: string, direction: LineageDirection) => {
    const asset = graphRef.current.assets[fqn];
    if (!asset) return;
    const controller = new AbortController();
    controllersRef.current.add(controller);
    setExpanding((e) => ({ ...e, [fqn]: direction }));
    try {
      const entities = toEntities(fqn, options.level, options.level === 'COLUMN' ? asset.columns : []);
      const res = await searchLineage({
        parent,
        entities,
        direction,
        maxDepth: 1,
        filters: options.filters,
      }, idToken, controller.signal);
      if (controller.signal.aborted) return;
      const next = commitGraph((g) => mergeLinks(g, res.links, { rootFqns: [fqn], direction, maxDepth: 1 }));
      if (res.unreachable.length) setUnreachable((u) => Array.from(new Set([...u, ...res.unreachable])));
      if (res.truncated) setTruncated(true);
      hydrateProcesses(next, controller.signal).catch(() => undefined);
    } catch (err) {
      if (!axios.isCancel(err) && !controller.signal.aborted) {
        setError(toApiError(err));
      }
    } finally {
      controllersRef.current.delete(controller);
      setExpanding((e) => ({ ...e, [fqn]: undefined }));
    }
  }, [options.level, options.filters, parent, idToken, hydrateProcesses, commitGraph]);

  const collapseNode = useCallback((fqn: string, direction: LineageDirection) => {
    commitGraph((g) => collapseNodeModel(g, fqn, direction));
  }, [commitGraph]);

  const setOptions = useCallback((partial: Partial<LineageOptions>) => {
    setOptionsState((o) => ({ ...o, ...partial }));
  }, []);

  const setRoot = useCallback((fqn: string) => setRootFqn(fqn), []);

  const reset = useCallback(() => {
    setRootFqn(entryFqn);
    setOptionsState(DEFAULT_OPTIONS);
    setReloadKey((k) => k + 1);
  }, [entryFqn]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    parent,
    entryLocation,
    rootFqn,
    graph,
    status,
    error,
    unreachable,
    truncated,
    expanding,
    options,
    setOptions,
    expandNode,
    collapseNode,
    setRoot,
    reset,
    retry,
    clearError,
  };
}

export type DataLineageGraphController = ReturnType<typeof useDataLineageGraph>;
