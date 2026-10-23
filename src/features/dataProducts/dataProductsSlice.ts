import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import { URLS } from '../../constants/urls';
import type { Project } from '../projects/projectsSlice';
import { findProjectByNumber, resolveProjectNumber } from '../../utils/resourceUtils';

// Replace the project number segment in a resource path with its project id,
// using the /get-projects list (the single source for project identity).
// e.g. projects/123456789/... -> projects/my-project-id/...
const replaceProjectNumberWithProjectId = (resource: string, projectsList: Project[]): string => {
  if (!resource) return resource;
  const match = resource.match(/projects\/([^/]+)/);
  if (!match) return resource;
  const projectNumber = match[1];
  const projectId = findProjectByNumber(projectNumber, projectsList)?.projectId;
  return projectId ? resource.replace(`projects/${projectNumber}`, `projects/${projectId}`) : resource;
}

// Every way the same product's resource path can be spelled, so the two sources
// below can be matched against each other.
//
// The dataProducts.list API and the Search index do not agree on how to name the
// project segment - one may use the project id (my-project), the other the project
// number (123456789). The previous approach canonicalized both to a single form,
// but that silently produced a *different* key when the project could not be
// resolved (an empty/partial /get-projects list), so the same product failed to
// match itself and was listed twice.
//
// Emitting every spelling we can derive and matching on ANY overlap removes that
// failure mode: an unresolvable project degrades to "match only the exact string"
// instead of "produce a key that matches nothing".
//
// The project segment is deliberately kept in the key. Two genuinely different
// products can share a location and id across projects (e.g. `subtitles` in three
// different projects), so stripping the project would wrongly collapse them.
const resourceKeyVariants = (resource: string, projectsList: Project[]): string[] => {
  if (!resource) return [];
  const match = resource.match(/^projects\/([^/]+)\/(.*)$/);
  if (!match) return [resource];
  const [, identifier, rest] = match;
  const variants = new Set<string>([`projects/${identifier}/${rest}`]);
  // identifier is a project number -> add the project id spelling
  const projectId = findProjectByNumber(identifier, projectsList)?.projectId;
  if (projectId) variants.add(`projects/${projectId}/${rest}`);
  // identifier is a project id -> add the project number spelling
  const projectNumber = resolveProjectNumber(identifier, projectsList);
  if (projectNumber) variants.add(`projects/${projectNumber}/${rest}`);
  return [...variants];
}

// Map a search entry (dataplexEntry) into the same shape as an API data product.
// Fields that are not available from search are defaulted to null, and list
// fields (e.g. ownerEmails) to an empty array.
const mapSearchEntryToDataProduct = (searchEntry: any) => {
  const entry = searchEntry?.dataplexEntry ?? {};
  const source = entry.entrySource ?? {};
  return {
    // Use the resource path as the name so it matches the API data products list.
    name: source.resource ?? null,
    displayName: source.displayName ?? null,
    description: source.description ?? null,
    createTime: entry.createTime ?? null,
    updateTime: entry.updateTime ?? null,
    labels: source.labels ?? null,
    ownerEmails: [],
    assetCount: null,
    icon: null,
    accessGroups: null,
    accessApprovalConfig: null,
    etag:"",
    label:"",
    // Found only via the org-wide Search index, not the user's own project's
    // dataProducts.list API - the user may not actually have access to it.
    // Drives the "Limited access" badge and the access-denied UX on click.
    isOutOfScope: true,
  };
}

