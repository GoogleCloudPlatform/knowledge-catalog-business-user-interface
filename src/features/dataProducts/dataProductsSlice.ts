import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import { URLS } from '../../constants/urls';
import type { Project } from '../projects/projectsSlice';
import { findProjectByNumber, resolveProjectNumber } from '../../utils/resourceUtils';
import {
  isDataProductsStale,
  loadDataProductsCache,
  saveDataProductsCache,
  type ProjectIdentity,
} from '../../utils/dataProductsCache';

/**
 * Data Products list loading
 * --------------------------
 * The list is the union of two sources fetched IN PARALLEL:
 *  - GET /data-products         : dataProducts.list for the configured projects.
 *                                 Each product is tagged by the backend with
 *                                 `projectId` and `projectNumber`.
 *  - GET /data-products/search  : the org-wide catalog search (scoped server-side),
 *                                 tagged with `projectNumber` and best-effort
 *                                 `projectId`.
 *
 * The API list is rendered as soon as it arrives; search-only products are
 * appended when the search resolves. Neither step needs the org-wide
 * /get-projects list: a search hit can only duplicate an API product if it is
 * in one of the API products' projects, and those carry both spellings of the
 * project (id and number). The /get-projects list, if already loaded, is still
 * used as an extra source of spellings.
 */

/** A data product as listed (API product or mapped search-only product). */
export type DataProductItem = {
  name: string;
  projectId?: string | null;
  projectNumber?: string | null;
  isOutOfScope?: boolean;
  [key: string]: unknown;
};

/** The parts of the root state these thunks read. */
type RootLike = {
  dataProducts?: DataProductsState;
  projects?: { items?: Project[] };
};
const rootOf = (getState: () => unknown) => getState() as RootLike;

type SearchItem = {
  resource: string;
  projectNumber?: string | null;
  projectId?: string | null;
  displayName?: string | null;
  description?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
  labels?: Record<string, string> | null;
};

const splitProjectResource = (resource: string): { segment: string; rest: string } | null => {
  const match = String(resource || '').match(/^projects\/([^/]+)\/(.*)$/);
  return match ? { segment: match[1], rest: match[2] } : null;
};

/**
 * Every way the same product's resource path can be spelled, so the two sources
 * can be matched against each other. The project segment is deliberately kept
 * in the key: two different products can share a location and id across
 * projects, so stripping the project would wrongly collapse them. Matching on
 * ANY overlap means an unresolvable project degrades to "match only the exact
 * string" instead of "produce a key that matches nothing".
 */
export const resourceKeyVariants = (
  resource: string,
  spellings: { projectId?: string | null; projectNumber?: string | null },
  projectsList: Project[] = [],
): string[] => {
  const parts = splitProjectResource(resource);
  if (!parts) return resource ? [resource] : [];
  const { segment, rest } = parts;
  const ids = new Set<string>([segment]);
  if (spellings.projectId) ids.add(spellings.projectId);
  if (spellings.projectNumber) ids.add(spellings.projectNumber);
  // Optional enrichment from /get-projects when it happens to be loaded.
  const fromListId = findProjectByNumber(segment, projectsList)?.projectId;
  if (fromListId) ids.add(fromListId);
  const fromListNumber = resolveProjectNumber(segment, projectsList);
  if (fromListNumber) ids.add(fromListNumber);
  return [...ids].map((id) => `projects/${id}/${rest}`);
};

// Map a search item into the same shape as an API data product.
const mapSearchItemToDataProduct = (item: SearchItem): DataProductItem => {
  const parts = splitProjectResource(item.resource);
  // Normalize the resource path to the project id when known.
  const name = parts && item.projectId ? `projects/${item.projectId}/${parts.rest}` : item.resource;
  return {
    name,
    displayName: item.displayName ?? null,
    description: item.description ?? null,
    createTime: item.createTime ?? null,
    updateTime: item.updateTime ?? null,
    labels: item.labels ?? null,
    ownerEmails: [],
    assetCount: null,
    icon: null,
    accessGroups: null,
    accessApprovalConfig: null,
    etag: '',
    label: '',
    projectId: item.projectId ?? null,
    projectNumber: item.projectNumber ?? null,
    // Found only via the org-wide Search index, not the configured projects'
    // dataProducts.list - the user may not actually have access to it.
    // Drives the "Limited access" badge and the access-denied UX on click.
    isOutOfScope: true,
  };
};

