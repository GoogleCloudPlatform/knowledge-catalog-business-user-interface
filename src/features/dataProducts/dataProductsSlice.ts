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
  console.log("replaceProjectNumberWithProjectId: match:", match);
  if (!match) return resource;
  const projectNumber = match[1];
  const projectId = findProjectByNumber(projectNumber, projectsList)?.projectId;
  return projectId ? resource.replace(`projects/${projectNumber}`, `projects/${projectId}`) : resource;
}

// Canonicalize a resource path's project segment to project-number form, so
// resource names coming from different APIs (the Dataplex data products list,
// which returns project number, vs. the search index, whose resource we've
// already rewritten to project id via replaceProjectNumberWithProjectId) can
// be compared reliably when de-duping. Falls through unchanged when the
// identifier isn't found in the /get-projects list (already-numeric ids, or
// the list not loaded yet) rather than throwing off the comparison.
const canonicalizeResourceProject = (resource: string, projectsList: Project[]): string => {
  if (!resource) return resource;
  const projects = projectsList ?? [];
  const match = resource.match(/^projects\/([^/]+)/);
  if (!match) return resource;
  const identifier = match[1];
  // Already a project number (matches a known project's canonical name) - keep as-is.
  if (projects.some((p) => p.name === `projects/${identifier}`)) return resource;
  // Otherwise treat it as a project id and resolve it to its project number.
  const projectNumber = projects.find((p) => p.projectId === identifier)?.name?.split('/')[1];
  return projectNumber ? resource.replace(`projects/${identifier}`, `projects/${projectNumber}`) : resource;
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
    const appConfig = (getState() as any).user?.userData?.appConfig;
    // Project identity mapping comes from /get-projects; appConfig is used only
    // for scoping (projectsRestricted / configuredProjectIds).
    const projectsList: Project[] = (getState() as any).projects?.items ?? [];
    const params: Record<string, string> = {};
    if (appConfig?.projectsRestricted && appConfig?.configuredProjectIds?.length > 0) {
      params.projectIds = appConfig.configuredProjectIds.join(',');
    }
    const response = await axios.get(URLS.API_URL + URLS.DATA_PRODUCTS, { params });
    console.log("API response", response);
    const searchDataProducts =  async () => {
      const result = await axios.post(
        URLS.API_URL + URLS.SEARCH_ENTRIES,
        { project: import.meta.env.VITE_GOOGLE_PROJECT_ID, location: 'global', query: '(type=DATA_PRODUCT)', orderBy: 'relevance', pageSize: 1000 },
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
      // Set of API data product resource names for quick lookup, canonicalized
      // to project-number form so it lines up with the search resource below
      // regardless of which project-identifier format either API returned.
      const projectDataProductNames = new Set(
        projectDataProducts
          .map((p: any) => canonicalizeResourceProject(p?.name, projectsList))
          .filter(Boolean)
      );

      // Find search entries that are NOT present in the API data products list,
      // matched by dataplexEntry.entrySource.resource === dataProduct.name.
      const searchOnlyProducts = searchResults
        .filter((searchEntry: any) => {
          const searchResource = searchEntry?.dataplexEntry?.entrySource?.resource;
          const canonicalSearchResource = canonicalizeResourceProject(searchResource, projectsList);
          return canonicalSearchResource && !projectDataProductNames.has(canonicalSearchResource);
        })
        .map(mapSearchEntryToDataProduct);
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