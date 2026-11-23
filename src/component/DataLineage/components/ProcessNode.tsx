/**
 * @file ProcessNode.tsx
 * @description React Flow node for a lineage process (BigQuery job, Dataflow,
 * Composer, Data Fusion, Dataproc, Vertex AI, Looker, custom/OpenLineage ...).
 */
import { memo } from 'react';
import { Box, Tooltip } from '@mui/material';
import { Handle, Position } from '@xyflow/react';
import type { LineageProcess } from '../types';
import { getProcessDisplayName, getProcessTypeInfo } from '../utils/processTypes';
import { PROCESS_NODE_SIZE } from '../utils/layout';

export interface ProcessNodeData {
  process: LineageProcess;
  isSelected: boolean;
  dimmed: boolean;
  onSelect: (process: LineageProcess) => void;
  [key: string]: unknown;
}

const hiddenHandle = { opacity: 0, width: 6, height: 6, border: 'none', background: 'transparent' };

const ProcessNode = ({ data }: { data: ProcessNodeData }) => {
  const { process, isSelected, dimmed } = data;
  const info = getProcessTypeInfo(process);
  return (
    <Tooltip title={`${getProcessDisplayName(process)} (${info.label})`} placement="top">
      <Box
        data-testid={`dl-process-node-${process.name}`}
        onClick={() => data.onSelect(process)}
        sx={{
          width: PROCESS_NODE_SIZE,
          height: PROCESS_NODE_SIZE,
          boxSizing: 'border-box',
          borderRadius: '50%',
          background: '#fff',
          border: `2px solid ${isSelected ? '#0B57D0' : info.color}`,
          boxShadow: isSelected ? '0 0 0 4px rgba(11,87,208,0.15)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: dimmed ? 0.35 : 1,
        }}
      >
        <Handle type="target" position={Position.Left} style={hiddenHandle} isConnectable={false} />
        <img src={info.icon} alt={info.label} style={{ width: 22, height: 22 }} />
        <Handle type="source" position={Position.Right} style={hiddenHandle} isConnectable={false} />
      </Box>
    </Tooltip>
  );
};

export default memo(ProcessNode);