// createAsyncThunk is used for asynchronous actions.
// It will automatically dispatch pending, fulfilled, and rejected actions.
export const fetchDataProductsList = createAsyncThunk('dataProducts/fetchDataProductsList', async (requestData: any , { rejectWithValue, getState }) => {
  // If the requestData is empty, we are returning an empty list.
  if (!requestData) {
    return [];
  }

  try {
    // fetching data products from API endpoint
    axios.defaults.headers.common['Authorization'] = requestData.id_token ? `Bearer ${requestData.id_token}` : '';
    // Project identity mapping comes from /get-projects - the single source for
    // translating between project id and project number.
    //
    // Both sources always contribute to the list; the Search index is expected to
    // re-send products the API already returned, and those repeats are collapsed
    // below. Matching them needs this mapping, so callers must not dispatch until
    // it is loaded - see the `projects.isloaded` gates at the dispatch sites.
    const projectsList: Project[] = (getState() as any).projects?.items ?? [];
    const appConfig = (getState() as any).user?.userData?.appConfig;
    const response = await axios.get(URLS.API_URL + URLS.DATA_PRODUCTS);
    console.log("API response", response);
    const searchDataProducts =  async () => {
      let queryString = '(type=DATA_PRODUCT)';
      if (appConfig?.projectsRestricted === true && appConfig?.configuredProjectIds?.length > 0) {
        queryString += ` (projectid=(${appConfig.configuredProjectIds.join('|')}))`;
      }
      const result = await axios.post(
        URLS.API_URL + URLS.SEARCH_ENTRIES,
        { project: import.meta.env.VITE_GOOGLE_PROJECT_ID, location: 'global', query: queryString, orderBy: 'relevance', pageSize: 1000 },
      );

      if (result.status === 200) {
        
        const results = result.data.results || [];
        // Normalize each entry's resource path: replace projects/{projectNumber}
        // with projects/{projectId} using the /get-projects mapping.
        return results.map((entry: any) => {
          const resource = entry?.dataplexEntry?.entrySource?.resource;
          if (resource) {
            entry.dataplexEntry.entrySource.resource = replaceProjectNumberWithProjectId(resource, projectsList);
          }
          return entry;
        });
      } else {
        return [];
      }
    };

    if(response.status === 200 || response.status !== 401) {
      const searchResults = await searchDataProducts();
      console.log("Search Results:", searchResults);
      // Merge the search results with the API response dataProducts based on resource path.
      const projectDataProducts = response.data.dataProducts || [];

      // Every spelling of every product already in the API list. `seen` grows as
      // search-only products are accepted, so it also stops the Search index from
      // contributing the same product twice (it is matched against the products
      // already taken, not just against the API list).
      const seen = new Set<string>();
      projectDataProducts.forEach((p: any) => {
        resourceKeyVariants(p?.name, projectsList).forEach((key) => seen.add(key));
      });

      // Find search entries that are NOT present in the API data products list.
      // Out-of-scope products are the point of the org-wide search, so they are
      // kept (flagged isOutOfScope) - only genuine repeats are dropped.
      const searchOnlyProducts: ReturnType<typeof mapSearchEntryToDataProduct>[] = [];
      searchResults.forEach((searchEntry: any) => {
        const variants = resourceKeyVariants(
          searchEntry?.dataplexEntry?.entrySource?.resource,
          projectsList,
        );
        if (!variants.length) return;
        if (variants.some((key) => seen.has(key))) return;
        variants.forEach((key) => seen.add(key));
        searchOnlyProducts.push(mapSearchEntryToDataProduct(searchEntry));
      });
      console.log("Search-only Data Products (not in API list):", searchOnlyProducts);

      const mergedDataProducts = [...projectDataProducts, ...searchOnlyProducts];
      return mergedDataProducts;
    } else {
      return rejectWithValue('Token expired');
    }
    
    
    // return response.status === 200 || response.status !== 401 ? [
    //   ...response.data.dataProducts
    //  ] : rejectWithValue('Token expired');
    //return mockSearchData; // For testing, we return mock data

  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 403) {
        return rejectWithValue({ type: 'PERMISSION_DENIED' });
      }
      return rejectWithValue(error.response?.data || error.message);
    }
    return rejectWithValue('An unknown error occurred');
  }
});

