/**
 * @file DataLineageGraph.tsx
 * @description React Flow canvas for the Data Lineage tab: dagre layout,
 * path highlighting of the selected node, minimap, controls and legend.
 */
import { useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography } from '@mui/material';
import AssetNode from './AssetNode';
import ProcessNode from './ProcessNode';
import type { LineageDirection, LineageGraphState, LineageProcess } from '../types';
import { computeHighlight, toFlowSpecs, type FlowEdgeSpec } from '../utils/graphBuilder';
import { layoutGraph } from '../utils/layout';
import { parseFqn } from '../utils/fqn';
import { getProcessTypeInfo } from '../utils/processTypes';

const nodeTypes = { dlAsset: AssetNode, dlProcess: ProcessNode };

export interface DataLineageGraphProps {
  graph: LineageGraphState;
  columnMode: boolean;
  showProcesses: boolean;
  selectedColumns: string[];
  selectedId: string | null;
  expanding: Record<string, LineageDirection | undefined>;
  /** Changing the nonce re-centres on `id`. */
  focusRequest?: { id: string; nonce: number } | null;
  onSelectAsset: (fqn: string) => void;
  onSelectProcess: (processes: LineageProcess[], id: string) => void;
  onExpand: (fqn: string, direction: LineageDirection) => void;
  onCollapse: (fqn: string, direction: LineageDirection) => void;
  onClearSelection: () => void;
}

const SYSTEM_COLORS: Record<string, string> = {
  bigquery: '#1A73E8',
  gcs: '#34A853',
  pubsub: '#A142F4',
  spanner: '#4285F4',
  looker: '#5F6368',
  looker_studio: '#4285F4',
  vertex_ai: '#1967D2',
};

const LegendItem = ({ swatch, label }: { swatch: React.ReactNode; label: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    {swatch}
    <Typography sx={{ fontSize: '0.6875rem', color: '#444746' }}>{label}</Typography>
  </Box>
);

const Legend = () => (
  <Box
    data-testid="dl-legend"
    sx={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: '8px', p: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}
  >
    <LegendItem swatch={<Box sx={{ width: 14, height: 10, border: '2px solid #1A73E8', borderRadius: '2px' }} />} label="Root asset" />
    <LegendItem swatch={<Box sx={{ width: 12, height: 12, border: '2px solid #D58813', borderRadius: '50%' }} />} label="Process / job" />
    <LegendItem swatch={<Box sx={{ width: 18, borderTop: '2px solid #747775' }} />} label="Data flow" />
    <LegendItem swatch={<Box sx={{ width: 18, borderTop: '2px dashed #747775' }} />} label="Transformation (column)" />
    <LegendItem swatch={<Box sx={{ width: 18, borderTop: '2px solid #0B57D0' }} />} label="Selected path" />
  </Box>
);

const GraphInner = ({
  graph,
  columnMode,
  showProcesses,
  selectedColumns,
  selectedId,
  expanding,
  focusRequest,
  onSelectAsset,
  onSelectProcess,
  onExpand,
  onCollapse,
  onClearSelection,
}: DataLineageGraphProps) => {
  const reactFlow = useReactFlow();
  const specs = useMemo(() => toFlowSpecs(graph, { showProcesses, columnMode }), [graph, showProcesses, columnMode]);
  const positions = useMemo(() => layoutGraph(specs.nodes, specs.edges, columnMode), [specs, columnMode]);
  const highlight = useMemo(() => computeHighlight(specs.edges, selectedId), [specs.edges, selectedId]);
  const edgeById = useMemo(() => new Map(specs.edges.map((e) => [e.id, e])), [specs.edges]);

  const flowNodes: Node[] = useMemo(() => specs.nodes.map((n) => {
    const dimmed = Boolean(highlight && !highlight.nodes.has(n.id));
    if (n.type === 'dlProcess' && n.process) {
      const process = n.process;
      return {
        id: n.id,
        type: 'dlProcess',
        position: positions[n.id],
        data: {
          process,
          isSelected: selectedId === n.id,
          dimmed,
          onSelect: () => onSelectProcess([process], n.id),
        },
      };
    }
    const asset = n.asset!;
    return {
      id: n.id,
      type: 'dlAsset',
      position: positions[n.id],
      data: {
        asset,
        parsed: parseFqn(asset.fqn),
        columnMode,
        selectedColumns,
        isSelected: selectedId === n.id,
        dimmed,
        expanding: expanding[asset.fqn],
        onSelect: onSelectAsset,
        onExpand,
        onCollapse,
      },
    };
  }), [specs.nodes, positions, highlight, selectedId, columnMode, selectedColumns, expanding, onSelectAsset, onSelectProcess, onExpand, onCollapse]);

  const flowEdges: Edge[] = useMemo(() => specs.edges.map((e: FlowEdgeSpec) => {
    const highlighted = Boolean(highlight?.edges.has(e.id));
    const dimmed = Boolean(highlight && !highlighted);
    const color = highlighted ? '#0B57D0' : '#747775';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: 'default',
      animated: highlighted,
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      style: {
        stroke: color,
        strokeWidth: highlighted ? 2.5 : 1.5,
        strokeDasharray: e.dependencyType === 'OTHER' ? '6 4' : undefined,
        opacity: dimmed ? 0.25 : 1,
        cursor: e.processes.length ? 'pointer' : 'default',
      },
      data: { processes: e.processes },
      label: undefined,
    };
  }), [specs.edges, highlight]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => { setNodes(flowNodes); }, [flowNodes, setNodes]);
  useEffect(() => { setEdges(flowEdges); }, [flowEdges, setEdges]);

  // Fit the view whenever the set of nodes changes (load / expand / collapse).
  const nodeKey = useMemo(() => specs.nodes.map((n) => n.id).sort().join('|'), [specs.nodes]);
  useEffect(() => {
    const t = setTimeout(() => {
      try { reactFlow.fitView({ padding: 0.2, duration: 300, maxZoom: 1.2 }); } catch { /* not mounted */ }
    }, 50);
    return () => clearTimeout(t);
  }, [nodeKey, reactFlow]);

  useEffect(() => {
    if (!focusRequest) return;
    const pos = positions[focusRequest.id];
    if (pos) {
      try { reactFlow.setCenter(pos.x + 140, pos.y + 36, { zoom: 1.2, duration: 400 }); } catch { /* not mounted */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      nodesConnectable={false}
      onPaneClick={onClearSelection}
      onEdgeClick={(_, edge) => {
        const spec = edgeById.get(edge.id);
        if (spec?.processes.length) onSelectProcess(spec.processes, edge.id);
      }}
      minZoom={0.1}
      maxZoom={2}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#C4C7C5" bgColor="#F8FAFD" />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => {
          if (n.type === 'dlProcess') return getProcessTypeInfo((n.data as { process?: LineageProcess })?.process).color;
          const system = parseFqn(n.id).system;
          return SYSTEM_COLORS[system] || '#9AA0A6';
        }}
        style={{ backgroundColor: '#fff' }}
      />
      <Controls showInteractive={false} />
      <Panel position="top-right"><Legend /></Panel>
    </ReactFlow>
  );
};

const DataLineageGraph = (props: DataLineageGraphProps) => (
  <ReactFlowProvider>
    <GraphInner {...props} />
  </ReactFlowProvider>
);

export default DataLineageGraph;