/** Merge API products with search items, dropping search repeats. Pure. */
export const mergeDataProducts = (
  apiProducts: DataProductItem[],
  searchItems: SearchItem[],
  projectsList: Project[] = [],
): DataProductItem[] => {
  const seen = new Set<string>();
  apiProducts.forEach((p) => {
    resourceKeyVariants(p?.name, { projectId: p?.projectId, projectNumber: p?.projectNumber }, projectsList)
      .forEach((key) => seen.add(key));
  });
  const searchOnly: DataProductItem[] = [];
  searchItems.forEach((item) => {
    const variants = resourceKeyVariants(item?.resource, item, projectsList);
    if (!variants.length) return;
    if (variants.some((key) => seen.has(key))) return;
    variants.forEach((key) => seen.add(key));
    searchOnly.push(mapSearchItemToDataProduct(item));
  });
  return [...apiProducts, ...searchOnly];
};

const identitiesToMap = (projects: ProjectIdentity[] = []): Record<string, ProjectIdentity> => {
  const out: Record<string, ProjectIdentity> = {};
  projects.forEach((p) => {
    if (p?.projectId && p?.projectNumber) {
      out[p.projectId] = p;
      out[p.projectNumber] = p;
    }
  });
  return out;
};

const collectIdentities = (items: { projectId?: string | null; projectNumber?: string | null }[]): ProjectIdentity[] =>
  items
    .filter((i) => i?.projectId && i?.projectNumber)
    .map((i) => ({ projectId: i.projectId as string, projectNumber: i.projectNumber as string }));

export type FetchDataProductsArgs = {
  id_token?: string;
  email?: string | null;
  /** Revalidate without replacing what is on screen. */
  background?: boolean;
};

type FetchMeta = { epoch: number };

export const fetchDataProductsList = createAsyncThunk<
  { items: DataProductItem[]; projectIdentity: Record<string, ProjectIdentity>; searchFailed: boolean; fetchedAt: number },
  FetchDataProductsArgs,
  { rejectedMeta: FetchMeta; fulfilledMeta: FetchMeta }
>('dataProducts/fetchDataProductsList', async (requestData, { rejectWithValue, fulfillWithValue, getState, dispatch }) => {
  const epochAtStart = rootOf(getState).dataProducts?.epoch ?? 0;
  axios.defaults.headers.common['Authorization'] = requestData?.id_token ? `Bearer ${requestData.id_token}` : '';

  // Both requests start immediately.
  const apiPromise = axios.get(URLS.API_URL + URLS.DATA_PRODUCTS);
  const searchPromise = axios.get(URLS.API_URL + URLS.DATA_PRODUCTS_SEARCH);
  // Handled below; this only avoids an unhandled rejection if the API call fails first.
  Promise.resolve(searchPromise).catch(() => undefined);

  try {
    const apiResponse = await apiPromise;
    const apiProducts: DataProductItem[] = apiResponse.data?.dataProducts || [];
    const apiProjects: ProjectIdentity[] = apiResponse.data?.projects || [];

    // Progressive render: show the configured projects' products right away.
    if (!requestData?.background) {
      dispatch(dataProductsApiListReceived({ items: apiProducts, projects: apiProjects, epoch: epochAtStart }));
    }

    let searchItems: SearchItem[] = [];
    let searchFailed = false;
    try {
      const searchResponse = await searchPromise;
      searchItems = searchResponse.data?.items || [];
    } catch (err) {
      console.warn('Data products catalog search failed; showing configured projects only.', err);
      searchFailed = true;
    }

    const projectsList: Project[] = rootOf(getState).projects?.items ?? [];
    const items = mergeDataProducts(apiProducts, searchItems, projectsList);
    const projectIdentity = {
      ...identitiesToMap(apiProjects),
      ...identitiesToMap(collectIdentities(searchItems)),
    };
    const fetchedAt = Date.now();

    if ((rootOf(getState).dataProducts?.epoch ?? 0) === epochAtStart && !searchFailed) {
      saveDataProductsCache(requestData?.email, { items, projectIdentity, fetchedAt });
    }

    return fulfillWithValue({ items, projectIdentity, searchFailed, fetchedAt }, { epoch: epochAtStart });
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 403) {
        return rejectWithValue({ type: 'PERMISSION_DENIED' }, { epoch: epochAtStart });
      }
      return rejectWithValue(error.response?.data || error.message, { epoch: epochAtStart });
    }
    return rejectWithValue('An unknown error occurred', { epoch: epochAtStart });
  }
}, {
  // Never run two list fetches at once (mount + sidebar click, double mounts).
  condition: (_arg, { getState }) => {
    const s = rootOf(getState).dataProducts;
    return !(s?.status === 'loading' || s?.isRefreshing);
  },
});

