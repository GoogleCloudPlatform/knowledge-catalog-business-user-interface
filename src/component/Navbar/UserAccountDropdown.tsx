import React from 'react';
import { Popover, Box, Typography, Avatar, Divider, IconButton } from '@mui/material';
import { Close, Logout } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../auth/AuthProvider';
import { sanitizeFirstName } from '../../utils/sanitizeName';
import './UserAccountDropdown.css';

interface UserAccountDropdownProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Extracts initials from a user name for avatar fallback.
 */
function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0]?.toUpperCase() ?? '?';
}

/**
 * Extracts the domain from an email for "Managed by" display.
 * Returns null for gmail.com addresses (personal accounts).
 */
function getManagedDomain(email: string | undefined): string | null {
  if (!email) return null;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || domain === 'gmail.com' || domain === 'googlemail.com') return null;
  return domain;
}

const SHOW_FOOTER_LINKS = false;

const UserAccountDropdown: React.FC<UserAccountDropdownProps> = ({
  anchorEl,
  open,
  onClose,
}) => {
  const { user, login, logout } = useAuth();
  const mode = useSelector((state: any) => state.user.mode);
  const isDark = mode === 'dark';
  const managedDomain = getManagedDomain(user?.email);

  const colors = {
    bg: isDark ? '#1b1b1b' : '#ffffff',
    text: isDark ? '#c4c7c5' : '#202124',
    textSecondary: isDark ? '#9aa0a6' : '#5f6368',
    divider: isDark ? '#3c4043' : '#e8eaed',
    actionBg: isDark ? '#1e1f20' : '#f1f3f4',
    actionHover: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e8eaed',
    link: isDark ? '#8ab4f8' : '#1a73e8',
    footerText: isDark ? '#9aa0a6' : '#5f6368',
    outlineBorder: isDark ? '#5f6368' : '#dadce0',
  };

  // "Switch account" triggers Google's account picker
  const switchAccount = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      await login({ credential: tokenResponse.access_token });
      onClose();
    },
    onError: () => console.error('Switch account failed'),
    flow: 'implicit',
    prompt: 'select_account',
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/dataplex.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send',
  });

  const handleSignOut = () => {
    sessionStorage.removeItem('welcomeShown');
    logout();
    onClose();
  };

  const handleManageAccount = () => {
    window.open('https://myaccount.google.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      transitionDuration={0}
      sx={{
        '& .MuiPopover-paper': {
          borderRadius: '28px',
          boxShadow: isDark
            ? '0 4px 24px rgba(0,0,0,0.5)'
            : '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
          width: '360px',
          marginTop: '45px',
          marginLeft: '5px',
          backgroundColor: isDark ? '#2a3a4a' : '#e8edf6',
          overflow: 'hidden',
        },
      }}
    >
      {/* Top bar: email + "Managed by" + close button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          px: 2,
          pt: 1.5,
          pb: 0,
        }}
      >
        <Box sx={{ flex: 1, textAlign: 'center', pl: 5 }}>
          <Typography
            sx={{
              fontFamily: '"Google Sans Text", sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: colors.text,
            }}
          >
            {user?.email || '\u2014'}
          </Typography>
          {managedDomain && (
            <Typography
              sx={{
                fontFamily: '"Google Sans Text", sans-serif',
                fontSize: '12px',
                color: colors.textSecondary,
                mt: 0.25,
              }}
            >
              Managed by {managedDomain}
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: colors.textSecondary,
            '&:hover': { backgroundColor: colors.actionHover },
          }}
        >
          <Close sx={{ fontSize: '20px' }} />
        </IconButton>
      </Box>

      {/* Avatar — large, centered */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pt: 3,
          pb: 2,
        }}
      >
        <Avatar
          alt={user?.name ?? ''}
          src={user?.picture ?? ''}
          sx={{
            width: 80,
            height: 80,
            fontSize: '2rem',
            fontFamily: '"Google Sans", sans-serif',
            fontWeight: 400,
            backgroundColor: '#7b1fa2',
            color: '#ffffff',
          }}
        >
          {getInitials(user?.name)}
        </Avatar>
      </Box>

      {/* Greeting */}
      <Typography
        sx={{
          fontFamily: '"Google Sans", sans-serif',
          fontSize: '22px',
          fontWeight: 400,
          color: colors.text,
          textAlign: 'center',
          pb: 1.5,
        }}
      >
        Hi, {sanitizeFirstName(user?.name)}!
      </Typography>

      {/* "Manage your Google Account" button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pb: 2.5 }}>
        <Box
          component="button"
          onClick={handleManageAccount}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Google Sans", sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: isDark ? '#8ab4f8' : '#0b56cf',
            backgroundColor: 'transparent',
            border: `1px solid ${isDark ? '#9aa0a6' : '#202124'}`,
            borderRadius: '100px',
            px: 3,
            py: 1,
            cursor: 'pointer',

            '&:hover': {
              backgroundColor: isDark ? 'rgba(138, 180, 248, 0.08)' : '#dae1f4',
            },
          }}
        >
          Manage your Google Account
        </Box>
      </Box>

      {/* Action section */}
      <Box>
        {/* Switch account | Sign out — separate rounded rectangles with tiny gap */}
        <Box sx={{ display: 'flex', gap: '2px', mx: 2, my: 1.5 }}>
          {/* Switch account */}
          <Box
            onClick={() => switchAccount()}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              py: 1.5,
              pl: 2,
              cursor: 'pointer',
              borderRadius: '100px 4px 4px 100px',
              backgroundColor: colors.bg,
  
              '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#dce0e7' },
            }}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill={colors.link}
              style={{
                backgroundColor: isDark ? '#3c4043' : '#e8eaed',
                borderRadius: '50%',
                boxSizing: 'content-box',
                padding: '2px',
              }}
            >
              <path d="M20 13h-7v7h-2v-7H4v-2h7V4h2v7h7v2z" />
            </svg>
            <Typography
              sx={{
                fontFamily: '"Google Sans", Roboto, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: isDark ? '#e8eaed' : '#000000',
              }}
            >
              Switch account
            </Typography>
          </Box>

          {/* Sign out */}
          <Box
            onClick={handleSignOut}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              py: 1.5,
              pl: 2,
              cursor: 'pointer',
              borderRadius: '4px 100px 100px 4px',
              backgroundColor: colors.bg,
  
              '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#dce0e7' },
            }}
          >
            <Logout sx={{ fontSize: '22px', color: colors.textSecondary }} />
            <Typography
              sx={{
                fontFamily: '"Google Sans", Roboto, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: isDark ? '#e8eaed' : '#000000',
              }}
            >
              Sign out
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: colors.divider }} />

        {/* Footer: Privacy Policy · Terms of Service (feature-flagged) */}
        {SHOW_FOOTER_LINKS && <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            py: 1.5,
          }}
        >
          <Typography
            component="a"
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontFamily: '"Google Sans Text", sans-serif',
              fontSize: '12px',
              color: colors.footerText,
              textDecoration: 'none',
              borderRadius: '4px',
              px: 0.75,
              py: 0.25,
  
              '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#dce0e7' },
            }}
          >
            Privacy Policy
          </Typography>
          <Typography
            sx={{
              fontSize: '12px',
              color: colors.footerText,
            }}
          >
            ·
          </Typography>
          <Typography
            component="a"
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontFamily: '"Google Sans Text", sans-serif',
              fontSize: '12px',
              color: colors.footerText,
              textDecoration: 'none',
              borderRadius: '4px',
              px: 0.75,
              py: 0.25,
  
              '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#dce0e7' },
            }}
          >
            Terms of Service
          </Typography>
        </Box>}
      </Box>
    </Popover>
  );
};

export default UserAccountDropdown;
