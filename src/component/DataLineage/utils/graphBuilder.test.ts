import { describe, it, expect } from 'vitest';
import {
  applyProcessDetails,
  collapseNode,
  computeHighlight,
  createInitialState,
  mergeLinks,
  neighbourCounts,
  PROCESS_NODE_PREFIX,
  toFlowSpecs,
  toListRows,
} from './graphBuilder';
import type { LineageLink } from '../types';

const ROOT = 'bigquery:p.d.root';
const A = 'bigquery:p.d.a';
const B = 'gcs:bucket.`raw/b.csv`';
const C = 'bigquery:p.d.c';
const D = 'looker:dashboard:inst.f.1';

const link = (src: string, tgt: string, extra: Partial<LineageLink> = {}): LineageLink => ({
  source: { fullyQualifiedName: src },
  target: { fullyQualifiedName: tgt },
  depth: 1,
  location: 'us',
  ...extra,
});
const proc = (name: string) => ({ process: { name } });

describe('mergeLinks', () => {
  it('adds upstream and downstream nodes with depths and dedupes by FQN', () => {
    let s = createInitialState(ROOT, 'us');
    s = mergeLinks(s, [link(A, ROOT), link(B, ROOT), link(A, ROOT)], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    s = mergeLinks(s, [link(ROOT, C)], { rootFqns: [ROOT], direction: 'DOWNSTREAM', maxDepth: 1 });
    expect(Object.keys(s.assets).sort()).toEqual([A, B, C, ROOT].sort());
    expect(s.assets[A].depth).toBe(-1);
    expect(s.assets[C].depth).toBe(1);
    expect(Object.keys(s.edges)).toHaveLength(3);
    expect(s.assets[ROOT].upstreamExpanded).toBe(true);
    expect(s.assets[ROOT].downstreamExpanded).toBe(true);
    // Frontier nodes are not marked expanded.
    expect(s.assets[A].upstreamExpanded).toBe(false);
    expect(s.assets[A].hasUpstream).toBe(true);
  });

  it('handles multi-hop results and marks inner nodes expanded', () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [link(ROOT, C, { depth: 1 }), link(C, D, { depth: 2 })], { rootFqns: [ROOT], direction: 'DOWNSTREAM', maxDepth: 3 });
    expect(s.assets[D].depth).toBe(2);
    expect(s.assets[C].downstreamExpanded).toBe(true);
    // D reached at depth 2 < maxDepth 3 with no further links => no downstream
    expect(s.assets[D].downstreamExpanded).toBe(true);
    expect(s.assets[D].hasDownstream).toBe(false);
  });

  it('marks no-lineage when a search returns nothing', () => {
    const s = mergeLinks(createInitialState(ROOT), [], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    expect(s.assets[ROOT].hasUpstream).toBe(false);
  });

  it('merges processes and dependency types on the same edge', () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [link(A, ROOT, { processes: [proc('projects/p/locations/us/processes/1')] })], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    s = mergeLinks(s, [link(A, ROOT, { processes: [proc('projects/p/locations/us/processes/2')], dependencyInfo: [{ dependencyType: 'EXACT_COPY' }] })], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    const edge = Object.values(s.edges)[0];
    expect(edge.processes.map((p) => p.name)).toHaveLength(2);
    expect(edge.dependencyType).toBe('EXACT_COPY');
  });

  it('tracks columns for column-level links', () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [
      link(A, ROOT, { source: { fullyQualifiedName: A, field: ['id'] }, target: { fullyQualifiedName: ROOT, field: ['user_id'] } }),
      link(A, ROOT, { source: { fullyQualifiedName: A, field: ['addr', 'zip'] }, target: { fullyQualifiedName: ROOT, field: ['zip'] } }),
    ], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    expect(s.assets[A].columns).toEqual(['id', 'addr.zip']);
    expect(s.assets[ROOT].columns).toEqual(['user_id', 'zip']);
    expect(Object.keys(s.edges)).toHaveLength(2);
  });

  it('does not mutate the input state', () => {
    const s0 = createInitialState(ROOT);
    mergeLinks(s0, [link(A, ROOT)], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    expect(Object.keys(s0.assets)).toEqual([ROOT]);
    expect(s0.assets[ROOT].upstreamExpanded).toBe(false);
  });
});

