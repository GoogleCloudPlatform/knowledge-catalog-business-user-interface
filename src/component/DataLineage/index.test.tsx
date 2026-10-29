import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('@xyflow/react', async () => {
  const React = await import('react');
  return {
    ReactFlow: ({ nodes, edges, nodeTypes, onEdgeClick, children }: any) => (
      <div data-testid="rf">
        {nodes.map((n: any) => { const C = nodeTypes[n.type]; return <C key={n.id} id={n.id} data={n.data} />; })}
        {edges.map((e: any) => <button key={e.id} data-testid={`edge-${e.id}`} onClick={(ev) => onEdgeClick?.(ev, e)} />)}
        {children}
      </div>
    ),
    ReactFlowProvider: ({ children }: any) => <>{children}</>,
    useNodesState: (init: any) => { const [s, set] = React.useState(init); return [s, set, vi.fn()]; },
    useEdgesState: (init: any) => { const [s, set] = React.useState(init); return [s, set, vi.fn()]; },
    useReactFlow: () => ({ fitView: vi.fn(), setCenter: vi.fn() }),
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
  DataGrid: ({ rows }: any) => <div data-testid="grid">{rows.map((r: any) => <div key={r.id}>{r.sourceName}→{r.targetName}</div>)}</div>,
}));

const mockSearchLineage = vi.fn();
const mockGetProcess = vi.fn();
const mockListRuns = vi.fn();
const mockGetEntry = vi.fn();
vi.mock('./api/dataLineageApi', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    searchLineage: (...a: any[]) => mockSearchLineage(...a),
    getProcess: (...a: any[]) => mockGetProcess(...a),
    listRuns: (...a: any[]) => mockListRuns(...a),
    getEntryByFqn: (...a: any[]) => mockGetEntry(...a),
  };
});

vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { token: 'tok' } }) }));
const mockToggleFullscreen = vi.fn();
vi.mock('../../hooks/useFullScreenStatus', () => ({
  default: () => ({ elementRef: { current: null }, isFullscreen: false, toggleFullscreen: mockToggleFullscreen }),
}));
const mockShowError = vi.fn();
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ showSuccess: vi.fn(), showError: mockShowError }),
}));
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../Lineage/SideDetailsPanel', () => ({
  default: ({ sidePanelData }: any) => <div data-testid="side-details">{sidePanelData?.name}</div>,
}));

import DataLineage from './index';
import { getSchemaColumns } from './utils/schema';

const ROOT = 'bigquery:p.d.orders';
const UP = 'bigquery:p.d.raw_orders';
const DOWN = 'looker:dashboard:inst.f.7';
const P1 = 'projects/p/locations/us/processes/q1';

const schemaField = (name: string, nested?: any[]) => ({
  structValue: { fields: { name: { stringValue: name }, ...(nested ? { fields: { listValue: { values: nested } } } : {}) } },
});
const entry = {
  name: 'projects/p/locations/us/entryGroups/@bigquery/entries/bigquery.googleapis.com/projects/p/datasets/d/tables/orders',
  fullyQualifiedName: ROOT,
  entryType: 'projects/655216118709/locations/global/entryTypes/bigquery-table',
  aspects: {
    '655216118709.global.schema': {
      data: { fields: { fields: { listValue: { values: [schemaField('order_id'), schemaField('address', [schemaField('zip')])] } } } },
    },
  },
};

const defaultSearch = (params: any) => Promise.resolve({
  links: params.direction === 'UPSTREAM'
    ? [{ source: { fullyQualifiedName: UP }, target: { fullyQualifiedName: ROOT }, depth: 1, processes: [{ process: { name: P1 } }] }]
    : [{ source: { fullyQualifiedName: ROOT }, target: { fullyQualifiedName: DOWN }, depth: 1 }],
  unreachable: [],
  truncated: false,
});

