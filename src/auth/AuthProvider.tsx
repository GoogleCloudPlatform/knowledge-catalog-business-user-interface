import { createContext, useContext, useMemo, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { type CredentialResponse, GoogleOAuthProvider } from '@react-oauth/google';
import type { User } from '../types/User';
import axios from 'axios';
import { setCredentials } from '../features/user/userSlice';
import { clearPersistedState, clearUserState } from '../utils/persistence';
import { useNotification } from '../contexts/NotificationContext';
import { setGlobalAuthFunctions, setAuthNotificationShown } from '../services/authErrorService';
import { performSilentAuth } from '../services/silentAuthService';
import { AUTH_CONFIG } from '../constants/auth';
import { setIsLoaded } from '../features/projects/projectsSlice';
import { useAppDispatch, useAppSelector } from '../app/store';


type AuthContextType = {
  user: User | null;
  login: (credentialResponse: CredentialResponse) => void;
  logout: () => void;
  updateUser: (token: string|undefined, userData: User) => void;
  silentLogin: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = ():AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, showInfo } = useNotification();

  // Read user from Redux (hydrated from IndexedDB on bootstrap)
  const user = useAppSelector(state => state.user.userData) as User | null;
  const isLoggedOut = useRef(false);

  const login = useCallback(async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      isLoggedOut.current = false;
      try {
        const token = credentialResponse.credential;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Fetch user profile from Google OAuth2 userinfo
        const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile = profileRes.data;

        // Calculate token timestamps
        const tokenIssuedAt = Math.floor(Date.now() / 1000);
        const tokenExpiry = tokenIssuedAt + AUTH_CONFIG.TOKEN_LIFETIME_SECONDS;

        const userData: User = {
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          token,
          tokenIssuedAt,
          tokenExpiry,
          hasRole: true,
          roles: ['roles/viewer'],
          permissions: ['read'],
          iamDisplayRole: 'Viewer',
          appConfig: {}
        };

        dispatch(setCredentials({token, user: userData}));

        // Reset the auth notification flag on successful login
        setAuthNotificationShown(false);

        showSuccess('Successfully signed in!', 3000);

      } catch (err) {
        console.error('Failed to fetch user info:', err);
        showError('Failed to sign in. Please try again.', 5000);
      }
    }
  }, [dispatch, showSuccess, showError]);

  const logout = useCallback(() => {
    isLoggedOut.current = true;
    dispatch(setCredentials({token: null, user: null}));
    dispatch(setIsLoaded({ isloaded: false }));
    clearUserState(); // Clear user state from IndexedDB
    clearPersistedState(); // Clear persisted Redux state (search, resources, entry)
    showInfo('You have been signed out.', 3000);
  }, [dispatch, showInfo]);

  // Set up global authentication functions
  useEffect(() => {
    setGlobalAuthFunctions(showError, logout);
  }, [showError, logout]);

  const updateUser = useCallback((token:string|undefined, userData:User) => {
    if (isLoggedOut.current) return;
    dispatch(setCredentials({token: token, user: userData}));
  }, [dispatch]);

  /**
   * Performs silent authentication to refresh the token
   * Returns true if successful, false otherwise
   */
  const silentLogin = useCallback(async (): Promise<boolean> => {
    if (!user?.email || isLoggedOut.current) {
      console.warn('[Silent Auth] Cannot perform silent login - no user email or logged out');
      return false;
    }

    try {
      console.log('[Silent Auth] Attempting silent authentication for', user.email);
      const newToken = await performSilentAuth(
        user.email,
        import.meta.env.VITE_GOOGLE_CLIENT_ID
      );

      // Update token and expiry
      const tokenIssuedAt = Math.floor(Date.now() / 1000);
      const tokenExpiry = tokenIssuedAt + AUTH_CONFIG.TOKEN_LIFETIME_SECONDS;

      const updatedUser = {
        ...user,
        token: newToken,
        tokenIssuedAt,
        tokenExpiry
      };

      // Update axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      updateUser(newToken, updatedUser);
      console.log('[Silent Auth] Successfully refreshed token');
      return true;
    } catch (error) {
      console.error('[Silent Auth] Failed:', error);
      return false;
    }
  }, [user, updateUser]);


  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
    updateUser,
    silentLogin
  }), [user, login, logout, updateUser, silentLogin]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthWithProvider = ({ children }: { children: ReactNode }) => (
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <AuthProvider>{children}</AuthProvider>
  </GoogleOAuthProvider>
);
