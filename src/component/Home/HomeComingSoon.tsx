import React from 'react';
import { Box, Typography } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';

const HomeComingSoon: React.FC = () => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 72px)',
    gap: '16px',
  }}>
    <HomeOutlinedIcon sx={{ fontSize: 64, color: '#BDC1C6' }} />
    <Typography variant="h5" sx={{ fontFamily: "'Google Sans', sans-serif", fontWeight: 500, color: '#3C4043' }}>
      Home
    </Typography>
    <Typography variant="body1" sx={{ fontFamily: "'Google Sans Text', sans-serif", color: '#5F6368' }}>
      Coming Soon
    </Typography>
  </Box>
);

export default HomeComingSoon;
