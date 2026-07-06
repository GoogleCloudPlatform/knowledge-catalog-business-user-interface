import React, { useState } from 'react';
import { Box, Typography, IconButton, Collapse, Tooltip, Divider } from '@mui/material';
import { ExpandMore, ExpandLess, AutoFixHighOutlined, HelpOutline } from '@mui/icons-material';
import TableInsightsQueryItem from './TableInsightsQueryItem'; 
import type { GroupedQueries } from '../../utils/insightsUtils'; 
import QueryFilterBar from '../../component/Common/QueryFilterBar';
interface TableInsightsGeneratedQueriesProps {
  groupedQueries: GroupedQueries[];
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

const TableInsightsGeneratedQueries: React.FC<TableInsightsGeneratedQueriesProps> = ({
  groupedQueries,
  searchTerm,
  onSearchTermChange,
}) => {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const handleDateToggle = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

 return (
  <Box sx={{
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    padding: "24px", gap: "16px", width: "100%", boxSizing: "border-box",
    background: "#FFFFFF", border: "1px solid #ECEEF4", borderRadius: "12px",
  }}>
    {/* Header */}
    <Box 
      sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Box sx={{ width: "32px", height: "32px", background: "#EAEEFA", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <AutoFixHighOutlined sx={{ fontSize: "20px", color: "#022FCD" }} /> 
        </Box>
        <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 600, fontSize: "18px", color: "#3D4151" }}>
          Generated Queries
        </Typography>
        <Tooltip title="AI-generated SQL queries based on the table's schema and data patterns">
          <HelpOutline sx={{ fontSize: 16, color: '#575757' }} />
        </Tooltip>
      </Box>
    </Box>

    <Divider sx={{ width: "100%", borderColor: "#E8EBEF", margin: "-4px 0 0 0" }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <QueryFilterBar 
            searchTerm={searchTerm} 
            onSearchTermChange={onSearchTermChange} 
            placeholder="Search query description" 
          />

        {/* Query Groups by Date */}
        <Box className="insights-queries-list" sx={{ width: "100%" }}>
          {groupedQueries.length === 0 ? (
            <Box className="insights-queries-empty">
              <Typography>No queries match your search criteria.</Typography>
            </Box>
          ) : (
            groupedQueries.map((group) => (
              <Box key={group.jobUid} className={`insights-date-group ${expandedDates.has(group.jobUid) ? 'insights-date-group--expanded' : ''}`}>
                {/* Date Header */}
                <Box
                  className="insights-date-group__header"
                  onClick={() => handleDateToggle(group.jobUid)}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Google Sans", sans-serif',
                      fontWeight: 600,
                      fontSize: '15px',
                      lineHeight: '24px',
                      color: '#3D4151',
                    }}
                  >
                    Generated date: {group.formattedDate}
                  </Typography>
                  <IconButton size="small">
                    {expandedDates.has(group.jobUid) ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                {/* Queries for this date */}
                <Collapse in={expandedDates.has(group.jobUid)}>
                  <Box 
                    className="insights-date-group__queries"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '16px',
                      gap: '16px',
                    }}
                  >
                    {group.queries.map((query, index) => (
                      <TableInsightsQueryItem
                        key={`${group.jobUid}-${index}`}
                        query={query}
                      />
                    ))}
                  </Box>
                </Collapse>
              </Box>
            ))
          )}
        </Box>
        </Box>
    </Box>
  );
};

export default TableInsightsGeneratedQueries;