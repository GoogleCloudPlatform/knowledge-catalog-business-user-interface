import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import dataProductsReducer, {
  fetchDataProductsList,
  getDataProductDetails,
  fetchDataProductsAssetsList,
  dataproductsSlice,
} from "./dataProductsSlice";
import userReducer from "../user/userSlice";

// ==========================================================================
// Mock axios
// ==========================================================================

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
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

const mockSessionData = {
  appConfig: {
    projects: [
      { projectId: "test-project", name: "projects/123456789" },
      { projectId: "another-project", name: "projects/987654321" },
    ],
  },
};

// ==========================================================================
// Helper Functions
// ==========================================================================

const createTestStore = (userData: any = null) => {
  return configureStore({
    reducer: {
      dataproducts: dataProductsReducer,
      user: userReducer,
    },
    preloadedState: userData ? {
      user: { token: null, userData, mode: 'light' as const },
    } : undefined,
  });
};

// ==========================================================================
// Initial State Tests
// ==========================================================================

describe("dataProductsSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("returns the initial state", () => {
      const store = createTestStore();
      const state = store.getState().dataproducts;

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
    describe("Pending State", () => {
      it("sets status to loading when pending", () => {
        const store = createTestStore();
        store.dispatch({ type: fetchDataProductsList.pending.type });

        const state = store.getState().dataproducts;
        expect(state.status).toBe("loading");
      });
    });

    describe("Fulfilled State", () => {
      it("sets status to succeeded and populates data on fulfilled", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: { dataProducts: mockDataProductsList },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsList({ id_token: "test-token" }) as any
        );

        const state = store.getState().dataproducts;
        expect(state.status).toBe("succeeded");
        expect(state.dataProductsItems).toEqual(mockDataProductsList);
      });

      it("sets Authorization header when id_token is provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: { dataProducts: mockDataProductsList },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsList({ id_token: "test-token" }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe(
          "Bearer test-token"
        );
      });

      it("sets empty Authorization header when id_token is not provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: { dataProducts: mockDataProductsList },
        });

        const store = createTestStore();
        await store.dispatch(fetchDataProductsList({}) as any);

        expect(axios.defaults.headers.common["Authorization"]).toBe("");
      });

      it("returns empty array when requestData is falsy", async () => {
        const store = createTestStore();
        const result = await store.dispatch(
          fetchDataProductsList(null) as any
        );

        expect(result.payload).toEqual([]);
        const state = store.getState().dataproducts;
        expect(state.dataProductsItems).toEqual([]);
      });

      it("returns empty array when requestData is undefined", async () => {
        const store = createTestStore();
        const result = await store.dispatch(
          fetchDataProductsList(undefined) as any
        );

        expect(result.payload).toEqual([]);
      });

      it("handles response with status 200", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: { dataProducts: mockDataProductsList },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsList({ id_token: "token" }) as any
        );

        const state = store.getState().dataproducts;
        expect(state.status).toBe("succeeded");
        expect(state.dataProductsItems).toEqual(mockDataProductsList);
      });

      it("handles fulfilled with empty payload by setting empty array", () => {
        const store = createTestStore();
        store.dispatch({
          type: fetchDataProductsList.fulfilled.type,
          payload: null,
        });

        const state = store.getState().dataproducts;
        expect(state.dataProductsItems).toEqual([]);
      });
    });

    describe("Rejected State", () => {
      it("sets status to failed and captures error on rejection", async () => {
        const axiosError = new AxiosError("Network Error");
        (axiosError as any).response = { data: "Server error" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsList({ id_token: "token" }) as any
        );

        const state = store.getState().dataproducts;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Server error");
      });

      it("handles AxiosError with error message when response is undefined", async () => {
        const axiosError = new AxiosError("Network Error");
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsList({ id_token: "token" }) as any
        );

        const state = store.getState().dataproducts;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Network Error");
      });

      it("handles non-AxiosError with generic message", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new Error("Generic error"));

        const store = createTestStore();
        await store.dispatch(
          fetchDataProductsList({ id_token: "token" }) as any
        );

        const state = store.getState().dataproducts;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("An unknown error occurred");
      });

      it("handles rejection with payload via reducer", () => {
        const store = createTestStore();
        store.dispatch({
          type: fetchDataProductsList.rejected.type,
          payload: "Custom error",
        });

        const state = store.getState().dataproducts;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Custom error");
      });
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
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

        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("data-product-details"),
          expect.objectContaining({
            params: expect.objectContaining({
              entry: expect.stringContaining("projects/test-project"),
            }),
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
        expect(state.selectedDataProductStatus).toBe("failed");
        expect(state.selectedDataProductError).toBe("An unknown error occurred");
      });

      it("handles rejection with payload via reducer", () => {
        const store = createTestStore();
        store.dispatch({
          type: getDataProductDetails.rejected.type,
          payload: "Details error",
        });

        const state = store.getState().dataproducts;
        expect(state.selectedDataProductStatus).toBe("failed");
        expect(state.selectedDataProductError).toBe("Details error");
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
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

        const state = store.getState().dataproducts;
        expect(state.dataProductAssetsStatus).toBe("failed");
        expect(state.dataProductAssetsError).toBe("An unknown error occurred");
      });

      it("handles rejection with payload via reducer", () => {
        const store = createTestStore();
        store.dispatch({
          type: fetchDataProductsAssetsList.rejected.type,
          payload: "Assets list error",
        });

        const state = store.getState().dataproducts;
        expect(state.dataProductAssetsStatus).toBe("failed");
        expect(state.dataProductAssetsError).toBe("Assets list error");
      });
    });
  });

  // ==========================================================================
  // getProjectNumber Helper Function Tests
  // ==========================================================================

  describe("getProjectNumber helper", () => {
    it("extracts project number from session data", async () => {
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

      // Verify the entry parameter contains the project number (123456789)
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            entry: expect.stringContaining("123456789"),
          }),
        })
      );
    });

    it("returns empty string when project is not found", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: mockDataProductDetails,
      });

      const store = createTestStore(mockSessionData);
      await store.dispatch(
        getDataProductDetails({
          id_token: "test-token",
          dataProductId:
            "projects/unknown-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      // When project not found, the entry should have empty project number part
      expect(axios.get).toHaveBeenCalled();
    });

    it("handles missing appConfig in store", async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(
        new TypeError("Cannot read properties of null")
      );

      const store = createTestStore();
      await store.dispatch(
        getDataProductDetails({
          id_token: "test-token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      const state = store.getState().dataproducts;
      expect(state.selectedDataProductStatus).toBe("failed");
    });

    it("handles session data with empty projects array", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: mockDataProductDetails,
      });

      const store = createTestStore({ appConfig: { projects: [] } });
      await store.dispatch(
        getDataProductDetails({
          id_token: "test-token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      expect(axios.get).toHaveBeenCalled();
    });

    it("handles project name without forward slashes", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: mockDataProductDetails,
      });

      const store = createTestStore({ appConfig: { projects: [{ projectId: "test-project", name: "simple-name" }] } });
      await store.dispatch(
        getDataProductDetails({
          id_token: "test-token",
          dataProductId:
            "projects/test-project/locations/us-central1/dataProducts/product-1",
        }) as any
      );

      expect(axios.get).toHaveBeenCalled();
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
      const state = store.getState().dataproducts;
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

      const state = store.getState().dataproducts;
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

      const state = store.getState().dataproducts;
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

      const state = store.getState().dataproducts;
      expect(state.selectedDataProductDetails).toEqual(mockDataProductDetails);
    });

    it("getDataProductDetails does not affect dataProductsItems state", async () => {
      const store = createTestStore(mockSessionData);

      // Set some initial items
      store.dispatch({
        type: fetchDataProductsList.fulfilled.type,
        payload: mockDataProductsList,
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

      const state = store.getState().dataproducts;
      expect(state.dataProductsItems).toEqual(mockDataProductsList);
    });

    it("fetchDataProductsAssetsList does not affect other state properties", async () => {
      const store = createTestStore(mockSessionData);

      // Set initial states
      store.dispatch({
        type: fetchDataProductsList.fulfilled.type,
        payload: mockDataProductsList,
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

      const state = store.getState().dataproducts;
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

      const state = store.getState().dataproducts;
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

      const state = store.getState().dataproducts;
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
          params: expect.objectContaining({
            project: "project-with-dashes",
          }),
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

      const state = store.getState().dataproducts;
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
      const state1 = store.getState().dataproducts;
      expect(state1.status).toBe("succeeded");

      await store.dispatch(
        fetchDataProductsList({ id_token: "token2" }) as any
      );
      const state2 = store.getState().dataproducts;
      expect(state2.status).toBe("succeeded");
    });
  });

  // ==========================================================================
  // Type Assertions Tests
  // ==========================================================================

  describe("Type Assertions", () => {
    it("dataProductsItems is typed as unknown initially", () => {
      const store = createTestStore();
      const state = store.getState().dataproducts;
      expect(Array.isArray(state.dataProductsItems)).toBe(true);
    });

    it("selectedDataProductDetails is typed as unknown initially", () => {
      const store = createTestStore();
      const state = store.getState().dataproducts;
      expect(typeof state.selectedDataProductDetails).toBe("object");
    });

    it("dataProductAssets is typed as unknown initially", () => {
      const store = createTestStore();
      const state = store.getState().dataproducts;
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
      const initialState = {
        dataProductsItems: [],
        status: "idle" as const,
        error: null,
        selectedDataProductDetails: {},
        selectedDataProductStatus: "idle" as const,
        selectedDataProductError: null,
        dataProductAssets: [],
        dataProductAssetsStatus: "idle" as const,
        dataProductAssetsError: null,
        viewMode: 'list' as const,
        detailTabValue: 0,
      };

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
