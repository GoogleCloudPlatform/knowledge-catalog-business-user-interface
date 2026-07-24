import { memo } from 'react';
import { Box, Tooltip } from '@mui/material';
import { Handle, Position } from '@xyflow/react';

/**
 * @file RelationshipNode.tsx
 * A blue chip node representing a resource (table) in the Relationships graph.
 */
export default memo(({ data, isConnectable, selected }: any) => {
  const label: string = data.label;

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />

      <Tooltip title={label} placement="top">
        <Box
          onClick={(e) => {
            e.stopPropagation();
            data.onNodeClick?.(data.id);
          }}
          sx={{
            maxWidth: '220px',
            padding: '8px 14px',
            borderRadius: '6px',
            backgroundColor: '#1A73E8',
            color: '#FFFFFF',
            fontFamily: '"Google Sans", sans-serif',
            fontWeight: 500,
            fontSize: '13px',
            lineHeight: '1.2',
            textAlign: 'center',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: selected ? '0 0 0 2px #0B57D0, 0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.15)',
            transition: 'box-shadow 0.15s ease',
            '&:hover': { backgroundColor: '#1666C1' },
          }}
        >
          {label}
        </Box>
      </Tooltip>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </>
  );
});
