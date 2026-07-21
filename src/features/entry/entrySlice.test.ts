import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import entryReducer, {
  fetchEntry,
  fetchLineageEntry,
  fetchEntryLinks,
  setEntry,
  pushToHistory,
  popFromHistory,
  clearHistory,
  entrySlice,
} from "./entrySlice";

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

const mockEntryData = {
  name: "projects/test-project/locations/us-central1/entryGroups/@bigquery/entries/test-entry",
  fullyQualifiedName: "bigquery:test-project.dataset.table",
  displayName: "Test Entry",
  description: "This is a test entry",
  entryType: "TABLE",
  aspects: {
    "dataplex.schema": {
      data: {
        columns: [
          { name: "id", type: "INTEGER" },
          { name: "name", type: "STRING" },
        ],
      },
    },
  },
  entrySource: {
    displayName: "Test Entry",
    description: "Test description",
    system: "bigquery",
  },
};

const mockLineageEntryData = {
  name: "projects/test-project/locations/us-central1/entryGroups/@bigquery/entries/lineage-entry",
  fullyQualifiedName: "bigquery:test-project.dataset.lineage_table",
  displayName: "Lineage Entry",
  description: "This is a lineage entry",
  entryType: "TABLE",
};

const mockHistoryEntry1 = {
  name: "projects/test-project/locations/us-central1/entryGroups/@bigquery/entries/history-1",
  displayName: "History Entry 1",
};

const mockHistoryEntry2 = {
  name: "projects/test-project/locations/us-central1/entryGroups/@bigquery/entries/history-2",
  displayName: "History Entry 2",
};

// ==========================================================================
// Helper Functions
// ==========================================================================

const createTestStore = (preloadedState?: Partial<ReturnType<typeof entryReducer>>) => {
  return configureStore({
    reducer: {
      entry: entryReducer,
    },
    preloadedState: preloadedState ? { entry: { ...getInitialState(), ...preloadedState } } : undefined,
  });
};

const getInitialState = () => ({
  items: [],
  status: "idle" as const,
  error: null,
  lineageEntryItems: [],
  lineageEntrystatus: "idle" as const,
  lineageEntryError: null,
  lineageToEntryCopy: false,
  history: [] as unknown[],
  tabHistory: [] as (string | null)[],
  pendingTabName: null as string | null,
  accessCheckCache: {} as Record<string, { status: 'loading' | 'succeeded' | 'failed'; error?: unknown }>,
  entryLinks: [] as import('../../component/Glossaries/GlossaryDataType').GlossaryItem[],
  entryLinksStatus: "idle" as const,
  entryLinksError: null,
});

// ==========================================================================
// Initial State Tests
// ==========================================================================

