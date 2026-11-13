/**
 * @file AssetNode.tsx
 * @description React Flow node for a lineage asset (any system). Shows the
 * system icon, name, asset type, project, upstream/downstream expand/collapse
 * controls and - in column mode - the columns involved, each with its own
 * connection handles.
 */
import { memo } from 'react';
import { Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight, UnfoldLess } from '@mui/icons-material';
import { Handle, Position } from '@xyflow/react';
import type { LineageAssetNode, LineageDirection } from '../types';
import type { ParsedFqn } from '../utils/fqn';
import { columnHandleId } from '../utils/graphBuilder';
import { ASSET_NODE_WIDTH, COLUMN_ROW_HEIGHT, MAX_VISIBLE_COLUMNS } from '../utils/layout';

export interface AssetNodeData {
  asset: LineageAssetNode;
  parsed: ParsedFqn;
  columnMode: boolean;
  selectedColumns: string[];
  isSelected: boolean;
  dimmed: boolean;
  expanding?: LineageDirection;
  onSelect: (fqn: string) => void;
  onExpand: (fqn: string, direction: LineageDirection) => void;
  onCollapse: (fqn: string, direction: LineageDirection) => void;
  [key: string]: unknown;
}

const hiddenHandle = { opacity: 0, width: 6, height: 6, border: 'none', background: 'transparent' };

const ExpandControl = ({ data, direction }: { data: AssetNodeData; direction: LineageDirection }) => {
  const { asset } = data;
  const isUp = direction === 'UPSTREAM';
  const expanded = isUp ? asset.upstreamExpanded : asset.downstreamExpanded;
  const available = isUp ? asset.hasUpstream : asset.hasDownstream;
  if (data.expanding === direction) {
    return <CircularProgress size={18} data-testid={`expanding-${direction}`} sx={{ m: '3px' }} />;
  }
  if (!available) return <Box sx={{ width: 24 }} />;
  const label = expanded
    ? `Collapse ${isUp ? 'upstream' : 'downstream'}`
    : `Expand ${isUp ? 'upstream' : 'downstream'}`;
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        className="nodrag"
        onClick={(e) => {
          e.stopPropagation();
          if (expanded) data.onCollapse(asset.fqn, direction);
          else data.onExpand(asset.fqn, direction);
        }}
        sx={{
          p: '2px',
          border: '1px solid #E0E0E0',
          borderRadius: '6px',
          color: '#0B57D0',
          '&:hover': { backgroundColor: '#0B57D0', color: '#fff' },
        }}
      >
        {expanded ? <UnfoldLess sx={{ fontSize: 18, transform: 'rotate(90deg)' }} />
          : isUp ? <ChevronLeft sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
      </IconButton>
    </Tooltip>
  );
};

const AssetNode = ({ data }: { data: AssetNodeData }) => {
  const { asset, parsed, columnMode, selectedColumns, isSelected, dimmed } = data;
  const columns = columnMode ? asset.columns.slice(0, MAX_VISIBLE_COLUMNS) : [];
  const hiddenCount = columnMode ? Math.max(0, asset.columns.length - MAX_VISIBLE_COLUMNS) : 0;

  return (
    <Box
      data-testid={`dl-asset-node-${asset.fqn}`}
      onClick={() => data.onSelect(asset.fqn)}
      sx={{
        width: ASSET_NODE_WIDTH,
        boxSizing: 'border-box',
        background: '#fff',
        borderRadius: '8px',
        border: isSelected ? '2px solid #0B57D0' : asset.isRoot ? '2px solid #1A73E8' : '1px solid #C4C7C5',
        boxShadow: isSelected ? '0 0 0 4px rgba(11,87,208,0.15)' : '0 1px 2px rgba(60,64,67,0.15)',
        opacity: dimmed ? 0.35 : 1,
        cursor: 'pointer',
        transition: 'opacity 150ms, box-shadow 150ms',
        position: 'relative',
        fontFamily: '"Google Sans", sans-serif',
      }}
    >
      <Handle type="target" position={Position.Left} style={hiddenHandle} isConnectable={false} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', p: '8px 6px' }}>
        <ExpandControl data={data} direction="UPSTREAM" />
        <img src={parsed.icon} alt={parsed.systemLabel} style={{ width: 24, height: 24, flex: '0 0 auto' }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Tooltip title={asset.fqn} placement="top">
            <Typography
              sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1F1F1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {parsed.displayName}
            </Typography>
          </Tooltip>
          <Typography
            sx={{ fontSize: '0.6875rem', color: '#5E5E5E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {parsed.systemLabel} · {parsed.assetType}{parsed.project ? ` · ${parsed.project}` : ''}
          </Typography>
        </Box>
        {asset.isRoot && (
          <Box sx={{ fontSize: '0.625rem', fontWeight: 600, color: '#0B57D0', background: '#E8F0FE', borderRadius: '4px', px: '4px', py: '1px' }}>
            ROOT
          </Box>
        )}
        <ExpandControl data={data} direction="DOWNSTREAM" />
      </Box>

      {columns.length > 0 && (
        <Box sx={{ borderTop: '1px solid #E0E0E0', pb: '6px' }}>
          {columns.map((col) => {
            const highlighted = asset.isRoot && selectedColumns.includes(col);
            return (
              <Box
                key={col}
                sx={{
                  position: 'relative',
                  height: COLUMN_ROW_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  px: '12px',
                  fontSize: '0.75rem',
                  color: '#1F1F1F',
                  background: highlighted ? '#E8F0FE' : 'transparent',
                  fontWeight: highlighted ? 600 : 400,
                }}
              >
                <Handle id={columnHandleId(col, 'in')} type="target" position={Position.Left} style={hiddenHandle} isConnectable={false} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col}</span>
                <Handle id={columnHandleId(col, 'out')} type="source" position={Position.Right} style={hiddenHandle} isConnectable={false} />
              </Box>
            );
          })}
          {hiddenCount > 0 && (
            <Typography sx={{ fontSize: '0.6875rem', color: '#0B57D0', px: '12px' }}>+{hiddenCount} more columns</Typography>
          )}
        </Box>
      )}
      <Handle type="source" position={Position.Right} style={hiddenHandle} isConnectable={false} />
    </Box>
  );
};

export default memo(AssetNode);
