import './Home.css'
import SearchBar from '../SearchBar/SearchBar'
import { CircularProgress, Grid } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import axios from 'axios'
import { URLS } from '../../constants/urls'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../../app/store'
import { sanitizeFirstName } from '../../utils/sanitizeName'
import { useNoAccess } from '../../contexts/NoAccessContext'
import { REQUIRED_PERMISSIONS } from '../../constants/auth'
import { useAppBootstrapStatus } from '../../hooks/useAppBootstrap'

/**
 * @file Home.tsx
 * @description
 * This component renders the main home/landing page of the application.
 *
 * Key functionalities include:
 * 1.  **State Reset**: It dispatches Redux actions to clear any existing
 * search/resource items from previous sessions.
 * 2.  **Search Handling**: It renders the `SearchBar` component. When a user
 * submits a search (via `handleSearch`), it again resets Redux state and
 * navigates to the `/search` page.
 *
 * appConfig/get-projects bootstrapping and the projectsRestricted access
 * check live in `useAppBootstrap` (called once in `Layout`), not here, so
 * they run regardless of which route a session enters through.
 *
 * @param {object} props - This component accepts no props.
 *
 * @returns {React.ReactElement} A React element displaying either:
 * - A `CircularProgress` loader while the app bootstrap is in progress.
 * - The main home page layout with the `SearchBar`.
 */

const Home = () => {
  const { user } = useAuth();
  const { triggerNoAccess } = useNoAccess();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  // Home reads neither appConfig nor the project list, but it shouldn't render
  // a half-initialised app either — waiting on appConfig alone means a reload
  // (warm appConfig from IndexedDB) renders instantly instead of blocking on a
  // /get-projects round-trip for data this page never uses.
  const { isAppConfigReady } = useAppBootstrapStatus();
  const accessCheckedRef = useRef(false);

  // Check OAuth scopes (set at login) and IAM role after login
  useEffect(() => {
    if (!user?.token || !user?.email || accessCheckedRef.current) return;
    accessCheckedRef.current = true;

    // 1. Check if login flagged missing OAuth scopes
    const scopeCheckFailed = localStorage.getItem('scopeCheckFailed');
    if (scopeCheckFailed) {
      const missingScopes = JSON.parse(scopeCheckFailed);
      localStorage.removeItem('scopeCheckFailed');
      triggerNoAccess({
        message: `Your Google account did not grant the required permissions: ${missingScopes.map((s: string) => s.split('/').pop()).join(', ')}. Please sign in again and grant all requested permissions.`,
      });
      return;
    }

    // 2. Check IAM permissions via backend endpoint
    axios.post(URLS.API_URL + URLS.CHECK_PERMISSIONS, {
      permissions: [...REQUIRED_PERMISSIONS],
    }).then((res) => {
      if (!res.data.hasPermission) {
        triggerNoAccess({
          message: `Your account (${user.email}) does not have the required Dataplex permissions on this project. Please contact your administrator to get the appropriate permissions.`,
        });
      }
    }).catch((err) => {
      console.error('[Home] Permission check failed:', err);
      if (err.response?.status === 403) {
        triggerNoAccess({
          message: 'Unable to verify your permissions. You may not have sufficient access to this project. Please contact your administrator.',
        });
      }
    });
  }, [user?.token, user?.email, triggerNoAccess]);

  // Reset any stale search/resource state left over from a previous session
  // when Home mounts. appConfig/get-projects bootstrapping and the
  // projectsRestricted access check are handled globally by useAppBootstrap.
  useEffect(() => {
    dispatch({ type: 'resources/setItemsPreviousPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsStoreData', payload: [] });
    dispatch({ type: 'resources/setItems', payload: [] });
  }, [dispatch]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearch = (_text:string) => {
    dispatch({ type: 'resources/setItemsPreviousPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsPageRequest', payload: null });
    dispatch({ type: 'resources/setItemsStoreData', payload: [] });
    dispatch({ type: 'resources/setItems', payload: [] });
    navigate('/search');
  };

  return (
    <div className="home">
      <div className='home-body'>
        { !isAppConfigReady ? (
          <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
          >
            <CircularProgress />
          </Grid>
        ) : (
          <div className="home-banner">
            <div className="home-content-wrapper">
              <div className="home-header">
                <div className="home-greeting">
                  <span>Hi <span className="home-greeting-name">{sanitizeFirstName(user?.name)}</span>,</span>
                </div>
                <h1 className="home-title">
                  What would you like to discover?
                </h1>
              </div>
              <div className="home-search-container">
                <SearchBar handleSearchSubmit={handleSearch} variant="default" dataSearch={[
                    { name: 'BigQuery' },
                    { name: 'Data Warehouse' },
                    { name: 'Data Lake' },
                    { name: 'Data Pipeline' },
                    { name: 'GCS' }
                ]}/>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home;
