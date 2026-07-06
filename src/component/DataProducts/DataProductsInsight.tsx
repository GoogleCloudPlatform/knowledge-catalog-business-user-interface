import React, {useState} from 'react';
import { Box, Typography, IconButton, Collapse, Tooltip } from '@mui/material';
import { ExpandMore, ExpandLess, ContentCopy } from '@mui/icons-material';
import { Highlight, themes } from 'prism-react-renderer';
import { useNotification } from '../../contexts/NotificationContext';
import './../TableInsights/TableInsights.css';

// interface for the DataProductsInsight Props
interface DataProductsInsightProps {
  entry: any;
  css?: React.CSSProperties; // Optional CSS properties for the wrapper
}

interface InsightQuery {
  description: string;
  sql: string;
  source?: string;
}

// Sparkle icon shown next to each AI-generated query description
const SparkleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.23694 5.87939C6.23694 9.3392 4.16103 11.4151 0.701233 11.4151C4.16103 11.4151 6.23694 13.491 6.23694 16.9508C6.23694 13.491 8.31284 11.4151 11.7726 11.4151C8.31284 11.4151 6.23694 9.3392 6.23694 5.87939Z" stroke="#65697D" strokeWidth="1.25" strokeLinejoin="round" />
    <path d="M13.156 14.877C13.156 16.1744 12.3775 16.9528 11.0801 16.9528C12.3775 16.9528 13.156 17.7313 13.156 19.0287C13.156 17.7313 13.9344 16.9528 15.2319 16.9528C13.9344 16.9528 13.156 16.1744 13.156 14.877Z" stroke="#65697D" strokeWidth="1.25" strokeLinejoin="round" />
    <path d="M13.156 3.80615C13.156 5.10359 12.3775 5.88203 11.0801 5.88203C12.3775 5.88203 13.156 6.66048 13.156 7.95792C13.156 6.66048 13.9344 5.88203 15.2319 5.88203C13.9344 5.88203 13.156 5.10359 13.156 3.80615Z" stroke="#65697D" strokeWidth="1.25" strokeLinejoin="round" />
  </svg>
);

// A single expandable insight: description header + collapsible SQL block
const InsightQueryCard: React.FC<{ query: InsightQuery }> = ({ query }) => {
  const [expanded, setExpanded] = useState(false);
  const { showNotification } = useNotification();

  const handleToggle = () => setExpanded((prev) => !prev);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query.sql);
    showNotification('SQL copied to clipboard', 'success', 3000);
  };

  return (
    <Box
      sx={{
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid #ECEEF4',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header: chevron + sparkle + description */}
      <Box
        onClick={handleToggle}
        sx={{
          display: 'flex',
          alignItems: 'flex-start', // Align items to the top
          gap: '10px',               
          padding: '16px',           
          cursor: 'pointer',
          '&:hover': { background: '#FAFAFA' },
        }}
      >
        <IconButton
          size="small"
          sx={{ padding: 0, marginTop: '0px' }}
          onClick={(e) => { e.stopPropagation(); handleToggle(); }}
        >
          {expanded ? <ExpandLess sx={{ color: '#1F1F1F' }} /> : <ExpandMore sx={{ color: '#1F1F1F' }} />}
        </IconButton>
        
        <Box sx={{ marginTop: '2px', display: 'flex' }}>
          <SparkleIcon size={20} />
        </Box>

        <Typography
          sx={{
            fontFamily: '"Google Sans", sans-serif',
            fontWeight: 400,
            fontSize: '15px',
            lineHeight: '24px', // Slightly taller line-height
            color: '#65697D',        
          }}
        >
          {query.description}
        </Typography>
      </Box>

      {/* SQL Code Block */}
      <Collapse in={expanded}>
        <Box sx={{ padding: '0 20px 20px 45px', maxWidth: 'calc(100% - 600px)' }}>
          <Box
            sx={{
              position: 'relative',
              border: '1px solid #E3E8EF',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#F5F8FE',
            }}
          >
            {/* SQL header bar */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography
                  sx={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    color: '#1F1F1F',
                  }}
                >
                  {"</> "}SQL
                </Typography>
              </Box>
              <Tooltip title="Copy SQL">
                <IconButton size="small" onClick={handleCopy}>
                  <ContentCopy sx={{ fontSize: 18, color: '#5F6368' }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Highlighted SQL */}
            <Highlight theme={themes.nightOwlLight} code={query.sql || ''} language="sql">
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <Box
                  component="pre"
                  className={className}
                  sx={{
                    ...style,
                    background: 'transparent',
                    padding: '0 16px 16px 16px',
                    margin: 0,
                    overflow: 'auto',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {tokens.map((line, i) => (
                    <div {...getLineProps({ line, key: i })}>
                      {line.map((token, key) => (
                        <span {...getTokenProps({ token, key })} />
                      ))}
                    </div>
                  ))}
                </Box>
              )}
            </Highlight>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

const DataProductsInsight: React.FC<DataProductsInsightProps> = ({ entry, css }) => {

  const aspects = entry?.aspects || [];
  const k = Object.entries(aspects).find(([k]) => k.includes('.global.queries'))?.[0] || '';
  console.log('Aspects:', aspects);
  console.log('Queries Key:', k);
  const insights: InsightQuery[] = aspects[`${k}`]?.data?.queries || [];

  return (
    <Box style={{ paddingBottom: '40px', ...css }}>
      {/* Query List */}
      {/* Query List */}
      {insights.length === 0 ? (
        <Box sx={{ padding: '23px 20px', textAlign: 'center', variant: "body1", color: "#0C1226CC" }}>
          No insights available for this data product.
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {insights.map((query, index) => (
            <InsightQueryCard key={index} query={query} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DataProductsInsight;
