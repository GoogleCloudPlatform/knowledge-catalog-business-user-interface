/**
 * @file graphBuilder.ts
 * @description Pure functions that turn Data Lineage API links into the tab's
 * graph model, and the graph model into renderable node/edge specs.
 * Nodes are deduplicated by fully qualified name.
 */
import type {
  DependencyType,
  LineageAssetNode,
  LineageDirection,
  LineageEdgeModel,
  LineageGraphState,
  LineageLink,
  LineageProcess,
  ListRow,
} from '../types';
import { formatFieldPath, parseFqn } from './fqn';

export const createInitialState = (rootFqn: string, rootLocation?: string): LineageGraphState => ({
  rootFqn,
  assets: {
    [rootFqn]: newAsset(rootFqn, 0, true, rootLocation),
  },
  edges: {},
});

function newAsset(fqn: string, depth: number, isRoot = false, location?: string): LineageAssetNode {
  return {
    kind: 'asset',
    id: fqn,
    fqn,
    isRoot,
    depth,
    columns: [],
    upstreamExpanded: false,
    downstreamExpanded: false,
    hasUpstream: true,
    hasDownstream: true,
    location,
  };
}

export const edgeIdFor = (link: LineageLink): string => {
  const sf = formatFieldPath(link.source.field);
  const tf = formatFieldPath(link.target.field);
  return `${link.source.fullyQualifiedName}${sf ? `#${sf}` : ''}->${link.target.fullyQualifiedName}${tf ? `#${tf}` : ''}`;
};

const mergeProcesses = (a: LineageProcess[], b: LineageProcess[]): LineageProcess[] => {
  const byName = new Map<string, LineageProcess>();
  [...a, ...b].forEach((p) => {
    if (!p?.name) return;
    const prev = byName.get(p.name);
    byName.set(p.name, { ...prev, ...p, attributes: p.attributes || prev?.attributes, origin: p.origin || prev?.origin });
  });
  return [...byName.values()];
};

const linkProcesses = (link: LineageLink): LineageProcess[] =>
  (link.processes || []).map((p) => p.process).filter((p): p is LineageProcess => Boolean(p?.name));

const linkDependencyType = (link: LineageLink): DependencyType | undefined =>
  link.dependencyInfo?.find((d) => d.dependencyType)?.dependencyType;

const addColumn = (asset: LineageAssetNode, field?: string[]) => {
  const path = formatFieldPath(field);
  if (path && path !== '*' && !asset.columns.includes(path)) asset.columns = [...asset.columns, path];
};

export interface MergeOptions {
  /** Entities the search started from. */
  rootFqns: string[];
  direction: LineageDirection;
  maxDepth: number;
}

/**
 * Merge a search result into the graph. Also marks which nodes have had the
 * given direction fully loaded (nodes reached at depth < maxDepth), and
 * which nodes have no further lineage in that direction.
 */
export const mergeLinks = (
  state: LineageGraphState,
  links: LineageLink[],
  { rootFqns, direction, maxDepth }: MergeOptions,
): LineageGraphState => {
  const assets: Record<string, LineageAssetNode> = {};
  Object.entries(state.assets).forEach(([k, v]) => { assets[k] = { ...v, columns: [...v.columns] }; });
  const edges: Record<string, LineageEdgeModel> = { ...state.edges };

  // Search level of each node relative to the search roots.
  const level = new Map<string, number>();
  rootFqns.forEach((r) => level.set(r, 0));

  const sorted = [...links].sort((a, b) => (a.depth ?? 1) - (b.depth ?? 1));
  sorted.forEach((link) => {
    const src = link.source?.fullyQualifiedName;
    const tgt = link.target?.fullyQualifiedName;
    if (!src || !tgt) return;
    const near = direction === 'UPSTREAM' ? tgt : src;
    const far = direction === 'UPSTREAM' ? src : tgt;

    if (!assets[near]) {
      assets[near] = newAsset(near, 0, false, link.location);
    }
    if (!assets[far]) {
      const nearDepth = assets[near].depth;
      assets[far] = newAsset(far, direction === 'UPSTREAM' ? nearDepth - 1 : nearDepth + 1, false, link.location);
    }
    const linkDepth = link.depth ?? 1;
    if (!level.has(far)) level.set(far, linkDepth);
    if (!level.has(near)) level.set(near, Math.max(0, linkDepth - 1));

    addColumn(assets[src], link.source.field);
    addColumn(assets[tgt], link.target.field);

    const id = edgeIdFor(link);
    const prev = edges[id];
    edges[id] = {
      id,
      source: src,
      target: tgt,
      sourceField: formatFieldPath(link.source.field) || undefined,
      targetField: formatFieldPath(link.target.field) || undefined,
      dependencyType: linkDependencyType(link) || prev?.dependencyType,
      processes: mergeProcesses(prev?.processes || [], linkProcesses(link)),
      link: prev ? { ...prev.link, ...link } : link,
      direction: prev?.direction || direction,
    };
  });

  // Mark expansion state.
  level.forEach((lvl, fqn) => {
    const a = assets[fqn];
    if (!a || lvl >= maxDepth) return;
    const hasLinks = sorted.some((l) =>
      (direction === 'UPSTREAM' ? l.target?.fullyQualifiedName : l.source?.fullyQualifiedName) === fqn);
    if (direction === 'UPSTREAM') {
      a.upstreamExpanded = true;
      if (!hasLinks) a.hasUpstream = false;
    } else {
      a.downstreamExpanded = true;
      if (!hasLinks) a.hasDownstream = false;
    }
  });

  return { ...state, assets, edges };
};

