/**
 * @file AssetDetailsPanel.tsx
 * @description Side panel for a selected lineage asset. Shows lineage-specific
 * metadata (system, type, FQN, neighbour counts, first/last seen) with actions,
 * and - when the asset is catalogued - the existing SideDetailsPanel
 * (Asset Info / Aspects / Schema). Entry lookup uses local state, never the
 * shared Redux entry slice.
 */
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import { Close, ContentCopy, AccountTreeOutlined, OpenInNew } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SideDetailsPanel from '../../Lineage/SideDetailsPanel';
import { getEntryByFqn } from '../api/dataLineageApi';
import type { CatalogEntryLike, LineageGraphState } from '../types';
import { parseFqn } from '../utils/fqn';
import { neighbourCounts } from '../utils/graphBuilder';
import { fetchLineageEntry, pushToHistory } from '../../../features/entry/entrySlice';
import type { AppDispatch } from '../../../app/store';
import { useNotification } from '../../../contexts/NotificationContext';

export interface AssetDetailsPanelProps {
  fqn: string;
  graph: LineageGraphState;
  /** The view-details entry (used directly when fqn matches). */
  entry: CatalogEntryLike;
  idToken: string;
  onClose: () => void;
  onSetRoot: (fqn: string) => void;
}

const formatTime = (t?: string) => (t ? new Date(t).toLocaleString() : '—');

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ display: 'flex', gap: 1, py: '3px' }}>
    <Typography sx={{ fontSize: '0.75rem', color: '#5E5E5E', width: 110, flex: '0 0 auto' }}>{label}</Typography>
    <Typography component="div" sx={{ fontSize: '0.75rem', color: '#1F1F1F', wordBreak: 'break-all' }}>{value}</Typography>
  </Box>
);

const AssetDetailsPanel = ({ fqn, graph, entry, idToken, onClose, onSetRoot }: AssetDetailsPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { showSuccess } = useNotification();
  const parsed = useMemo(() => parseFqn(fqn), [fqn]);
  const counts = useMemo(() => neighbourCounts(graph, fqn), [graph, fqn]);
  const asset = graph.assets[fqn];
  const isCurrentEntry = fqn === entry?.fullyQualifiedName;

  const [catalogEntry, setCatalogEntry] = useState<CatalogEntryLike | null>(isCurrentEntry ? entry : null);
  const [status, setStatus] = useState<'loading' | 'succeeded' | 'failed'>(isCurrentEntry ? 'succeeded' : 'loading');

  useEffect(() => {
    if (isCurrentEntry) {
      setCatalogEntry(entry);
      setStatus('succeeded');
      return;
    }
    const controller = new AbortController();
    setCatalogEntry(null);
    setStatus('loading');
    getEntryByFqn(fqn, idToken, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data && data.name) {
          setCatalogEntry(data);
          setStatus('succeeded');
        } else {
          setStatus('failed');
        }
      })
      .catch((err) => {
        if (!axios.isCancel(err) && !controller.signal.aborted) setStatus('failed');
      });
    return () => controller.abort();
  }, [fqn, idToken, isCurrentEntry, entry]);

  // First/last seen across links touching this asset.
  const { firstSeen, lastSeen, locations } = useMemo(() => {
    let first: string | undefined;
    let last: string | undefined;
    const locs = new Set<string>();
    Object.values(graph.edges).forEach((e) => {
      if (e.source !== fqn && e.target !== fqn) return;
      if (e.link.startTime && (!first || e.link.startTime < first)) first = e.link.startTime;
      if (e.link.endTime && (!last || e.link.endTime > last)) last = e.link.endTime;
      if (e.link.location) locs.add(e.link.location);
    });
    if (asset?.location) locs.add(asset.location);
    return { firstSeen: first, lastSeen: last, locations: [...locs] };
  }, [graph.edges, fqn, asset?.location]);

  const openDetails = () => {
    dispatch(pushToHistory('dataLineage'));
    dispatch({ type: 'entry/setLineageToEntryCopy', payload: true });
    dispatch(fetchLineageEntry({ fqn, id_token: idToken }));
    navigate('/view-details');
  };

  const copyFqn = () => {
    navigator.clipboard?.writeText(fqn).then(() => showSuccess('Copied fully qualified name', 2000));
  };

  return (
    <Box
      data-testid="dl-asset-panel"
      sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #DADCE0', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 12px 8px', background: '#FAFAFA' }}>
        <img src={parsed.icon} alt={parsed.systemLabel} style={{ width: 24, height: 24 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 500, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {catalogEntry?.entrySource?.displayName || parsed.displayName}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#5E5E5E' }}>{parsed.systemLabel} · {parsed.assetType}</Typography>
        </Box>
        <IconButton size="small" aria-label="Close asset panel" onClick={onClose}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <Box sx={{ p: '8px 12px' }}>
          <InfoRow
            label="FQN"
            value={(
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                <span>{fqn}</span>
                <Tooltip title="Copy">
                  <IconButton size="small" aria-label="Copy FQN" onClick={copyFqn} sx={{ p: '2px' }}><ContentCopy sx={{ fontSize: 14 }} /></IconButton>
                </Tooltip>
              </Box>
            )}
          />
          {parsed.project && <InfoRow label="Project" value={parsed.project} />}
          {locations.length > 0 && <InfoRow label="Location" value={locations.join(', ')} />}
          <InfoRow label="Upstream" value={`${counts.upstream} asset(s) in graph`} />
          <InfoRow label="Downstream" value={`${counts.downstream} asset(s) in graph`} />
          <InfoRow label="First seen" value={formatTime(firstSeen)} />
          <InfoRow label="Last seen" value={formatTime(lastSeen)} />
          {asset?.columns?.length ? <InfoRow label="Columns in lineage" value={asset.columns.join(', ')} /> : null}

          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {!asset?.isRoot && (
              <Button size="small" variant="outlined" startIcon={<AccountTreeOutlined />} onClick={() => onSetRoot(fqn)}>
                Show lineage from here
              </Button>
            )}
            {!isCurrentEntry && status === 'succeeded' && (
              <Button size="small" variant="outlined" startIcon={<OpenInNew />} onClick={openDetails}>
                Open details
              </Button>
            )}
          </Box>
        </Box>
        <Divider />

        {status === 'failed' ? (
          <Box sx={{ p: 2 }} data-testid="dl-asset-not-catalogued">
            <Typography sx={{ fontSize: '0.8rem', color: '#5E5E5E' }}>
              This asset isn't in Knowledge Catalog, or you don't have access to its entry. Lineage info above comes from the Data Lineage API.
            </Typography>
          </Box>
        ) : (
          <SideDetailsPanel
            sidePanelData={catalogEntry}
            sidePanelDataStatus={status}
            css={{ width: '100%', maxWidth: '100%', border: 'none', borderRadius: 0, height: 'auto', overflow: 'visible' }}
          />
        )}
      </Box>
    </Box>
  );
};

export default AssetDetailsPanel;
