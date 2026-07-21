import React from 'react'
import './Login.css'
import { useAuth } from '../../../auth/AuthProvider';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sanitizeRedirectURL } from '../../../services/urlPreservationService';

/**
 * @file Login.tsx
 * @summary Renders the application's login page and handles the Google sign-in process.
 *
 * @description
 * This component displays the main login screen for the application. The UI
 * consists of a background image, the application logo ("Knowledge Catalog
 * Universal Catalog"), and a "Sign in with Google Cloud" button.
 *
 * It uses the `useGoogleLogin` hook from `@react-oauth/google` to initiate
 * the Google OAuth implicit flow when the user clicks the sign-in button.
 *
 * On successful Google authentication, the `onSuccess` callback extracts the
 * `access_token` from the response. This token is then passed to the `login`
 * function, which is obtained from the `useAuth` context, to authenticate
 * the user within the application.
 *
 * @param {object} props - This component accepts no props (`React.FC`).
 *
 * @returns {JSX.Element} The rendered React component for the login page.
 */

const GOOGLE_OAUTH_SCOPES = import.meta.env.VITE_IS_SERVICE_ACCOUNT == "true" ? [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
] : [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/bigquery',
  'https://www.googleapis.com/auth/dataplex.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send'
];


const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const { access_token } = tokenResponse;
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
    },
    onError: () => console.error('Google Login Failed'),
    flow: 'implicit', // or 'auth-code' depending on your OAuth setup
    scope: GOOGLE_OAUTH_SCOPES.join(' '),
  });
  
  return (<div className='login-container-parent'>
    <div className="login-container">
      <div className='login-image-container'>
        <img src='/assets/images/BG Image.png' alt='Login' className='login-image' />
      </div>
      <div className='login-button-container'>
        <div className='login-button-card'>
          <div className='logo-section'>
            <div className='logo-container'>
              <img src="/assets/svg/catalog-studio-logo-figma-585de1.svg" alt="Catalog Studio Logo" className='logo-image'/>
              <div className='logo-text-container'>
                <span className='logo-text-primary' style={{color: '#022FCD'}}>Knowledge</span>
                <span className='logo-text-secondary' style={{color: '#022FCD'}}>Catalog</span>
              </div>
            </div>
          </div>
          {/* <div className='signin-text'>
            <span>Sign into Knowledge Catalog Business Interface</span>
          </div> */}
          <button className="login-button" onClick={() => {googleLogin()}}>
            <img src='/assets/images/google-logo-figma-53c44d.png' alt='Google Icon' className='google-icon' />
            <span className='login-button-txt'>Sign in with Google Cloud</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

export default Login
