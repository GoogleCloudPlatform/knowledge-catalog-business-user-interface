import React, { useState } from 'react'
import './LoginV2.css'
import { useAuth } from '../../../auth/AuthProvider';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sanitizeRedirectURL } from '../../../services/urlPreservationService';
import { CircularProgress } from '@mui/material';
import dataplexLogo from '../../../assets/svg/knowledge-catalog-logo-v2.svg';
import googleLogo from '../../../assets/images/google-logo-figma-53c44d.png';
import { REQUIRED_SCOPES } from '../../../constants/auth';

const LoginV2: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const { access_token } = tokenResponse;
      setLoading(true);

      // Check if user granted all required OAuth scopes
      const grantedScopes = (tokenResponse.scope || '').split(' ');
      const missingScopes = REQUIRED_SCOPES.filter(s => !grantedScopes.includes(s));
      if (missingScopes.length > 0) {
        console.warn('[Login] Missing OAuth scopes:', missingScopes);
        localStorage.setItem('scopeCheckFailed', JSON.stringify(missingScopes));
      } else {
        localStorage.removeItem('scopeCheckFailed');
      }

      try {
        await login({
          credential: access_token,
        });

        // Check for redirect URL after successful login
        const continueParam = searchParams.get('continue');
        if (continueParam) {
          const sanitizedURL = sanitizeRedirectURL(continueParam);
          if (sanitizedURL) {
            console.log('[Login] Redirecting to:', sanitizedURL);
            navigate(sanitizedURL, { replace: true });
            return;
          }
        }

        // Default redirect to home
        navigate('/home', { replace: true });
      } catch {
        setLoading(false);
      }
    },
    onError: () => console.error('Google Login Failed'),
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/dataplex.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send',
  });

  return (
    <div className="loginv2-page">
      <div className="loginv2-card">
        {/* Left Panel - Brand & messaging */}
        <div className="loginv2-left">
          <img
            src={dataplexLogo}
            style={{ width: '197.52px', height: '48.05px' }}
            alt="Knowledge Catalog"
            className="loginv2-logo"
          />
          <h1 className="loginv2-heading">
            Your gateway to data discovery
          </h1>
          <p className="loginv2-body">
            Discover, understand, and govern all your data assets in one unified catalog
          </p>
        </div>

        {/* Right Panel - Gradient background + sign-in */}
        <div className="loginv2-right">
          <div className="loginv2-gradient-orb loginv2-gradient-orb-1" />
          <div className="loginv2-gradient-orb loginv2-gradient-orb-2" />
          <div className="loginv2-gradient-orb loginv2-gradient-orb-3" />

          <div className="loginv2-right-content">
            {loading ? (
              <div className="loginv2-loading">
                <CircularProgress size={40} sx={{ color: '#4285F4' }} />
                <span className="loginv2-loading-text">Signing you in...</span>
              </div>
            ) : (
              <>
                <span className="loginv2-get-started">GET STARTED</span>
                <h2 className="loginv2-signin-heading">
                  Sign in with Google to continue
                </h2>
                <button
                  className="loginv2-button"
                  onClick={() => { googleLogin(); }}
                >
                  <img
                    src={googleLogo}
                    alt="Google Icon"
                    className="loginv2-google-icon"
                  />
                  <span className="loginv2-button-text">Continue with Google</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginV2