/**
 * Collapse a node in one direction: drop its edges on that side and every
 * asset that is no longer reachable from the root.
 */
export const collapseNode = (
  state: LineageGraphState,
  fqn: string,
  direction: LineageDirection,
): LineageGraphState => {
  const keptEdges = Object.values(state.edges).filter((e) =>
    direction === 'UPSTREAM' ? e.target !== fqn : e.source !== fqn);

  const adjacency = new Map<string, string[]>();
  keptEdges.forEach((e) => {
    adjacency.set(e.source, [...(adjacency.get(e.source) || []), e.target]);
    adjacency.set(e.target, [...(adjacency.get(e.target) || []), e.source]);
  });
  const reachable = new Set<string>([state.rootFqn]);
  const queue = [state.rootFqn];
  while (queue.length) {
    const cur = queue.shift() as string;
    (adjacency.get(cur) || []).forEach((n) => {
      if (!reachable.has(n)) { reachable.add(n); queue.push(n); }
    });
  }

  const assets: Record<string, LineageAssetNode> = {};
  Object.values(state.assets).forEach((a) => {
    if (reachable.has(a.id)) assets[a.id] = { ...a };
  });
  if (assets[fqn]) {
    if (direction === 'UPSTREAM') assets[fqn].upstreamExpanded = false;
    else assets[fqn].downstreamExpanded = false;
  }
  const edges: Record<string, LineageEdgeModel> = {};
  keptEdges.forEach((e) => {
    if (reachable.has(e.source) && reachable.has(e.target)) edges[e.id] = e;
  });
  return { ...state, assets, edges };
};

/** Fill in full process details (displayName/origin) once fetched. */
export const applyProcessDetails = (
  state: LineageGraphState,
  processes: LineageProcess[],
): LineageGraphState => {
  const byName = new Map(processes.map((p) => [p.name, p]));
  const edges: Record<string, LineageEdgeModel> = {};
  Object.values(state.edges).forEach((e) => {
    edges[e.id] = { ...e, processes: e.processes.map((p) => ({ ...p, ...(byName.get(p.name) || {}) })) };
  });
  return { ...state, edges };
};

// ---------------------------------------------------------------------------
// Render specs
// ---------------------------------------------------------------------------

export interface FlowNodeSpec {
  id: string;
  type: 'dlAsset' | 'dlProcess';
  asset?: LineageAssetNode;
  process?: LineageProcess;
}

export interface FlowEdgeSpec {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  dependencyType?: DependencyType;
  processes: LineageProcess[];
  /** Underlying asset-level edges represented by this flow edge. */
  modelEdgeIds: string[];
}

export const PROCESS_NODE_PREFIX = 'process:';
export const columnHandleId = (field: string, side: 'in' | 'out') => `col-${side}:${field}`;

export interface FlowOptions {
  showProcesses: boolean;
  columnMode: boolean;
}

