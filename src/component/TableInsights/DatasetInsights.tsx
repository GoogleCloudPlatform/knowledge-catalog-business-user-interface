import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Tooltip, Divider } from '@mui/material';
import { AssistantOutlined, HelpOutline, HubOutlined, AutoFixHighOutlined, Check } from '@mui/icons-material';
import type { AppDispatch } from '../../app/store';
import {
  fetchInsights,
  selectInsightsData,
  selectInsightsStatus,
} from '../../features/tableInsights/tableInsightsSlice';
import { useAuth } from '../../auth/AuthProvider';
import { getMostRecentSuccessfulDatasetJob } from '../../utils/insightsUtils';
import TableInsightsSkeleton from './TableInsightsSkeleton';
import InsightQueryCard from '../Common/InsightQueryCard';
import type { InsightQuery } from '../Common/InsightQueryCard';
import RelationshipsGraph from './RelationshipsGraph/RelationshipsGraph';
import RelationshipsTable from './RelationshipsGraph/RelationshipsTable';
import type { SchemaRelationship } from './RelationshipsGraph/utils';
import type { InsightJob } from '../../mocks/insightsMockData';
import './TableInsights.css';

interface DatasetInsightsProps {
  entry: any;
  scanName: string | null;
}

// Shared section card chrome (white rounded card with an icon + title header).
const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  tooltip?: string;
  children: React.ReactNode;
  bodyPadding?: string;
  headerRight?: React.ReactNode;
}> = ({ icon, title, tooltip, children, bodyPadding, headerRight }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: '24px',
      gap: '16px',
      width: '100%',
      boxSizing: 'border-box',
      background: '#FFFFFF',
      border: '1px solid #ECEEF4',
      borderRadius: '12px',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Box sx={{ width: '32px', height: '32px', background: '#EAEEFA', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 600, fontSize: '18px', color: '#3D4151' }}>
          {title}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip}>
            <HelpOutline sx={{ fontSize: 16, color: '#575757' }} />
          </Tooltip>
        )}
      </Box>
      {headerRight}
    </Box>
    <Divider sx={{ width: '100%', borderColor: '#E8EBEF', margin: '-4px 0 0 0' }} />
    <Box sx={{ width: '100%', padding: bodyPadding }}>{children}</Box>
  </Box>
);

// Segmented pill toggle mirroring the Table-Info card (Schema | Sample Data).
const ViewToggle: React.FC<{ value: 'graph' | 'table'; onChange: (v: 'graph' | 'table') => void }> = ({ value, onChange }) => {
  const pillSx = (active: boolean, side: 'left' | 'right') => ({
    fontSize: '14px',
    background: active ? '#C2E7FF' : 'transparent',
    color: active ? '#004A77' : '#1F1F1F',
    padding: '6px 12px',
    borderRadius: side === 'left' ? '100px 0px 0px 100px' : '0px 100px 100px 0px',
    border: '1px solid #575757',
    borderRight: side === 'left' ? 'none' : '1px solid #575757',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: '"Google Sans", sans-serif',
    fontWeight: 500,
    lineHeight: '20px',
    height: '32px',
    boxSizing: 'border-box' as const,
  });
  return (
    <Box sx={{ display: 'flex', flexShrink: 0 }}>
      <Box sx={pillSx(value === 'graph', 'left')} onClick={() => onChange('graph')}>
        {value === 'graph' && <Check sx={{ fontSize: '18px', color: '#004A77' }} />}
        Graph
      </Box>
      <Box sx={pillSx(value === 'table', 'right')} onClick={() => onChange('table')}>
        {value === 'table' && <Check sx={{ fontSize: '18px', color: '#004A77' }} />}
        Table
      </Box>
    </Box>
  );
};

