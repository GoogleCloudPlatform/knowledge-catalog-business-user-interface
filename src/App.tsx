import { CssBaseline } from '@mui/material';
import Routing from './routes/Routing';
import { AppVersionWatcher } from './hooks/useAppVersionCheck';

const App = () => {
  return (
    <>
      <CssBaseline />
      {/* Reloads open tabs automatically after the app is redeployed. */}
      <AppVersionWatcher />
      <Routing />
    </>
  );
};

export default App;
