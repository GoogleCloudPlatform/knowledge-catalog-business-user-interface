import React from 'react';
import { Box, Typography, Tooltip, Divider } from '@mui/material';
import { HelpOutline, AssistantOutlined } from '@mui/icons-material';

interface InsightsTableDescriptionProps {
  description: string;
  onViewColumnDescriptions: () => void;
}

const InsightsTableDescription: React.FC<InsightsTableDescriptionProps> = ({
  description,
  onViewColumnDescriptions,
}) => {
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
          <AssistantOutlined sx={{ fontSize: "20px", color: "#022FCD" }} /> 
        </Box>
        <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 600, fontSize: "18px", color: "#3D4151" }}>
          Table Description
        </Typography>
        <Tooltip title="AI-generated description of this table based on its schema and data patterns">
          <HelpOutline sx={{ fontSize: 16, color: '#575757' }} />
        </Tooltip>
      </Box>
    </Box>

    <Divider sx={{ width: "100%", borderColor: "#E8EBEF", margin: "-4px 0 0 0" }} />

    {/* Content */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Typography sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 400, fontSize: "14px", lineHeight: "20px", color: "#1F1F1F" }}>
          {description}
        </Typography>
        <Typography
          component="span"
          onClick={onViewColumnDescriptions}
          sx={{ fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "12px", color: "#0B57D0", cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          View column descriptions
        </Typography>
      </Box>
  </Box>
);
};

export default InsightsTableDescription;