const DatasetInsights: React.FC<DatasetInsightsProps> = ({ entry, scanName }) => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const id_token = user?.token || '';

  const resourceId = entry?.entrySource?.resource || '';

  const insightsData = useSelector(selectInsightsData(resourceId)) as InsightJob[] | undefined;
  const insightsStatus = useSelector(selectInsightsStatus(resourceId));

  const [relationshipsView, setRelationshipsView] = useState<'graph' | 'table'>('graph');

  useEffect(() => {
    if (id_token) {
      dispatch(fetchInsights({ resourceId, id_token, scanName: scanName || '' }));
    }
  }, [scanName, id_token, insightsStatus, dispatch, resourceId]);

  const mostRecentJob = insightsData ? getMostRecentSuccessfulDatasetJob(insightsData) : null;
  const datasetResult = mostRecentJob?.dataDocumentationResult?.datasetResult;

  // Loading state
  if (insightsStatus === 'loading' && scanName !== null) {
    return <TableInsightsSkeleton />;
  }

  // Global empty state — only when there is genuinely no dataset result to show.
  if (!insightsData || insightsData.length === 0 || !datasetResult || scanName === null) {
    return (
      <Box className="insights-empty-state">
        <Box className="insights-empty-state__content">
          <svg width="48" height="48" viewBox="0 -960 960 960" fill="#9AA0A6" xmlns="http://www.w3.org/2000/svg">
            <path d="m744-577-53-115-115-52 115-53 53-115 52 115 115 53-115 52-52 115Zm0 528-52-116-116-52 116-52 52-116 52 116 116 52-116 52-52 116ZM408-169l-97-215-215-97 215-97 97-215 97 215 215 97-215 97-97 215Zm0-174 43-95 95-43-95-43-43-95-43 95-95 43 95 43 43 95Zm0-138Z" />
          </svg>
          <p className="insights-empty-state__title">No AI-generated insights available</p>
          <p className="insights-empty-state__subtitle">
            Run a Data Documentation scan in Knowledge Catalog to generate insights for this dataset.
          </p>
        </Box>
      </Box>
    );
  }

  const overview = datasetResult.overview || '';
  const relationships: SchemaRelationship[] = datasetResult.schemaRelationships || [];
  const queries: InsightQuery[] = datasetResult.queries || [];

  return (
    <Box className="insights-container" style={{ paddingBottom: '40px' }}>
      <Box className="insights-content" sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Dataset Description */}
        <SectionCard
          icon={<AssistantOutlined sx={{ fontSize: '20px', color: '#022FCD' }} />}
          title="Dataset Description"
          tooltip="AI-generated description of this dataset based on its tables and data patterns"
        >
          <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '20px', color: '#1F1F1F' }}>
            {overview || '-'}
          </Typography>
        </SectionCard>

        {/* 2. Relationships */}
        <SectionCard
          icon={<HubOutlined sx={{ fontSize: '20px', color: '#022FCD' }} />}
          title="Relationships"
          tooltip="AI-inferred relationships between tables in this dataset"
          bodyPadding="0"
          headerRight={
            relationships.length > 0 ? (
              <ViewToggle value={relationshipsView} onChange={setRelationshipsView} />
            ) : undefined
          }
        >
          {relationships.length === 0 ? (
            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontSize: '14px', color: '#65697D' }}>
              No relationships detected for this dataset.
            </Typography>
          ) : relationshipsView === 'graph' ? (
            <RelationshipsGraph relationships={relationships} />
          ) : (
            <RelationshipsTable relationships={relationships} />
          )}
        </SectionCard>

        {/* 3. Generated Queries */}
        <SectionCard
          icon={<AutoFixHighOutlined sx={{ fontSize: '20px', color: '#022FCD' }} />}
          title="Generated Queries"
          tooltip="AI-generated SQL queries based on the dataset's tables and data patterns"
        >
          {queries.length === 0 ? (
            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontSize: '14px', color: '#65697D' }}>
              No queries available for this dataset.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {queries.map((query, index) => (
                <InsightQueryCard key={index} query={query} />
              ))}
            </Box>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
};

export default DatasetInsights;
