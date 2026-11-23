/**
 * @file ProcessDetailsPanel.tsx
 * @description Side panel for a lineage process (and its query runs).
 *  - Details: display name, resource name, origin, attributes
 *  - Query runs: runs.list (paginated); expanding a run loads its lineage
 *    events and, for BigQuery-originated processes, the BigQuery job (SQL +
 *    statistics)
 *  - Links: the links in the current graph created by this process
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Link as MuiLink,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, ContentCopy, ExpandMore, OpenInNew } from '@mui/icons-material';
import { Highlight, themes } from 'prism-react-renderer';
import axios from 'axios';
import type { BigQueryJobSummary, LineageEvent, LineageGraphState, LineageProcess, LineageRun, RunState } from '../types';
import { getBigQueryJob, getProcess, listLineageEvents, listRuns, toApiError } from '../api/dataLineageApi';
import {
  attributeToString,
  bigQueryJobConsoleUrl,
  getBigQueryJobRef,
  getProcessDisplayName,
  getProcessTypeInfo,
} from '../utils/processTypes';
import { formatFieldPath, parseFqn } from '../utils/fqn';

export interface ProcessDetailsPanelProps {
  processes: LineageProcess[];
  graph: LineageGraphState;
  idToken: string;
  onClose: () => void;
  onSelectAsset?: (fqn: string) => void;
}

const RUN_STATE_COLOR: Record<RunState, 'success' | 'error' | 'info' | 'warning' | 'default'> = {
  COMPLETED: 'success',
  FAILED: 'error',
  STARTED: 'info',
  ABORTED: 'warning',
  UNKNOWN: 'default',
};

const fmt = (t?: string) => (t ? new Date(t).toLocaleString() : '—');
const duration = (s?: string, e?: string) => {
  if (!s || !e) return '—';
  const ms = new Date(e).getTime() - new Date(s).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`;
};
const bytes = (v?: string) => {
  const n = Number(v);
  if (!v || Number.isNaN(n)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  let x = n;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(i ? 2 : 0)} ${units[i]}`;
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ display: 'flex', gap: 1, py: '3px' }}>
    <Typography sx={{ fontSize: '0.75rem', color: '#5E5E5E', width: 120, flex: '0 0 auto' }}>{label}</Typography>
    <Typography component="div" sx={{ fontSize: '0.75rem', color: '#1F1F1F', wordBreak: 'break-all' }}>{value}</Typography>
  </Box>
);

const SqlBlock = ({ sql }: { sql: string }) => (
  <Box sx={{ position: 'relative', border: '1px solid #E0E0E0', borderRadius: '6px', overflow: 'hidden' }}>
    <Tooltip title="Copy SQL">
      <IconButton
        size="small"
        aria-label="Copy SQL"
        onClick={() => navigator.clipboard?.writeText(sql)}
        sx={{ position: 'absolute', top: 4, right: 4, background: '#fff', zIndex: 1 }}
      >
        <ContentCopy sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
    <Highlight theme={themes.github} code={sql} language="sql">
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre data-testid="dl-sql" style={{ ...style, margin: 0, padding: '8px', fontSize: '11px', maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => <span key={key} {...getTokenProps({ token })} />)}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  </Box>
);

interface RunDetailsState {
  status: 'loading' | 'succeeded' | 'failed';
  events: LineageEvent[];
  job?: BigQueryJobSummary | null;
  jobError?: string;
}

const RunDetails = ({ process, run, idToken }: { process: LineageProcess; run: LineageRun; idToken: string }) => {
  const [state, setState] = useState<RunDetailsState>({ status: 'loading', events: [] });
  const jobRef = useMemo(() => getBigQueryJobRef(process, run), [process, run]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', events: [] });
    const eventsP = listLineageEvents(run.name, idToken, undefined, controller.signal);
    const jobP = jobRef ? getBigQueryJob(jobRef, idToken, controller.signal) : Promise.resolve(null);
    Promise.allSettled([eventsP, jobP]).then(([ev, job]) => {
      if (controller.signal.aborted) return;
      setState({
        status: ev.status === 'fulfilled' ? 'succeeded' : 'failed',
        events: ev.status === 'fulfilled' ? ev.value.lineageEvents : [],
        job: job.status === 'fulfilled' ? job.value : null,
        jobError: job.status === 'rejected' && !axios.isCancel(job.reason) ? toApiError(job.reason).message : undefined,
      });
    });
    return () => controller.abort();
  }, [run.name, idToken, jobRef]);

  if (state.status === 'loading') return <CircularProgress size={20} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {run.attributes && Object.keys(run.attributes).length > 0 && (
        <Box>
          {Object.entries(run.attributes).map(([k, v]) => <Row key={k} label={k} value={attributeToString(v)} />)}
        </Box>
      )}

      {jobRef && (
        <Box data-testid="dl-bq-job">
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, mb: 0.5 }}>BigQuery job</Typography>
          {state.job ? (
            <>
              <Row label="Job ID" value={state.job.jobId || jobRef.jobId} />
              <Row label="Statement" value={state.job.statementType || '—'} />
              <Row label="State" value={state.job.state || '—'} />
              <Row label="User" value={state.job.userEmail || '—'} />
              <Row label="Bytes processed" value={bytes(state.job.totalBytesProcessed)} />
              <Row label="Slot time" value={state.job.totalSlotMs ? `${(Number(state.job.totalSlotMs) / 1000).toFixed(1)} s` : '—'} />
              <Row label="Cache hit" value={state.job.cacheHit === undefined ? '—' : String(state.job.cacheHit)} />
              {state.job.destinationTable && (
                <Row label="Destination" value={`${state.job.destinationTable.projectId}.${state.job.destinationTable.datasetId}.${state.job.destinationTable.tableId}`} />
              )}
              {state.job.errorResult?.message && <Row label="Error" value={state.job.errorResult.message} />}
              {state.job.query && <Box sx={{ mt: 1 }}><SqlBlock sql={state.job.query} /></Box>}
            </>
          ) : (
            <Typography sx={{ fontSize: '0.75rem', color: '#5E5E5E' }}>
              {state.jobError || 'Job details unavailable.'}
            </Typography>
          )}
          <MuiLink href={bigQueryJobConsoleUrl(jobRef)} target="_blank" rel="noopener noreferrer" sx={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px', mt: 0.5 }}>
            Open in BigQuery <OpenInNew sx={{ fontSize: 12 }} />
          </MuiLink>
        </Box>
      )}

      <Box>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, mb: 0.5 }}>Lineage events ({state.events.length})</Typography>
        {state.status === 'failed' && <Typography sx={{ fontSize: '0.75rem', color: '#B3261E' }}>Failed to load lineage events.</Typography>}
        {state.events.map((ev) => (
          <Box key={ev.name} sx={{ border: '1px solid #EEE', borderRadius: '6px', p: '6px', mb: '6px' }}>
            <Typography sx={{ fontSize: '0.6875rem', color: '#5E5E5E' }}>{fmt(ev.startTime)} → {fmt(ev.endTime)}</Typography>
            {(ev.links || []).map((l, i) => {
              const sf = formatFieldPath(l.source.field);
              const tf = formatFieldPath(l.target.field);
              return (
                <Typography key={i} sx={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {parseFqn(l.source.fullyQualifiedName).displayName}{sf ? `.${sf}` : ''}
                  {' → '}
                  {parseFqn(l.target.fullyQualifiedName).displayName}{tf ? `.${tf}` : ''}
                </Typography>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const ProcessDetailsPanel = ({ processes, graph, idToken, onClose, onSelectAsset }: ProcessDetailsPanelProps) => {
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState(0);
  const [details, setDetails] = useState<LineageProcess | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');
  const [runs, setRuns] = useState<LineageRun[]>([]);
  const [runsToken, setRunsToken] = useState<string | undefined>();
  const [runsStatus, setRunsStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [expandedRun, setExpandedRun] = useState<string | false>(false);

  const selected = processes[Math.min(index, processes.length - 1)];
  const processName = selected?.name;

  useEffect(() => { setIndex(0); }, [processes]);

  useEffect(() => {
    if (!processName) return;
    const controller = new AbortController();
    setTab((t) => t);
    setDetails(selected?.origin ? selected : null);
    setDetailsStatus(selected?.origin ? 'succeeded' : 'loading');
    setRuns([]);
    setRunsToken(undefined);
    setRunsStatus('loading');
    setExpandedRun(false);

    if (!selected?.origin) {
      getProcess(processName, idToken, controller.signal)
        .then((p) => { if (!controller.signal.aborted) { setDetails(p); setDetailsStatus('succeeded'); } })
        .catch((err) => { if (!axios.isCancel(err) && !controller.signal.aborted) setDetailsStatus('failed'); });
    }
    listRuns(processName, idToken, undefined, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        setRuns(r.runs);
        setRunsToken(r.nextPageToken);
        setRunsStatus('succeeded');
      })
      .catch((err) => { if (!axios.isCancel(err) && !controller.signal.aborted) setRunsStatus('failed'); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processName, idToken]);

  const loadMoreRuns = () => {
    if (!processName || !runsToken) return;
    setRunsStatus('loading');
    listRuns(processName, idToken, runsToken)
      .then((r) => {
        setRuns((cur) => [...cur, ...r.runs]);
        setRunsToken(r.nextPageToken);
        setRunsStatus('succeeded');
      })
      .catch(() => setRunsStatus('failed'));
  };

  const process = details || selected;
  const info = getProcessTypeInfo(process);
  const processLinks = useMemo(
    () => Object.values(graph.edges).filter((e) => e.processes.some((p) => p.name === processName)),
    [graph.edges, processName],
  );

  if (!selected) return null;

  return (
    <Box
      data-testid="dl-process-panel"
      sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #DADCE0', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 12px 8px', background: '#FAFAFA' }}>
        <img src={info.icon} alt={info.label} style={{ width: 24, height: 24 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 500, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {getProcessDisplayName(process)}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#5E5E5E' }}>{info.label}</Typography>
        </Box>
        <IconButton size="small" aria-label="Close process panel" onClick={onClose}><Close fontSize="small" /></IconButton>
      </Box>

      {processes.length > 1 && (
        <Box sx={{ px: '12px', pt: 1 }}>
          <Select
            size="small"
            fullWidth
            value={Math.min(index, processes.length - 1)}
            onChange={(e) => setIndex(Number(e.target.value))}
            sx={{ fontSize: '0.8rem' }}
            inputProps={{ 'aria-label': 'Select process' }}
          >
            {processes.map((p, i) => <MenuItem key={p.name} value={i} sx={{ fontSize: '0.8rem' }}>{getProcessDisplayName(p)}</MenuItem>)}
          </Select>
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontSize: '0.8rem' } }}>
        <Tab label="Details" />
        <Tab label="Query runs" />
        <Tab label={`Links (${processLinks.length})`} />
      </Tabs>

      <Box sx={{ overflowY: 'auto', flex: 1, p: '8px 12px' }}>
        {tab === 0 && (
          <Box>
            {detailsStatus === 'loading' && <CircularProgress size={20} />}
            {detailsStatus === 'failed' && <Typography sx={{ fontSize: '0.75rem', color: '#B3261E' }}>Failed to load process details.</Typography>}
            <Row label="Display name" value={process?.displayName || '—'} />
            <Row label="Resource" value={process?.name} />
            <Row label="Origin type" value={process?.origin?.sourceType || '—'} />
            <Row label="Origin" value={process?.origin?.name || '—'} />
            {process?.attributes && Object.keys(process.attributes).length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>Attributes</Typography>
                {Object.entries(process.attributes).map(([k, v]) => <Row key={k} label={k} value={attributeToString(v)} />)}
              </Box>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box data-testid="dl-runs">
            {runsStatus === 'failed' && <Typography sx={{ fontSize: '0.75rem', color: '#B3261E' }}>Failed to load runs.</Typography>}
            {runsStatus === 'succeeded' && runs.length === 0 && (
              <Typography sx={{ fontSize: '0.75rem', color: '#5E5E5E' }}>No runs recorded for this process.</Typography>
            )}
            {runs.map((run) => (
              <Accordion
                key={run.name}
                disableGutters
                expanded={expandedRun === run.name}
                onChange={(_, open) => setExpandedRun(open ? run.name : false)}
                sx={{ boxShadow: 'none', border: '1px solid #EEE', mb: '6px', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: '6px', alignItems: 'center', gap: 1 } }}>
                  <Chip size="small" label={run.state || 'UNKNOWN'} color={RUN_STATE_COLOR[run.state || 'UNKNOWN']} variant="outlined" sx={{ fontSize: '0.6875rem', height: 20 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.75rem' }}>{fmt(run.startTime)}</Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#5E5E5E' }}>
                      {run.displayName || run.name.split('/').pop()} · {duration(run.startTime, run.endTime)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {expandedRun === run.name && <RunDetails process={process} run={run} idToken={idToken} />}
                </AccordionDetails>
              </Accordion>
            ))}
            {runsStatus === 'loading' && <CircularProgress size={20} />}
            {runsToken && runsStatus !== 'loading' && (
              <Button size="small" onClick={loadMoreRuns}>Load more runs</Button>
            )}
          </Box>
        )}

        {tab === 2 && (
          <Box>
            {processLinks.map((e) => (
              <Box key={e.id} sx={{ py: '4px', borderBottom: '1px solid #F1F1F1' }}>
                <Typography sx={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  <MuiLink component="button" onClick={() => onSelectAsset?.(e.source)} sx={{ fontSize: '0.75rem' }}>
                    {parseFqn(e.source).displayName}{e.sourceField ? `.${e.sourceField}` : ''}
                  </MuiLink>
                  {' → '}
                  <MuiLink component="button" onClick={() => onSelectAsset?.(e.target)} sx={{ fontSize: '0.75rem' }}>
                    {parseFqn(e.target).displayName}{e.targetField ? `.${e.targetField}` : ''}
                  </MuiLink>
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProcessDetailsPanel;