/**
 * Show data as fast as possible, then make sure it is fresh:
 *  1. Already in memory and fresh  -> nothing to do.
 *  2. Empty in memory              -> hydrate from the persisted cache (if any).
 *  3. Nothing to show              -> foreground fetch (skeleton).
 *  4. Showing stale data           -> background revalidation (no skeleton).
 */
export const ensureDataProductsLoaded = createAsyncThunk(
  'dataProducts/ensureDataProductsLoaded',
  async (requestData: FetchDataProductsArgs, { getState, dispatch }) => {
    const current = () => rootOf(getState).dataProducts ?? initialState;
    if (current().status === 'loading' || current().isRefreshing) return;

    if (current().status !== 'succeeded' && (current().dataProductsItems?.length ?? 0) === 0) {
      const epoch = current().epoch;
      const cached = await loadDataProductsCache(requestData?.email);
      const s = current();
      if (cached && s.epoch === epoch && s.status !== 'succeeded' && s.status !== 'loading' && (s.dataProductsItems?.length ?? 0) === 0) {
        dispatch(hydrateDataProducts(cached));
      }
    }

    const s = current();
    if (s.status === 'loading' || s.isRefreshing) return;
    if (s.status !== 'succeeded') {
      dispatch(fetchDataProductsList({ ...requestData, background: false }));
    } else if (isDataProductsStale(s.fetchedAt)) {
      dispatch(fetchDataProductsList({ ...requestData, background: true }));
    }
  },
);

export const getDataProductDetails = createAsyncThunk('dataProducts/getDataProductDetails', async (requestData: any , { rejectWithValue }) => {
  // If the requestData is empty, we are returning an empty list.
  if (!requestData) {
    return [];
  }

  try {
    axios.defaults.headers.common['Authorization'] = requestData.id_token ? `Bearer ${requestData.id_token}` : '';

    // The backend builds the catalog entry name (which needs the project
    // NUMBER) from the data product resource name, resolving and caching the
    // project identity itself - so this no longer waits for /get-projects.
    const response = await axios.get(URLS.API_URL + URLS.DATA_PRODUCT_DETAILS, {
      params: { dataProduct: requestData.dataProductId },
    });

    return response.status === 200 || response.status !== 401 ? response.data
    : rejectWithValue('Token expired');

  } catch (error) {
    if (error instanceof AxiosError) {
      const axiosError = error as AxiosError;
      // Handle 403 Forbidden separately - don't trigger global logout
      if (axiosError.response?.status === 403) {
        // Plain object, matching fetchDataProductsList's PERMISSION_DENIED
        // shape - not JSON.stringify'd, so consumers can branch on `.type`
        // instead of having to parse it back out of a string.
        return rejectWithValue({
          type: "PERMISSION_DENIED",
          message: "You don't have access to this resource",
          itemId: requestData.dataProductId,
        });
      }
      return rejectWithValue(axiosError.response?.data || axiosError.message);
    }
    return rejectWithValue('An unknown error occurred');
  }
});

