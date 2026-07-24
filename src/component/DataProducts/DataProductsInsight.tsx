import React from 'react';
import { Box } from '@mui/material';
import InsightQueryCard from '../Common/InsightQueryCard';
import type { InsightQuery } from '../Common/InsightQueryCard';
import './../TableInsights/TableInsights.css';

// interface for the DataProductsInsight Props
interface DataProductsInsightProps {
  entry: any;
  css?: React.CSSProperties; // Optional CSS properties for the wrapper
}

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