export const toFlowSpecs = (
  state: LineageGraphState,
  { showProcesses, columnMode }: FlowOptions,
): { nodes: FlowNodeSpec[]; edges: FlowEdgeSpec[] } => {
  const nodes: FlowNodeSpec[] = Object.values(state.assets).map((a) => ({ id: a.id, type: 'dlAsset', asset: a }));
  const edges = new Map<string, FlowEdgeSpec>();
  const processNodes = new Map<string, LineageProcess>();

  const addEdge = (spec: FlowEdgeSpec) => {
    const prev = edges.get(spec.id);
    if (prev) {
      prev.processes = mergeProcesses(prev.processes, spec.processes);
      prev.modelEdgeIds = Array.from(new Set([...prev.modelEdgeIds, ...spec.modelEdgeIds]));
      if (!prev.dependencyType) prev.dependencyType = spec.dependencyType;
    } else {
      edges.set(spec.id, spec);
    }
  };

  Object.values(state.edges).forEach((e) => {
    if (!state.assets[e.source] || !state.assets[e.target]) return;
    const useColumns = columnMode && e.sourceField && e.targetField;
    if (showProcesses && !columnMode && e.processes.length > 0) {
      e.processes.forEach((p) => {
        const pid = `${PROCESS_NODE_PREFIX}${p.name}`;
        processNodes.set(pid, mergeProcesses(processNodes.has(pid) ? [processNodes.get(pid) as LineageProcess] : [], [p])[0]);
        addEdge({ id: `${e.source}=>${pid}`, source: e.source, target: pid, processes: [p], modelEdgeIds: [e.id], dependencyType: e.dependencyType });
        addEdge({ id: `${pid}=>${e.target}`, source: pid, target: e.target, processes: [p], modelEdgeIds: [e.id], dependencyType: e.dependencyType });
      });
    } else {
      addEdge({
        id: useColumns ? e.id : `${e.source}=>${e.target}`,
        source: e.source,
        target: e.target,
        sourceHandle: useColumns ? columnHandleId(e.sourceField as string, 'out') : undefined,
        targetHandle: useColumns ? columnHandleId(e.targetField as string, 'in') : undefined,
        dependencyType: e.dependencyType,
        processes: e.processes,
        modelEdgeIds: [e.id],
      });
    }
  });

  processNodes.forEach((process, id) => nodes.push({ id, type: 'dlProcess', process }));
  return { nodes, edges: [...edges.values()] };
};

/**
 * Upstream + downstream closure of a node over the rendered edges.
 * Returns the highlighted node and edge ids.
 */
export const computeHighlight = (
  edges: { id: string; source: string; target: string }[],
  startId: string | null,
): { nodes: Set<string>; edges: Set<string> } | null => {
  if (!startId) return null;
  const nodes = new Set<string>([startId]);
  const edgeIds = new Set<string>();
  const walk = (forward: boolean) => {
    const queue = [startId];
    const seen = new Set<string>([startId]);
    while (queue.length) {
      const cur = queue.shift() as string;
      edges.forEach((e) => {
        const from = forward ? e.source : e.target;
        const to = forward ? e.target : e.source;
        if (from === cur) {
          edgeIds.add(e.id);
          nodes.add(to);
          if (!seen.has(to)) { seen.add(to); queue.push(to); }
        }
      });
    }
  };
  walk(true);
  walk(false);
  return { nodes, edges: edgeIds };
};

export const toListRows = (state: LineageGraphState): ListRow[] =>
  Object.values(state.edges).map((e) => {
    const s = parseFqn(e.source);
    const t = parseFqn(e.target);
    // Edges that end at or before the root (depth <= 0) feed the root: upstream.
    const isUpstream = (state.assets[e.target]?.depth ?? 0) <= 0;
    return {
      id: e.id,
      direction: isUpstream ? 'UPSTREAM' : 'DOWNSTREAM',
      depth: Math.max(Math.abs(state.assets[e.source]?.depth ?? 0), Math.abs(state.assets[e.target]?.depth ?? 0)),
      sourceFqn: e.source,
      sourceName: s.displayName,
      sourceSystem: s.systemLabel,
      sourceField: e.sourceField || '',
      targetFqn: e.target,
      targetName: t.displayName,
      targetSystem: t.systemLabel,
      targetField: e.targetField || '',
      process: e.processes.map((p) => p.displayName || p.name?.split('/').pop()).filter(Boolean).join(', '),
      dependencyType: e.dependencyType === 'EXACT_COPY' ? 'Exact copy' : e.dependencyType === 'OTHER' ? 'Transformation' : '',
      startTime: e.link.startTime,
      endTime: e.link.endTime,
    };
  });

/** Count direct upstream/downstream neighbours of an asset in the model. */
export const neighbourCounts = (state: LineageGraphState, fqn: string) => {
  const up = new Set<string>();
  const down = new Set<string>();
  Object.values(state.edges).forEach((e) => {
    if (e.target === fqn) up.add(e.source);
    if (e.source === fqn) down.add(e.target);
  });
  return { upstream: up.size, downstream: down.size };
};
