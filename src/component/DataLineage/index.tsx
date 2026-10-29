import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../auth/AuthProvider';
import useFullScreenStatus from '../../hooks/useFullScreenStatus';
import { useNotification } from '../../contexts/NotificationContext';
import DataLineageToolbar, { type SearchOption } from './components/DataLineageToolbar';
import DataLineageGraph from './components/DataLineageGraph';
import DataLineageListView from './components/DataLineageListView';
import AssetDetailsPanel from './components/AssetDetailsPanel';
import ProcessDetailsPanel from './components/ProcessDetailsPanel';
import { useDataLineageGraph } from './hooks/useDataLineageGraph';
import { parseFqn } from './utils/fqn';
import { PROCESS_NODE_PREFIX } from './utils/graphBuilder';
import type { CatalogEntryLike, LineageProcess } from './types';
import { getSchemaColumns } from './utils/schema';

/**
 * @file index.tsx
 * @description
 * "Data Lineage" tab for /view-details. Renders upstream/downstream and
 * column-level lineage for the current entry using the Knowledge Catalog
 * Data Lineage REST API (via thin backend proxy routes):
 *  - Graph (React Flow) and List (DataGrid) views
 *  - Direction / depth / asset-vs-column level / filters
 *  - Expand/collapse per node, path highlighting, find-in-graph
 *  - Asset details side panel and process panel with query runs
 *
 * State is local to this component (see useDataLineageGraph) so the existing
 * Lineage tab and the shared entry Redux slice are unaffected.
 */

interface DataLineageProps {
  entry: CatalogEntryLike;
}

type Selection =
  | { kind: 'asset'; fqn: string }
  | { kind: 'process'; processes: LineageProcess[]; id: string }
  | null;