export const fetchDataProductsAssetsList = createAsyncThunk('dataProducts/fetchDataProductsAssetsList', async (requestData: any , { rejectWithValue }) => {
  // If the requestData is empty, we are returning an empty list.
  if (!requestData) {
    return [];
  }

  try {
    axios.defaults.headers.common['Authorization'] = requestData.id_token ? `Bearer ${requestData.id_token}` : '';
    // dataProductId may be the catalog entry name
    // (projects/{p}/locations/{l}/entryGroups/@dataplex/entries/.../dataProducts/{id})
    // or the data product name. The backend normalizes a project number to its
    // project id (cached), so no project list is needed here.
    const parts = requestData.dataProductId.split('/');
    const project = parts[1];
    const location = parts[3];
    const finalEntryName = `projects/${project}/locations/${location}/dataProducts/${parts[parts.length - 1]}`;

    const response = await axios.get(URLS.API_URL + URLS.DATA_PRODUCT_ASSETS, {
        params: { dataProduct: finalEntryName }
    });
    return response.status === 200 || response.status !== 401 ? [
      ...(response.data?.dataAssets || [])
     ] : rejectWithValue('Token expired');

  } catch (error) {
    if (error instanceof AxiosError) {
      return rejectWithValue(error.response?.data || error.message);
    }
    return rejectWithValue('An unknown error occurred');
  }
});