describe("entrySlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("returns the initial state", () => {
      const store = createTestStore();
      const state = store.getState().entry;

      expect(state.items).toEqual([]);
      expect(state.status).toBe("idle");
      expect(state.error).toBeNull();
      expect(state.lineageEntryItems).toEqual([]);
      expect(state.lineageEntrystatus).toBe("idle");
      expect(state.lineageEntryError).toBeNull();
      expect(state.lineageToEntryCopy).toBe(false);
      expect(state.history).toEqual([]);
      expect(state.entryLinks).toEqual([]);
      expect(state.entryLinksStatus).toBe("idle");
      expect(state.entryLinksError).toBeNull();
    });

    it("has correct slice name", () => {
      expect(entrySlice.name).toBe("entry");
    });

    it("exports reducer as default", () => {
      expect(entryReducer).toBeDefined();
      expect(typeof entryReducer).toBe("function");
    });
  });

  // ==========================================================================
  // Synchronous Reducers Tests
  // ==========================================================================

  describe("Synchronous Reducers", () => {
    describe("setEntry", () => {
      it("sets items and status to succeeded", () => {
        const store = createTestStore();
        store.dispatch(setEntry(mockEntryData));

        const state = store.getState().entry;
        expect(state.items).toEqual(mockEntryData);
        expect(state.status).toBe("succeeded");
      });

      it("replaces existing items", () => {
        const store = createTestStore({ items: mockHistoryEntry1 });
        store.dispatch(setEntry(mockEntryData));

        const state = store.getState().entry;
        expect(state.items).toEqual(mockEntryData);
      });

      it("handles null payload", () => {
        const store = createTestStore();
        store.dispatch(setEntry(null));

        const state = store.getState().entry;
        expect(state.items).toBeNull();
        expect(state.status).toBe("succeeded");
      });

      it("handles empty object payload", () => {
        const store = createTestStore();
        store.dispatch(setEntry({}));

        const state = store.getState().entry;
        expect(state.items).toEqual({});
        expect(state.status).toBe("succeeded");
      });
    });

    describe("pushToHistory", () => {
      it("pushes current items to history when items exist", () => {
        const store = createTestStore({ items: mockEntryData });
        store.dispatch(pushToHistory());

        const state = store.getState().entry;
        expect(state.history).toHaveLength(1);
        expect(state.history[0]).toEqual(mockEntryData);
      });

      it("does not push to history when items is empty array", () => {
        const store = createTestStore({ items: [] });
        store.dispatch(pushToHistory());

        const state = store.getState().entry;
        expect(state.history).toHaveLength(0);
      });

      it("does not push to history when items is empty object", () => {
        const store = createTestStore({ items: {} });
        store.dispatch(pushToHistory());

        const state = store.getState().entry;
        expect(state.history).toHaveLength(0);
      });

      it("accumulates multiple history entries", () => {
        const store = createTestStore({ items: mockHistoryEntry1 });
        store.dispatch(pushToHistory());

        store.dispatch(setEntry(mockHistoryEntry2));
        store.dispatch(pushToHistory());

        const state = store.getState().entry;
        expect(state.history).toHaveLength(2);
        expect(state.history[0]).toEqual(mockHistoryEntry1);
        expect(state.history[1]).toEqual(mockHistoryEntry2);
      });
    });

    describe("popFromHistory", () => {
      it("pops last entry from history and sets as current", () => {
        const store = createTestStore({
          items: mockEntryData,
          history: [mockHistoryEntry1, mockHistoryEntry2],
        });
        store.dispatch(popFromHistory());

        const state = store.getState().entry;
        expect(state.items).toEqual(mockHistoryEntry2);
        expect(state.history).toHaveLength(1);
        expect(state.status).toBe("succeeded");
      });

      it("does nothing when history is empty", () => {
        const store = createTestStore({ items: mockEntryData, history: [] });
        store.dispatch(popFromHistory());

        const state = store.getState().entry;
        expect(state.items).toEqual(mockEntryData);
        expect(state.history).toHaveLength(0);
      });

      it("sets status to succeeded when popping", () => {
        const store = createTestStore({
          items: [],
          status: "idle",
          history: [mockHistoryEntry1],
        });
        store.dispatch(popFromHistory());

        const state = store.getState().entry;
        expect(state.status).toBe("succeeded");
      });
    });

    describe("clearHistory", () => {
      it("clears all history entries", () => {
        const store = createTestStore({
          history: [mockHistoryEntry1, mockHistoryEntry2],
        });
        store.dispatch(clearHistory());

        const state = store.getState().entry;
        expect(state.history).toEqual([]);
      });

      it("does nothing when history is already empty", () => {
        const store = createTestStore({ history: [] });
        store.dispatch(clearHistory());

        const state = store.getState().entry;
        expect(state.history).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // fetchEntry Async Thunk Tests
  // ==========================================================================

  describe("fetchEntry", () => {
    describe("Pending State", () => {
      it("sets status to loading when pending", () => {
        const store = createTestStore();
        store.dispatch({ type: fetchEntry.pending.type });

        const state = store.getState().entry;
        expect(state.status).toBe("loading");
      });
    });

    describe("Fulfilled State", () => {
      it("sets status to succeeded and populates items on fulfilled", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockEntryData,
        });

        const store = createTestStore();
        await store.dispatch(
          fetchEntry({ id_token: "test-token", entryName: "test-entry" }) as any
        );

        const state = store.getState().entry;
        expect(state.status).toBe("succeeded");
        expect(state.items).toEqual(mockEntryData);
      });

      it("sets Authorization header when id_token is provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockEntryData,
        });

        const store = createTestStore();
        await store.dispatch(
          fetchEntry({ id_token: "my-token", entryName: "test-entry" }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe(
          "Bearer my-token"
        );
      });

      it("sets empty Authorization header when id_token is not provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockEntryData,
        });

        const store = createTestStore();
        await store.dispatch(fetchEntry({ entryName: "test-entry" }) as any);

        expect(axios.defaults.headers.common["Authorization"]).toBe("");
      });

      it("returns empty array when requestData is falsy", async () => {
        const store = createTestStore();
        const result = await store.dispatch(fetchEntry(null) as any);

        expect(result.payload).toEqual([]);
        const state = store.getState().entry;
        expect(state.items).toEqual([]);
      });

      it("returns empty array when requestData is undefined", async () => {
        const store = createTestStore();
        const result = await store.dispatch(fetchEntry(undefined) as any);

        expect(result.payload).toEqual([]);
      });

      it("constructs correct URL with entryName parameter", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockEntryData,
        });

        const store = createTestStore();
        await store.dispatch(
          fetchEntry({
            id_token: "token",
            entryName: "projects/test/entries/my-entry",
          }) as any
        );

        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("entryName=projects/test/entries/my-entry")
        );
      });

      it("handles fulfilled with payload via reducer", () => {
        const store = createTestStore();
        store.dispatch({
          type: fetchEntry.fulfilled.type,
          payload: mockEntryData,
        });

        const state = store.getState().entry;
        expect(state.items).toEqual(mockEntryData);
        expect(state.status).toBe("succeeded");
      });
    });

    describe("Rejected State", () => {
      it("sets status to failed and captures error on rejection", async () => {
        const axiosError = new AxiosError("Network Error");
        (axiosError as any).response = { data: "Server error" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchEntry({ id_token: "token", entryName: "test-entry" }) as any
        );

        const state = store.getState().entry;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Server error");
      });

      it("handles AxiosError with message when response is undefined", async () => {
        const axiosError = new AxiosError("Network Error");
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchEntry({ id_token: "token", entryName: "test-entry" }) as any
        );

        const state = store.getState().entry;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Network Error");
      });

      it("handles non-AxiosError with generic message", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new Error("Generic error"));

        const store = createTestStore();
        await store.dispatch(
          fetchEntry({ id_token: "token", entryName: "test-entry" }) as any
        );

        const state = store.getState().entry;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("An unknown error occurred");
      });

      it("handles rejection with payload via reducer", () => {
        const store = createTestStore();
        store.dispatch({
          type: fetchEntry.rejected.type,
          payload: "Custom error",
        });

        const state = store.getState().entry;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Custom error");
      });
    });
  });

  // ==========================================================================
  // fetchLineageEntry Async Thunk Tests
  // ==========================================================================

  describe("fetchLineageEntry", () => {
    describe("Pending State", () => {
      it("sets lineageEntrystatus to loading when pending", () => {
        const store = createTestStore();
        store.dispatch({ type: fetchLineageEntry.pending.type });

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("loading");
      });

      it("also sets main status to loading when lineageToEntryCopy is true", () => {
        const store = createTestStore({ lineageToEntryCopy: true });
        store.dispatch({ type: fetchLineageEntry.pending.type });

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("loading");
        expect(state.status).toBe("loading");
      });

      it("does not affect main status when lineageToEntryCopy is false", () => {
        const store = createTestStore({ lineageToEntryCopy: false, status: "succeeded" });
        store.dispatch({ type: fetchLineageEntry.pending.type });

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("loading");
        expect(state.status).toBe("succeeded");
      });
    });

    describe("Fulfilled State", () => {
      it("sets lineageEntrystatus to succeeded and populates lineageEntryItems", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockLineageEntryData,
        });

        const store = createTestStore();
        await store.dispatch(
          fetchLineageEntry({
            id_token: "test-token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("succeeded");
        expect(state.lineageEntryItems).toEqual(mockLineageEntryData);
      });

      it("copies to items when lineageToEntryCopy is true", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockLineageEntryData,
        });

        const store = createTestStore({ lineageToEntryCopy: true });
        await store.dispatch(
          fetchLineageEntry({
            id_token: "test-token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        const state = store.getState().entry;
        expect(state.items).toEqual(mockLineageEntryData);
        expect(state.status).toBe("succeeded");
        expect(state.lineageToEntryCopy).toBe(false);
      });

      it("does not copy to items when lineageToEntryCopy is false", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockLineageEntryData,
        });

        const store = createTestStore({
          lineageToEntryCopy: false,
          items: mockEntryData,
        });
        await store.dispatch(
          fetchLineageEntry({
            id_token: "test-token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        const state = store.getState().entry;
        expect(state.items).toEqual(mockEntryData);
        expect(state.lineageEntryItems).toEqual(mockLineageEntryData);
      });

      it("sets Authorization header when id_token is provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockLineageEntryData,
        });

        const store = createTestStore();
        await store.dispatch(
          fetchLineageEntry({
            id_token: "lineage-token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe(
          "Bearer lineage-token"
        );
      });

      it("sets empty Authorization header when id_token is not provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockLineageEntryData,
        });

        const store = createTestStore();
        await store.dispatch(
          fetchLineageEntry({ fqn: "bigquery:project.dataset.table" }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe("");
      });

      it("returns empty array when requestData is falsy", async () => {
        const store = createTestStore();
        const result = await store.dispatch(fetchLineageEntry(null) as any);

        expect(result.payload).toEqual([]);
      });

      it("returns empty array when requestData is undefined", async () => {
        const store = createTestStore();
        const result = await store.dispatch(fetchLineageEntry(undefined) as any);

        expect(result.payload).toEqual([]);
      });

      it("constructs correct URL with fqn parameter", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: mockLineageEntryData,
        });

        const store = createTestStore();
        await store.dispatch(
          fetchLineageEntry({
            id_token: "token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("fqn=bigquery:project.dataset.table")
        );
      });

      it("handles fulfilled via reducer with lineageToEntryCopy true", () => {
        const store = createTestStore({ lineageToEntryCopy: true });
        store.dispatch({
          type: fetchLineageEntry.fulfilled.type,
          payload: mockLineageEntryData,
        });

        const state = store.getState().entry;
        expect(state.lineageEntryItems).toEqual(mockLineageEntryData);
        expect(state.items).toEqual(mockLineageEntryData);
        expect(state.status).toBe("succeeded");
        expect(state.lineageToEntryCopy).toBe(false);
      });
    });

    describe("Rejected State", () => {
      it("sets lineageEntrystatus to failed and captures error", async () => {
        const axiosError = new AxiosError("Network Error");
        (axiosError as any).response = { data: "Lineage server error" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchLineageEntry({
            id_token: "token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("failed");
        expect(state.lineageEntryError).toBe("Lineage server error");
      });

      it("also sets main error when lineageToEntryCopy is true", async () => {
        const axiosError = new AxiosError("Network Error");
        (axiosError as any).response = { data: "Lineage error with copy" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore({ lineageToEntryCopy: true });
        await store.dispatch(
          fetchLineageEntry({
            id_token: "token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("failed");
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Lineage error with copy");
        expect(state.lineageToEntryCopy).toBe(false);
      });

      it("handles AxiosError with message when response is undefined", async () => {
        const axiosError = new AxiosError("Connection timeout");
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchLineageEntry({
            id_token: "token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("failed");
        expect(state.lineageEntryError).toBe("Connection timeout");
      });

      it("handles non-AxiosError with generic message", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new TypeError("Type error"));

        const store = createTestStore();
        await store.dispatch(
          fetchLineageEntry({
            id_token: "token",
            fqn: "bigquery:project.dataset.table",
          }) as any
        );

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("failed");
        expect(state.lineageEntryError).toBe("An unknown error occurred");
      });

      it("handles rejection via reducer with lineageToEntryCopy true", () => {
        const store = createTestStore({ lineageToEntryCopy: true });
        store.dispatch({
          type: fetchLineageEntry.rejected.type,
          payload: "Rejection error",
        });

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("failed");
        expect(state.lineageEntryError).toBe("Rejection error");
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Rejection error");
        expect(state.lineageToEntryCopy).toBe(false);
      });

      it("handles rejection via reducer with lineageToEntryCopy false", () => {
        const store = createTestStore({ lineageToEntryCopy: false });
        store.dispatch({
          type: fetchLineageEntry.rejected.type,
          payload: "Rejection error",
        });

        const state = store.getState().entry;
        expect(state.lineageEntrystatus).toBe("failed");
        expect(state.lineageEntryError).toBe("Rejection error");
        expect(state.status).toBe("idle");
      });
    });
  });

  // ==========================================================================
  // fetchEntryLinks Async Thunk Tests
  // ==========================================================================

  describe("fetchEntryLinks", () => {
    describe("Pending State", () => {
      it("sets entryLinksStatus to loading when pending", () => {
        const store = createTestStore();
        store.dispatch({ type: fetchEntryLinks.pending.type });

        const state = store.getState().entry;
        expect(state.entryLinksStatus).toBe("loading");
        expect(state.entryLinksError).toBeNull();
      });
    });

    describe("Fulfilled State", () => {
      it("sets entryLinksStatus to succeeded and populates entryLinks", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: {
            terms: [
              {
                name: "projects/p/locations/us/entryGroups/@dataplex/entries/term1",
                entryType: "projects/p/locations/global/entryTypes/dataplex-term",
                updateTime: "2024-01-15T10:00:00Z",
                entrySource: {
                  displayName: "Revenue",
                  description: "Total revenue",
                  labels: { finance: "true" },
                },
                linkedPaths: ["Schema.salary"],
              },
            ],
          },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "projects/p/entries/test", id_token: "token" }) as any
        );

        const state = store.getState().entry;
        expect(state.entryLinksStatus).toBe("succeeded");
        expect(state.entryLinks).toHaveLength(1);
        expect(state.entryLinks[0].displayName).toBe("Revenue");
        expect(state.entryLinks[0].description).toBe("Total revenue");
        expect(state.entryLinks[0].type).toBe("term");
        expect(state.entryLinks[0].linkedPaths).toEqual(["Schema.salary"]);
        expect(state.entryLinks[0].labels).toEqual(["finance:true"]);
      });

      it("handles empty terms array", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: { terms: [] },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "projects/p/entries/test", id_token: "token" }) as any
        );

        const state = store.getState().entry;
        expect(state.entryLinksStatus).toBe("succeeded");
        expect(state.entryLinks).toEqual([]);
      });

      it("handles missing terms key in response", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: { entryLinks: [] },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "projects/p/entries/test", id_token: "token" }) as any
        );

        const state = store.getState().entry;
        expect(state.entryLinksStatus).toBe("succeeded");
        expect(state.entryLinks).toEqual([]);
      });

      it("maps term entry with Timestamp object format", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: {
            terms: [
              {
                name: "projects/p/locations/us/entryGroups/@dataplex/entries/term2",
                entryType: "dataplex-term",
                updateTime: { seconds: 1705312800, nanos: 0 },
                entrySource: {
                  displayName: "Cost",
                  description: "Total cost",
                },
              },
            ],
          },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "projects/p/entries/test", id_token: "token" }) as any
        );

        const state = store.getState().entry;
        expect(state.entryLinks[0].lastModified).toBe(1705312800);
        expect(state.entryLinks[0].labels).toEqual([]);
      });

      it("maps term entry with missing displayName to Untitled", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: {
            terms: [
              {
                name: "projects/p/entries/term3",
                entrySource: {},
              },
            ],
          },
        });

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "projects/p/entries/test", id_token: "token" }) as any
        );

        const state = store.getState().entry;
        expect(state.entryLinks[0].displayName).toBe("Untitled");
        expect(state.entryLinks[0].description).toBe("");
      });

      it("sets Authorization header", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { terms: [] } });

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "test-entry", id_token: "my-token" }) as any
        );

        expect(axios.defaults.headers.common["Authorization"]).toBe("Bearer my-token");
      });

      it("constructs correct URL with encoded entryName", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { terms: [] } });

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "projects/p/entries/test entry", id_token: "token" }) as any
        );

        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("entryName=projects%2Fp%2Fentries%2Ftest%20entry")
        );
      });
    });

    describe("Rejected State", () => {
      it("sets entryLinksStatus to failed and clears entryLinks", async () => {
        const axiosError = new AxiosError("Network Error");
        (axiosError as any).response = { data: "Server error" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "test-entry", id_token: "token" }) as any
        );

        const state = store.getState().entry;
        expect(state.entryLinksStatus).toBe("failed");
        expect(state.entryLinks).toEqual([]);
      });

      it("returns PERMISSION_DENIED for 403 errors", async () => {
        const axiosError = new AxiosError("Forbidden");
        (axiosError as any).response = { status: 403, data: "Forbidden" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "test-entry", id_token: "token" }) as any
        );

        const state = store.getState().entry;
        expect(state.entryLinksStatus).toBe("failed");
        expect(state.entryLinksError).toEqual({
          type: "PERMISSION_DENIED",
          message: "You don't have access to this resource",
        });
      });

      it("handles non-AxiosError with generic message", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new Error("Generic error"));

        const store = createTestStore();
        await store.dispatch(
          fetchEntryLinks({ entryName: "test-entry", id_token: "token" }) as any
        );

        const state = store.getState().entry;
        expect(state.entryLinksStatus).toBe("failed");
        expect(state.entryLinksError).toBe("An unknown error occurred");
      });
    });

    describe("State Reset on fetchEntry.pending", () => {
      it("clears entryLinks when a new entry fetch starts", () => {
        const store = createTestStore({
          entryLinks: [{ id: "x", type: "term", displayName: "Old" } as any],
          entryLinksStatus: "succeeded",
          entryLinksError: null,
        });

        store.dispatch({ type: fetchEntry.pending.type });

        const state = store.getState().entry;
        expect(state.entryLinks).toEqual([]);
        expect(state.entryLinksStatus).toBe("idle");
        expect(state.entryLinksError).toBeNull();
      });
    });
  });

  // ==========================================================================
  // setLineageToEntryCopy Tests
  // ==========================================================================

  describe("setLineageToEntryCopy", () => {
    it("sets lineageToEntryCopy to true", () => {
      const store = createTestStore();
      store.dispatch(entrySlice.actions.setLineageToEntryCopy(true));

      const state = store.getState().entry;
      expect(state.lineageToEntryCopy).toBe(true);
    });

    it("sets lineageToEntryCopy to false", () => {
      const store = createTestStore({ lineageToEntryCopy: true });
      store.dispatch(entrySlice.actions.setLineageToEntryCopy(false));

      const state = store.getState().entry;
      expect(state.lineageToEntryCopy).toBe(false);
    });
  });

  // ==========================================================================
  // State Isolation Tests
  // ==========================================================================

  describe("State Isolation", () => {
    it("fetchEntry does not affect lineageEntryItems", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockEntryData,
      });

      const store = createTestStore({ lineageEntryItems: mockLineageEntryData });
      await store.dispatch(
        fetchEntry({ id_token: "token", entryName: "test-entry" }) as any
      );

      const state = store.getState().entry;
      expect(state.lineageEntryItems).toEqual(mockLineageEntryData);
    });

    it("fetchLineageEntry does not affect items when lineageToEntryCopy is false", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockLineageEntryData,
      });

      const store = createTestStore({
        items: mockEntryData,
        lineageToEntryCopy: false,
      });
      await store.dispatch(
        fetchLineageEntry({
          id_token: "token",
          fqn: "bigquery:project.dataset.table",
        }) as any
      );

      const state = store.getState().entry;
      expect(state.items).toEqual(mockEntryData);
    });

    it("history operations do not affect other state properties", () => {
      const store = createTestStore({
        items: mockEntryData,
        status: "succeeded",
        error: null,
        lineageEntryItems: mockLineageEntryData,
      });

      store.dispatch(pushToHistory());
      store.dispatch(setEntry(mockHistoryEntry1));
      store.dispatch(popFromHistory());

      const state = store.getState().entry;
      expect(state.lineageEntryItems).toEqual(mockLineageEntryData);
    });
  });

  // ==========================================================================
  // Action Type Tests
  // ==========================================================================

  describe("Action Types", () => {
    it("fetchEntry has correct action types", () => {
      expect(fetchEntry.pending.type).toBe("entry/fetchEntry/pending");
      expect(fetchEntry.fulfilled.type).toBe("entry/fetchEntry/fulfilled");
      expect(fetchEntry.rejected.type).toBe("entry/fetchEntry/rejected");
    });

    it("fetchLineageEntry has correct action types", () => {
      expect(fetchLineageEntry.pending.type).toBe(
        "entry/fetchLineageEntry/pending"
      );
      expect(fetchLineageEntry.fulfilled.type).toBe(
        "entry/fetchLineageEntry/fulfilled"
      );
      expect(fetchLineageEntry.rejected.type).toBe(
        "entry/fetchLineageEntry/rejected"
      );
    });

    it("fetchEntryLinks has correct action types", () => {
      expect(fetchEntryLinks.pending.type).toBe("entry/fetchEntryLinks/pending");
      expect(fetchEntryLinks.fulfilled.type).toBe("entry/fetchEntryLinks/fulfilled");
      expect(fetchEntryLinks.rejected.type).toBe("entry/fetchEntryLinks/rejected");
    });

    it("synchronous actions have correct types", () => {
      expect(setEntry.type).toBe("entry/setEntry");
      expect(pushToHistory.type).toBe("entry/pushToHistory");
      expect(popFromHistory.type).toBe("entry/popFromHistory");
      expect(clearHistory.type).toBe("entry/clearHistory");
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty response data", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {},
      });

      const store = createTestStore();
      await store.dispatch(
        fetchEntry({ id_token: "token", entryName: "test-entry" }) as any
      );

      const state = store.getState().entry;
      expect(state.items).toEqual({});
      expect(state.status).toBe("succeeded");
    });

    it("handles null response data", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: null,
      });

      const store = createTestStore();
      await store.dispatch(
        fetchEntry({ id_token: "token", entryName: "test-entry" }) as any
      );

      const state = store.getState().entry;
      expect(state.items).toBeNull();
    });

    it("handles special characters in entryName", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockEntryData,
      });

      const store = createTestStore();
      await store.dispatch(
        fetchEntry({
          id_token: "token",
          entryName: "projects/test/entries/entry@with-special.chars_123",
        }) as any
      );

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(
          "entryName=projects/test/entries/entry@with-special.chars_123"
        )
      );
    });

    it("handles special characters in fqn", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockLineageEntryData,
      });

      const store = createTestStore();
      await store.dispatch(
        fetchLineageEntry({
          id_token: "token",
          fqn: "bigquery:project-name.dataset_name.table-name",
        }) as any
      );

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(
          "fqn=bigquery:project-name.dataset_name.table-name"
        )
      );
    });

    it("handles rapid successive dispatches", async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: mockEntryData,
      });

      const store = createTestStore();

      await Promise.all([
        store.dispatch(
          fetchEntry({ id_token: "token1", entryName: "entry1" }) as any
        ),
        store.dispatch(
          fetchEntry({ id_token: "token2", entryName: "entry2" }) as any
        ),
      ]);

      const state = store.getState().entry;
      expect(state.status).toBe("succeeded");
    });
  });

  // ==========================================================================
  // Complex Workflow Tests
  // ==========================================================================

  describe("Complex Workflows", () => {
    it("navigates through history correctly", () => {
      const store = createTestStore();

      // Set first entry
      store.dispatch(setEntry(mockHistoryEntry1));
      expect(store.getState().entry.items).toEqual(mockHistoryEntry1);

      // Push to history and set second entry
      store.dispatch(pushToHistory());
      store.dispatch(setEntry(mockHistoryEntry2));
      expect(store.getState().entry.items).toEqual(mockHistoryEntry2);
      expect(store.getState().entry.history).toHaveLength(1);

      // Push again and set third entry
      store.dispatch(pushToHistory());
      store.dispatch(setEntry(mockEntryData));
      expect(store.getState().entry.items).toEqual(mockEntryData);
      expect(store.getState().entry.history).toHaveLength(2);

      // Navigate back
      store.dispatch(popFromHistory());
      expect(store.getState().entry.items).toEqual(mockHistoryEntry2);
      expect(store.getState().entry.history).toHaveLength(1);

      // Navigate back again
      store.dispatch(popFromHistory());
      expect(store.getState().entry.items).toEqual(mockHistoryEntry1);
      expect(store.getState().entry.history).toHaveLength(0);
    });

    it("handles lineageToEntryCopy workflow", async () => {
      const store = createTestStore();

      // Set lineageToEntryCopy flag
      store.dispatch(entrySlice.actions.setLineageToEntryCopy(true));
      expect(store.getState().entry.lineageToEntryCopy).toBe(true);

      // Fetch lineage entry
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockLineageEntryData,
      });

      await store.dispatch(
        fetchLineageEntry({
          id_token: "token",
          fqn: "bigquery:project.dataset.table",
        }) as any
      );

      const state = store.getState().entry;
      expect(state.lineageEntryItems).toEqual(mockLineageEntryData);
      expect(state.items).toEqual(mockLineageEntryData);
      expect(state.lineageToEntryCopy).toBe(false);
    });

    it("handles clearing history after navigation", () => {
      const store = createTestStore({
        items: mockEntryData,
        history: [mockHistoryEntry1, mockHistoryEntry2],
      });

      store.dispatch(clearHistory());

      const state = store.getState().entry;
      expect(state.history).toEqual([]);
      expect(state.items).toEqual(mockEntryData);
    });
  });

  // ==========================================================================
  // Reducer Direct Tests
  // ==========================================================================

  describe("Reducer Direct Tests", () => {
    it("reducer handles unknown action type", () => {
      const initialState = getInitialState();
      const newState = entryReducer(initialState, { type: "UNKNOWN_ACTION" });

      expect(newState).toEqual(initialState);
    });

    it("reducer handles undefined state", () => {
      const newState = entryReducer(undefined, { type: "INIT" });

      expect(newState.items).toEqual([]);
      expect(newState.status).toBe("idle");
      expect(newState.error).toBeNull();
      expect(newState.history).toEqual([]);
    });
  });

  // ==========================================================================
  // Exported Actions Tests
  // ==========================================================================

  describe("Exported Actions", () => {
    it("exports setEntry action", () => {
      expect(setEntry).toBeDefined();
      expect(typeof setEntry).toBe("function");
    });

    it("exports pushToHistory action", () => {
      expect(pushToHistory).toBeDefined();
      expect(typeof pushToHistory).toBe("function");
    });

    it("exports popFromHistory action", () => {
      expect(popFromHistory).toBeDefined();
      expect(typeof popFromHistory).toBe("function");
    });

    it("exports clearHistory action", () => {
      expect(clearHistory).toBeDefined();
      expect(typeof clearHistory).toBe("function");
    });

    it("exports fetchEntry async thunk", () => {
      expect(fetchEntry).toBeDefined();
      expect(typeof fetchEntry).toBe("function");
    });

    it("exports fetchLineageEntry async thunk", () => {
      expect(fetchLineageEntry).toBeDefined();
      expect(typeof fetchLineageEntry).toBe("function");
    });

    it("exports fetchEntryLinks async thunk", () => {
      expect(fetchEntryLinks).toBeDefined();
      expect(typeof fetchEntryLinks).toBe("function");
    });
  });
});