const DataLineage: React.FC<DataLineageProps> = ({ entry }) => {
  const { user } = useAuth();
  const idToken = user?.token || '';
  const { showError } = useNotification();
  const { elementRef, isFullscreen, toggleFullscreen } = useFullScreenStatus();

  const lineage = useDataLineageGraph(entry, idToken);
  const { graph, status, error, options } = lineage;

  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [showProcesses, setShowProcesses] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(null);

  const rootColumns = useMemo(() => getSchemaColumns(entry), [entry]);
  const columnMode = options.level === 'COLUMN';

  // Surface expansion / follow-up errors without replacing the graph.
  useEffect(() => {
    if (error && status === 'succeeded') {
      showError(error.message, 4000);
      lineage.clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, status]);

  // Drop the selection if the selected asset disappears (collapse / reload).
  useEffect(() => {
    if (selection?.kind === 'asset' && !graph.assets[selection.fqn]) setSelection(null);
  }, [graph.assets, selection]);

  const handleSelectAsset = useCallback((fqn: string) => {
    setSelection((cur) => (cur?.kind === 'asset' && cur.fqn === fqn ? null : { kind: 'asset', fqn }));
  }, []);

  const handleSelectProcess = useCallback((processes: LineageProcess[], id: string) => {
    setSelection({ kind: 'process', processes, id });
  }, []);

  const handleSetRoot = useCallback((fqn: string) => {
    setSelection(null);
    lineage.setRoot(fqn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineage.setRoot]);

  const searchOptions: SearchOption[] = useMemo(() => Object.values(graph.assets).map((a) => {
    const p = parseFqn(a.fqn);
    return { id: a.fqn, label: p.displayName, sub: `${p.systemLabel} · ${a.fqn}` };
  }), [graph.assets]);

  const selectedId = selection?.kind === 'asset'
    ? selection.fqn
    : selection?.kind === 'process' && selection.id.startsWith(PROCESS_NODE_PREFIX) ? selection.id : null;

  const assetCount = Object.keys(graph.assets).length;

  const renderBody = () => {
    if (status === 'loading' || status === 'idle') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <CircularProgress data-testid="dl-loading" />
        </Box>
      );
    }
    if (status === 'failed') {
      return (
        <Box sx={{ p: 3 }} data-testid="dl-error">
          <Alert
            severity={error?.type === 'PERMISSION_DENIED' ? 'warning' : 'error'}
            action={<Button size="small" onClick={lineage.retry}>Retry</Button>}
          >
            {error?.message || 'Failed to load data lineage.'}
            {error?.type === 'API_DISABLED' && (
              <Typography sx={{ fontSize: '0.8rem', mt: 0.5 }}>
                Enable <code>datalineage.googleapis.com</code> in the project to record and view lineage.
              </Typography>
            )}
          </Alert>
        </Box>
      );
    }
    if (viewMode === 'list') {
      return <DataLineageListView graph={graph} columnMode={columnMode} onSelectAsset={handleSelectAsset} />;
    }
    return (
      <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
        {assetCount <= 1 && (
          <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
            <Alert severity="info" data-testid="dl-empty">
              {columnMode && options.columns.length === 0
                ? 'Select one or more columns to view column-level lineage.'
                : 'No lineage recorded for this asset with the current filters.'}
            </Alert>
          </Box>
        )}
        <DataLineageGraph
          graph={graph}
          columnMode={columnMode}
          showProcesses={showProcesses}
          selectedColumns={options.columns}
          selectedId={selectedId}
          expanding={lineage.expanding}
          focusRequest={focusRequest}
          onSelectAsset={handleSelectAsset}
          onSelectProcess={handleSelectProcess}
          onExpand={lineage.expandNode}
          onCollapse={lineage.collapseNode}
          onClearSelection={() => setSelection(null)}
        />
      </Box>
    );
  };

  return (
    <Box
      ref={elementRef}
      data-testid="data-lineage-tab"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : 'calc(100vh - 200px)',
        minHeight: 480,
        background: '#fff',
        width: '100%',
        minWidth: 0,
      }}
    >
      <DataLineageToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        options={options}
        setOptions={lineage.setOptions}
        rootColumns={rootColumns}
        showProcesses={showProcesses}
        onShowProcessesChange={setShowProcesses}
        searchOptions={searchOptions}
        onSearchSelect={(id) => {
          setSelection({ kind: 'asset', fqn: id });
          setFocusRequest({ id, nonce: Date.now() });
        }}
        onReset={() => { setSelection(null); lineage.reset(); }}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        truncated={lineage.truncated}
        entryLocation={lineage.entryLocation}
      />

      {(lineage.unreachable.length > 0 || lineage.rootFqn !== entry?.fullyQualifiedName) && (
        <Box sx={{ border: '1px solid #E0E0E0', borderBottom: 'none', px: 1.5, py: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {lineage.rootFqn !== entry?.fullyQualifiedName && (
            <Alert
              severity="info"
              sx={{ py: 0, fontSize: '0.75rem' }}
              action={<Button size="small" onClick={() => handleSetRoot(entry.fullyQualifiedName || '')}>Back to {parseFqn(entry.fullyQualifiedName).displayName}</Button>}
            >
              Showing lineage from {parseFqn(lineage.rootFqn).displayName}
            </Alert>
          )}
          {lineage.unreachable.length > 0 && (
            <Alert severity="warning" sx={{ py: 0, fontSize: '0.75rem' }} data-testid="dl-unreachable">
              Some locations couldn't be searched, so results may be incomplete: {lineage.unreachable.join(', ')}
            </Alert>
          )}
        </Box>
      )}

      <Box sx={{ flex: 1, display: 'flex', gap: '10px', minHeight: 0 }}>
        <Box
          sx={{
            flex: '1 1 auto',
            minWidth: 0,
            border: '1px solid #E0E0E0',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {renderBody()}
        </Box>

        {selection && status === 'succeeded' && (
          <Box sx={{ width: { xs: '100%', sm: '23.75rem' }, flex: { xs: '1 1 auto', sm: '0 0 23.75rem' }, minHeight: 0 }}>
            {selection.kind === 'asset' ? (
              <AssetDetailsPanel
                key={selection.fqn}
                fqn={selection.fqn}
                graph={graph}
                entry={entry}
                idToken={idToken}
                onClose={() => setSelection(null)}
                onSetRoot={handleSetRoot}
              />
            ) : (
              <ProcessDetailsPanel
                processes={selection.processes}
                graph={graph}
                idToken={idToken}
                onClose={() => setSelection(null)}
                onSelectAsset={handleSelectAsset}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DataLineage;
