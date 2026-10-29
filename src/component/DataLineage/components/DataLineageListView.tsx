/**
 * @file DataLineageListView.tsx
 * @description Tabular view of the lineage links currently in the graph.
 */
import { useMemo } from 'react';
import { Box } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { LineageGraphState, ListRow } from '../types';
import { toListRows } from '../utils/graphBuilder';

export interface DataLineageListViewProps {
  graph: LineageGraphState;
  columnMode: boolean;
  onSelectAsset: (fqn: string) => void;
}

const fmt = (t?: string) => (t ? new Date(t).toLocaleString() : '');

const DataLineageListView = ({ graph, columnMode, onSelectAsset }: DataLineageListViewProps) => {
  const rows = useMemo(() => toListRows(graph), [graph]);

  const columns: GridColDef<ListRow>[] = useMemo(() => [
    { field: 'direction', headerName: 'Direction', width: 110, valueFormatter: (v: string) => (v === 'UPSTREAM' ? 'Upstream' : 'Downstream') },
    { field: 'depth', headerName: 'Hop', width: 70, type: 'number' },
    { field: 'sourceName', headerName: 'Source', flex: 1, minWidth: 160, description: 'Source asset' },
    { field: 'sourceSystem', headerName: 'Source system', width: 140 },
    ...(columnMode ? [{ field: 'sourceField', headerName: 'Source column', width: 140 } as GridColDef<ListRow>] : []),
    { field: 'targetName', headerName: 'Target', flex: 1, minWidth: 160 },
    { field: 'targetSystem', headerName: 'Target system', width: 140 },
    ...(columnMode ? [{ field: 'targetField', headerName: 'Target column', width: 140 } as GridColDef<ListRow>] : []),
    { field: 'process', headerName: 'Process', flex: 1, minWidth: 140 },
    ...(columnMode ? [{ field: 'dependencyType', headerName: 'Dependency', width: 120 } as GridColDef<ListRow>] : []),
    { field: 'startTime', headerName: 'First seen', width: 170, valueFormatter: (v: string) => fmt(v) },
    { field: 'endTime', headerName: 'Last seen', width: 170, valueFormatter: (v: string) => fmt(v) },
    { field: 'sourceFqn', headerName: 'Source FQN', width: 260 },
    { field: 'targetFqn', headerName: 'Target FQN', width: 260 },
  ], [columnMode]);

  return (
    <Box sx={{ height: '100%', width: '100%', background: '#fff' }} data-testid="dl-list-view">
      <DataGrid
        rows={rows}
        columns={columns}
        density="compact"
        showToolbar
        disableRowSelectionOnClick
        initialState={{
          columns: { columnVisibilityModel: { sourceFqn: false, targetFqn: false } },
          sorting: { sortModel: [{ field: 'direction', sort: 'desc' }] },
        }}
        onCellClick={(params) => {
          if (params.field === 'sourceName') onSelectAsset(params.row.sourceFqn);
          if (params.field === 'targetName') onSelectAsset(params.row.targetFqn);
        }}
        localeText={{ noRowsLabel: 'No lineage links found' }}
        sx={{ border: 'none', fontSize: '0.8rem', '& .MuiDataGrid-cell[data-field="sourceName"], & .MuiDataGrid-cell[data-field="targetName"]': { color: '#0B57D0', cursor: 'pointer' } }}
      />
    </Box>
  );
};

export default DataLineageListView;
