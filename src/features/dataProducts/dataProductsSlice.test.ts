import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import dataProductsReducer, {
  fetchDataProductsList,
  ensureDataProductsLoaded,
  getDataProductDetails,
  fetchDataProductsAssetsList,
  dataproductsSlice,
  mergeDataProducts,
  hydrateDataProducts,
  clearDataProducts,
} from "./dataProductsSlice";
import * as dpCache from "../../utils/dataProductsCache";
import userReducer from "../user/userSlice";
import projectsReducer from "../projects/projectsSlice";

// ==========================================================================
// Mock axios
// ==========================================================================

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    // fetchDataProductsList also calls axios.post (SEARCH_ENTRIES) to merge in
    // any data products found only via search. Default to "no search results"
    // so existing tests that only stub axios.get keep seeing exactly their
    // mocked dataProducts list; tests exercising the merge override this.
    post: vi.fn().mockResolvedValue({ status: 200, data: { results: [] } }),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
  AxiosError: class AxiosError extends Error {
    response?: { data: unknown };
    constructor(message: string, response?: { data: unknown }) {
      super(message);
      this.name = "AxiosError";
      this.response = response;
    }
  },
}));

vi.mock("../../utils/dataProductsCache", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    loadDataProductsCache: vi.fn().mockResolvedValue(null),
    saveDataProductsCache: vi.fn().mockResolvedValue(undefined),
    clearDataProductsCache: vi.fn().mockResolvedValue(undefined),
  };
});

// ==========================================================================
// Mock Data
// ==========================================================================

const mockDataProductsList = [
  {
    name: "projects/test-project/locations/us-central1/dataProducts/product-1",
    displayName: "Product 1",
    description: "Test product 1",
  },
  {
    name: "projects/test-project/locations/us-central1/dataProducts/product-2",
    displayName: "Product 2",
    description: "Test product 2",
  },
];

const mockDataProductDetails = {
  name: "projects/test-project/locations/us-central1/entryGroups/@dataplex/entries/product-1",
  displayName: "Product 1",
  description: "Detailed product info",
  aspects: {
    "dataplex.overview": {
      data: {
        description: "Overview description",
      },
    },
  },
};

const mockDataProductAssets = [
  {
    name: "projects/test-project/locations/us-central1/dataProducts/product-1/dataAssets/asset-1",
    displayName: "Asset 1",
  },
  {
    name: "projects/test-project/locations/us-central1/dataProducts/product-1/dataAssets/asset-2",
    displayName: "Asset 2",
  },
];

// Project identity mapping now comes from the projects slice (/get-projects),
// not from appConfig. appConfig is still used for scoping-only fields.
const mockProjectsList = [
  { projectId: "test-project", name: "projects/123456789" },
  { projectId: "another-project", name: "projects/987654321" },
];

const mockSessionData = {
  appConfig: {},
};

// ==========================================================================
// Helper Functions
// ==========================================================================

const createTestStore = (userData: any = null, projectsItems: any[] = mockProjectsList) => {
  return configureStore({
    reducer: {
      dataProducts: dataProductsReducer,
      user: userReducer,
      projects: projectsReducer,
    },
    preloadedState: {
      user: { token: null, userData, mode: 'light' as const },
      projects: {
        items: projectsItems,
        status: 'succeeded' as const,
        error: null,
        isloaded: true,
        epoch: 0,
      },
    },
  });
};

// ==========================================================================
// Initial State Tests
// ==========================================================================

