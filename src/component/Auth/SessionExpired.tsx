import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useAuth } from '../../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

// M3 design tokens
const m3 = {
  background: '#E9EEF6',
  cardBg: '#FFFFFF',
  cardShadow:
    '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  iconBg: 'rgba(179, 38, 30, 0.16)',
  iconColor: '#B3261E',
  titleColor: '#1F1F1F',
  bodyColor: '#5F6367',
  buttonBg: '#022FCD',
  buttonText: '#FFFFFF',
  dividerColor: '#E9EEF6',
  footerColor: '#5F6367',
};

const googleFonts = {
  display: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
  body: '"Google Sans Text", "Roboto", "Helvetica", "Arial", sans-serif',
};

interface SessionExpiredProps {
  reason?: 'session_expired' | 'token_expired' | 'unauthorized';
  customMessage?: string;
  onRetry?: () => void;
}

const SessionExpired: React.FC<SessionExpiredProps> = ({
  reason = 'session_expired',
  customMessage,
  onRetry,
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const getTitle = () => {
    switch (reason) {
      case 'token_expired':
        return 'Access Token Expired';
      case 'unauthorized':
        return 'Access Denied';
      default:
        return 'Session Expired';
    }
  };

  const getMessage = () => {
    if (customMessage) return customMessage;

    switch (reason) {
      case 'token_expired':
        return 'Your access token has expired. Please sign in again to continue using the application.';
      case 'unauthorized':
        return 'You do not have permission to access this resource. Please contact your administrator or sign in with a different account.';
      default:
        return 'Your session has expired. Please sign in again to continue using the application.';
    }
  };

  const getIconName = () => {
    switch (reason) {
      case 'token_expired':
        return 'history_2';
      case 'unauthorized':
        return 'gpp_bad';
      default:
        return 'report';
    }
  };

  const handleReLogin = async () => {
    try {
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      navigate('/login');
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: m3.background,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 580,
          maxWidth: '100%',
          borderRadius: '24px',
          boxShadow: m3.cardShadow,
          py: '40px',
          backgroundColor: m3.cardBg,
        }}
      >
        {/* Content area */}
        <Box
          sx={{
            px: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '20px',
          }}
        >
          {/* Icon circle */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: m3.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 36, color: m3.iconColor }}
            >
              {getIconName()}
            </span>
          </Box>

          {/* Title */}
          <Typography
            component="h1"
            sx={{
              fontFamily: googleFonts.display,
              fontSize: 36,
              fontWeight: 500,
              lineHeight: '44px',
              color: m3.titleColor,
            }}
          >
            {getTitle()}
          </Typography>

          {/* Message */}
          <Typography
            sx={{
              fontFamily: googleFonts.body,
              fontSize: 16,
              fontWeight: 400,
              lineHeight: '24px',
              letterSpacing: '0.5px',
              color: m3.bodyColor,
            }}
          >
            {getMessage()}
          </Typography>

          {/* Button row */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              width: '100%',
              gap: 2,
            }}
          >
            {onRetry && (
              <Button
                variant="outlined"
                onClick={handleRetry}
                sx={{
                  fontFamily: googleFonts.display,
                  borderRadius: '100px',
                  height: 56,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: 16,
                  letterSpacing: '0.15px',
                  px: 3,
                }}
              >
                Try Again
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleReLogin}
              sx={{
                fontFamily: googleFonts.display,
                backgroundColor: m3.buttonBg,
                color: m3.buttonText,
                borderRadius: '100px',
                height: 56,
                minWidth: 99,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 16,
                letterSpacing: '0.15px',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#0B3DA2',
                  boxShadow: 'none',
                },
              }}
            >
              Sign In
            </Button>
          </Box>
        </Box>

        {/* Divider + Footer */}
        <Box
          sx={{
            mt: '20px',
            pt: '20px',
            mx: '40px',
            borderTop: `1px solid ${m3.dividerColor}`,
          }}
        >
          <Typography
            sx={{
              fontFamily: googleFonts.body,
              fontSize: 12,
              fontWeight: 400,
              lineHeight: '16px',
              letterSpacing: '0.4px',
              textAlign: 'center',
              color: m3.footerColor,
            }}
          >
            If you continue to experience issues, please contact your system
            administrator.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default SessionExpired;
