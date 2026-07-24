import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchLineageEntry, pushToHistory } from '../../../features/entry/entrySlice';
import type { AppDispatch } from '../../../app/store';
import { useAuth } from '../../../auth/AuthProvider';
import { toEntryFqn } from './utils';

/**
 * Returns a function that navigates to a resource's detail page given its
 * BigQuery resource FQN (`//bigquery.googleapis.com/.../tables/T`). Tags the
 * history entry with 'insights' so Back returns to this dataset's Insights tab.
 * Shared by the Relationships graph and table views.
 */
const useNavigateToResource = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const id_token = user?.token || '';

  return (tableFqn: string) => {
    dispatch(pushToHistory('insights'));
    dispatch({ type: 'entry/setLineageToEntryCopy', payload: true });
    dispatch(fetchLineageEntry({ fqn: toEntryFqn(tableFqn), id_token }));
    navigate('/view-details');
  };
};

export default useNavigateToResource;