describe('getSchemaColumns', () => {
  it('flattens nested schema fields', () => {
    expect(getSchemaColumns(entry)).toEqual(['order_id', 'address', 'address.zip']);
    expect(getSchemaColumns({})).toEqual([]);
  });
});

describe('DataLineage tab', () => {
  beforeEach(() => {
    [mockSearchLineage, mockGetProcess, mockListRuns, mockGetEntry, mockShowError].forEach((m) => m.mockReset());
    mockSearchLineage.mockImplementation(defaultSearch);
    mockGetProcess.mockImplementation((name: string) => Promise.resolve({ name, displayName: 'Nightly ETL', origin: { sourceType: 'BIGQUERY' } }));
    mockListRuns.mockResolvedValue({ runs: [] });
    mockGetEntry.mockResolvedValue({ name: 'projects/p/locations/us/entryGroups/x/entries/raw' });
  });

  it('loads and renders the lineage graph', async () => {
    render(<DataLineage entry={entry} />);
    expect(screen.getByTestId('dl-loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId(`dl-asset-node-${UP}`)).toBeInTheDocument());
    expect(screen.getByTestId(`dl-asset-node-${DOWN}`)).toBeInTheDocument();
    expect(screen.getByTestId(`dl-process-node-${P1}`)).toBeInTheDocument();
    expect(mockSearchLineage).toHaveBeenCalledTimes(2);
  });

  it('opens the asset panel and the process panel', async () => {
    render(<DataLineage entry={entry} />);
    await waitFor(() => screen.getByTestId(`dl-asset-node-${UP}`));
    fireEvent.click(screen.getByTestId(`dl-asset-node-${UP}`));
    await waitFor(() => expect(screen.getByTestId('dl-asset-panel')).toBeInTheDocument());
    expect(mockGetEntry).toHaveBeenCalledWith(UP, 'tok', expect.anything());

    fireEvent.click(screen.getByTestId(`dl-process-node-${P1}`));
    await waitFor(() => expect(screen.getByTestId('dl-process-panel')).toBeInTheDocument());
    expect(screen.queryByTestId('dl-asset-panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close process panel'));
    expect(screen.queryByTestId('dl-process-panel')).not.toBeInTheDocument();
  });

  it('re-roots from the asset panel and returns to the entry', async () => {
    render(<DataLineage entry={entry} />);
    await waitFor(() => screen.getByTestId(`dl-asset-node-${UP}`));
    fireEvent.click(screen.getByTestId(`dl-asset-node-${UP}`));
    await waitFor(() => screen.getByText('Show lineage from here'));
    mockSearchLineage.mockClear();
    fireEvent.click(screen.getByText('Show lineage from here'));
    await waitFor(() => expect(screen.getByText(/Showing lineage from raw_orders/)).toBeInTheDocument());
    expect(mockSearchLineage.mock.calls[0][0].entities).toEqual([{ fullyQualifiedName: UP }]);
    fireEvent.click(screen.getByText('Back to orders'));
    await waitFor(() => expect(screen.queryByText(/Showing lineage from/)).not.toBeInTheDocument());
  });

  it('switches to list view', async () => {
    render(<DataLineage entry={entry} />);
    await waitFor(() => screen.getByTestId(`dl-asset-node-${UP}`));
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByTestId('grid')).toHaveTextContent('raw_orders→orders');
    expect(screen.getByTestId('grid')).toHaveTextContent('orders→7');
  });

  it('changes direction and depth', async () => {
    render(<DataLineage entry={entry} />);
    await waitFor(() => screen.getByTestId(`dl-asset-node-${UP}`));
    mockSearchLineage.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Upstream' }));
    await waitFor(() => expect(mockSearchLineage).toHaveBeenCalledTimes(1));
    expect(mockSearchLineage.mock.calls[0][0].direction).toBe('UPSTREAM');
    await waitFor(() => expect(screen.queryByTestId(`dl-asset-node-${DOWN}`)).not.toBeInTheDocument());

    mockSearchLineage.mockClear();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Depth' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('3 hops'));
    await waitFor(() => expect(mockSearchLineage).toHaveBeenCalled());
    expect(mockSearchLineage.mock.calls[0][0].maxDepth).toBe(3);
  });

  it('switches to column level and prompts for columns', async () => {
    render(<DataLineage entry={entry} />);
    await waitFor(() => screen.getByTestId(`dl-asset-node-${UP}`));
    mockSearchLineage.mockClear();
    mockSearchLineage.mockResolvedValue({ links: [], unreachable: [], truncated: false });
    fireEvent.click(screen.getByRole('button', { name: 'Column' }));
    await waitFor(() => expect(mockSearchLineage).toHaveBeenCalled());
    expect(mockSearchLineage.mock.calls[0][0].entities).toEqual([{ fullyQualifiedName: ROOT, field: ['*'] }]);
    await waitFor(() => expect(screen.getByTestId('dl-empty')).toHaveTextContent('Select one or more columns'));
    expect(screen.getByLabelText('Columns')).toBeInTheDocument();
  });

  it('shows errors with retry', async () => {
    mockSearchLineage.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: { details: 'SERVICE_DISABLED' } }, message: 'x' });
    render(<DataLineage entry={entry} />);
    await waitFor(() => expect(screen.getByTestId('dl-error')).toBeInTheDocument());
    expect(screen.getByText(/not enabled/)).toBeInTheDocument();
    mockSearchLineage.mockImplementation(defaultSearch);
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByTestId(`dl-asset-node-${UP}`)).toBeInTheDocument());
  });

  it('shows the empty state, unreachable warnings and truncation', async () => {
    mockSearchLineage.mockResolvedValue({ links: [], unreachable: ['projects/1/locations/eu'], truncated: true });
    render(<DataLineage entry={entry} />);
    await waitFor(() => expect(screen.getByTestId('dl-empty')).toBeInTheDocument());
    expect(screen.getByTestId('dl-unreachable')).toHaveTextContent('projects/1/locations/eu');
    expect(screen.getByText('Results truncated')).toBeInTheDocument();
  });

  it('applies filters from the filter popover', async () => {
    render(<DataLineage entry={entry} />);
    await waitFor(() => screen.getByTestId(`dl-asset-node-${UP}`));
    fireEvent.click(screen.getByLabelText('Filters'));
    const panel = await screen.findByTestId('dl-filters');
    fireEvent.change(within(panel).getByLabelText('Projects (comma separated)'), { target: { value: 'proj-a, projects/proj-b' } });
    fireEvent.change(within(panel).getByLabelText('Additional locations'), { target: { value: 'eu' } });
    fireEvent.click(within(panel).getByLabelText('Exact copy'));
    mockSearchLineage.mockClear();
    fireEvent.click(within(panel).getByText('Apply'));
    await waitFor(() => expect(mockSearchLineage).toHaveBeenCalled());
    expect(mockSearchLineage.mock.calls[0][0].filters).toMatchObject({
      projects: ['projects/proj-a', 'projects/proj-b'],
      locations: ['eu'],
      dependencyTypes: ['EXACT_COPY'],
    });
  });

  it('notifies on expansion errors without dropping the graph', async () => {
    render(<DataLineage entry={entry} />);
    await waitFor(() => screen.getByTestId(`dl-asset-node-${UP}`));
    mockSearchLineage.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: { details: 'boom' } }, message: 'x' });
    fireEvent.click(screen.getAllByLabelText('Expand upstream')[0]);
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith('boom', 4000));
    expect(screen.getByTestId(`dl-asset-node-${UP}`)).toBeInTheDocument();
  });

  it('toggles fullscreen', async () => {
    render(<DataLineage entry={entry} />);
    fireEvent.click(screen.getByLabelText('Toggle fullscreen'));
    expect(mockToggleFullscreen).toHaveBeenCalled();
  });
});
