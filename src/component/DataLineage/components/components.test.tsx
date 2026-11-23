import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockSetCenter = vi.fn();
const mockFitView = vi.fn();
vi.mock('@xyflow/react', async () => {
  const React = await import('react');
  return {
    ReactFlow: ({ nodes, edges, nodeTypes, onEdgeClick, onPaneClick, children }: any) => (
      <div data-testid="rf">
        {nodes.map((n: any) => {
          const C = nodeTypes[n.type];
          return <C key={n.id} id={n.id} data={n.data} />;
        })}
        {edges.map((e: any) => (
          <button
            key={e.id}
            data-testid={`edge-${e.id}`}
            data-dashed={e.style?.strokeDasharray ? 'yes' : 'no'}
            data-opacity={String(e.style?.opacity)}
            onClick={(ev) => onEdgeClick?.(ev, e)}
          />
        ))}
        <button data-testid="pane" onClick={() => onPaneClick?.()} />
        {children}
      </div>
    ),
    ReactFlowProvider: ({ children }: any) => <>{children}</>,
    useNodesState: (init: any) => { const [s, set] = React.useState(init); return [s, set, vi.fn()]; },
    useEdgesState: (init: any) => { const [s, set] = React.useState(init); return [s, set, vi.fn()]; },
    useReactFlow: () => ({ fitView: mockFitView, setCenter: mockSetCenter }),
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
    Background: () => null,
    BackgroundVariant: { Dots: 'dots' },
    MiniMap: () => null,
    Controls: () => null,
    Panel: ({ children }: any) => <div>{children}</div>,
  };
});

