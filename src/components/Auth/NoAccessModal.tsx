import React from 'react';
import { Dialog, Box, Typography, Button } from '@mui/material';

// M3 design tokens (shared with SessionExpired)
const m3 = {
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

interface NoAccessModalProps {
  open: boolean;
  message?: string | null;
  onSignIn: () => void;
}

export const NoAccessModal: React.FC<NoAccessModalProps> = ({
  open,
  message,
  onSignIn,
}) => {
  const displayMessage =
    message ||
    'You do not have permission to access this resource. This may be because you did not grant the required permissions during sign-in, or your account lacks the necessary roles. Please sign in again and ensure all requested permissions are accepted.';

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
      }}
      disableEscapeKeyDown
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 580,
          maxWidth: '100%',
          borderRadius: '24px',
          boxShadow: m3.cardShadow,
          py: '40px',
          backgroundColor: m3.cardBg,
        },
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
            cancel
          </span>
        </Box>

        {/* Title */}
        <Typography
          component="h2"
          sx={{
            fontFamily: googleFonts.display,
            fontSize: 36,
            fontWeight: 500,
            lineHeight: '44px',
            color: m3.titleColor,
          }}
        >
          Access Denied
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
          {displayMessage}
        </Typography>

        {/* Button row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            width: '100%',
          }}
        >
          <Button
            variant="contained"
            onClick={onSignIn}
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
              Sign In Again
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
    </Dialog>
  );
};
