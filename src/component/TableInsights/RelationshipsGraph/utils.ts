//@ts-ignore: Could not find a declaration file for module '@dagrejs/dagre'
import dagre from '@dagrejs/dagre';

/**
 * A single schema relationship as returned inside
 * `dataDocumentationResult.datasetResult.schemaRelationships`.
 */
export interface SchemaRelationship {
  leftSchemaPaths: { tableFqn: string; paths: string[] };
  rightSchemaPaths: { tableFqn: string; paths: string[] };
  type?: string;
}

export interface RelationshipEdgeData {
  leftFqn: string;
  rightFqn: string;
  leftLabel: string;
  rightLabel: string;
  type: string;
  /** Human-readable join expressions, e.g. "left.dep = right.dep" */
  joinExpr: string[];
}

export interface GraphNode {
  id: string; // tableFqn
  label: string; // table name
}

export interface GraphEdge {
  id: string;
  source: string; // left tableFqn
  target: string; // right tableFqn
  data: RelationshipEdgeData;
}

/**
 * Parse a resource-style BigQuery FQN
 * `//bigquery.googleapis.com/projects/P/datasets/D/tables/T`
 * into its parts. `table` doubles as the display label.
 */
export const parseTableFqn = (
  fqn: string
): { project: string; dataset: string; table: string } => {
  const project = fqn.match(/\/projects\/([^/]+)/)?.[1] || '';
  const dataset = fqn.match(/\/datasets\/([^/]+)/)?.[1] || '';
  const table = fqn.match(/\/tables\/([^/]+)/)?.[1] || fqn.split('/').pop() || fqn;
  return { project, dataset, table };
};

/** Display label for a resource FQN (the table name). */
export const getTableLabel = (fqn: string): string => parseTableFqn(fqn).table;

/**
 * Convert a resource-style FQN to the Dataplex entry FQN used for navigation,
 * e.g. `bigquery:P.D.T`.
 */
export const toEntryFqn = (fqn: string): string => {
  const { project, dataset, table } = parseTableFqn(fqn);
  return `bigquery:${project}.${dataset}.${table}`;
};

/** Build the pairwise join expression strings for a relationship. */
const buildJoinExpr = (rel: SchemaRelationship): string[] => {
  const leftLabel = getTableLabel(rel.leftSchemaPaths?.tableFqn || '');
  const rightLabel = getTableLabel(rel.rightSchemaPaths?.tableFqn || '');
  const leftPaths = rel.leftSchemaPaths?.paths || [];
  const rightPaths = rel.rightSchemaPaths?.paths || [];
  const count = Math.min(leftPaths.length, rightPaths.length);
  const exprs: string[] = [];
  for (let i = 0; i < count; i++) {
    exprs.push(`${leftLabel}.${leftPaths[i]} = ${rightLabel}.${rightPaths[i]}`);
  }
  return exprs;
};

export interface RelationshipRow {
  table1: string;
  table2: string;
  relationship: string; // join expressions joined by " AND "
  source: string;
  leftFqn: string;
  rightFqn: string;
}

/**
 * Flatten the raw schemaRelationships into table rows (one row per relationship).
 * Used by the Relationships table view.
 */
export const buildRelationshipRows = (
  relationships: SchemaRelationship[] = []
): RelationshipRow[] =>
  relationships
    .filter((rel) => rel.leftSchemaPaths?.tableFqn && rel.rightSchemaPaths?.tableFqn)
    .map((rel) => {
      const leftFqn = rel.leftSchemaPaths.tableFqn;
      const rightFqn = rel.rightSchemaPaths.tableFqn;
      return {
        table1: getTableLabel(leftFqn),
        table2: getTableLabel(rightFqn),
        relationship: buildJoinExpr(rel).join(' AND '),
        source: 'LLM-inferred',
        leftFqn,
        rightFqn,
      };
    });

/**
 * Turn the raw schemaRelationships array into unique nodes + edges.
 *
 * Edges are normalised: parallel/duplicate relationships between the same pair
 * of tables collapse into a SINGLE edge (keyed by the unordered node pair), and
 * every relationship's join expressions are aggregated (deduped) onto that edge.
 * The first-seen orientation is kept as source/target so neighbour direction is
 * deterministic.
 */
export const buildGraph = (
  relationships: SchemaRelationship[] = []
): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  relationships.forEach((rel) => {
    const leftFqn = rel.leftSchemaPaths?.tableFqn;
    const rightFqn = rel.rightSchemaPaths?.tableFqn;
    if (!leftFqn || !rightFqn || leftFqn === rightFqn) return;

    if (!nodeMap.has(leftFqn)) nodeMap.set(leftFqn, { id: leftFqn, label: getTableLabel(leftFqn) });
    if (!nodeMap.has(rightFqn)) nodeMap.set(rightFqn, { id: rightFqn, label: getTableLabel(rightFqn) });

    // Unordered pair key so A→B and B→A collapse to one edge.
    const pairKey = [leftFqn, rightFqn].sort().join('||');
    const exprs = buildJoinExpr(rel);

    const existing = edgeMap.get(pairKey);
    if (existing) {
      // Aggregate join expressions, de-duplicated, preserving order.
      exprs.forEach((e) => {
        if (!existing.data.joinExpr.includes(e)) existing.data.joinExpr.push(e);
      });
    } else {
      edgeMap.set(pairKey, {
        id: `rel-${pairKey}`,
        source: leftFqn,
        target: rightFqn,
        data: {
          leftFqn,
          rightFqn,
          leftLabel: getTableLabel(leftFqn),
          rightLabel: getTableLabel(rightFqn),
          type: rel.type || 'SCHEMA_JOIN',
          joinExpr: [...exprs],
        },
      });
    }
  });

  return { nodes: Array.from(nodeMap.values()), edges: Array.from(edgeMap.values()) };
};

export interface Neighbor {
  fqn: string;
  label: string;
  direction: 'outgoing' | 'incoming';
}

/**
 * Neighbours of a node, with edge direction.
 * The node as edge `source` ⇒ outgoing; as `target` ⇒ incoming.
 * De-duplicated per (fqn, direction).
 */
export const getNeighbors = (nodeId: string, edges: GraphEdge[]): Neighbor[] => {
  const seen = new Set<string>();
  const neighbors: Neighbor[] = [];
  edges.forEach((edge) => {
    if (edge.source === nodeId) {
      const key = `out:${edge.target}`;
      if (!seen.has(key)) {
        seen.add(key);
        neighbors.push({ fqn: edge.target, label: getTableLabel(edge.target), direction: 'outgoing' });
      }
    } else if (edge.target === nodeId) {
      const key = `in:${edge.source}`;
      if (!seen.has(key)) {
        seen.add(key);
        neighbors.push({ fqn: edge.source, label: getTableLabel(edge.source), direction: 'incoming' });
      }
    }
  });
  return neighbors;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 48;

/**
 * Position nodes with a dagre left-to-right layout (mirrors the Lineage graph).
 */
export const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 120, ranksep: 240, ranker: 'network-simplex' });

  nodes.forEach((node: any) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge: any) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node: any) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
