import React, { useMemo } from 'react';
import { Box, Tooltip } from '@mui/material';
import { LockOutlined, HourglassEmptyOutlined } from '@mui/icons-material';

// Visual presets used across the detail view
type RequestAccessVariant = 'card' | 'compact';

interface RequestAccessButtonProps {
  /** The data product entry passed back to the click handler */
  entry: any;
  /** Click handler invoked when access can still be requested */
  onRequestAccess: (entry: any) => void;
  /** Change requests fetched for this data product */
  changeRequests: any[];
  /** Loading lifecycle for the change requests fetch */
  changeRequestStatus: 'loading' | 'success' | 'error';
  /** Email of the currently signed-in user */
  userEmail?: string;
  /** Size preset — `card` (large) or `compact` (header) */
  variant?: RequestAccessVariant;
  /** The total number of access groups available for this data product */
  totalAccessGroups?: number;
}

// Sizing tokens per variant so both buttons stay visually consistent
const VARIANT_STYLES: Record<RequestAccessVariant, { padding: string; height: string; iconSize: string }> = {
  card: { padding: '10px 16px', height: '40px', iconSize: '18px' },
  compact: { padding: '8px 16px', height: '36px', iconSize: '16px' },
};

const RequestAccessButton: React.FC<RequestAccessButtonProps> = ({
  entry,
  onRequestAccess,
  changeRequests,
  changeRequestStatus,
  userEmail,
  variant = 'card',
  totalAccessGroups = 0
}) => {
  // The user already has an access request in flight once the fetch has
  // succeeded and one of the change requests was authored by them.
  // Determines the overall state of the user's access
  const requestState = useMemo(() => {
    if (changeRequestStatus !== 'success' || !userEmail || totalAccessGroups === 0) return 'can_request';
    
    // 1. Get all active (non-rejected) requests authored by this user
    const userRequests = (changeRequests ?? []).filter(
      (cr: any) => 
        cr?.author?.toLowerCase() === userEmail.toLowerCase() && 
        cr?.state !== 'REJECTED'
    );

    // 2. Separate them into Approved groups and All Active groups (Pending + Approved)
    // NOTE: Change 'APPROVED' to match your API's exact state string if it uses something else (e.g., 'FULFILLED')
    const approvedGroups = new Set(
      userRequests
        .filter((cr: any) => cr?.state === 'APPROVED') 
        .map((cr: any) => cr?.dataProductAccessRequest?.accessGroupId)
        .filter(Boolean)
    );

    const allActiveGroups = new Set(
      userRequests
        .map((cr: any) => cr?.dataProductAccessRequest?.accessGroupId)
        .filter(Boolean)
    );

    // 3. Determine the button state
    if (approvedGroups.size >= totalAccessGroups) return 'all_approved';
    if (allActiveGroups.size >= totalAccessGroups) return 'all_requested';

    return 'can_request';
  }, [changeRequestStatus, changeRequests, userEmail, totalAccessGroups]);

  const sizing = VARIANT_STYLES[variant];

  const baseSx = {
    fontFamily: '"Google Sans", sans-serif',
    borderRadius: '100px',
    padding: sizing.padding,
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    height: sizing.height,
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textTransform: 'none' as const,
    gap: '8px',
    transition: 'background-color 0.2s ease',
  };

  if (totalAccessGroups === 0) {
    return (
      <Tooltip title="There are no access groups for this data product" arrow placement="top">
        <span style={{ display: 'inline-flex' }}>
          <Box
            component="button"
            disabled
            sx={{
              ...baseSx,
              backgroundColor: '#E8EAED',
              color: '#5F6368',
              cursor: 'not-allowed',
            }}
          >
            <LockOutlined style={{ fontSize: sizing.iconSize }} />
            Request Access
          </Box>
        </span>
      </Tooltip>
    );
  }

  if (requestState === 'all_approved') {
    return (
      <Tooltip title="You have access to all the access groups of this product" arrow placement="top">
        <span style={{ display: 'inline-flex' }}>
          <Box
            component="button"
            disabled
            sx={{
              ...baseSx,
              backgroundColor: '#E8EAED',
              color: '#5F6368',
              cursor: 'not-allowed',
            }}
          >
            <LockOutlined style={{ fontSize: sizing.iconSize }} />
            Access Granted
          </Box>
        </span>
      </Tooltip>
    );
  }

  if (requestState === 'all_requested') {
    return (
      <Tooltip title="You have pending requests for all available access groups" arrow placement="top">
        <span style={{ display: 'inline-flex' }}>
          <Box
            component="button"
            disabled
            data-testid="request-access-pending"
            sx={{
              ...baseSx,
              backgroundColor: '#E8EAED',
              color: '#5F6368',
              cursor: 'not-allowed',
            }}
          >
            <HourglassEmptyOutlined style={{ fontSize: sizing.iconSize }} />
            Pending Request
          </Box>
        </span>
      </Tooltip>
    );
  }

  return (
    <Box
      component="button"
      data-testid="request-access-button"
      onClick={() => onRequestAccess(entry)}
      sx={{
        ...baseSx,
        backgroundColor: '#022FCD',
        color: '#FFFFFF',
        cursor: 'pointer',
        '&:hover': { backgroundColor: '#1A49E3' },
      }}
    >
      <LockOutlined style={{ fontSize: sizing.iconSize }} />
      Request Access
    </Box>
  );
};

export default RequestAccessButton;
