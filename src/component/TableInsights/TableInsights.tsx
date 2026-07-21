import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Drawer } from '@mui/material';
import type { AppDispatch } from '../../app/store';
import {
  fetchInsights,
  selectInsightsData,
  selectInsightsStatus,
} from '../../features/tableInsights/tableInsightsSlice';
import { useAuth } from '../../auth/AuthProvider';
import { useAccessRequest } from '../../contexts/AccessRequestContext';
import { getMostRecentSuccessfulJob, groupQueriesByDate, filterQueriesBySearchTerm } from '../../utils/insightsUtils';
import InsightsTableDescription from './InsightsTableDescription';
import TableInsightsGeneratedQueries from './TableInsightsGeneratedQueries';
import TableInsightsPreviewPanel from './TableInsightsPreviewPanel';
import TableInsightsSkeleton from './TableInsightsSkeleton';
import type { InsightJob, ColumnDescription } from '../../mocks/insightsMockData';
import './TableInsights.css';

interface TableInsightsProps {
  entry: any;
  scanName: string|null;
}

const TableInsights: React.FC<TableInsightsProps> = ({ entry, scanName }) => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const { setAccessPanelOpen } = useAccessRequest();
  const id_token = user?.token || '';

  // console.log('TableInsights rendered with scanName:', scanName);

  // Get resource ID from entry
  const resourceId = entry?.entrySource?.resource || '';
  // console.log('Derived resourceId:', resourceId);
  // console.log('Entry data:', entry);

  // Redux selectors
  const insightsData = useSelector(selectInsightsData(resourceId)) as InsightJob[] | undefined;
  const insightsStatus = useSelector(selectInsightsStatus(resourceId));

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    currentDescription: string;
    geminiDescription: string;
    columnDescriptions: ColumnDescription[];
  } | null>(null);

  // Sync preview panel state with global context for z-index management
  useEffect(() => {
    setAccessPanelOpen(isPreviewOpen);
  }, [isPreviewOpen, setAccessPanelOpen]);

  // Fetch insights on mount
  useEffect(() => {
    if (id_token) {
      dispatch(fetchInsights({ resourceId, id_token, scanName: scanName || '' }));
    }
  }, [scanName, id_token, insightsStatus, dispatch]);

  // Process insights data
  const mostRecentJob = insightsData ? getMostRecentSuccessfulJob(insightsData) : null;
  const tableDescription = mostRecentJob?.dataDocumentationResult?.tableResult?.overview || mostRecentJob?.dataDocumentationResult?.datasetResult?.overview || '';
  const columnDescriptions = mostRecentJob?.dataDocumentationResult?.tableResult?.schema?.fields || [];

  // Group queries by date
  const groupedQueries = insightsData ? groupQueriesByDate(insightsData) : [];
  const filteredQueries = filterQueriesBySearchTerm(groupedQueries, searchTerm);

  // Handle preview panel
  const handleOpenPreview = () => {
    // Get current description from entry aspects if available
    const currentDescription = entry?.aspects?.['Tables.global.overview']?.data?.description?.stringValue || '-';

    setPreviewData({
      currentDescription,
      geminiDescription: tableDescription,
      columnDescriptions,
    });
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewData(null);
  };

  // Loading state
  if (insightsStatus === 'loading' && scanName !== null) {
    return <TableInsightsSkeleton />;
  }

  // No data state
  if (!insightsData || insightsData.length === 0 || !mostRecentJob || scanName === null) {
    return (
      <Box className="insights-empty-state">
        <Box className="insights-empty-state__content">
          <svg width="48" height="48" viewBox="0 -960 960 960" fill="#9AA0A6" xmlns="http://www.w3.org/2000/svg">
            <path d="m744-577-53-115-115-52 115-53 53-115 52 115 115 53-115 52-52 115Zm0 528-52-116-116-52 116-52 52-116 52 116 116 52-116 52-52 116ZM408-169l-97-215-215-97 215-97 97-215 97 215 215 97-215 97-97 215Zm0-174 43-95 95-43-95-43-43-95-43 95-95 43 95 43 43 95Zm0-138Z"/>
          </svg>
          <p className="insights-empty-state__title">No AI-generated insights available</p>
          <p className="insights-empty-state__subtitle">
            Run a Data Documentation scan in Knowledge Catalog to generate insights for this table.
          </p>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box className="insights-container" style={{paddingBottom: '40px'}}>
        <Box className="insights-content" sx={{ flex: 1 }}>
          {/* Table Description Section */}
          <InsightsTableDescription
            description={tableDescription}
            onViewColumnDescriptions={handleOpenPreview}
          />

          {/* Generated Queries Section */}
          <TableInsightsGeneratedQueries
            groupedQueries={filteredQueries}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
          />
        </Box>
      </Box>

      {/* Preview Panel */}
      <Drawer
        anchor="right"
        open={isPreviewOpen}
        onClose={handleClosePreview}
        PaperProps={{
          sx: {
            width: '38.25rem',
            backgroundColor: '#ffffff',
            boxShadow: '-0.25rem 0rem 0.5rem rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <TableInsightsPreviewPanel
          currentDescription={previewData?.currentDescription || '-'}
          geminiDescription={previewData?.geminiDescription || '-'}
          columnDescriptions={previewData?.columnDescriptions || []}
          onClose={handleClosePreview}
        />
      </Drawer>
    </>
  );
};

export default TableInsights;