export const getDataProductDetails = createAsyncThunk('dataProducts/getDataProductDetails', async (requestData: any , { rejectWithValue, getState }) => {
  // If the requestData is empty, we are returning an empty list.
  if (!requestData) {
    return [];
  }

  try {
    // fetching data products from API endpoint 
    axios.defaults.headers.common['Authorization'] = requestData.id_token ? `Bearer ${requestData.id_token}` : '';
    
    const project = requestData.dataProductId.split('/')[1];
    const location = requestData.dataProductId.split('/')[3];
    // Project number comes from /get-projects — the single source for project
    // identity. An unknown project yields '' here, which produces a malformed
    // entry name and a clear API error rather than a silently wrong lookup.
    const projectsList: Project[] = (getState() as any).projects?.items ?? [];
    const projectNumber = resolveProjectNumber(project, projectsList) || project;  // fallback to the original project string if not found
    const finalEntryName = `projects/${project}/locations/${location}/entryGroups/@dataplex/entries/projects/${projectNumber}/locations/${location}/dataProducts/${requestData.dataProductId.split('/')[5]}`;


    const response = await axios.get(URLS.API_URL + URLS.DATA_PRODUCT_DETAILS, {
    params: {
        project,
        location,
        entry: finalEntryName
    }
    });

    console.log("API response", response);
    return response.status === 200 || response.status !== 401 ? response.data
    : rejectWithValue('Token expired');
    //return mockSearchData; // For testing, we return mock data

  } catch (error) {
    if (error instanceof AxiosError) {
      const axiosError = error as AxiosError;
      // Handle 403 Forbidden separately - don't trigger global logout
      console.log("axiosError.response?.status", axiosError.response);
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

export const fetchDataProductsAssetsList = createAsyncThunk('dataProducts/fetchDataProductsAssetsList', async (requestData: any , { rejectWithValue, getState }) => {
  // If the requestData is empty, we are returning an empty list.
  if (!requestData) {
    return [];
  }

  try {
    // fetching data products from API endpoint 
    axios.defaults.headers.common['Authorization'] = requestData.id_token ? `Bearer ${requestData.id_token}` : '';
    let projectid = requestData.dataProductId.split('/')[1];

    // Resolve projectid against appConfig.projects: if it is not a known projectId
    // it may actually be a project number, so look it up by name
    // (projects/{projectNumber}) and swap in the matching projectId.
     const projects: Project[] = (getState() as any).projects?.items ?? [];
    if (!projects.some((p) => p.projectId === projectid)) {
      const matchedProject = projects.find((p) => p.name === `projects/${projectid}`);
      if (matchedProject?.projectId) {
        projectid = matchedProject.projectId;
      }
    }

    const location = requestData.dataProductId.split('/')[3];
    const finalEntryName = `projects/${projectid}/locations/${location}/dataProducts/${requestData.dataProductId.split('/').pop()}`;

    const response = await axios.get(URLS.API_URL + URLS.DATA_PRODUCT_ASSETS, {
        params: { dataProduct: finalEntryName }
    });
    console.log("Data Products Assets API response", response);
    return response.status === 200 || response.status !== 401 ? [
      ...response.data.dataAssets
     ] : rejectWithValue('Token expired');
    //return mockSearchData; // For testing, we return mock data

  } catch (error) {
    if (error instanceof AxiosError) {
      return rejectWithValue(error.response?.data || error.message);
    }
    return rejectWithValue('An unknown error occurred');
  }
});


type DataProductsState = {
  dataProductsItems: unknown; // Replace 'unknown' with your actual resource type
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | undefined | unknown | null;
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
  },
  // The `extraReducers` field lets the slice handle actions defined elsewhere,
  // including actions generated by createAsyncThunk.
  extraReducers: (builder) => {
    builder
      .addCase(fetchDataProductsList.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDataProductsList.fulfilled, (state, action) => {
        state.status = 'succeeded';
        console.log("Fetched Data Products:", action.payload);
        state.dataProductsItems = action.payload || [];
      })
      .addCase(fetchDataProductsList.rejected, (state, action) => {
        state.status = 'failed';
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
        console.log("Fetched Data Products Assets:", action.payload);
        state.dataProductAssets = action.payload || [];
      })
      .addCase(fetchDataProductsAssetsList.rejected, (state, action) => {
        state.dataProductAssetsStatus = 'failed';
        state.dataProductAssetsError = action.payload;
      })
  },
});

export const { setDataProductsViewMode, setDataProductsDetailTabValue, resetDataProductsUIState, resetSelectedDataProduct } = dataproductsSlice.actions;
export default dataproductsSlice.reducer;