describe("dataProductsSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // vi.restoreAllMocks() in afterEach wipes vi.fn() implementations (there's
    // no "original" to restore to for a plain mock), so re-establish the
    // default "no search results" stub for every test.
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: { results: [] } });
    vi.mocked(axios.get).mockReset();
    vi.mocked(dpCache.loadDataProductsCache).mockReset().mockResolvedValue(null);
    vi.mocked(dpCache.saveDataProductsCache).mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("returns the initial state", () => {
      const store = createTestStore();
      const state = store.getState().dataProducts;

      expect(state.dataProductsItems).toEqual([]);
      expect(state.status).toBe("idle");
      expect(state.error).toBeNull();
      expect(state.selectedDataProductDetails).toEqual({});
      expect(state.selectedDataProductStatus).toBe("idle");
      expect(state.selectedDataProductError).toBeNull();
      expect(state.dataProductAssets).toEqual([]);
      expect(state.dataProductAssetsStatus).toBe("idle");
      expect(state.dataProductAssetsError).toBeNull();
    });

    it("has correct slice name", () => {
      expect(dataproductsSlice.name).toBe("dataproducts");
    });

    it("exports reducer as default", () => {
      expect(dataProductsReducer).toBeDefined();
      expect(typeof dataProductsReducer).toBe("function");
    });
  });

  // ==========================================================================
  // fetchDataProductsList Tests
  // ==========================================================================

  describe("fetchDataProductsList", () => {
    const DP_URL = "/data-products";
    const SEARCH_URL = "/data-products/search";

    // Route axios.get by URL: the list and the catalog search are separate calls.
    const mockGets = (api: any, search: any = { status: 200, data: { items: [] } }) => {
      vi.mocked(axios.get).mockImplementation((url: string) => {
        if (url.endsWith(SEARCH_URL)) {
          return search instanceof Error ? Promise.reject(search) : Promise.resolve(search);
        }
        if (url.endsWith(DP_URL)) {
          return api instanceof Error ? Promise.reject(api) : Promise.resolve(api);
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      });
    };

    describe("Pending State", () => {
      it("sets status to loading when pending (foreground)", () => {
        const store = createTestStore();
        store.dispatch({ type: fetchDataProductsList.pending.type, meta: { arg: {} } });
        const state = store.getState().dataProducts;
        expect(state.status).toBe("loading");
        expect(state.searchStatus).toBe("loading");
      });

      it("keeps status and sets isRefreshing for background revalidation", () => {
        const store = createTestStore();
        store.dispatch(hydrateDataProducts({ items: mockDataProductsList, fetchedAt: 1 }));
        store.dispatch({ type: fetchDataProductsList.pending.type, meta: { arg: { background: true } } });
        const state = store.getState().dataProducts;
        expect(state.status).toBe("succeeded");
        expect(state.isRefreshing).toBe(true);
        expect(state.dataProductsItems).toEqual(mockDataProductsList);
      });
    });

    describe("Fulfilled State", () => {
      it("fetches the list and the catalog search in parallel", async () => {
        let resolveApi: (v: any) => void = () => {};
        vi.mocked(axios.get).mockImplementation((url: string) => {
          if (url.endsWith(SEARCH_URL)) return Promise.resolve({ status: 200, data: { items: [] } });
          return new Promise((r) => { resolveApi = r; });
        });
        const store = createTestStore();
        const p = store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        // Both requests were issued before the list resolved.
        expect(vi.mocked(axios.get).mock.calls.map((c) => c[0])).toEqual([
          expect.stringContaining(DP_URL),
          expect.stringContaining(SEARCH_URL),
        ]);
        resolveApi({ status: 200, data: { dataProducts: mockDataProductsList } });
        await p;
        expect(store.getState().dataProducts.status).toBe("succeeded");
      });

      it("renders the API list before the catalog search resolves", async () => {
        let resolveSearch: (v: any) => void = () => {};
        vi.mocked(axios.get).mockImplementation((url: string) => {
          if (url.endsWith(SEARCH_URL)) return new Promise((r) => { resolveSearch = r; });
          return Promise.resolve({ status: 200, data: { dataProducts: mockDataProductsList, projects: [] } });
        });
        const store = createTestStore();
        const p = store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        await vi.waitFor(() => expect(store.getState().dataProducts.status).toBe("succeeded"));
        expect(store.getState().dataProducts.dataProductsItems).toEqual(mockDataProductsList);
        expect(store.getState().dataProducts.searchStatus).toBe("loading");
        resolveSearch({ status: 200, data: { items: [] } });
        await p;
        expect(store.getState().dataProducts.searchStatus).toBe("succeeded");
        expect(store.getState().dataProducts.fetchedAt).toEqual(expect.any(Number));
      });

      it("sets Authorization header when id_token is provided", async () => {
        mockGets({ status: 200, data: { dataProducts: mockDataProductsList } });
        const store = createTestStore();
        await store.dispatch(fetchDataProductsList({ id_token: "test-token" }) as any);
        expect(axios.defaults.headers.common["Authorization"]).toBe("Bearer test-token");
      });

      it("sets empty Authorization header when id_token is not provided", async () => {
        mockGets({ status: 200, data: { dataProducts: mockDataProductsList } });
        const store = createTestStore();
        await store.dispatch(fetchDataProductsList({}) as any);
        expect(axios.defaults.headers.common["Authorization"]).toBe("");
      });

      it("keeps the API list when the catalog search fails", async () => {
        mockGets({ status: 200, data: { dataProducts: mockDataProductsList } }, new Error("search down"));
        const store = createTestStore();
        await store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        const state = store.getState().dataProducts;
        expect(state.status).toBe("succeeded");
        expect(state.searchStatus).toBe("failed");
        expect(state.dataProductsItems).toEqual(mockDataProductsList);
      });

      it("persists the merged list for the user", async () => {
        mockGets(
          { status: 200, data: { dataProducts: mockDataProductsList, projects: [{ projectId: "test-project", projectNumber: "123456789" }] } },
        );
        const store = createTestStore();
        await store.dispatch(fetchDataProductsList({ id_token: "t", email: "a@b.com" }) as any);
        expect(dpCache.saveDataProductsCache).toHaveBeenCalledWith("a@b.com", expect.objectContaining({
          items: mockDataProductsList,
          projectIdentity: expect.objectContaining({ "test-project": expect.anything(), "123456789": expect.anything() }),
          fetchedAt: expect.any(Number),
        }));
      });

      it("handles fulfilled with empty payload by setting empty array", () => {
        const store = createTestStore();
        store.dispatch({ type: fetchDataProductsList.fulfilled.type, payload: null });
        expect(store.getState().dataProducts.dataProductsItems).toEqual([]);
      });

      it("does not start a second fetch while one is in flight", async () => {
        let resolveApi: (v: any) => void = () => {};
        vi.mocked(axios.get).mockImplementation((url: string) => {
          if (url.endsWith(SEARCH_URL)) return Promise.resolve({ status: 200, data: { items: [] } });
          return new Promise((r) => { resolveApi = r; });
        });
        const store = createTestStore();
        const p1 = store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        const p2 = store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2); // one list + one search
        resolveApi({ status: 200, data: { dataProducts: [] } });
        await Promise.all([p1, p2]);
      });
    });

    describe("Search results merge (de-duplication without /get-projects)", () => {
      it("does not duplicate a product whose project is spelled differently in the two sources", async () => {
        mockGets(
          {
            status: 200,
            data: {
              dataProducts: [{
                name: "projects/test-project/locations/us-central1/dataProducts/product-1",
                displayName: "Product 1",
                projectId: "test-project",
                projectNumber: "123456789",
              }],
            },
          },
          {
            status: 200,
            data: {
              items: [{
                resource: "projects/123456789/locations/us-central1/dataProducts/product-1",
                projectNumber: "123456789",
                projectId: null,
                displayName: "Product 1",
              }],
            },
          },
        );
        // Empty project list: the merge must not need it.
        const store = createTestStore(null, []);
        await store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        expect(store.getState().dataProducts.dataProductsItems).toHaveLength(1);
      });

      it("adds search-only products flagged as isOutOfScope, normalized to the project id when known", async () => {
        mockGets(
          { status: 200, data: { dataProducts: mockDataProductsList } },
          {
            status: 200,
            data: {
              items: [{
                resource: "projects/555/locations/eu/dataProducts/other",
                projectNumber: "555",
                projectId: "other-project",
                displayName: "Other",
              }],
            },
          },
        );
        const store = createTestStore(null, []);
        await store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        const items = store.getState().dataProducts.dataProductsItems as any[];
        expect(items).toHaveLength(3);
        const extra = items[2];
        expect(extra).toMatchObject({
          name: "projects/other-project/locations/eu/dataProducts/other",
          displayName: "Other",
          isOutOfScope: true,
          projectNumber: "555",
          projectId: "other-project",
        });
        expect(items[0].isOutOfScope).toBeUndefined();
      });
    });

    describe("mergeDataProducts (pure)", () => {
      const api = [{ name: "projects/p1/locations/us/dataProducts/a", projectId: "p1", projectNumber: "111" }];

      it("drops a search repeat matched by project number", () => {
        const out = mergeDataProducts(api, [{ resource: "projects/111/locations/us/dataProducts/a", projectNumber: "111" }]);
        expect(out).toHaveLength(1);
      });

      it("keeps same-named products in different projects", () => {
        const out = mergeDataProducts(api, [{ resource: "projects/222/locations/us/dataProducts/a", projectNumber: "222" }]);
        expect(out).toHaveLength(2);
      });

      it("does not list the same search-only product twice", () => {
        const item = { resource: "projects/333/locations/us/dataProducts/z", projectNumber: "333" };
        const out = mergeDataProducts([], [item, { ...item }]);
        expect(out).toHaveLength(1);
      });

      it("uses /get-projects spellings as an extra source when available", () => {
        const apiNoTags = [{ name: "projects/test-project/locations/us/dataProducts/a" }];
        const out = mergeDataProducts(
          apiNoTags,
          [{ resource: "projects/123456789/locations/us/dataProducts/a" }],
          mockProjectsList,
        );
        expect(out).toHaveLength(1);
      });

      it("ignores search items without a resource", () => {
        expect(mergeDataProducts([], [{ resource: "" } as any])).toHaveLength(0);
      });
    });

    describe("Rejected State", () => {
      it("sets status to failed and captures error on rejection", async () => {
        const err = new AxiosError("Network Error", { data: { message: "boom" } } as any);
        mockGets(err);
        const store = createTestStore();
        await store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        const state = store.getState().dataProducts;
        expect(state.status).toBe("failed");
        expect(state.error).toEqual({ message: "boom" });
      });

      it("maps 403 to PERMISSION_DENIED", async () => {
        const err = new AxiosError("Forbidden", { status: 403, data: {} } as any);
        (err as any).response = { status: 403, data: {} };
        mockGets(err);
        const store = createTestStore();
        await store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        expect(store.getState().dataProducts.error).toEqual({ type: "PERMISSION_DENIED" });
      });

      it("handles non-AxiosError with generic message", async () => {
        mockGets(new TypeError("x"));
        const store = createTestStore();
        await store.dispatch(fetchDataProductsList({ id_token: "t" }) as any);
        expect(store.getState().dataProducts.error).toBe("An unknown error occurred");
      });

      it("keeps cached data when a background revalidation fails", async () => {
        mockGets(new TypeError("offline"));
        const store = createTestStore();
        store.dispatch(hydrateDataProducts({ items: mockDataProductsList, fetchedAt: 1 }));
        await store.dispatch(fetchDataProductsList({ id_token: "t", background: true }) as any);
        const state = store.getState().dataProducts;
        expect(state.status).toBe("succeeded");
        expect(state.isRefreshing).toBe(false);
        expect(state.dataProductsItems).toEqual(mockDataProductsList);
      });
    });

    describe("clearDataProducts (logout)", () => {
      it("drops the list and ignores responses from the previous session", async () => {
        let resolveApi: (v: any) => void = () => {};
        vi.mocked(axios.get).mockImplementation((url: string) => {
          if (url.endsWith(SEARCH_URL)) return Promise.resolve({ status: 200, data: { items: [] } });
          return new Promise((r) => { resolveApi = r; });
        });
        const store = createTestStore();
        const p = store.dispatch(fetchDataProductsList({ id_token: "t", email: "a@b.com" }) as any);
        store.dispatch(clearDataProducts());
        resolveApi({ status: 200, data: { dataProducts: mockDataProductsList } });
        await p;
        const state = store.getState().dataProducts;
        expect(state.dataProductsItems).toEqual([]);
        expect(state.status).toBe("idle");
        expect(state.epoch).toBe(1);
        expect(dpCache.saveDataProductsCache).not.toHaveBeenCalled();
      });
    });
  });

  describe("ensureDataProductsLoaded", () => {
    const mockApi = () => vi.mocked(axios.get).mockImplementation((url: string) =>
      Promise.resolve(url.endsWith("/data-products/search")
        ? { status: 200, data: { items: [] } }
        : { status: 200, data: { dataProducts: mockDataProductsList } }));

    it("foreground-fetches when nothing is cached", async () => {
      mockApi();
      const store = createTestStore();
      await store.dispatch(ensureDataProductsLoaded({ id_token: "t", email: "a@b.com" }) as any);
      await vi.waitFor(() => expect(store.getState().dataProducts.status).toBe("succeeded"));
      expect(dpCache.loadDataProductsCache).toHaveBeenCalledWith("a@b.com");
    });

    it("hydrates from a fresh persisted cache without fetching", async () => {
      vi.mocked(dpCache.loadDataProductsCache).mockResolvedValueOnce({
        items: mockDataProductsList, projectIdentity: {}, fetchedAt: Date.now(),
      });
      const store = createTestStore();
      await store.dispatch(ensureDataProductsLoaded({ id_token: "t", email: "a@b.com" }) as any);
      expect(store.getState().dataProducts.dataProductsItems).toEqual(mockDataProductsList);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it("hydrates from a stale cache and revalidates in the background", async () => {
      mockApi();
      vi.mocked(dpCache.loadDataProductsCache).mockResolvedValueOnce({
        items: [mockDataProductsList[0]], projectIdentity: {}, fetchedAt: Date.now() - dpCache.DATA_PRODUCTS_FRESH_MS - 1000,
      });
      const store = createTestStore();
      await store.dispatch(ensureDataProductsLoaded({ id_token: "t", email: "a@b.com" }) as any);
      // Cached data shown immediately, no skeleton status.
      expect(store.getState().dataProducts.status).toBe("succeeded");
      await vi.waitFor(() => expect(store.getState().dataProducts.dataProductsItems).toEqual(mockDataProductsList));
      expect(store.getState().dataProducts.isRefreshing).toBe(false);
    });

    it("does nothing when in-memory data is fresh", async () => {
      const store = createTestStore();
      store.dispatch(hydrateDataProducts({ items: mockDataProductsList, fetchedAt: Date.now() }));
      await store.dispatch(ensureDataProductsLoaded({ id_token: "t", email: "a@b.com" }) as any);
      expect(axios.get).not.toHaveBeenCalled();
      expect(dpCache.loadDataProductsCache).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getDataProductDetails Tests
  // ==========================================================================

  describe("getDataProductDetails", () => {

    describe("Pending State", () => {
      it("sets selectedDataProductStatus to loading when pending", () => {
        const store = createTestStore();
        store.dispatch({ type: getDataProductDetails.pending.type });

        const state = store.getState().dataProducts;
        expect(state.selectedDataProductStatus).toBe("loading");
      });
    });

    describe("Fulfilled State", () => {
      it("sets selectedDataProductStatus to succeeded and populates details on fulfilled", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: mockDataProductDetails,
        });

        const store = createTestStore(mockSessionData);
        await store.dispatch(
          getDataProductDetails({
            id_token: "test-token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.selectedDataProductStatus).toBe("succeeded");
        expect(state.selectedDataProductDetails).toEqual(mockDataProductDetails);
      });

      it("returns empty array when requestData is falsy", async () => {
        const store = createTestStore();
        const result = await store.dispatch(getDataProductDetails(null) as any);

        expect(result.payload).toEqual([]);
      });

      it("returns empty array when requestData is undefined", async () => {
        const store = createTestStore();
        const result = await store.dispatch(
          getDataProductDetails(undefined) as any
        );

        expect(result.payload).toEqual([]);
      });

      it("constructs correct lookup URL from dataProductId", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: mockDataProductDetails,
        });

        const store = createTestStore(mockSessionData);
        await store.dispatch(
          getDataProductDetails({
            id_token: "test-token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        // The backend now builds the entry name (needs the project number).
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("data-product-details"),
          expect.objectContaining({
            params: {
              dataProduct: "projects/test-project/locations/us-central1/dataProducts/product-1",
            },
          })
        );
      });

      it("sets Authorization header when id_token is provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: mockDataProductDetails,
        });

        const store = createTestStore(mockSessionData);
        await store.dispatch(
          getDataProductDetails({
            id_token: "my-token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe(
          "Bearer my-token"
        );
      });

      it("sets empty Authorization header when id_token is not provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: mockDataProductDetails,
        });

        const store = createTestStore(mockSessionData);
        await store.dispatch(
          getDataProductDetails({
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe("");
      });
    });

    describe("Rejected State", () => {
      it("sets selectedDataProductStatus to failed and captures error", async () => {
        const axiosError = new AxiosError("Network Error");
        (axiosError as any).response = { data: "Server error details" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore(mockSessionData);
        await store.dispatch(
          getDataProductDetails({
            id_token: "token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.selectedDataProductStatus).toBe("failed");
        expect(state.selectedDataProductError).toBe("Server error details");
      });

      it("handles AxiosError with message when response is undefined", async () => {
        const axiosError = new AxiosError("Connection timeout");
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore(mockSessionData);
        await store.dispatch(
          getDataProductDetails({
            id_token: "token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.selectedDataProductStatus).toBe("failed");
        expect(state.selectedDataProductError).toBe("Connection timeout");
      });

      it("handles non-AxiosError with generic message", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(
          new Error("Something went wrong")
        );

        const store = createTestStore(mockSessionData);
        await store.dispatch(
          getDataProductDetails({
            id_token: "token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.selectedDataProductStatus).toBe("failed");
        expect(state.selectedDataProductError).toBe("An unknown error occurred");
      });

      it("handles rejection with payload via reducer", () => {
        const store = createTestStore();
        store.dispatch({
          type: getDataProductDetails.rejected.type,
          payload: "Details error",
        });

        const state = store.getState().dataProducts;
        expect(state.selectedDataProductStatus).toBe("failed");
        expect(state.selectedDataProductError).toBe("Details error");
      });

      it("sets a plain PERMISSION_DENIED object (not a JSON string) on a 403", async () => {
        const axiosError = new AxiosError("Forbidden");
        (axiosError as any).response = { status: 403 };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore(mockSessionData);
        await store.dispatch(
          getDataProductDetails({
            id_token: "token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.selectedDataProductStatus).toBe("failed");
        // A plain object, not JSON.stringify'd - consumers branch on `.type`
        // directly instead of having to parse it back out of a string.
        expect(state.selectedDataProductError).toEqual({
          type: "PERMISSION_DENIED",
          message: "You don't have access to this resource",
          itemId: "projects/test-project/locations/us-central1/dataProducts/product-1",
        });
      });
    });
  });

  // ==========================================================================
  // fetchDataProductsAssetsList Tests
  // ==========================================================================

  describe("fetchDataProductsAssetsList", () => {
    describe("Pending State", () => {
      it("sets dataProductAssetsStatus to loading when pending", () => {
        const store = createTestStore();
        store.dispatch({ type: fetchDataProductsAssetsList.pending.type });

        const state = store.getState().dataProducts;
        expect(state.dataProductAssetsStatus).toBe("loading");
      });

      it("clears dataProductAssets when pending", () => {
        const store = createTestStore();

        // First populate with some data
        store.dispatch({
          type: fetchDataProductsAssetsList.fulfilled.type,
          payload: mockDataProductAssets,
        });

        // Now dispatch pending
        store.dispatch({ type: fetchDataProductsAssetsList.pending.type });

        const state = store.getState().dataProducts;
        expect(state.dataProductAssets).toEqual([]);
      });
    });

    describe("Fulfilled State", () => {
      it("sets dataProductAssetsStatus to succeeded and populates assets on fulfilled", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: { dataAssets: mockDataProductAssets },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsAssetsList({
            id_token: "test-token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.dataProductAssetsStatus).toBe("succeeded");
        expect(state.dataProductAssets).toEqual(mockDataProductAssets);
      });

      it("returns empty array when requestData is falsy", async () => {
        const store = createTestStore();
        const result = await store.dispatch(
          fetchDataProductsAssetsList(null) as any
        );

        expect(result.payload).toEqual([]);
      });

      it("returns empty array when requestData is undefined", async () => {
        const store = createTestStore();
        const result = await store.dispatch(
          fetchDataProductsAssetsList(undefined) as any
        );

        expect(result.payload).toEqual([]);
      });

      it("constructs correct assets URL from dataProductId", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: { dataAssets: mockDataProductAssets },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsAssetsList({
            id_token: "test-token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("data-product-assets"),
          expect.objectContaining({
            params: expect.objectContaining({
              dataProduct: "projects/test-project/locations/us-central1/dataProducts/product-1",
            }),
          })
        );
      });

      it("sets Authorization header when id_token is provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: { dataAssets: mockDataProductAssets },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsAssetsList({
            id_token: "bearer-token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe(
          "Bearer bearer-token"
        );
      });

      it("sets empty Authorization header when id_token is not provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: { dataAssets: mockDataProductAssets },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsAssetsList({
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe("");
      });

      it("handles fulfilled with empty payload by setting empty array", () => {
        const store = createTestStore();
        store.dispatch({
          type: fetchDataProductsAssetsList.fulfilled.type,
          payload: null,
        });

        const state = store.getState().dataProducts;
        expect(state.dataProductAssets).toEqual([]);
      });
    });

    describe("Rejected State", () => {
      it("sets dataProductAssetsStatus to failed and captures error", async () => {
        const axiosError = new AxiosError("Assets fetch failed");
        (axiosError as any).response = { data: "Assets error" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsAssetsList({
            id_token: "token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.dataProductAssetsStatus).toBe("failed");
        expect(state.dataProductAssetsError).toBe("Assets error");
      });

      it("handles AxiosError with message when response is undefined", async () => {
        const axiosError = new AxiosError("Network failure");
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsAssetsList({
            id_token: "token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.dataProductAssetsStatus).toBe("failed");
        expect(state.dataProductAssetsError).toBe("Network failure");
      });

      it("handles non-AxiosError with generic message", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new TypeError("Type error"));

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsAssetsList({
            id_token: "token",
            dataProductId:
              "projects/test-project/locations/us-central1/dataProducts/product-1",
          }) as any
        );

        const state = store.getState().dataProducts;
        expect(state.dataProductAssetsStatus).toBe("failed");
        expect(state.dataProductAssetsError).toBe("An unknown error occurred");
      });

      it("handles rejection with payload via reducer", () => {
        const store = createTestStore();
        store.dispatch({
          type: fetchDataProductsAssetsList.rejected.type,
          payload: "Assets list error",
        });

        const state = store.getState().dataProducts;
        expect(state.dataProductAssetsStatus).toBe("failed");
        expect(state.dataProductAssetsError).toBe("Assets list error");
      });
    });
  });

  // ==========================================================================
  // getProjectNumber Helper Function Tests
  // ==========================================================================

  describe("details request does not depend on the project list", () => {
    it("sends the data product name even when /get-projects is empty", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: mockDataProductDetails });
      const store = createTestStore(null, []);
      await store.dispatch(
        getDataProductDetails({
          id_token: "test-token",
          dataProductId: "projects/123456789/locations/us-central1/dataProducts/product-1",
        }) as any
      );
      expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
        params: { dataProduct: "projects/123456789/locations/us-central1/dataProducts/product-1" },
      });
      expect(store.getState().dataProducts.selectedDataProductStatus).toBe("succeeded");
    });

    it("marks the request failed when the call throws", async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new TypeError("Cannot read properties of null"));
      const store = createTestStore();
      await store.dispatch(
        getDataProductDetails({
          id_token: "test-token",
          dataProductId: "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );
      expect(store.getState().dataProducts.selectedDataProductStatus).toBe("failed");
    });
  });

  // ==========================================================================
  // Response Status Tests
  // ==========================================================================

  describe("Response Status Handling", () => {
    it("handles non-200 non-401 status in fetchDataProductsList", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 500,
        data: { dataProducts: mockDataProductsList },
      });

      const store = createTestStore();
      await store.dispatch(
        fetchDataProductsList({ id_token: "token" }) as any
      );

      // Non-401 status passes through (status !== 401 is true)
      const state = store.getState().dataProducts;
      expect(state.status).toBe("succeeded");
    });

    it("handles non-200 non-401 status in getDataProductDetails", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 500,
        data: mockDataProductDetails,
      });

      const store = createTestStore(mockSessionData);
      await store.dispatch(
        getDataProductDetails({
          id_token: "token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      const state = store.getState().dataProducts;
      expect(state.selectedDataProductStatus).toBe("succeeded");
    });

    it("handles non-200 non-401 status in fetchDataProductsAssetsList", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 500,
        data: { dataAssets: mockDataProductAssets },
      });

      const store = createTestStore();
      await store.dispatch(
        fetchDataProductsAssetsList({
          id_token: "token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      const state = store.getState().dataProducts;
      expect(state.dataProductAssetsStatus).toBe("succeeded");
    });

    it("rejects with Token expired when getDataProductDetails receives 401 status", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 401,
        data: { error: "Unauthorized" },
      });

      const store = createTestStore(mockSessionData);
      const result = await store.dispatch(
        getDataProductDetails({
          id_token: "expired-token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      // Check that the action type indicates rejection
      expect(result.type).toContain("rejected");
      expect(result.payload).toBe("Token expired");
    });
  });

  // ==========================================================================
  // State Isolation Tests
  // ==========================================================================

  describe("State Isolation", () => {
    it("fetchDataProductsList does not affect selectedDataProductDetails state", async () => {
      const store = createTestStore();

      // Set some initial details
      store.dispatch({
        type: getDataProductDetails.fulfilled.type,
        payload: mockDataProductDetails,
      });

      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: { dataProducts: mockDataProductsList },
      });

      await store.dispatch(
        fetchDataProductsList({ id_token: "token" }) as any
      );

      const state = store.getState().dataProducts;
      expect(state.selectedDataProductDetails).toEqual(mockDataProductDetails);
    });

    it("getDataProductDetails does not affect dataProductsItems state", async () => {
      const store = createTestStore(mockSessionData);

      // Set some initial items
      store.dispatch({
        type: fetchDataProductsList.fulfilled.type,
        payload: { items: mockDataProductsList, projectIdentity: {}, searchFailed: false, fetchedAt: 1 },
      });

      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: mockDataProductDetails,
      });

      await store.dispatch(
        getDataProductDetails({
          id_token: "token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      const state = store.getState().dataProducts;
      expect(state.dataProductsItems).toEqual(mockDataProductsList);
    });

    it("fetchDataProductsAssetsList does not affect other state properties", async () => {
      const store = createTestStore(mockSessionData);

      // Set initial states
      store.dispatch({
        type: fetchDataProductsList.fulfilled.type,
        payload: { items: mockDataProductsList, projectIdentity: {}, searchFailed: false, fetchedAt: 1 },
      });
      store.dispatch({
        type: getDataProductDetails.fulfilled.type,
        payload: mockDataProductDetails,
      });

      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: { dataAssets: mockDataProductAssets },
      });

      await store.dispatch(
        fetchDataProductsAssetsList({
          id_token: "token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      const state = store.getState().dataProducts;
      expect(state.dataProductsItems).toEqual(mockDataProductsList);
      expect(state.selectedDataProductDetails).toEqual(mockDataProductDetails);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty dataProducts array in response", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: { dataProducts: [] },
      });

      const store = createTestStore();
      await store.dispatch(
        fetchDataProductsList({ id_token: "token" }) as any
      );

      const state = store.getState().dataProducts;
      expect(state.status).toBe("succeeded");
      expect(state.dataProductsItems).toEqual([]);
    });

    it("handles empty dataAssets array in response", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: { dataAssets: [] },
      });

      const store = createTestStore();
      await store.dispatch(
        fetchDataProductsAssetsList({
          id_token: "token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      const state = store.getState().dataProducts;
      expect(state.dataProductAssetsStatus).toBe("succeeded");
      expect(state.dataProductAssets).toEqual([]);
    });

    it("handles dataProductId with many path segments", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: { dataAssets: mockDataProductAssets },
      });

      const store = createTestStore();
      await store.dispatch(
        fetchDataProductsAssetsList({
          id_token: "token",
          dataProductId:
            "projects/my-project/locations/europe-west1/dataProducts/complex-product-name-123",
        }) as any
      );

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("data-product-assets"),
        expect.objectContaining({
          params: expect.objectContaining({
            dataProduct: "projects/my-project/locations/europe-west1/dataProducts/complex-product-name-123",
          }),
        })
      );
    });

    it("handles special characters in project ID", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: mockDataProductDetails,
      });

      const store = createTestStore({
        appConfig: {
          projects: [
            { projectId: "project-with-dashes", name: "projects/111222333" },
          ],
        },
      });
      await store.dispatch(
        getDataProductDetails({
          id_token: "token",
          dataProductId:
            "projects/project-with-dashes/locations/us-west1/dataProducts/product-1",
        }) as any
      );

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("data-product-details"),
        expect.objectContaining({
          params: {
            dataProduct: "projects/project-with-dashes/locations/us-west1/dataProducts/product-1",
          },
        })
      );
    });
  });

  // ==========================================================================
  // Concurrent Operations Tests
  // ==========================================================================

  describe("Concurrent Operations", () => {
    it("handles multiple concurrent fetchDataProductsList calls", async () => {
      vi.mocked(axios.get)
        .mockResolvedValueOnce({
          status: 200,
          data: { dataProducts: [mockDataProductsList[0]] },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { dataProducts: [mockDataProductsList[1]] },
        });

      const store = createTestStore();

      const promise1 = store.dispatch(
        fetchDataProductsList({ id_token: "token1" }) as any
      );
      const promise2 = store.dispatch(
        fetchDataProductsList({ id_token: "token2" }) as any
      );

      await Promise.all([promise1, promise2]);

      const state = store.getState().dataProducts;
      expect(state.status).toBe("succeeded");
    });

    it("handles fetch followed by another fetch", async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: { dataProducts: mockDataProductsList },
      });

      const store = createTestStore();

      await store.dispatch(
        fetchDataProductsList({ id_token: "token1" }) as any
      );
      const state1 = store.getState().dataProducts;
      expect(state1.status).toBe("succeeded");

      await store.dispatch(
        fetchDataProductsList({ id_token: "token2" }) as any
      );
      const state2 = store.getState().dataProducts;
      expect(state2.status).toBe("succeeded");
    });
  });

  // ==========================================================================
  // Type Assertions Tests
  // ==========================================================================

  describe("Type Assertions", () => {
    it("dataProductsItems is typed as unknown initially", () => {
      const store = createTestStore();
      const state = store.getState().dataProducts;
      expect(Array.isArray(state.dataProductsItems)).toBe(true);
    });

    it("selectedDataProductDetails is typed as unknown initially", () => {
      const store = createTestStore();
      const state = store.getState().dataProducts;
      expect(typeof state.selectedDataProductDetails).toBe("object");
    });

    it("dataProductAssets is typed as unknown initially", () => {
      const store = createTestStore();
      const state = store.getState().dataProducts;
      expect(Array.isArray(state.dataProductAssets)).toBe(true);
    });
  });

  // ==========================================================================
  // Action Type Tests
  // ==========================================================================

  describe("Action Types", () => {
    it("fetchDataProductsList has correct action types", () => {
      expect(fetchDataProductsList.pending.type).toBe(
        "dataProducts/fetchDataProductsList/pending"
      );
      expect(fetchDataProductsList.fulfilled.type).toBe(
        "dataProducts/fetchDataProductsList/fulfilled"
      );
      expect(fetchDataProductsList.rejected.type).toBe(
        "dataProducts/fetchDataProductsList/rejected"
      );
    });

    it("getDataProductDetails has correct action types", () => {
      expect(getDataProductDetails.pending.type).toBe(
        "dataProducts/getDataProductDetails/pending"
      );
      expect(getDataProductDetails.fulfilled.type).toBe(
        "dataProducts/getDataProductDetails/fulfilled"
      );
      expect(getDataProductDetails.rejected.type).toBe(
        "dataProducts/getDataProductDetails/rejected"
      );
    });

    it("fetchDataProductsAssetsList has correct action types", () => {
      expect(fetchDataProductsAssetsList.pending.type).toBe(
        "dataProducts/fetchDataProductsAssetsList/pending"
      );
      expect(fetchDataProductsAssetsList.fulfilled.type).toBe(
        "dataProducts/fetchDataProductsAssetsList/fulfilled"
      );
      expect(fetchDataProductsAssetsList.rejected.type).toBe(
        "dataProducts/fetchDataProductsAssetsList/rejected"
      );
    });
  });

  // ==========================================================================
  // Reducer Direct Tests
  // ==========================================================================

  describe("Reducer Direct Tests", () => {
    it("reducer handles unknown action type", () => {
      const initialState = dataProductsReducer(undefined, { type: "INIT" });

      const newState = dataProductsReducer(initialState, {
        type: "UNKNOWN_ACTION",
      });

      expect(newState).toEqual(initialState);
    });

    it("reducer handles undefined state", () => {
      const newState = dataProductsReducer(undefined, { type: "INIT" });

      expect(newState.dataProductsItems).toEqual([]);
      expect(newState.status).toBe("idle");
      expect(newState.error).toBeNull();
    });
  });
});
