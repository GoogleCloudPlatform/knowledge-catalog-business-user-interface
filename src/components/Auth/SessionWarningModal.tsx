/**
 * @file SessionWarningModal.tsx
 * @description Modal component that warns users about impending session/token expiration
 *
 * Features:
 * - Shows countdown timer based on token expiration
 * - "Stay Logged In" button opens Google OAuth popup for re-authentication
 * - "Log Out" button for manual logout
 * - Transforms to "expired" state when countdown reaches zero
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../../auth/AuthProvider';

// M3 design tokens
const m3 = {
  cardBg: '#FFFFFF',
  cardShadow:
    '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  iconBg: 'rgba(14, 77, 202, 0.16)',
  iconColor: '#022FCD',
  iconBgExpired: 'rgba(179, 38, 30, 0.16)',
  iconColorExpired: '#B3261E',
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

interface SessionWarningModalProps {
  open: boolean;
  remainingTime: number; // in seconds
  onStayLoggedIn: () => Promise<void>;
  onLogOut: () => void;
}

type ModalMode = 'warning' | 'loading' | 'expired';

interface ModalState {
  mode: ModalMode;
  error: string | null;
}

/**
 * Formats seconds into MM:SS format
 */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  open,
  remainingTime,
  onStayLoggedIn,
  onLogOut,
}) => {
  const { user, updateUser } = useAuth();
  const [modalState, setModalState] = useState<ModalState>({
    mode: 'warning',
    error: null,
  });

  // Google OAuth login hook - uses native popup flow
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const { access_token } = tokenResponse;

      // Update token in auth context
      const now = Math.floor(Date.now() / 1000);
      const tokenExpiry = now + 3600; // 1 hour from now

      const updatedUser = {
        ...user!,
        token: access_token,
        tokenIssuedAt: now,
        tokenExpiry,
      };

      // Update axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      // Update user data
      updateUser(access_token, updatedUser);

      console.log('[SessionWarningModal] Token refreshed via Google OAuth popup');

      // Notify parent and close modal
      await onStayLoggedIn();
      setModalState({ mode: 'warning', error: null });
    },
    onError: (error) => {
      console.error('[SessionWarningModal] Google OAuth failed:', error);

      // Check if token expired while popup was open
      if (remainingTime <= 0) {
        setModalState({
          mode: 'expired',
          error: 'Your session has expired. Please sign in again.',
        });
      } else {
        // Show error but keep modal open for retry
        setModalState({
          mode: 'warning',
          error: 'Authentication failed. Please try again.',
        });
      }
    },
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/dataplex.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send',
  });

  // Reset modal state when countdown reaches zero
  useEffect(() => {
    if (remainingTime <= 0 && modalState.mode === 'warning') {
      setModalState({ mode: 'expired', error: null });
    }
  }, [remainingTime, modalState.mode]);

  // Reset modal state when modal opens (only if time hasn't expired)
  useEffect(() => {
    if (open && modalState.mode !== 'warning' && remainingTime > 0) {
      setModalState({ mode: 'warning', error: null });
    }
  }, [open, modalState.mode, remainingTime]);

  /**
   * Handle "Stay Logged In" button click
   * Opens Google OAuth popup for re-authentication
   */
  const handleStayLoggedIn = () => {
    setModalState({ mode: 'loading', error: null });
    googleLogin();
  };

  const isExpired = modalState.mode === 'expired';

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
            backgroundColor: isExpired ? m3.iconBgExpired : m3.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 36,
              color: isExpired ? m3.iconColorExpired : m3.iconColor,
            }}
          >
            {isExpired ? 'report' : 'history_2'}
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
          {isExpired ? 'Session Expired' : 'Session Expiring Soon'}
        </Typography>

        {/* Message */}
        {modalState.mode === 'warning' && (
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
            Your session is about to expire in {formatTime(remainingTime)}.
            <br />
            Please log in again to continue.
          </Typography>
        )}

        {modalState.mode === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} sx={{ color: m3.buttonBg }} />
            <Typography
              sx={{
                fontFamily: googleFonts.body,
                fontSize: 16,
                fontWeight: 400,
                lineHeight: '24px',
                color: m3.bodyColor,
              }}
            >
              Opening login window...
            </Typography>
          </Box>
        )}

        {isExpired && (
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
            Your session has expired. Please sign in again to continue.
          </Typography>
        )}

        {modalState.error && (
          <Alert
            severity="error"
            sx={{
              width: '100%',
              fontFamily: googleFonts.body,
              borderRadius: 2,
            }}
          >
            {modalState.error}
          </Alert>
        )}

        {/* Button row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            width: '100%',
            gap: 2,
          }}
        >
          {modalState.mode === 'warning' && (
            <>
              <Button
                variant="contained"
                onClick={handleStayLoggedIn}
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
                Stay Signed In
              </Button>
              <Button
                variant="text"
                onClick={onLogOut}
                sx={{
                  fontFamily: googleFonts.display,
                  color: m3.buttonBg,
                  borderRadius: '100px',
                  height: 56,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: 16,
                  letterSpacing: '0.15px',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  },
                }}
              >
                Log out
              </Button>
            </>
          )}

          {isExpired && (
            <Button
              variant="contained"
              onClick={onLogOut}
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
          )}
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
