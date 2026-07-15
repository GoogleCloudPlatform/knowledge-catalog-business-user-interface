/**
 * @file useSessionManagement.ts
 * @description Hook for managing session warnings based on token expiration
 *
 * Features:
 * - Monitors token expiration time
 * - Shows warning modal 5 minutes before token expires
 * - Multi-tab synchronization via localStorage
 * - Page visibility detection for tab switching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { AUTH_CONFIG } from '../constants/auth';

interface UseSessionManagementConfig {
  warningThreshold?: number;  // Time before expiry to show warning (default: 5 minutes)
  checkInterval?: number;     // How often to check token expiry (default: 30 seconds)
  enabled?: boolean;          // Allow disabling
}

interface UseSessionManagementReturn {
  isWarningModalOpen: boolean;
  remainingTime: number;
  handleStayLoggedIn: () => Promise<void>;
  handleLogOut: () => void;
}

const TOKEN_CHECK_INTERVAL_MS = 5 * 1000; // Check every 5 seconds
const TOKEN_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

/**
 * Hook for managing session warnings based on token expiration
 */
export const useSessionManagement = (
  config: UseSessionManagementConfig = {}
): UseSessionManagementReturn => {
  const {
    warningThreshold = TOKEN_WARNING_THRESHOLD_MS,
    checkInterval = TOKEN_CHECK_INTERVAL_MS,
    enabled = true,
  } = config;

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0); // in seconds

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isModalOpenRef = useRef(false); // Track modal state without causing re-renders

  const { STORAGE_KEYS } = AUTH_CONFIG;

  /**
   * Get time remaining until token expires (in milliseconds)
   */
  const getTimeUntilExpiry = useCallback((): number => {
    const tokenExpiry = (user as any)?.tokenExpiry;
    if (!tokenExpiry) {
      return 0;
    }
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = (tokenExpiry - now) * 1000; // Convert to ms
    return Math.max(0, timeRemaining);
  }, [user]);

  /**
   * Handle session expiration (token expired)
   * Note: This only closes the warning modal and broadcasts to other tabs.
   * The useSessionExpiration hook handles the actual expiration flow
   * (showing SessionExpired component, logout, etc.)
   */
  const handleSessionExpired = useCallback(() => {
    console.log('[Session Management] Session expired - closing warning modal');

    // Close modal if open
    setIsWarningModalOpen(false);
    isModalOpenRef.current = false;

    // Clear countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Broadcast expiration to all tabs
    localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRED, Date.now().toString());
  }, [STORAGE_KEYS.SESSION_EXPIRED]);

  /**
   * Start countdown timer for warning modal
   */
  const startCountdown = useCallback((initialSeconds: number) => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    console.log('[Session Management] Starting countdown from', initialSeconds, 'seconds');
    setRemainingTime(Math.max(0, initialSeconds));

    // Update countdown every second
    countdownIntervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          handleSessionExpired();
          return 0;
        }
        return newValue;
      });
    }, 1000);
  }, [handleSessionExpired]);

  /**
   * Check token expiration and show warning if needed
   */
  const checkTokenExpiration = useCallback(() => {
    if (!enabled || !user) return;

    const timeUntilExpiry = getTimeUntilExpiry();

    if (timeUntilExpiry <= 0) {
      // Token already expired
      handleSessionExpired();
      return;
    }

    // Use ref to check modal state to avoid dependency issues
    if (timeUntilExpiry <= warningThreshold && !isModalOpenRef.current) {
      // Show warning modal
      console.log('[Session Management] Token expiring soon - showing warning');
      const secondsRemaining = Math.floor(timeUntilExpiry / 1000);
      isModalOpenRef.current = true;
      setIsWarningModalOpen(true);
      startCountdown(secondsRemaining);
    }
  }, [enabled, user, getTimeUntilExpiry, warningThreshold, handleSessionExpired, startCountdown]);

  /**
   * Handle localStorage changes (multi-tab sync)
   */
  const handleStorageChange = useCallback(
    (e: StorageEvent) => {
      if (!enabled) return;

      // Session renewed in another tab
      if (e.key === STORAGE_KEYS.SESSION_RENEWED) {
        console.log('[Session Management] Session renewed in another tab');
        setIsWarningModalOpen(false);
        isModalOpenRef.current = false;
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }

      // Session expired in another tab
      if (e.key === STORAGE_KEYS.SESSION_EXPIRED) {
        handleSessionExpired();
      }
    },
    [enabled, STORAGE_KEYS, handleSessionExpired]
  );

  /**
   * Handle page visibility changes (tab switching, system sleep/wake)
   */
  const handleVisibilityChange = useCallback(() => {
    if (!enabled || !user) return;

    if (document.visibilityState === 'visible') {
      // If modal is already open, recalculate remaining time from localStorage
      // since browsers throttle/pause setInterval in hidden tabs
      if (isModalOpenRef.current) {
        const timeUntilExpiry = getTimeUntilExpiry();
        if (timeUntilExpiry <= 0) {
          handleSessionExpired();
        } else {
          const secondsRemaining = Math.floor(timeUntilExpiry / 1000);
          startCountdown(secondsRemaining);
        }
      } else {
        checkTokenExpiration();
      }
    }
  }, [enabled, user, getTimeUntilExpiry, handleSessionExpired, startCountdown, checkTokenExpiration]);

  /**
   * Handle "Stay Logged In" button click
   * This will be called by the modal after successful popup login
   */
  const handleStayLoggedIn = useCallback(async () => {
    console.log('[Session Management] Stay Logged In - session renewed');

    // Broadcast session renewal to all tabs
    localStorage.setItem(STORAGE_KEYS.SESSION_RENEWED, Date.now().toString());

    // Close modal
    setIsWarningModalOpen(false);
    isModalOpenRef.current = false;

    // Clear countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [STORAGE_KEYS.SESSION_RENEWED]);

  /**
   * Handle "Log Out" button click
   */
  const handleLogOut = useCallback(() => {
    console.log('[Session Management] Log Out clicked');

    // Clear timers
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }

    // Close modal
    setIsWarningModalOpen(false);
    isModalOpenRef.current = false;

    // Logout
    logout();
    navigate('/login');
  }, [logout, navigate]);

  /**
   * Setup token expiration monitoring
   */
  useEffect(() => {
    if (!enabled || !user) return;

    // Check token expiration immediately
    checkTokenExpiration();

    // Set up interval to check token expiration
    tokenCheckIntervalRef.current = setInterval(checkTokenExpiration, checkInterval);

    // Add storage event listener (multi-tab sync)
    window.addEventListener('storage', handleStorageChange);

    // Add visibility change listener (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    enabled,
    user,
    checkInterval,
    checkTokenExpiration,
    handleStorageChange,
    handleVisibilityChange,
  ]);

  return {
    isWarningModalOpen,
    remainingTime,
    handleStayLoggedIn,
    handleLogOut,
  };
};