describe('collapseNode', () => {
  it('removes assets only reachable through the collapsed side', () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [link(ROOT, C)], { rootFqns: [ROOT], direction: 'DOWNSTREAM', maxDepth: 1 });
    s = mergeLinks(s, [link(C, D)], { rootFqns: [C], direction: 'DOWNSTREAM', maxDepth: 1 });
    s = mergeLinks(s, [link(A, ROOT)], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    const collapsed = collapseNode(s, ROOT, 'DOWNSTREAM');
    expect(Object.keys(collapsed.assets).sort()).toEqual([A, ROOT].sort());
    expect(collapsed.assets[ROOT].downstreamExpanded).toBe(false);
    expect(Object.values(collapsed.edges).every((e) => e.source !== ROOT)).toBe(true);
  });

  it('keeps assets reachable by another path', () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [link(ROOT, C), link(ROOT, D)], { rootFqns: [ROOT], direction: 'DOWNSTREAM', maxDepth: 1 });
    s = mergeLinks(s, [link(C, D)], { rootFqns: [C], direction: 'DOWNSTREAM', maxDepth: 1 });
    const collapsed = collapseNode(s, C, 'DOWNSTREAM');
    expect(collapsed.assets[D]).toBeDefined();
    expect(Object.keys(collapsed.edges)).toHaveLength(2);
  });
});

describe('toFlowSpecs', () => {
  const build = () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [
      link(A, ROOT, { processes: [proc('projects/p/locations/us/processes/q1')] }),
      link(B, ROOT, { processes: [proc('projects/p/locations/us/processes/q1')] }),
      link(ROOT, C),
    ], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    return s;
  };

  it('creates shared process nodes when showing processes', () => {
    const { nodes, edges } = toFlowSpecs(build(), { showProcesses: true, columnMode: false });
    const processNodes = nodes.filter((n) => n.type === 'dlProcess');
    expect(processNodes).toHaveLength(1);
    expect(processNodes[0].id).toBe(`${PROCESS_NODE_PREFIX}projects/p/locations/us/processes/q1`);
    // A->q1, B->q1, q1->ROOT (deduped), ROOT->C (direct, no process)
    expect(edges).toHaveLength(4);
  });

  it('uses direct edges carrying processes when processes are hidden', () => {
    const { nodes, edges } = toFlowSpecs(build(), { showProcesses: false, columnMode: false });
    expect(nodes.filter((n) => n.type === 'dlProcess')).toHaveLength(0);
    expect(edges).toHaveLength(3);
    expect(edges.find((e) => e.source === A)?.processes).toHaveLength(1);
  });

  it('wires column handles in column mode', () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [
      link(A, ROOT, { source: { fullyQualifiedName: A, field: ['id'] }, target: { fullyQualifiedName: ROOT, field: ['uid'] }, dependencyInfo: [{ dependencyType: 'OTHER' }] }),
    ], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    const { edges } = toFlowSpecs(s, { showProcesses: true, columnMode: true });
    expect(edges).toHaveLength(1);
    expect(edges[0].sourceHandle).toBe('col-out:id');
    expect(edges[0].targetHandle).toBe('col-in:uid');
    expect(edges[0].dependencyType).toBe('OTHER');
  });
});

describe('computeHighlight', () => {
  it('returns ancestors and descendants of the start node', () => {
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'x', target: 'c' },
      { id: 'e4', source: 'c', target: 'd' },
    ];
    const h = computeHighlight(edges, 'b')!;
    expect([...h.nodes].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect([...h.edges].sort()).toEqual(['e1', 'e2', 'e4']);
    expect(computeHighlight(edges, null)).toBeNull();
  });
});

describe('list rows / counts / process details', () => {
  it('produces list rows with direction and systems', () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [link(B, ROOT)], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    s = mergeLinks(s, [link(ROOT, D, { processes: [{ process: { name: 'projects/p/locations/us/processes/z', displayName: 'Dash refresh' } }] })], { rootFqns: [ROOT], direction: 'DOWNSTREAM', maxDepth: 1 });
    const rows = toListRows(s);
    const up = rows.find((r) => r.sourceFqn === B)!;
    const down = rows.find((r) => r.targetFqn === D)!;
    expect(up.direction).toBe('UPSTREAM');
    expect(up.sourceSystem).toBe('Cloud Storage');
    expect(up.sourceName).toBe('b.csv');
    expect(down.direction).toBe('DOWNSTREAM');
    expect(down.targetSystem).toBe('Looker');
    expect(down.process).toBe('Dash refresh');
    expect(neighbourCounts(s, ROOT)).toEqual({ upstream: 1, downstream: 1 });
  });

  it('applies fetched process details to edges', () => {
    let s = createInitialState(ROOT);
    s = mergeLinks(s, [link(A, ROOT, { processes: [proc('projects/p/locations/us/processes/1')] })], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    s = applyProcessDetails(s, [{ name: 'projects/p/locations/us/processes/1', displayName: 'Daily load', origin: { sourceType: 'BIGQUERY' } }]);
    const p = Object.values(s.edges)[0].processes[0];
    expect(p.displayName).toBe('Daily load');
    expect(p.origin?.sourceType).toBe('BIGQUERY');
  });
});
