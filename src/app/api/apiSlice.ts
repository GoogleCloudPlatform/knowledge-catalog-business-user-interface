/* eslint-disable @typescript-eslint/ban-types */
import { type BaseQueryApi, createApi, type FetchArgs, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { isAuthenticationError } from '../../services/authErrorService';
import { recordTiming } from '../../utils/apiTiming';

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).user.token;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

const baseQueryWithReauth = async (args: string | FetchArgs, api: BaseQueryApi, extraOptions: {}) => {
  const start = performance.now();
  const result = await baseQuery(args, api, extraOptions);

  const url = typeof args === 'string' ? args : args.url;
  const method = typeof args === 'string' ? 'GET' : args.method ?? 'GET';
  const status =
    (result.meta?.response?.status as number | undefined) ??
    (result.error?.status as number | string | undefined) ??
    'unknown';
  recordTiming(method, url, performance.now() - start, status);

  // Check for authentication errors
  if (result.error && isAuthenticationError(result.error)) {
    api.dispatch({ type: 'auth/authenticationError' });
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});