type DataProductsState = {
  dataProductsItems: DataProductItem[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | undefined | unknown | null;
  /** Catalog search part of the list (search-only products load after the API list). */
  searchStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  /** A background revalidation is running; what is on screen stays visible. */
  isRefreshing: boolean;
  /** When the list was last fetched successfully (ms epoch). */
  fetchedAt: number | null;
  /** id/number -> identity, collected from the list responses. */
  projectIdentity: Record<string, ProjectIdentity>;
  /** Incremented by clearDataProducts (logout) to discard in-flight responses. */
  epoch: number;
  selectedDataProductDetails?: unknown|any; // Replace 'unknown' with your actual resource type
  selectedDataProductStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  selectedDataProductError: string | undefined | unknown | null;
  dataProductAssets: unknown;
  dataProductAssetsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  dataProductAssetsError: string | undefined | unknown | null;
  // UI state preserved across navigation
  viewMode: 'table' | 'list';
  detailTabValue: number;
};

const initialState: DataProductsState = {
  dataProductsItems: [],
  status: 'idle',
  error: null,
  searchStatus: 'idle',
  isRefreshing: false,
  fetchedAt: null,
  projectIdentity: {},
  epoch: 0,
  selectedDataProductDetails: {},
  selectedDataProductStatus: 'idle',
  selectedDataProductError: null,
  dataProductAssets: [],
  dataProductAssetsStatus: 'idle',
  dataProductAssetsError: null,
  viewMode: 'list',
  detailTabValue: 0,
};

// createSlice generates actions and reducers for a slice of the Redux state.
export const dataproductsSlice = createSlice({
  name: 'dataproducts',
  initialState,
  reducers: {
    setDataProductsViewMode: (state, action: { payload: 'table' | 'list' }) => {
      state.viewMode = action.payload;
    },
    setDataProductsDetailTabValue: (state, action: { payload: number }) => {
      state.detailTabValue = action.payload;
    },
    resetDataProductsUIState: (state) => {
      state.viewMode = 'list';
      state.detailTabValue = 0;
    },
    resetSelectedDataProduct: (state) => {
      state.selectedDataProductStatus = 'idle';
      state.selectedDataProductDetails = {};
      state.selectedDataProductError = null;
    },
    /** First half of a foreground fetch: the configured projects' products. */
    dataProductsApiListReceived: (state, action: PayloadAction<{ items: DataProductItem[]; projects: ProjectIdentity[]; epoch: number }>) => {
      if (action.payload.epoch !== state.epoch) return;
      state.status = 'succeeded';
      state.dataProductsItems = action.payload.items || [];
      state.searchStatus = 'loading';
      state.projectIdentity = { ...state.projectIdentity, ...identitiesToMap(action.payload.projects) };
    },
    /** Render from the persisted cache (revalidation is decided by the caller). */
    hydrateDataProducts: (state, action: PayloadAction<{ items: unknown[]; projectIdentity?: Record<string, ProjectIdentity>; fetchedAt: number }>) => {
      if (state.status === 'succeeded' || state.status === 'loading') return;
      state.dataProductsItems = (action.payload.items || []) as DataProductItem[];
      state.projectIdentity = { ...state.projectIdentity, ...(action.payload.projectIdentity || {}) };
      state.fetchedAt = action.payload.fetchedAt;
      state.status = 'succeeded';
      state.searchStatus = 'succeeded';
      state.error = null;
    },
    /** Logout: drop the user's list and invalidate in-flight responses. */
    clearDataProducts: (state) => ({ ...initialState, epoch: state.epoch + 1 }),
  },
  // The `extraReducers` field lets the slice handle actions defined elsewhere,
  // including actions generated by createAsyncThunk.
  extraReducers: (builder) => {
    builder
      .addCase(fetchDataProductsList.pending, (state, action) => {
        state.error = null;
        if (action.meta?.arg?.background) {
          state.isRefreshing = true;
        } else {
          state.status = 'loading';
          state.searchStatus = 'loading';
        }
      })
      .addCase(fetchDataProductsList.fulfilled, (state, action) => {
        if (action.meta?.epoch !== undefined && action.meta.epoch !== state.epoch) return; // stale response from a cleared session
        state.status = 'succeeded';
        state.isRefreshing = false;
        state.dataProductsItems = action.payload?.items || [];
        state.searchStatus = action.payload?.searchFailed ? 'failed' : 'succeeded';
        state.fetchedAt = action.payload?.fetchedAt ?? Date.now();
        state.projectIdentity = { ...state.projectIdentity, ...(action.payload?.projectIdentity || {}) };
      })
      .addCase(fetchDataProductsList.rejected, (state, action) => {
        if (action.meta?.condition) return; // skipped by `condition`, nothing was started
        if (action.meta?.epoch !== undefined && action.meta.epoch !== state.epoch) return;
        if (action.meta?.arg?.background) {
          // Keep showing what we have; try again on the next visit.
          state.isRefreshing = false;
          return;
        }
        state.status = 'failed';
        state.searchStatus = 'idle';
        state.error = action.payload;
      })
      .addCase(getDataProductDetails.pending, (state) => {
        state.selectedDataProductStatus = 'loading';
      })
      .addCase(getDataProductDetails.fulfilled, (state, action) => {
        state.selectedDataProductStatus = 'succeeded';
        state.selectedDataProductDetails = action.payload;
      })
      .addCase(getDataProductDetails.rejected, (state, action) => {
        state.selectedDataProductStatus = 'failed';
        state.selectedDataProductError = action.payload;
      })
      .addCase(fetchDataProductsAssetsList.pending, (state) => {
        state.dataProductAssetsStatus = 'loading';
        state.dataProductAssets = [];  // Clear old assets when fetching new ones
      })
      .addCase(fetchDataProductsAssetsList.fulfilled, (state, action) => {
        state.dataProductAssetsStatus = 'succeeded';
        state.dataProductAssets = action.payload || [];
      })
      .addCase(fetchDataProductsAssetsList.rejected, (state, action) => {
        state.dataProductAssetsStatus = 'failed';
        state.dataProductAssetsError = action.payload;
      })
  },
});

export const {
  setDataProductsViewMode,
  setDataProductsDetailTabValue,
  resetDataProductsUIState,
  resetSelectedDataProduct,
  dataProductsApiListReceived,
  hydrateDataProducts,
  clearDataProducts,
} = dataproductsSlice.actions;
export default dataproductsSlice.reducer;
