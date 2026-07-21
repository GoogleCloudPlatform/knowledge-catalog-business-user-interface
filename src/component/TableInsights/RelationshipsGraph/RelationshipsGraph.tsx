import React, { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MiniMap,
  Controls,
  ControlButton,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../../Lineage/xy-theme.css';
import './RelationshipsGraph.css';
import { Box, IconButton, Tooltip, Typography, Collapse, Divider } from '@mui/material';
import {
  Close,
  ArrowBack,
  ExpandMore,
  ExpandLess,
  OpenInNew,
  Fullscreen,
  CloseFullscreen,
  CenterFocusStrongOutlined,
} from '@mui/icons-material';
import { LineStartCircleIcon, LineEndCircleIcon } from './icons';
import useFullScreenStatus from '../../../hooks/useFullScreenStatus';
import useNavigateToResource from './useNavigateToResource';
import RelationshipNode from './RelationshipNode';
import {
  buildGraph,
  getLayoutedElements,
  getNeighbors,
  getTableLabel,
} from './utils';
import type { SchemaRelationship, GraphEdge, RelationshipEdgeData, Neighbor } from './utils';

const nodeTypes = { relationshipNode: RelationshipNode };
const defaultViewport = { x: 0, y: 0, zoom: 1 };

interface RelationshipsGraphProps {
  relationships: SchemaRelationship[];
}

/**
 * Small blue table chip used inside the popups, with an optional direction glyph.
 * The direction icon carries a Source/Destination tooltip; the label itself has
 * NO tooltip (no resource-name tooltip inside popups). Pass `onClick` to make it
 * act as a button that focuses the corresponding node.
 */
const TableChip: React.FC<{
  label: string;
  direction?: 'outgoing' | 'incoming';
  onClick?: () => void;
}> = ({ label, direction, onClick }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
    {direction === 'outgoing' && (
      <Tooltip title="Source">
        <Box sx={{ display: 'flex' }}><LineStartCircleIcon size={18} color="#5F6368" /></Box>
      </Tooltip>
    )}
    {direction === 'incoming' && (
      <Tooltip title="Destination">
        <Box sx={{ display: 'flex' }}><LineEndCircleIcon size={18} color="#5F6368" /></Box>
      </Tooltip>
    )}
    <Box
      onClick={onClick}
      sx={{
        padding: '6px 12px',
        borderRadius: '6px',
        backgroundColor: '#1A73E8',
        color: '#FFFFFF',
        fontFamily: '"Google Sans", sans-serif',
        fontWeight: 500,
        fontSize: '13px',
        maxWidth: '220px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { backgroundColor: '#1666C1' } : undefined,
      }}
    >
      {label}
    </Box>
  </Box>
);

/**
 * Custom bottom-left controls. Rendered inside <ReactFlow> so it can use
 * useReactFlow() for fit-view. Default zoom buttons kept; default fit-view +
 * interactive buttons hidden and replaced with clearer custom buttons.
 */
const GraphControls: React.FC<{ isFullscreen: boolean; toggleFullscreen: () => void }> = ({
  isFullscreen,
  toggleFullscreen,
}) => {
  const { fitView } = useReactFlow();
  return (
    <Controls showFitView={false} showInteractive={false}>
      <ControlButton title="Fit view" onClick={() => fitView({ padding: 0.2 })}>
        <CenterFocusStrongOutlined style={{ fontSize: 14, color: '#575757' }} />
      </ControlButton>
      <ControlButton title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
        {isFullscreen
          ? <CloseFullscreen style={{ fontSize: 14, color: '#575757' }} />
          : <Fullscreen style={{ fontSize: 14, color: '#575757' }} />}
      </ControlButton>
    </Controls>
  );
};

const popupSx = {
  position: 'absolute' as const,
  top: 16,
  left: 16,
  zIndex: 20,
  width: 360,
  maxWidth: 'calc(100% - 32px)',
  maxHeight: 'calc(100% - 32px)',
  overflowY: 'auto' as const,
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  border: '1px solid #ECEEF4',
  padding: '16px',
};

const sectionHeaderSx = {
  fontFamily: '"Google Sans", sans-serif',
  fontWeight: 600,
  fontSize: '15px',
  color: '#3D4151',
};

const RelationshipsGraph: React.FC<RelationshipsGraphProps> = ({ relationships }) => {
  const navigateToResource = useNavigateToResource();
  const { elementRef, isFullscreen, toggleFullscreen } = useFullScreenStatus();

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => buildGraph(relationships),
    [relationships]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Popup state: either an edge, or a node (with a drill-in stack for neighbours).
  const [selectedEdge, setSelectedEdge] = useState<RelationshipEdgeData | null>(null);
  const [nodeStack, setNodeStack] = useState<string[]>([]); // fqn stack, last = focused
  const [propsOpen, setPropsOpen] = useState(true);
  const [neighborsOpen, setNeighborsOpen] = useState(true);

  const focusedNodeId = nodeStack.length > 0 ? nodeStack[nodeStack.length - 1] : null;

  const handleNodeClick = (nodeId: string) => {
    setSelectedEdge(null);
    setNodeStack([nodeId]);
    setPropsOpen(true);
    setNeighborsOpen(true);
  };

  const closePopup = () => {
    setSelectedEdge(null);
    setNodeStack([]);
  };

  useEffect(() => {
    const flowNodes = rawNodes.map((n) => ({
      id: n.id,
      type: 'relationshipNode',
      data: { id: n.id, label: n.label, onNodeClick: handleNodeClick },
      position: { x: 0, y: 0 },
    }));

    const flowEdges = rawEdges.map((e: GraphEdge) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: e.data,
      animated: false,
      label: 'LLM-inferred',
      labelStyle: {
        fill: '#5F6368',
        fontFamily: '"Google Sans", sans-serif',
        fontSize: 12,
        fontWeight: 500,
      },
      labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.9 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      style: { stroke: '#94A3B8', strokeWidth: 2 },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      flowNodes,
      flowEdges,
      'LR'
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes, rawEdges]);

  // Highlight the selected node.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n: any) => ({ ...n, selected: n.id === focusedNodeId }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedNodeId]);

  const handleEdgeClick = (_: React.MouseEvent, edge: any) => {
    setNodeStack([]);
    setSelectedEdge(edge.data as RelationshipEdgeData);
    setPropsOpen(true);
  };

  const neighbors: Neighbor[] = focusedNodeId ? getNeighbors(focusedNodeId, rawEdges) : [];

  return (
    <Box
      ref={elementRef}
      className="relationships-graph"
      sx={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : '520px',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'rgb(248, 250, 253)',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={() => {}}
        onEdgeClick={handleEdgeClick}
        onPaneClick={closePopup}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={25} size={2} color="#c4c4c4" bgColor="rgb(248, 250, 253)" />
        <MiniMap
          nodeStrokeWidth={1}
          nodeStrokeColor="#0041d0"
          nodeColor="#1A73E8"
          pannable
          zoomable
          style={{ backgroundColor: '#ffffff' }}
        />
        <GraphControls isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />
      </ReactFlow>

      {/* Edge popup */}
      {selectedEdge && (
        <Box sx={popupSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 13, color: '#3D4151', fontFamily: '"Google Sans", sans-serif' }}>Edge: LLM-inferred</Typography>
            <IconButton size="small" onClick={closePopup}><Close sx={{ fontSize: 18 }} /></IconButton>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <TableChip label={selectedEdge.leftLabel} direction="outgoing" onClick={() => handleNodeClick(selectedEdge.leftFqn)} />
            <TableChip label={selectedEdge.rightLabel} direction="incoming" onClick={() => handleNodeClick(selectedEdge.rightFqn)} />
          </Box>

          <Box
            onClick={() => setPropsOpen((v) => !v)}
            sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: 2, cursor: 'pointer' }}
          >
            <IconButton size="small" sx={{ p: 0 }}>{propsOpen ? <ExpandLess /> : <ExpandMore />}</IconButton>
            <Typography sx={sectionHeaderSx}>Properties</Typography>
            <Typography sx={{ fontSize: 13, color: '#9AA0A6' }}>{selectedEdge.joinExpr.length}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Collapse in={propsOpen}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', pl: '4px' }}>
              {selectedEdge.joinExpr.map((expr, i) => (
                <Box key={i} sx={{ display: 'flex', gap: '12px' }}>
                  <Typography sx={{ ...sectionHeaderSx, fontSize: 14, minWidth: 120, flexShrink: 0 }}>
                    Relationship {i + 1}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: '#65697D', fontFamily: '"Google Sans", sans-serif', wordBreak: 'break-word' }}>
                    {expr}
                  </Typography>
                </Box>
              ))}
              {selectedEdge.joinExpr.length === 0 && (
                <Typography sx={{ fontSize: 13, color: '#9AA0A6' }}>No properties.</Typography>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Node popup */}
      {focusedNodeId && (
        <Box sx={popupSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              {nodeStack.length > 1 && (
                <Tooltip title="Back">
                  <IconButton size="small" onClick={() => setNodeStack((s) => s.slice(0, -1))}>
                    <ArrowBack sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
              <TableChip label={getTableLabel(focusedNodeId)} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Open resource">
                <IconButton size="small" onClick={() => navigateToResource(focusedNodeId)}>
                  <OpenInNew sx={{ fontSize: 18, color: '#0B57D0' }} />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={closePopup}><Close sx={{ fontSize: 18 }} /></IconButton>
            </Box>
          </Box>

          {/* Neighbours */}
          <Box
            onClick={() => setNeighborsOpen((v) => !v)}
            sx={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <IconButton size="small" sx={{ p: 0 }}>{neighborsOpen ? <ExpandLess /> : <ExpandMore />}</IconButton>
            <Typography sx={sectionHeaderSx}>Neighbors</Typography>
            <Typography sx={{ fontSize: 13, color: '#9AA0A6' }}>{neighbors.length}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Collapse in={neighborsOpen}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {neighbors.map((nb, i) => (
                <Box
                  key={`${nb.fqn}-${nb.direction}-${i}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    py: '10px',
                    minWidth: 0,
                    borderBottom: i < neighbors.length - 1 ? '1px solid #F1F3F4' : 'none',
                  }}
                >
                  <TableChip
                    label={nb.label}
                    direction={nb.direction}
                    onClick={() => setNodeStack((s) => [...s, nb.fqn])}
                  />
                </Box>
              ))}
              {neighbors.length === 0 && (
                <Typography sx={{ fontSize: 13, color: '#9AA0A6', pl: '4px' }}>No neighbours.</Typography>
              )}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
};

export default RelationshipsGraph;
