import React, { useState } from 'react';
import { Box, Typography, IconButton, Collapse, Tooltip } from '@mui/material';
import { ExpandMore, ExpandLess, ContentCopy } from '@mui/icons-material';
import { Highlight, themes } from 'prism-react-renderer';
import { useNotification } from '../../contexts/NotificationContext';
import type { QueryItem } from '../../mocks/insightsMockData';

interface TableInsightsQueryItemProps {
  query: QueryItem;
}

const SparkleIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.88504 5.85547C9.88504 10.0073 7.39397 12.4983 3.24219 12.4983C7.39397 12.4983 9.88504 14.9894 9.88504 19.1412C9.88505 14.9894 12.3761 12.4983 16.5279 12.4983C12.3761 12.4983 9.88504 10.0073 9.88504 5.85547Z" stroke="#65697D" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M18.1864 16.6523C18.1864 18.2093 17.2522 19.1434 15.6953 19.1434C17.2522 19.1434 18.1864 20.0776 18.1864 21.6345C18.1864 20.0776 19.1205 19.1434 20.6775 19.1434C19.1205 19.1434 18.1864 18.2093 18.1864 16.6523Z" stroke="#65697D" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M18.1864 3.36719C18.1864 4.92411 17.2522 5.85826 15.6953 5.85826C17.2522 5.85826 18.1864 6.79241 18.1864 8.34933C18.1864 6.79241 19.1205 5.85826 20.6775 5.85826C19.1205 5.85826 18.1864 4.92411 18.1864 3.36719Z" stroke="#65697D" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const TableInsightsQueryItem: React.FC<TableInsightsQueryItemProps> = ({ query }) => {
  const [expanded, setExpanded] = useState(false);
  const { showNotification } = useNotification();

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query.sql);
    showNotification('SQL copied to clipboard', 'success', 3000);
  };

  return (
  <Box sx={{ width: '100%', background: '#FFFFFF', border: '1px solid #ECEEF4', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
    {/* Header: chevron + sparkle + description */}
    <Box
      onClick={handleToggle}
      sx={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '16px', cursor: 'pointer', '&:hover': { background: '#FAFAFA' } }}
    >
      <IconButton size="small" sx={{ padding: 0, marginTop: '0px' }} onClick={(e) => { e.stopPropagation(); handleToggle(); }}>
        {expanded ? <ExpandLess sx={{ color: '#1F1F1F' }} /> : <ExpandMore sx={{ color: '#1F1F1F' }} />}
      </IconButton>

      <Box sx={{ marginTop: '2px', display: 'flex' }}>
        <SparkleIcon size={20} />
      </Box>

      <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '24px', color: '#65697D' }}>
        {query.description}
      </Typography>
    </Box>

    {/* SQL Code Block */}
    <Collapse in={expanded}>
      <Box sx={{ padding: '0 20px 20px 45px' }}>
        <Box sx={{ position: 'relative', border: '1px solid #E3E8EF', borderRadius: '12px', overflow: 'hidden', background: '#F5F8FE' }}>
          {/* SQL header bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
            <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: '15px', color: '#1F1F1F' }}>
              {"</> "}SQL
            </Typography>
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
                  ...style, background: 'transparent', padding: '0 16px 16px 16px', margin: 0,
                  overflow: 'auto', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
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

export default TableInsightsQueryItem;