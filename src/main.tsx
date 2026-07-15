import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom';
import { AuthWithProvider } from './auth/AuthProvider';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { NotificationProvider } from './contexts/NotificationContext';
import { AccessRequestProvider } from './contexts/AccessRequestContext';
import ThemeSyncProvider from './contexts/ThemeSyncProvider';
import './utils/apiInterceptor'; // Set up axios interceptors
import './utils/testHelpers'; // Load testing helpers (available in console)
import theme from './theme';
import store, { hydrateUserState } from './app/store'
import App from './App'
import './index.css'
import './styles/dark-mode.css'

async function bootstrap() {
  // Load user state from IndexedDB before first render
  await hydrateUserState();

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Provider store={store}>
        <ThemeSyncProvider>
          <BrowserRouter>
            <NotificationProvider>
              <AccessRequestProvider>
                <AuthWithProvider>
                  <ThemeProvider theme={theme}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <App />
                    </LocalizationProvider>
                  </ThemeProvider>
                </AuthWithProvider>
              </AccessRequestProvider>
            </NotificationProvider>
          </BrowserRouter>
        </ThemeSyncProvider>
      </Provider>
    </React.StrictMode>,
  );
}

bootstrap();