vi.mock('@mui/x-data-grid', () => ({
  DataGrid: ({ rows, columns, onCellClick }: any) => (
    <table data-testid="grid">
      <thead><tr>{columns.map((c: any) => <th key={c.field}>{c.headerName}</th>)}</tr></thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.id}>
            {columns.map((c: any) => (
              <td key={c.field} onClick={() => onCellClick?.({ field: c.field, row: r })}>{String(r[c.field] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const mockGetProcess = vi.fn();
const mockListRuns = vi.fn();
const mockListEvents = vi.fn();
const mockGetJob = vi.fn();
const mockGetEntry = vi.fn();
vi.mock('../api/dataLineageApi', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getProcess: (...a: any[]) => mockGetProcess(...a),
    listRuns: (...a: any[]) => mockListRuns(...a),
    listLineageEvents: (...a: any[]) => mockListEvents(...a),
    getBigQueryJob: (...a: any[]) => mockGetJob(...a),
    getEntryByFqn: (...a: any[]) => mockGetEntry(...a),
  };
});

const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({ useDispatch: () => mockDispatch }));
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('../../../features/entry/entrySlice', () => ({
  fetchLineageEntry: (p: any) => ({ type: 'fetchLineageEntry', payload: p }),
  pushToHistory: (p: any) => ({ type: 'pushToHistory', payload: p }),
}));
vi.mock('../../../contexts/NotificationContext', () => ({
  useNotification: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));
vi.mock('../../Lineage/SideDetailsPanel', () => ({
  default: ({ sidePanelData, sidePanelDataStatus }: any) => (
    <div data-testid="side-details">{sidePanelDataStatus}:{sidePanelData?.name}</div>
  ),
}));

import DataLineageGraph from './DataLineageGraph';
import ProcessDetailsPanel from './ProcessDetailsPanel';
import AssetDetailsPanel from './AssetDetailsPanel';
import DataLineageListView from './DataLineageListView';
import { createInitialState, mergeLinks } from '../utils/graphBuilder';
import type { LineageGraphState, LineageLink } from '../types';

const ROOT = 'bigquery:p.d.root';
const UP = 'gcs:bucket.`raw/file.csv`';
const DOWN = 'looker:dashboard:inst.f.42';
const P1 = 'projects/p/locations/us/processes/q1';

const link = (s: string, t: string, extra: Partial<LineageLink> = {}): LineageLink => ({
  source: { fullyQualifiedName: s }, target: { fullyQualifiedName: t }, depth: 1, location: 'us', ...extra,
});

const buildGraph = (): LineageGraphState => {
  let g = createInitialState(ROOT, 'us');
  g = mergeLinks(g, [link(UP, ROOT, { processes: [{ process: { name: P1, displayName: 'Load file', origin: { sourceType: 'BIGQUERY' } } }], startTime: '2024-01-01T00:00:00Z', endTime: '2024-02-01T00:00:00Z' })], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
  g = mergeLinks(g, [link(ROOT, DOWN, { dependencyInfo: [{ dependencyType: 'OTHER' }] })], { rootFqns: [ROOT], direction: 'DOWNSTREAM', maxDepth: 1 });
  return g;
};

const graphProps = () => ({
  graph: buildGraph(),
  columnMode: false,
  showProcesses: true,
  selectedColumns: [],
  selectedId: null as string | null,
  expanding: {},
  focusRequest: null,
  onSelectAsset: vi.fn(),
  onSelectProcess: vi.fn(),
  onExpand: vi.fn(),
  onCollapse: vi.fn(),
  onClearSelection: vi.fn(),
});

// ---------------------------------------------------------------------------
describe('DataLineageGraph + nodes', () => {
  it('renders asset nodes with system-specific labels and a process node', () => {
    render(<DataLineageGraph {...graphProps()} />);
    expect(screen.getByTestId(`dl-asset-node-${ROOT}`)).toBeInTheDocument();
    expect(screen.getByText('root')).toBeInTheDocument();
    expect(screen.getByText('ROOT')).toBeInTheDocument();
    expect(screen.getByText('file.csv')).toBeInTheDocument();
    expect(screen.getByText(/Cloud Storage · Path/)).toBeInTheDocument();
    expect(screen.getByText(/Looker · Dashboard/)).toBeInTheDocument();
    expect(screen.getByTestId(`dl-process-node-${P1}`)).toBeInTheDocument();
    expect(screen.getByTestId('dl-legend')).toBeInTheDocument();
  });

  it('invokes select / expand / collapse callbacks', () => {
    const props = graphProps();
    render(<DataLineageGraph {...props} />);
    fireEvent.click(screen.getByTestId(`dl-asset-node-${UP}`));
    expect(props.onSelectAsset).toHaveBeenCalledWith(UP);

    // Upstream node: upstream not yet expanded -> expand
    fireEvent.click(screen.getAllByLabelText('Expand upstream')[0]);
    expect(props.onExpand).toHaveBeenCalledWith(UP, 'UPSTREAM');

    // Root has both directions expanded -> collapse
    fireEvent.click(screen.getAllByLabelText('Collapse downstream')[0]);
    expect(props.onCollapse).toHaveBeenCalledWith(ROOT, 'DOWNSTREAM');

    fireEvent.click(screen.getByTestId(`dl-process-node-${P1}`));
    expect(props.onSelectProcess).toHaveBeenCalledWith([expect.objectContaining({ name: P1 })], `process:${P1}`);

    fireEvent.click(screen.getByTestId('pane'));
    expect(props.onClearSelection).toHaveBeenCalled();
  });

  it('shows a spinner while expanding', () => {
    render(<DataLineageGraph {...graphProps()} expanding={{ [UP]: 'UPSTREAM' }} />);
    expect(screen.getByTestId('expanding-UPSTREAM')).toBeInTheDocument();
  });

  it('styles transformation edges dashed and dims edges off the selected path', () => {
    render(<DataLineageGraph {...graphProps()} selectedId={DOWN} />);
    const downEdge = screen.getByTestId(`edge-${ROOT}=>${DOWN}`);
    expect(downEdge.dataset.dashed).toBe('yes');
    expect(downEdge.dataset.opacity).toBe('1');
    // The upstream path (UP -> process -> ROOT) is an ancestor of DOWN, so it stays highlighted.
    expect(screen.getByTestId(`edge-${UP}=>process:${P1}`).dataset.opacity).toBe('1');
  });

  it('opens processes from edge clicks when processes are hidden', () => {
    const props = graphProps();
    render(<DataLineageGraph {...props} showProcesses={false} />);
    fireEvent.click(screen.getByTestId(`edge-${UP}=>${ROOT}`));
    expect(props.onSelectProcess).toHaveBeenCalledWith([expect.objectContaining({ name: P1 })], `${UP}=>${ROOT}`);
  });

  it('renders column rows in column mode', () => {
    let g = createInitialState(ROOT);
    g = mergeLinks(g, [link(UP, ROOT, { source: { fullyQualifiedName: UP, field: ['id'] }, target: { fullyQualifiedName: ROOT, field: ['user_id'] } })], { rootFqns: [ROOT], direction: 'UPSTREAM', maxDepth: 1 });
    render(<DataLineageGraph {...graphProps()} graph={g} columnMode selectedColumns={['user_id']} />);
    expect(screen.getByText('user_id')).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
  });

  it('centres on focus requests', async () => {
    const { rerender } = render(<DataLineageGraph {...graphProps()} />);
    rerender(<DataLineageGraph {...graphProps()} focusRequest={{ id: DOWN, nonce: 1 }} />);
    await waitFor(() => expect(mockSetCenter).toHaveBeenCalled());
  });
});

// ---------------------------------------------------------------------------
describe('ProcessDetailsPanel', () => {
  beforeEach(() => {
    [mockGetProcess, mockListRuns, mockListEvents, mockGetJob].forEach((m) => m.mockReset());
  });

  const bqProcess = {
    name: P1,
    displayName: 'Load file',
    origin: { sourceType: 'BIGQUERY' as const, name: 'projects/p/locations/US' },
    attributes: { bigquery_job_id: 'job_1' },
  };

  it('shows details, runs (with pagination), lineage events and BigQuery SQL', async () => {
    mockListRuns
      .mockResolvedValueOnce({ runs: [{ name: `${P1}/runs/r1`, state: 'COMPLETED', startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T00:00:05Z' }], nextPageToken: 'n' })
      .mockResolvedValueOnce({ runs: [{ name: `${P1}/runs/r2`, state: 'FAILED' }], nextPageToken: undefined });
    mockListEvents.mockResolvedValue({ lineageEvents: [{ name: 'ev1', links: [{ source: { fullyQualifiedName: UP }, target: { fullyQualifiedName: ROOT, field: ['id'] } }] }] });
    mockGetJob.mockResolvedValue({ jobId: 'job_1', query: 'SELECT 1 FROM t', statementType: 'INSERT', totalBytesProcessed: '2048', state: 'DONE' });

    render(<ProcessDetailsPanel processes={[bqProcess]} graph={buildGraph()} idToken="tok" onClose={vi.fn()} />);
    expect(screen.getAllByText('Load file').length).toBeGreaterThan(0);
    expect(screen.getByText('BigQuery job')).toBeInTheDocument();
    expect(screen.getByText('job_1')).toBeInTheDocument(); // attribute
    expect(mockGetProcess).not.toHaveBeenCalled(); // already hydrated

    fireEvent.click(screen.getByText('Query runs'));
    await waitFor(() => expect(screen.getByText('COMPLETED')).toBeInTheDocument());
    expect(screen.getByText(/5.0 s/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Load more runs'));
    await waitFor(() => expect(screen.getByText('FAILED')).toBeInTheDocument());
    expect(mockListRuns).toHaveBeenLastCalledWith(P1, 'tok', 'n');

    fireEvent.click(screen.getByText('COMPLETED'));
    await waitFor(() => expect(screen.getByTestId('dl-sql')).toHaveTextContent('SELECT 1 FROM t'));
    expect(mockGetJob).toHaveBeenCalledWith({ projectId: 'p', jobId: 'job_1', location: 'US' }, 'tok', expect.anything());
    expect(screen.getByText('2.00 KB')).toBeInTheDocument();
    expect(screen.getByText('Lineage events (1)')).toBeInTheDocument();
    expect(screen.getByText(/file\.csv → root\.id/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Links (1)'));
    expect(screen.getByText('file.csv')).toBeInTheDocument();
  });

  it('fetches details for non-hydrated processes and skips BigQuery for other origins', async () => {
    mockGetProcess.mockResolvedValue({ name: P1, displayName: 'Dataflow pipeline', origin: { sourceType: 'DATAFLOW', name: 'projects/p/locations/us/jobs/1' } });
    mockListRuns.mockResolvedValue({ runs: [{ name: `${P1}/runs/r1`, state: 'STARTED' }] });
    mockListEvents.mockResolvedValue({ lineageEvents: [] });
    render(<ProcessDetailsPanel processes={[{ name: P1 }]} graph={buildGraph()} idToken="tok" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText('Dataflow pipeline').length).toBeGreaterThan(0));
    expect(screen.getByText('Dataflow job')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Query runs'));
    await waitFor(() => expect(screen.getByText('STARTED')).toBeInTheDocument());
    fireEvent.click(screen.getByText('STARTED'));
    await waitFor(() => expect(screen.getByText('Lineage events (0)')).toBeInTheDocument());
    expect(mockGetJob).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dl-bq-job')).not.toBeInTheDocument();
  });

  it('shows empty runs and a selector for multiple processes', async () => {
    mockListRuns.mockResolvedValue({ runs: [] });
    const onClose = vi.fn();
    render(
      <ProcessDetailsPanel
        processes={[bqProcess, { ...bqProcess, name: `${P1}x`, displayName: 'Second' }]}
        graph={buildGraph()}
        idToken="tok"
        onClose={onClose}
      />,
    );
    expect(screen.getByLabelText('Select process')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Query runs'));
    await waitFor(() => expect(screen.getByText('No runs recorded for this process.')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Close process panel'));
    expect(onClose).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe('AssetDetailsPanel', () => {
  beforeEach(() => { mockGetEntry.mockReset(); mockDispatch.mockReset(); mockNavigate.mockReset(); });
  const entry = { name: 'projects/p/locations/us/entryGroups/@bigquery/entries/root', fullyQualifiedName: ROOT };

  it('uses the current entry without fetching for the root', () => {
    render(<AssetDetailsPanel fqn={ROOT} graph={buildGraph()} entry={entry} idToken="tok" onClose={vi.fn()} onSetRoot={vi.fn()} />);
    expect(mockGetEntry).not.toHaveBeenCalled();
    expect(screen.getByTestId('side-details')).toHaveTextContent(`succeeded:${entry.name}`);
    expect(screen.getAllByText('1 asset(s) in graph')).toHaveLength(2);
    expect(screen.queryByText('Show lineage from here')).not.toBeInTheDocument();
  });

  it('fetches catalog entry for other assets and supports actions', async () => {
    mockGetEntry.mockResolvedValue({ name: 'projects/p/locations/us/entryGroups/g/entries/up', entrySource: { displayName: 'Raw file' } });
    const onSetRoot = vi.fn();
    render(<AssetDetailsPanel fqn={UP} graph={buildGraph()} entry={entry} idToken="tok" onClose={vi.fn()} onSetRoot={onSetRoot} />);
    await waitFor(() => expect(screen.getByText('Raw file')).toBeInTheDocument());
    expect(screen.getByText('Cloud Storage · Path')).toBeInTheDocument();
    expect(screen.getByText(new Date('2024-01-01T00:00:00Z').toLocaleString())).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show lineage from here'));
    expect(onSetRoot).toHaveBeenCalledWith(UP);

    fireEvent.click(screen.getByText('Open details'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pushToHistory', payload: 'dataLineage' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'fetchLineageEntry', payload: { fqn: UP, id_token: 'tok' } });
    expect(mockNavigate).toHaveBeenCalledWith('/view-details');
  });

  it('shows a fallback for assets not in the catalog', async () => {
    mockGetEntry.mockRejectedValue(new Error('500'));
    render(<AssetDetailsPanel fqn={DOWN} graph={buildGraph()} entry={entry} idToken="tok" onClose={vi.fn()} onSetRoot={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('dl-asset-not-catalogued')).toBeInTheDocument());
    expect(screen.queryByText('Open details')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe('DataLineageListView', () => {
  it('renders links as rows and selects assets on name click', () => {
    const onSelect = vi.fn();
    render(<DataLineageListView graph={buildGraph()} columnMode={false} onSelectAsset={onSelect} />);
    expect(screen.getByText('file.csv')).toBeInTheDocument();
    expect(screen.getByText('Cloud Storage')).toBeInTheDocument();
    expect(screen.getByText('Load file')).toBeInTheDocument();
    expect(screen.queryByText('Source column')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('file.csv'));
    expect(onSelect).toHaveBeenCalledWith(UP);
  });

  it('adds column fields in column mode', () => {
    render(<DataLineageListView graph={buildGraph()} columnMode onSelectAsset={vi.fn()} />);
    expect(screen.getByText('Source column')).toBeInTheDocument();
    expect(screen.getByText('Dependency')).toBeInTheDocument();
  });
});
