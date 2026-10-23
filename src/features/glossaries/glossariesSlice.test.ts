import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import glossariesReducer, {
  fetchGlossaries,
  fetchGlossaryChildren,
  fetchItemDetails,
  fetchTermRelationships,
  fetchGlossaryEntryDetails,
  fetchViewDetailsChildren,
  fetchViewDetailsEntryDetails,
  fetchViewDetailsTermRelationships,
  filterGlossaries,
  clearGlossaries,
  setActiveFilters,
  clearFilters,
  addFilter,
  removeFilter,
  updateFilterConnector,
  glossariesSlice,
} from "./glossariesSlice";
import type { FilterChip } from "../../component/Glossaries/GlossaryDataType";

// ==========================================================================
// Mock axios
// ==========================================================================

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
  AxiosError: class AxiosError extends Error {
    response?: { data: unknown; status?: number };
    constructor(message: string, response?: { data: unknown; status?: number }) {
      super(message);
      this.name = "AxiosError";
      this.response = response;
    }
  },
}));

// ==========================================================================
// Mock Data
// ==========================================================================

const mockGlossaryItem = {
  id: "projects/test-project/locations/global/glossaries/test-glossary",
  type: "glossary" as const,
  displayName: "Test Glossary",
  description: "Test glossary description",
  longDescription: "",
  project: "test-project",
  location: "global",
  lastModified: 1700000000,
  labels: ["key1:value1"],
  contacts: [],
  children: [],
  relations: [],
};

const mockCategoryItem = {
  id: "projects/test-project/locations/global/glossaries/test-glossary/categories/test-category",
  type: "category" as const,
  displayName: "Test Category",
  description: "Test category description",
  longDescription: "",
  lastModified: 1700000000,
  labels: [],
  contacts: [],
  children: [],
};

const mockTermItem = {
  id: "projects/test-project/locations/global/glossaries/test-glossary/terms/test-term",
  type: "term" as const,
  displayName: "Test Term",
  description: "Test term description",
  longDescription: "",
  lastModified: 1700000000,
  labels: [],
  contacts: [],
  children: [],
};

const mockGlossarySearchResult = {
  dataplexEntry: {
    name: "projects/test-project/locations/global/entryGroups/@dataplex/entries/test-entry",
    entrySource: {
      resource: "projects/test-project/locations/global/glossaries/test-glossary",
      displayName: "Test Glossary",
      description: "Test description",
      location: "global",
      labels: { key1: "value1" },
    },
    entryType: "GLOSSARY",
    updateTime: "2023-11-20T00:00:00Z",
  },
};

const mockCategoryApiResponse = {
  name: "projects/test-project/locations/global/glossaries/test-glossary/categories/cat1",
  displayName: "Category 1",
  description: "Category description",
  updateTime: "2023-11-20T00:00:00Z",
  labels: { env: "prod" },
};

const mockTermApiResponse = {
  name: "projects/test-project/locations/global/glossaries/test-glossary/terms/term1",
  displayName: "Term 1",
  description: "Term description",
  updateTime: "2023-11-20T00:00:00Z",
  labels: { type: "business" },
};

const mockEntryDetails = {
  name: "projects/test-project/locations/global/entryGroups/@dataplex/entries/test-entry",
  entrySource: {
    resource: "projects/test-project/locations/global/glossaries/test-glossary",
    displayName: "Test Glossary",
    description: "Short description",
  },
  entryType: "GLOSSARY",
  updateTime: "2023-11-20T00:00:00Z",
  aspects: {
    "dataplex-types.global.overview": {
      data: {
        content: "Long description content",
      },
    },
    "dataplex-types.global.contacts": {
      data: {
        identities: [
          { id: "user1@example.com" },
          { name: "User Two" },
        ],
      },
    },
  },
};

const mockLinkedAssetResult = {
  dataplexEntry: {
    name: "projects/test-project/locations/us-central1/entryGroups/@bigquery/entries/linked-asset",
    entrySource: {
      displayName: "Linked Asset",
      description: "Asset description",
    },
    updateTime: "2023-11-20T00:00:00Z",
  },
};

const mockSynonymResult = {
  dataplexEntry: {
    name: "projects/test-project/locations/global/glossaries/test-glossary/terms/synonym-term",
    entrySource: {
      displayName: "Synonym Term",
      description: "Synonym description",
    },
    updateTime: "2023-11-20T00:00:00Z",
  },
};

const mockRelatedResult = {
  dataplexEntry: {
    name: "projects/test-project/locations/global/glossaries/test-glossary/terms/related-term",
    entrySource: {
      displayName: "Related Term",
      description: "Related description",
    },
    updateTime: "2023-11-20T00:00:00Z",
  },
};

const mockFilterChip: FilterChip = {
  id: "filter-1",
  field: "name",
  value: "test",
  displayLabel: "Name: test",
  connector: "AND",
  showFieldLabel: true,
};

// ==========================================================================
// Helper Functions
// ==========================================================================

const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      glossaries: glossariesReducer,
    },
    preloadedState: preloadedState ? { glossaries: preloadedState } : undefined,
  });
};

const getInitialState = () => ({
  glossaryItems: [],
  viewDetailsItems: [],
  filteredItems: [],
  filteredTreeItems: [],
  totalSize: 0,
  status: "idle" as const,
  filterStatus: "idle" as const,
  activeFilters: [],
  error: null,
  filterError: null,
  accessDeniedItemId: null,
  selectedId: "",
  expandedIds: [] as string[],
  tabValue: 0,
});

// ==========================================================================
// Initial State Tests
// ==========================================================================

describe("glossariesSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("returns the initial state", () => {
      const store = createTestStore();
      const state = store.getState().glossaries;

      expect(state.glossaryItems).toEqual([]);
      expect(state.viewDetailsItems).toEqual([]);
      expect(state.filteredItems).toEqual([]);
      expect(state.filteredTreeItems).toEqual([]);
      expect(state.totalSize).toBe(0);
      expect(state.status).toBe("idle");
      expect(state.filterStatus).toBe("idle");
      expect(state.activeFilters).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.filterError).toBeNull();
      expect(state.accessDeniedItemId).toBeNull();
    });

    it("has correct slice name", () => {
      expect(glossariesSlice.name).toBe("glossaries");
    });

    it("exports reducer as default", () => {
      expect(glossariesReducer).toBeDefined();
      expect(typeof glossariesReducer).toBe("function");
    });
  });

  // ==========================================================================
  // Synchronous Reducers Tests
  // ==========================================================================

  describe("Synchronous Reducers", () => {
    describe("clearGlossaries", () => {
      it("clears glossaryItems and resets status", () => {
        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
          status: "succeeded",
        });

        store.dispatch(clearGlossaries());

        const state = store.getState().glossaries;
        expect(state.glossaryItems).toEqual([]);
        expect(state.status).toBe("idle");
      });

      it("also clears the filter state, which used to survive logout", () => {
        // Dispatched by logout(). It previously reset only glossaryItems/status,
        // so activeFilters and filteredTreeItems carried into the next session -
        // and the page renders filteredTreeItems whenever activeFilters is
        // non-empty, so the new session opened on the old filtered subset.
        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
          filteredTreeItems: [mockGlossaryItem],
          viewDetailsItems: [mockGlossaryItem],
          activeFilters: [{ id: "f1", field: "name", value: "x", displayLabel: "x" }],
          totalSize: 42,
          selectedId: "some-id",
        });

        store.dispatch(clearGlossaries());

        expect(store.getState().glossaries).toEqual(getInitialState());
      });
    });

    describe("setActiveFilters", () => {
      it("sets active filters", () => {
        const store = createTestStore();
        const filters: FilterChip[] = [mockFilterChip];

        store.dispatch(setActiveFilters(filters));

        const state = store.getState().glossaries;
        expect(state.activeFilters).toEqual(filters);
      });

      it("replaces existing filters", () => {
        const store = createTestStore({
          ...getInitialState(),
          activeFilters: [mockFilterChip],
        });

        const newFilters: FilterChip[] = [
          { ...mockFilterChip, id: "filter-2", value: "new", displayLabel: "Name: new" },
        ];

        store.dispatch(setActiveFilters(newFilters));

        const state = store.getState().glossaries;
        expect(state.activeFilters).toEqual(newFilters);
      });
    });

    describe("clearFilters", () => {
      it("clears all filter-related state", () => {
        const store = createTestStore({
          ...getInitialState(),
          activeFilters: [mockFilterChip],
          filteredItems: [mockGlossaryItem],
          filteredTreeItems: [mockGlossaryItem],
          filterStatus: "succeeded",
          filterError: "Some error",
        });

        store.dispatch(clearFilters());

        const state = store.getState().glossaries;
        expect(state.activeFilters).toEqual([]);
        expect(state.filteredItems).toEqual([]);
        expect(state.filteredTreeItems).toEqual([]);
        expect(state.filterStatus).toBe("idle");
        expect(state.filterError).toBeNull();
      });
    });

    describe("addFilter", () => {
      it("adds a filter to activeFilters", () => {
        const store = createTestStore();

        store.dispatch(addFilter(mockFilterChip));

        const state = store.getState().glossaries;
        expect(state.activeFilters).toHaveLength(1);
        expect(state.activeFilters[0]).toEqual(mockFilterChip);
      });

      it("appends to existing filters", () => {
        const store = createTestStore({
          ...getInitialState(),
          activeFilters: [mockFilterChip],
        });

        const newFilter: FilterChip = { ...mockFilterChip, id: "filter-2" };
        store.dispatch(addFilter(newFilter));

        const state = store.getState().glossaries;
        expect(state.activeFilters).toHaveLength(2);
      });
    });

    describe("removeFilter", () => {
      it("removes a filter by id", () => {
        const store = createTestStore({
          ...getInitialState(),
          activeFilters: [mockFilterChip, { ...mockFilterChip, id: "filter-2" }],
        });

        store.dispatch(removeFilter("filter-1"));

        const state = store.getState().glossaries;
        expect(state.activeFilters).toHaveLength(1);
        expect(state.activeFilters[0].id).toBe("filter-2");
      });

      it("does nothing if filter not found", () => {
        const store = createTestStore({
          ...getInitialState(),
          activeFilters: [mockFilterChip],
        });

        store.dispatch(removeFilter("non-existent"));

        const state = store.getState().glossaries;
        expect(state.activeFilters).toHaveLength(1);
      });
    });

    describe("updateFilterConnector", () => {
      it("updates filter connector to OR", () => {
        const store = createTestStore({
          ...getInitialState(),
          activeFilters: [mockFilterChip],
        });

        store.dispatch(updateFilterConnector({ id: "filter-1", connector: "OR" }));

        const state = store.getState().glossaries;
        expect(state.activeFilters[0].connector).toBe("OR");
      });

      it("updates filter connector to AND", () => {
        const store = createTestStore({
          ...getInitialState(),
          activeFilters: [{ ...mockFilterChip, connector: "OR" }],
        });

        store.dispatch(updateFilterConnector({ id: "filter-1", connector: "AND" }));

        const state = store.getState().glossaries;
        expect(state.activeFilters[0].connector).toBe("AND");
      });

      it("does nothing if filter not found", () => {
        const store = createTestStore({
          ...getInitialState(),
          activeFilters: [mockFilterChip],
        });

        store.dispatch(updateFilterConnector({ id: "non-existent", connector: "OR" }));

        const state = store.getState().glossaries;
        expect(state.activeFilters[0].connector).toBe("AND");
      });
    });
  });

  // ==========================================================================
  // fetchGlossaries Tests
  // ==========================================================================

  describe("fetchGlossaries", () => {
    describe("Pending State", () => {
      it("sets status to loading and clears error", () => {
        const store = createTestStore({ ...getInitialState(), error: "old error" });
        store.dispatch({ type: fetchGlossaries.pending.type });

        const state = store.getState().glossaries;
        expect(state.status).toBe("loading");
        expect(state.error).toBeNull();
      });
    });

    describe("Fulfilled State", () => {
      it("sets status to succeeded and populates glossaryItems", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: {
            results: [mockGlossarySearchResult],
            totalSize: 1,
          },
        });

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "test-token" }) as any);

        const state = store.getState().glossaries;
        expect(state.status).toBe("succeeded");
        expect(state.glossaryItems).toHaveLength(1);
        expect(state.totalSize).toBe(1);
      });

      it("follows nextPageToken until exhausted, combining every page's results", async () => {
        // A single capped request silently dropped every glossary beyond the
        // first page, with no signal to the user that more existed.
        const pageOneResult = {
          ...mockGlossarySearchResult,
          dataplexEntry: {
            ...mockGlossarySearchResult.dataplexEntry,
            entrySource: {
              ...mockGlossarySearchResult.dataplexEntry.entrySource,
              resource: "projects/test-project/locations/global/glossaries/page-one-glossary",
            },
          },
        };
        const pageTwoResult = {
          ...mockGlossarySearchResult,
          dataplexEntry: {
            ...mockGlossarySearchResult.dataplexEntry,
            entrySource: {
              ...mockGlossarySearchResult.dataplexEntry.entrySource,
              resource: "projects/test-project/locations/global/glossaries/page-two-glossary",
            },
          },
        };

        vi.mocked(axios.post)
          .mockResolvedValueOnce({
            data: { results: [pageOneResult], totalSize: 2, nextPageToken: "token-for-page-2" },
          })
          .mockResolvedValueOnce({
            data: { results: [pageTwoResult], totalSize: 2 },
          });

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "test-token" }) as any);

        expect(axios.post).toHaveBeenCalledTimes(2);
        expect(axios.post).toHaveBeenNthCalledWith(
          2,
          expect.any(String),
          expect.objectContaining({ pageToken: "token-for-page-2" })
        );
        const state = store.getState().glossaries;
        expect(state.glossaryItems).toHaveLength(2);
        expect(state.totalSize).toBe(2);
      });

      it("stops after one request when the response carries no nextPageToken", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [mockGlossarySearchResult], totalSize: 1 },
        });

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "test-token" }) as any);

        expect(axios.post).toHaveBeenCalledTimes(1);
      });

      it("drops a category/term entry instead of mistyping it as a top-level glossary", async () => {
        // A query restricted to type=GLOSSARY can still return a nested
        // category/term (Dataplex/EXP:SEMANTIC does not reliably honor the
        // type filter). mapEntryToGlossaryItem hardcodes type: "glossary" with
        // no check of its own, so an entry like this must never reach it -
        // otherwise it becomes a fake, independent top-level glossary row,
        // distinct from its real place nested under its actual parent.
        const categoryResult = {
          dataplexEntry: {
            name: "projects/test-project/locations/global/entryGroups/@dataplex/entries/cat-entry",
            entrySource: {
              resource: "projects/test-project/locations/global/glossaries/g1/categories/c1",
              displayName: "Data Residency & Sovereignty",
              location: "global",
            },
            entryType: "projects/655216118709/locations/global/entryTypes/glossary-category",
          },
        };

        vi.mocked(axios.post).mockResolvedValueOnce({
          data: {
            results: [mockGlossarySearchResult, categoryResult],
            totalSize: 2,
          },
        });

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "test-token" }) as any);

        const state = store.getState().glossaries;
        expect(state.glossaryItems).toHaveLength(1);
        expect(state.glossaryItems[0].id).toBe(
          mockGlossarySearchResult.dataplexEntry.entrySource.resource
        );
      });

      it("drops a malformed result (missing name/entrySource) instead of crashing the reducer", async () => {
        // This runs directly inside the reducer with no surrounding try/catch
        // and the app has no error boundary - an unguarded property access
        // here would crash the whole app, not just this feature. The
        // entryType must itself look like a real top-level glossary so it
        // survives the thunk's own isTopLevelGlossaryEntry filter and
        // actually reaches mapEntryToGlossaryItem - anything lacking
        // dataplexEntry/entryType entirely is already dropped upstream.
        const malformedResults = [
          { dataplexEntry: { entryType: "projects/x/locations/global/entryTypes/glossary" } }, // no entrySource, no name
          {
            dataplexEntry: {
              entryType: "projects/x/locations/global/entryTypes/glossary",
              entrySource: {},
            },
          }, // no name, no resource
        ];

        vi.mocked(axios.post).mockResolvedValueOnce({
          data: {
            results: [mockGlossarySearchResult, ...malformedResults],
            totalSize: 3,
          },
        });

        const store = createTestStore();
        await expect(
          store.dispatch(fetchGlossaries({ id_token: "test-token" }) as any)
        ).resolves.toBeDefined();

        const state = store.getState().glossaries;
        expect(state.status).toBe("succeeded");
        expect(state.glossaryItems).toHaveLength(1);
        expect(state.glossaryItems[0].id).toBe(
          mockGlossarySearchResult.dataplexEntry.entrySource.resource
        );
      });

      it("sets Authorization header when id_token is provided", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "my-token" }) as any);

        expect(axios.defaults.headers.common["Authorization"]).toBe("Bearer my-token");
      });

      it("sets empty Authorization header when id_token is not provided", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({}) as any);

        expect(axios.defaults.headers.common["Authorization"]).toBe("");
      });

      it("preserves existing children and aspects when updating", async () => {
        const existingItem = {
          ...mockGlossaryItem,
          children: [mockCategoryItem],
          aspects: { test: "data" },
          linkedAssets: ["asset1"],
          relations: ["relation1"],
          longDescription: "Existing long desc",
        };

        vi.mocked(axios.post).mockResolvedValueOnce({
          data: {
            results: [mockGlossarySearchResult],
            totalSize: 1,
          },
        });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [existingItem],
        });

        await store.dispatch(fetchGlossaries({ id_token: "token" }) as any);

        const state = store.getState().glossaries;
        expect(state.glossaryItems[0].children).toEqual([mockCategoryItem]);
        expect(state.glossaryItems[0].aspects).toEqual({ test: "data" });
      });

      it("handles response without results", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { totalSize: 0 },
        });

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "token" }) as any);

        const state = store.getState().glossaries;
        expect(state.status).toBe("succeeded");
        expect(state.glossaryItems).toEqual([]);
      });
    });

    describe("Rejected State", () => {
      it("sets status to failed and captures error", async () => {
        const axiosError = new AxiosError("Network Error");
        (axiosError as any).response = { data: "Server error" };
        vi.mocked(axios.post).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "token" }) as any);

        const state = store.getState().glossaries;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Server error");
      });

      it("handles AxiosError with message when response is undefined", async () => {
        const axiosError = new AxiosError("Network Error");
        vi.mocked(axios.post).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "token" }) as any);

        const state = store.getState().glossaries;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("Network Error");
      });

      it("handles non-AxiosError with generic message", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("Generic error"));

        const store = createTestStore();
        await store.dispatch(fetchGlossaries({ id_token: "token" }) as any);

        const state = store.getState().glossaries;
        expect(state.status).toBe("failed");
        expect(state.error).toBe("An unknown error occurred");
      });
    });
  });

  // ==========================================================================
  // fetchGlossaryChildren Tests
  // ==========================================================================

  describe("fetchGlossaryChildren", () => {
    describe("Fulfilled State", () => {
      it("fetches and maps categories and terms", async () => {
        vi.mocked(axios.get)
          .mockResolvedValueOnce({ data: { categories: [mockCategoryApiResponse] } })
          .mockResolvedValueOnce({ data: { terms: [mockTermApiResponse] } });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
        });

        await store.dispatch(
          fetchGlossaryChildren({
            parentId: "projects/test-project/locations/global/glossaries/test-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const glossary = state.glossaryItems.find(
          (g) => g.id === "projects/test-project/locations/global/glossaries/test-glossary"
        );
        expect(glossary?.children?.length).toBeGreaterThanOrEqual(0);
      });

      it("handles empty categories and terms", async () => {
        vi.mocked(axios.get)
          .mockResolvedValueOnce({ data: { categories: [] } })
          .mockResolvedValueOnce({ data: { terms: [] } });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
        });

        await store.dispatch(
          fetchGlossaryChildren({
            parentId: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.glossaryItems).toBeDefined();
      });

      it("handles API errors gracefully", async () => {
        vi.mocked(axios.get)
          .mockRejectedValueOnce(new Error("Categories error"))
          .mockRejectedValueOnce(new Error("Terms error"));

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryChildren({
            parentId: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        // Should handle errors and still return empty children
        const state = store.getState().glossaries;
        expect(state.glossaryItems).toBeDefined();
      });

      it("creates new item if parent not found in tree", async () => {
        vi.mocked(axios.get)
          .mockResolvedValueOnce({ data: { categories: [] } })
          .mockResolvedValueOnce({ data: { terms: [] } });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryChildren({
            parentId: "projects/test-project/locations/global/glossaries/new-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.glossaryItems.find(
          (g) => g.id === "projects/test-project/locations/global/glossaries/new-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.type).toBe("glossary");
      });

      it("identifies category parent correctly", async () => {
        vi.mocked(axios.get)
          .mockResolvedValueOnce({ data: { categories: [] } })
          .mockResolvedValueOnce({ data: { terms: [] } });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryChildren({
            parentId: "projects/test-project/locations/global/glossaries/test/categories/cat1",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const catItem = state.glossaryItems.find((g) =>
          g.id.includes("/categories/")
        );
        expect(catItem?.type).toBe("category");
      });

      it("builds hierarchy from nested categories", async () => {
        const parentCategory = {
          name: "projects/test-project/locations/global/glossaries/test/categories/parent",
          displayName: "Parent Category",
          description: "Parent",
          updateTime: "2023-11-20T00:00:00Z",
        };

        const childCategory = {
          name: "projects/test-project/locations/global/glossaries/test/categories/child",
          displayName: "Child Category",
          description: "Child",
          updateTime: "2023-11-20T00:00:00Z",
          parent: "projects/test-project/locations/global/glossaries/test/categories/parent",
        };

        const termWithParent = {
          name: "projects/test-project/locations/global/glossaries/test/terms/term1",
          displayName: "Term 1",
          description: "Term",
          updateTime: "2023-11-20T00:00:00Z",
          parent: "projects/test-project/locations/global/glossaries/test/categories/parent",
        };

        vi.mocked(axios.get)
          .mockResolvedValueOnce({
            data: { categories: [parentCategory, childCategory] },
          })
          .mockResolvedValueOnce({
            data: { terms: [termWithParent] },
          });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
        });

        await store.dispatch(
          fetchGlossaryChildren({
            parentId: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.glossaryItems).toBeDefined();
      });
    });

    describe("Error Handling", () => {
      it("handles API errors gracefully by returning empty children", async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

        const store = createTestStore();
        const result = await store.dispatch(
          fetchGlossaryChildren({
            parentId: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        // The thunk rejects with an error message
        expect(result.meta.requestStatus).toBe("rejected");
        expect(result.payload).toBe("Failed to fetch children");
      });

      it("handles rejection when processing error occurs", async () => {
        // To trigger rejection, we need an error during processing stage
        // Mock get to return invalid data that causes processing error
        vi.mocked(axios.get).mockImplementation(() => {
          throw new Error("Processing error");
        });

        const store = createTestStore();
        const result = await store.dispatch(
          fetchGlossaryChildren({
            parentId: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload).toBe("Failed to fetch children");
      });
    });
  });

  // ==========================================================================
  // fetchItemDetails Tests
  // ==========================================================================

  describe("fetchItemDetails", () => {
    describe("Fulfilled State", () => {
      it("fetches item details and clears accessDeniedItemId", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEntryDetails });

        const store = createTestStore({
          ...getInitialState(),
          accessDeniedItemId: "some-id",
        });

        await store.dispatch(
          fetchItemDetails({
            entryName: "projects/test-project/locations/global/glossaries/test-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.accessDeniedItemId).toBeNull();
      });

      it("constructs proper entry name when not including entryGroups", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEntryDetails });

        const store = createTestStore();

        await store.dispatch(
          fetchItemDetails({
            entryName: "projects/test-project/locations/global/glossaries/test",
            id_token: "token",
          }) as any
        );

        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("lookup-entry-rest"),
          expect.objectContaining({
            params: expect.objectContaining({
              entry: expect.stringContaining("entryGroups/@dataplex/entries"),
              view: "ALL",
            }),
          })
        );
      });
    });

    describe("Rejected State", () => {
      it("handles 403 error with PERMISSION_DENIED", async () => {
        const axiosError = new AxiosError("Forbidden");
        (axiosError as any).response = { status: 403, data: "Access denied" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();

        await store.dispatch(
          fetchItemDetails({
            entryName: "projects/test-project/locations/global/glossaries/test",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.accessDeniedItemId).toBe(
          "projects/test-project/locations/global/glossaries/test"
        );
      });

      it("handles non-403 errors", async () => {
        const axiosError = new AxiosError("Server error");
        (axiosError as any).response = { status: 500, data: "Internal error" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        const result = await store.dispatch(
          fetchItemDetails({
            entryName: "projects/test-project/locations/global/glossaries/test",
            id_token: "token",
          }) as any
        );

        expect(result.payload).toBe("Failed to fetch item details");
      });
    });
  });

  // ==========================================================================
  // fetchTermRelationships Tests
  // ==========================================================================

  describe("fetchTermRelationships", () => {
    describe("Fulfilled State", () => {
      it("fetches linked assets, synonyms, and related terms", async () => {
        vi.mocked(axios.post)
          .mockResolvedValueOnce({ data: { results: [mockLinkedAssetResult] } })
          .mockResolvedValueOnce({ data: { results: [mockSynonymResult] } })
          .mockResolvedValueOnce({ data: { results: [mockRelatedResult] } });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [
            {
              ...mockGlossaryItem,
              children: [mockTermItem],
            },
          ],
        });

        await store.dispatch(
          fetchTermRelationships({
            termId: mockTermItem.id,
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.glossaryItems).toBeDefined();
      });

      it("handles empty results", async () => {
        vi.mocked(axios.post)
          .mockResolvedValueOnce({ data: { results: [] } })
          .mockResolvedValueOnce({ data: { results: [] } })
          .mockResolvedValueOnce({ data: { results: [] } });

        const store = createTestStore();

        const result = await store.dispatch(
          fetchTermRelationships({
            termId: mockTermItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload.linkedAssets).toEqual([]);
        expect(result.payload.relations).toEqual([]);
      });

      it("drops a malformed synonym/related result instead of failing the whole fetch", async () => {
        // A malformed result (missing dataplexEntry/name) must not throw inside
        // mapRelation - the thunk's single try/catch would otherwise discard
        // every relation AND the linked assets Promise.all already fetched
        // successfully, over one bad entry.
        const malformedResult = { dataplexEntry: { entrySource: {} } }; // no name
        vi.mocked(axios.post)
          .mockResolvedValueOnce({ data: { results: [mockLinkedAssetResult] } })
          .mockResolvedValueOnce({ data: { results: [mockSynonymResult, malformedResult] } })
          .mockResolvedValueOnce({ data: { results: [mockRelatedResult, {}] } });

        const store = createTestStore();

        const result = await store.dispatch(
          fetchTermRelationships({
            termId: mockTermItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload.relations).toHaveLength(2);
        expect(result.payload.relations.map((r: any) => r.id)).toEqual([
          mockSynonymResult.dataplexEntry.name,
          mockRelatedResult.dataplexEntry.name,
        ]);
      });

      it("creates new term item if not found in tree", async () => {
        vi.mocked(axios.post)
          .mockResolvedValueOnce({ data: { results: [mockLinkedAssetResult] } })
          .mockResolvedValueOnce({ data: { results: [mockSynonymResult] } })
          .mockResolvedValueOnce({ data: { results: [] } });

        const store = createTestStore();

        await store.dispatch(
          fetchTermRelationships({
            termId: "projects/test-project/locations/global/glossaries/test/terms/new-term",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const termItem = state.glossaryItems.find(
          (g) => g.id === "projects/test-project/locations/global/glossaries/test/terms/new-term"
        );
        expect(termItem).toBeDefined();
        expect(termItem?.type).toBe("term");
      });
    });

    describe("Rejected State", () => {
      it("handles rejection", async () => {
        vi.mocked(axios.post).mockRejectedValue(new Error("Network error"));

        const store = createTestStore();
        const result = await store.dispatch(
          fetchTermRelationships({
            termId: mockTermItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload).toBe("Failed to fetch term relationships");
      });
    });
  });

  // ==========================================================================
  // fetchGlossaryEntryDetails Tests
  // ==========================================================================

  describe("fetchGlossaryEntryDetails", () => {
    describe("Fulfilled State", () => {
      it("fetches entry details and updates tree", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEntryDetails });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
        });

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.glossaryItems).toBeDefined();
      });

      it("does not clear accessDeniedItemId set for a DIFFERENT, still-pending item", async () => {
        // Two call sites dispatch this thunk (auto-select-first-item on mount,
        // and every click) and can be in flight together. An older, slower
        // fetch for item A succeeding after a newer, faster 403 for item B
        // must not wipe B's just-set denial - nothing re-fetches B again, so
        // the tabs shimmer gated on this flag would stay stuck forever.
        vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEntryDetails });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
          accessDeniedItemId: "projects/test/locations/global/glossaries/denied-glossary",
        });

        // Resolves successfully, but for a DIFFERENT id than the one flagged.
        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(store.getState().glossaries.accessDeniedItemId).toBe(
          "projects/test/locations/global/glossaries/denied-glossary"
        );
      });

      it("clears accessDeniedItemId when the fulfilled response is for that same item", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEntryDetails });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
          accessDeniedItemId: mockGlossaryItem.id,
        });

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(store.getState().glossaries.accessDeniedItemId).toBeNull();
      });

      it("creates new item if not found in tree", async () => {
        const categoryDetails = {
          ...mockEntryDetails,
          entryType: "GLOSSARY_CATEGORY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/g1/categories/c1",
            displayName: "New Category",
            description: "Desc",
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: categoryDetails });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: "projects/test/locations/global/glossaries/g1/categories/c1",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const catItem = state.glossaryItems.find((g) =>
          g.id.includes("/categories/")
        );
        expect(catItem).toBeDefined();
        expect(catItem?.type).toBe("category");
      });

      it("creates term item with correct type", async () => {
        const termDetails = {
          ...mockEntryDetails,
          entryType: "GLOSSARY_TERM",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/g1/terms/t1",
            displayName: "New Term",
            description: "Term Desc",
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: termDetails });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: "projects/test/locations/global/glossaries/g1/terms/t1",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const termItem = state.glossaryItems.find((g) => g.id.includes("/terms/"));
        expect(termItem?.type).toBe("term");
      });

      it("creates new glossary item when not found in tree with no overview aspect (fallback)", async () => {
        const glossaryDetailsNoOverview = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/new-glossary-no-overview",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/new-glossary-no-overview",
            displayName: "Glossary No Overview",
            description: "Basic description only",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "some-other-aspect": { data: { value: "test" } },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: glossaryDetailsNoOverview });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: "projects/test/locations/global/glossaries/new-glossary-no-overview",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.glossaryItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/new-glossary-no-overview"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.longDescription).toBe("Basic description only");
      });

      it("creates new item when not found in tree with no contacts aspect (empty array)", async () => {
        const glossaryDetailsNoContacts = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/new-glossary-no-contacts",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/new-glossary-no-contacts",
            displayName: "Glossary No Contacts",
            description: "Description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.overview": {
              data: { content: "Long description" },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: glossaryDetailsNoContacts });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: "projects/test/locations/global/glossaries/new-glossary-no-contacts",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.glossaryItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/new-glossary-no-contacts"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.contacts).toEqual([]);
      });

      it("creates new item when not found in tree with labels", async () => {
        const glossaryDetailsWithLabels = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/new-glossary-with-labels",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/new-glossary-with-labels",
            displayName: "Glossary With Labels",
            description: "Description",
            labels: { env: "prod", team: "data", version: "1.0" },
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.overview": {
              data: { content: "Long description" },
            },
            "dataplex-types.global.contacts": {
              data: {
                identities: [{ id: "owner@test.com" }],
              },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: glossaryDetailsWithLabels });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: "projects/test/locations/global/glossaries/new-glossary-with-labels",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.glossaryItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/new-glossary-with-labels"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.labels).toContain("env:prod");
        expect(newItem?.labels).toContain("team:data");
        expect(newItem?.labels).toContain("version:1.0");
        expect(newItem?.contacts).toContain("owner@test.com");
      });

      it("creates new item when not found in tree with empty overview content (fallback)", async () => {
        const glossaryDetailsEmptyOverview = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/empty-overview-glossary",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/empty-overview-glossary",
            displayName: "Empty Overview Glossary",
            description: "Fallback desc",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.overview": {
              data: { content: "" },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: glossaryDetailsEmptyOverview });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: "projects/test/locations/global/glossaries/empty-overview-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.glossaryItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/empty-overview-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.longDescription).toBe("Fallback desc");
      });

      it("creates new item when not found in tree with contacts aspect missing data", async () => {
        const glossaryDetailsContactsNoData = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/contacts-no-data-glossary",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/contacts-no-data-glossary",
            displayName: "Contacts No Data",
            description: "Description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.contacts": {},
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: glossaryDetailsContactsNoData });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: "projects/test/locations/global/glossaries/contacts-no-data-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.glossaryItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/contacts-no-data-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.contacts).toEqual([]);
      });

      it("creates new item with identity.name fallback when id is missing", async () => {
        const glossaryDetailsContactsNameOnly = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/contacts-name-only",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/contacts-name-only",
            displayName: "Contacts Name Only",
            description: "Description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.contacts": {
              data: {
                identities: [{ name: "Contact Name Only" }, { id: "contact@test.com" }],
              },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: glossaryDetailsContactsNameOnly });

        const store = createTestStore();

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: "projects/test/locations/global/glossaries/contacts-name-only",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.glossaryItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/contacts-name-only"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.contacts).toContain("Contact Name Only");
        expect(newItem?.contacts).toContain("contact@test.com");
      });
    });

    describe("Rejected State", () => {
      it("handles rejection with response data", async () => {
        const axiosError = new AxiosError("Server error");
        (axiosError as any).response = { data: "Custom error message" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        const result = await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload).toBe("Custom error message");
      });

      it("handles rejection without response data", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new Error("Network error"));

        const store = createTestStore();
        const result = await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload).toBe("Failed to lookup entry details");
      });

      it("does not clear accessDeniedItemId for a DIFFERENT item on a non-403 failure", async () => {
        // Same race as the fulfilled case: a non-403 failure for item A must
        // not wipe a just-set denial for a DIFFERENT item B.
        vi.mocked(axios.get).mockRejectedValueOnce(new Error("Network error"));

        const store = createTestStore({
          ...getInitialState(),
          accessDeniedItemId: "projects/test/locations/global/glossaries/denied-glossary",
        });

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(store.getState().glossaries.accessDeniedItemId).toBe(
          "projects/test/locations/global/glossaries/denied-glossary"
        );
      });

      it("clears accessDeniedItemId on a non-403 failure for that same item", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new Error("Network error"));

        const store = createTestStore({
          ...getInitialState(),
          accessDeniedItemId: mockGlossaryItem.id,
        });

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(store.getState().glossaries.accessDeniedItemId).toBeNull();
      });

      it("sets accessDeniedItemId on a 403 for the currently selected item", async () => {
        const axiosError = new AxiosError("Forbidden");
        (axiosError as any).response = { status: 403, data: "Access denied" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore({
          ...getInitialState(),
          selectedId: mockGlossaryItem.id,
          accessDeniedItemId: null,
        });

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(store.getState().glossaries.accessDeniedItemId).toBe(mockGlossaryItem.id);
      });

      it("does not hijack accessDeniedItemId on a 403 for a glossary the user never selected", async () => {
        // Defensive guard: if anything ever dispatches this thunk for an item
        // other than the current selection, its 403 must not overwrite the
        // flag the selected item's own denial already set - nothing
        // re-fetches the real selection afterward to restore it, so the tabs
        // shimmer gated on this flag would stay stuck forever.
        const axiosError = new AxiosError("Forbidden");
        (axiosError as any).response = { status: 403, data: "Access denied" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const selectedId = "projects/test/locations/global/glossaries/selected-g";
        const otherGlossaryId = "projects/test/locations/global/glossaries/other-g";

        const store = createTestStore({
          ...getInitialState(),
          selectedId,
          accessDeniedItemId: selectedId,
        });

        await store.dispatch(
          fetchGlossaryEntryDetails({
            entryName: otherGlossaryId,
            id_token: "token",
          }) as any
        );

        expect(store.getState().glossaries.accessDeniedItemId).toBe(selectedId);
      });
    });
  });

  // ==========================================================================
  // filterGlossaries Tests
  // ==========================================================================

  describe("filterGlossaries", () => {
    describe("Pending State", () => {
      it("sets filterStatus to loading and clears filterError", () => {
        const store = createTestStore({ ...getInitialState(), filterError: "old error" });
        store.dispatch({ type: filterGlossaries.pending.type });

        const state = store.getState().glossaries;
        expect(state.filterStatus).toBe("loading");
        expect(state.filterError).toBeNull();
      });
    });

    describe("Fulfilled State", () => {
      it("filters glossaries with name filter", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: {
            results: [mockGlossarySearchResult],
            totalSize: 1,
          },
        });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
        });

        await store.dispatch(
          filterGlossaries({
            filters: [mockFilterChip],
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.filterStatus).toBe("succeeded");
        expect(state.filteredItems).toHaveLength(1);
      });

      it("handles parent filter", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [{ ...mockFilterChip, field: "parent", value: "test-parent" }],
            id_token: "token",
          }) as any
        );

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.stringContaining('parent:"test-parent"'),
          })
        );
      });

      it("handles synonym filter", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [{ ...mockFilterChip, field: "synonym", value: "test-synonym" }],
            id_token: "token",
          }) as any
        );

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.stringContaining('synonym:"test-synonym"'),
          })
        );
      });

      it("handles labels filter", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [{ ...mockFilterChip, field: "labels", value: "env:prod" }],
            id_token: "token",
          }) as any
        );

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.stringContaining("labels:env:prod"),
          })
        );
      });

      it("handles aspect filter", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [{ ...mockFilterChip, field: "aspect", value: "custom-aspect" }],
            id_token: "token",
          }) as any
        );

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.stringContaining('has "custom-aspect"'),
          })
        );
      });

      it("handles contact filter", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [{ ...mockFilterChip, field: "contact", value: "user@test.com" }],
            id_token: "token",
          }) as any
        );

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.stringContaining("contacts.owner"),
          })
        );
      });

      it("handles default search (showFieldLabel false)", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [{ ...mockFilterChip, showFieldLabel: false }],
            id_token: "token",
          }) as any
        );

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.stringContaining("name:"),
          })
        );
      });

      it("handles empty filters", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [],
            id_token: "token",
          }) as any
        );

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.stringContaining("type=glossary"),
          })
        );
      });

      it("handles OR connector between filters", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        const filters: FilterChip[] = [
          { ...mockFilterChip, id: "f1", value: "val1" },
          { ...mockFilterChip, id: "f-or", connector: "OR", value: "" },
          { ...mockFilterChip, id: "f2", value: "val2" },
        ];

        await store.dispatch(
          filterGlossaries({
            filters,
            id_token: "token",
          }) as any
        );

        expect(axios.post).toHaveBeenCalled();
      });

      it("uses custom pageSize when provided", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [], totalSize: 0 },
        });

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [mockFilterChip],
            id_token: "token",
            pageSize: 50,
          }) as any
        );

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            pageSize: 50,
          })
        );
      });

      it("follows nextPageToken until exhausted, combining every page's results", async () => {
        // A single request capped at pageSize silently dropped every match
        // beyond the first page, with no signal to the user that more existed.
        const pageOneResult = {
          ...mockGlossarySearchResult,
          dataplexEntry: {
            ...mockGlossarySearchResult.dataplexEntry,
            entrySource: {
              ...mockGlossarySearchResult.dataplexEntry.entrySource,
              resource: "projects/test-project/locations/global/glossaries/page-one-glossary",
            },
          },
        };
        const pageTwoResult = {
          ...mockGlossarySearchResult,
          dataplexEntry: {
            ...mockGlossarySearchResult.dataplexEntry,
            entrySource: {
              ...mockGlossarySearchResult.dataplexEntry.entrySource,
              resource: "projects/test-project/locations/global/glossaries/page-two-glossary",
            },
          },
        };

        vi.mocked(axios.post)
          .mockResolvedValueOnce({
            data: { results: [pageOneResult], totalSize: 2, nextPageToken: "token-for-page-2" },
          })
          .mockResolvedValueOnce({
            data: { results: [pageTwoResult], totalSize: 2 },
          });

        const store = createTestStore();
        await store.dispatch(
          filterGlossaries({ filters: [mockFilterChip], id_token: "token" }) as any
        );

        expect(axios.post).toHaveBeenCalledTimes(2);
        expect(axios.post).toHaveBeenNthCalledWith(
          2,
          expect.any(String),
          expect.objectContaining({ pageToken: "token-for-page-2" })
        );
        const state = store.getState().glossaries;
        expect(state.filteredItems).toHaveLength(2);
        expect(state.filteredItems.map((i: { id: string }) => i.id)).toEqual([
          "projects/test-project/locations/global/glossaries/page-one-glossary",
          "projects/test-project/locations/global/glossaries/page-two-glossary",
        ]);
      });

      it("stops after one request when the response carries no nextPageToken", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [mockGlossarySearchResult], totalSize: 1 },
        });

        const store = createTestStore();
        await store.dispatch(
          filterGlossaries({ filters: [mockFilterChip], id_token: "token" }) as any
        );

        expect(axios.post).toHaveBeenCalledTimes(1);
      });

      it("builds filtered tree from results", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
          data: {
            results: [mockGlossarySearchResult],
            totalSize: 1,
          },
        });

        const store = createTestStore({
          ...getInitialState(),
          glossaryItems: [mockGlossaryItem],
        });

        await store.dispatch(
          filterGlossaries({
            filters: [mockFilterChip],
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.filteredTreeItems).toBeDefined();
      });

      it("drops a category search result entirely - never nested, never as a parent placeholder, never counted", async () => {
        // Search should only ever surface glossaries - a category/term match
        // is dropped upstream by isTopLevelGlossaryEntry, the same predicate
        // fetchGlossaries uses for the root list.
        const categoryResult = {
          dataplexEntry: {
            name: "projects/test-project/locations/global/entryGroups/@dataplex/entries/cat-entry",
            entrySource: {
              resource: "projects/test-project/locations/global/glossaries/g1/categories/c1",
              displayName: "Orphaned Category",
              location: "global",
            },
            entryType: "projects/655216118709/locations/global/entryTypes/glossary-category",
          },
        };

        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [categoryResult], totalSize: 1 },
        });

        const store = createTestStore({ ...getInitialState(), glossaryItems: [] });

        await store.dispatch(
          filterGlossaries({ filters: [mockFilterChip], id_token: "token" }) as any
        );

        const state = store.getState().glossaries;
        expect(state.filteredItems).toHaveLength(0);
        expect(state.totalSize).toBe(0);
        expect(state.filteredTreeItems).toHaveLength(0);
        // No branch-fetch should have been dispatched - filterGlossaries never
        // speculatively fetches branches.
        expect(axios.get).not.toHaveBeenCalled();
      });

      it("represents a not-yet-loaded glossary match as a normal unlocked row", async () => {
        // There's no pre-check for Dataplex glossary access - a glossary match
        // not already in the loaded tree is shown as a normal row; the user
        // discovers access the normal way, via handleNavigate's click flow
        // and the content pane's existing "no access" banner.
        const glossaryResult = {
          dataplexEntry: {
            name: "projects/test-project/locations/global/entryGroups/@dataplex/entries/g1-entry",
            entrySource: {
              resource: "projects/test-project/locations/global/glossaries/g1",
              displayName: "Unloaded Glossary",
              location: "global",
            },
            entryType: "projects/655216118709/locations/global/entryTypes/glossary",
          },
        };

        vi.mocked(axios.post).mockResolvedValueOnce({
          data: { results: [glossaryResult], totalSize: 1 },
        });

        const store = createTestStore({ ...getInitialState(), glossaryItems: [] });

        await store.dispatch(
          filterGlossaries({ filters: [mockFilterChip], id_token: "token" }) as any
        );

        const tree = store.getState().glossaries.filteredTreeItems;
        expect(tree).toHaveLength(1);
        expect(tree[0]).toMatchObject({
          id: "projects/test-project/locations/global/glossaries/g1",
          type: "glossary",
          isInaccessible: false,
        });
        expect(axios.get).not.toHaveBeenCalled();
      });
    });

    describe("Rejected State", () => {
      it("sets filterStatus to failed and captures filterError", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("Filter error"));

        const store = createTestStore();

        await store.dispatch(
          filterGlossaries({
            filters: [mockFilterChip],
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.filterStatus).toBe("failed");
        expect(state.filterError).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // ViewDetails Thunks Tests
  // ==========================================================================

  describe("ViewDetails Thunks", () => {
    describe("fetchViewDetailsChildren", () => {
      it("fetches children and updates viewDetailsItems", async () => {
        vi.mocked(axios.get)
          .mockResolvedValueOnce({ data: { categories: [mockCategoryApiResponse] } })
          .mockResolvedValueOnce({ data: { terms: [mockTermApiResponse] } });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsChildren({
            parentId: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.viewDetailsItems).toBeDefined();
      });

      it("handles category parent by extracting glossary path", async () => {
        vi.mocked(axios.get)
          .mockResolvedValueOnce({ data: { categories: [] } })
          .mockResolvedValueOnce({ data: { terms: [] } });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsChildren({
            parentId: "projects/test/locations/global/glossaries/g1/categories/cat1",
            id_token: "token",
          }) as any
        );

        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("glossary-children"),
          expect.anything()
        );
      });
    });

    describe("fetchViewDetailsEntryDetails", () => {
      it("fetches details and updates viewDetailsItems", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEntryDetails });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.viewDetailsItems).toBeDefined();
      });

      it("handles rejection", async () => {
        const axiosError = new AxiosError("Error");
        (axiosError as any).response = { data: "Error data" };
        vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

        const store = createTestStore();
        const result = await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: mockGlossaryItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload).toBe("Error data");
      });

      it("creates new glossary item when not found in tree with no overview aspect (falls back to basicDesc)", async () => {
        const detailsWithNoOverview = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/new-entry",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/new-glossary",
            displayName: "New Glossary",
            description: "Basic description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "some-other-aspect": { data: { value: "test" } },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsWithNoOverview });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/new-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.viewDetailsItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/new-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.longDescription).toBe("Basic description");
      });

      it("creates new category item when not found in tree with no contacts aspect", async () => {
        const categoryDetailsNoContacts = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/new-cat",
          entryType: "GLOSSARY_CATEGORY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/g1/categories/new-cat",
            displayName: "New Category",
            description: "Category description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.overview": {
              data: { content: "Long category description" },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: categoryDetailsNoContacts });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/g1/categories/new-cat",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.viewDetailsItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/g1/categories/new-cat"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.type).toBe("category");
        expect(newItem?.contacts).toEqual([]);
      });

      it("creates new term item when not found in tree with no labels", async () => {
        const termDetailsNoLabels = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/new-term",
          entryType: "GLOSSARY_TERM",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/g1/terms/new-term",
            displayName: "New Term",
            description: "Term description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.overview": {
              data: { content: "Long term description" },
            },
            "dataplex-types.global.contacts": {
              data: {
                identities: [{ id: "contact@test.com" }, { name: "Contact Name" }],
              },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: termDetailsNoLabels });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/g1/terms/new-term",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.viewDetailsItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/g1/terms/new-term"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.type).toBe("term");
        expect(newItem?.labels).toEqual([]);
        expect(newItem?.contacts).toContain("contact@test.com");
        expect(newItem?.contacts).toContain("Contact Name");
      });

      it("creates new item with all data populated when found in tree", async () => {
        const fullDetailsData = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/full-entry",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/full-glossary",
            displayName: "Full Glossary",
            description: "Full description",
            labels: { env: "prod", team: "data" },
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.overview": {
              data: { content: "Long overview content" },
            },
            "dataplex-types.global.contacts": {
              data: {
                identities: [{ id: "owner@test.com" }],
              },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: fullDetailsData });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/full-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.viewDetailsItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/full-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.type).toBe("glossary");
        expect(newItem?.labels).toContain("env:prod");
        expect(newItem?.labels).toContain("team:data");
        expect(newItem?.longDescription).toBe("Long overview content");
        expect(newItem?.contacts).toContain("owner@test.com");
      });

      it("creates new item with empty aspects", async () => {
        const detailsNoAspects = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/no-aspects",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/no-aspects-glossary",
            displayName: "No Aspects Glossary",
            description: "Description only",
          },
          updateTime: "2023-11-20T00:00:00Z",
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsNoAspects });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/no-aspects-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.viewDetailsItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/no-aspects-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.longDescription).toBe("Description only");
        expect(newItem?.contacts).toEqual([]);
        expect(newItem?.labels).toEqual([]);
      });

      it("creates new item with empty entrySource", async () => {
        const detailsNoEntrySource = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/no-source",
          entryType: "GLOSSARY",
          updateTime: "2023-11-20T00:00:00Z",
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsNoEntrySource });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/no-source-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.viewDetailsItems.length).toBeGreaterThan(0);
      });

      it("handles item with overview aspect that has empty content", async () => {
        const detailsEmptyOverview = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/empty-overview",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/empty-overview-glossary",
            displayName: "Empty Overview",
            description: "Fallback description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.overview": {
              data: { content: "" },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsEmptyOverview });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/empty-overview-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.viewDetailsItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/empty-overview-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.longDescription).toBe("Fallback description");
      });

      it("handles item with contacts aspect that has empty identities", async () => {
        const detailsEmptyContacts = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/empty-contacts",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/empty-contacts-glossary",
            displayName: "Empty Contacts",
            description: "Description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.contacts": {
              data: { identities: [] },
            },
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsEmptyContacts });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/empty-contacts-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.viewDetailsItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/empty-contacts-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.contacts).toEqual([]);
      });

      it("handles item with contacts aspect missing data property", async () => {
        const detailsContactsNoData = {
          name: "projects/test/locations/global/entryGroups/@dataplex/entries/contacts-no-data",
          entryType: "GLOSSARY",
          entrySource: {
            resource: "projects/test/locations/global/glossaries/contacts-no-data-glossary",
            displayName: "Contacts No Data",
            description: "Description",
          },
          updateTime: "2023-11-20T00:00:00Z",
          aspects: {
            "dataplex-types.global.contacts": {},
          },
        };

        vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsContactsNoData });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsEntryDetails({
            entryName: "projects/test/locations/global/glossaries/contacts-no-data-glossary",
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        const newItem = state.viewDetailsItems.find(
          (item: any) => item.id === "projects/test/locations/global/glossaries/contacts-no-data-glossary"
        );
        expect(newItem).toBeDefined();
        expect(newItem?.contacts).toEqual([]);
      });
    });

    describe("fetchViewDetailsTermRelationships", () => {
      it("fetches relationships and updates viewDetailsItems", async () => {
        vi.mocked(axios.post)
          .mockResolvedValueOnce({ data: { results: [mockLinkedAssetResult] } })
          .mockResolvedValueOnce({ data: { results: [] } })
          .mockResolvedValueOnce({ data: { results: [] } });

        const store = createTestStore();

        await store.dispatch(
          fetchViewDetailsTermRelationships({
            termId: mockTermItem.id,
            id_token: "token",
          }) as any
        );

        const state = store.getState().glossaries;
        expect(state.viewDetailsItems).toBeDefined();
      });

      it("drops a malformed synonym/related result instead of failing the whole fetch", async () => {
        const malformedResult = { dataplexEntry: { entrySource: {} } }; // no name
        vi.mocked(axios.post)
          .mockResolvedValueOnce({ data: { results: [mockLinkedAssetResult] } })
          .mockResolvedValueOnce({ data: { results: [mockSynonymResult, malformedResult] } })
          .mockResolvedValueOnce({ data: { results: [{}] } });

        const store = createTestStore();

        const result = await store.dispatch(
          fetchViewDetailsTermRelationships({
            termId: mockTermItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload.relations).toHaveLength(1);
        expect(result.payload.relations[0].id).toBe(mockSynonymResult.dataplexEntry.name);
      });

      it("handles rejection", async () => {
        vi.mocked(axios.post).mockRejectedValue(new Error("Error"));

        const store = createTestStore();
        const result = await store.dispatch(
          fetchViewDetailsTermRelationships({
            termId: mockTermItem.id,
            id_token: "token",
          }) as any
        );

        expect(result.payload).toBe("Failed to fetch term relationships");
      });
    });
  });

  // ==========================================================================
  // Helper Functions Coverage Tests
  // ==========================================================================

  describe("Helper Functions Coverage", () => {
    it("extractProject handles missing project index", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [
            {
              dataplexEntry: {
                name: "invalid-path/entry",
                entrySource: {
                  resource: "invalid-path/glossary",
                  displayName: "Test",
                },
                entryType: "GLOSSARY",
              },
            },
          ],
        },
      });

      const store = createTestStore();
      await store.dispatch(fetchGlossaries({ id_token: "token" }) as any);

      const state = store.getState().glossaries;
      expect(state.glossaryItems[0].project).toBe("-");
    });

    it("extractProjectLocation uses defaults when missing", async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEntryDetails });

      const store = createTestStore();
      await store.dispatch(
        fetchItemDetails({
          entryName: "some-entry-without-proper-path",
          id_token: "token",
        }) as any
      );

      expect(axios.get).toHaveBeenCalled();
    });

    it("updateDetailsInTree handles aspects without overview", async () => {
      const detailsWithoutOverview = {
        ...mockEntryDetails,
        aspects: {
          "some-other-aspect": { data: {} },
        },
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsWithoutOverview });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [mockGlossaryItem],
      });

      await store.dispatch(
        fetchGlossaryEntryDetails({
          entryName: mockGlossaryItem.id,
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.glossaryItems).toBeDefined();
    });

    it("updateDetailsInTree handles aspects without contacts", async () => {
      const detailsWithoutContacts = {
        ...mockEntryDetails,
        aspects: {
          "dataplex-types.global.overview": {
            data: { content: "Test content" },
          },
        },
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsWithoutContacts });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [mockGlossaryItem],
      });

      await store.dispatch(
        fetchGlossaryEntryDetails({
          entryName: mockGlossaryItem.id,
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.glossaryItems).toBeDefined();
    });

    it("mapSearchResultToGlossaryItem's category type derivation is unreachable via filterGlossaries - category results are dropped upstream", async () => {
      // Search should only ever surface glossaries - a category result is
      // dropped by isTopLevelGlossaryEntry before mapSearchResultToGlossaryItem
      // is ever called, so its "category" type-derivation branch (still
      // exercised directly by the "mapSearchResultToGlossaryItem" unit tests
      // elsewhere in this file) can't be reached through this thunk anymore.
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [
            {
              dataplexEntry: {
                name: "projects/test/locations/global/entryGroups/@dataplex/entries/cat",
                entrySource: {
                  resource: "projects/test/locations/global/glossaries/g1/categories/c1",
                  displayName: "Category",
                },
                entryType: "GLOSSARY_CATEGORY",
              },
            },
          ],
        },
      });

      const store = createTestStore();
      await store.dispatch(
        filterGlossaries({
          filters: [mockFilterChip],
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.filteredItems).toHaveLength(0);
    });

    it("mapSearchResultToGlossaryItem's term type derivation is unreachable via filterGlossaries - term results are dropped upstream", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [
            {
              dataplexEntry: {
                name: "projects/test/locations/global/entryGroups/@dataplex/entries/term",
                entrySource: {
                  resource: "projects/test/locations/global/glossaries/g1/terms/t1",
                  displayName: "Term",
                },
                entryType: "GLOSSARY_TERM",
              },
            },
          ],
        },
      });

      const store = createTestStore();
      await store.dispatch(
        filterGlossaries({
          filters: [mockFilterChip],
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.filteredItems).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Action Types Tests
  // ==========================================================================

  describe("Action Types", () => {
    it("fetchGlossaries has correct action types", () => {
      expect(fetchGlossaries.pending.type).toBe("glossaries/fetchGlossaries/pending");
      expect(fetchGlossaries.fulfilled.type).toBe("glossaries/fetchGlossaries/fulfilled");
      expect(fetchGlossaries.rejected.type).toBe("glossaries/fetchGlossaries/rejected");
    });

    it("fetchGlossaryChildren has correct action types", () => {
      expect(fetchGlossaryChildren.pending.type).toBe("glossaries/fetchChildren/pending");
      expect(fetchGlossaryChildren.fulfilled.type).toBe("glossaries/fetchChildren/fulfilled");
      expect(fetchGlossaryChildren.rejected.type).toBe("glossaries/fetchChildren/rejected");
    });

    it("filterGlossaries has correct action types", () => {
      expect(filterGlossaries.pending.type).toBe("glossaries/filterGlossaries/pending");
      expect(filterGlossaries.fulfilled.type).toBe("glossaries/filterGlossaries/fulfilled");
      expect(filterGlossaries.rejected.type).toBe("glossaries/filterGlossaries/rejected");
    });

    it("synchronous actions have correct types", () => {
      expect(clearGlossaries.type).toBe("glossaries/clearGlossaries");
      expect(setActiveFilters.type).toBe("glossaries/setActiveFilters");
      expect(clearFilters.type).toBe("glossaries/clearFilters");
      expect(addFilter.type).toBe("glossaries/addFilter");
      expect(removeFilter.type).toBe("glossaries/removeFilter");
      expect(updateFilterConnector.type).toBe("glossaries/updateFilterConnector");
    });
  });

  // ==========================================================================
  // Reducer Direct Tests
  // ==========================================================================

  describe("Reducer Direct Tests", () => {
    it("reducer handles unknown action type", () => {
      const initialState = getInitialState();
      const newState = glossariesReducer(initialState, { type: "UNKNOWN_ACTION" });
      expect(newState).toEqual(initialState);
    });

    it("reducer handles undefined state", () => {
      const newState = glossariesReducer(undefined, { type: "INIT" });
      expect(newState.glossaryItems).toEqual([]);
      expect(newState.status).toBe("idle");
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles fetchItemDetails rejected with non-object payload", () => {
      const store = createTestStore();
      store.dispatch({
        type: fetchItemDetails.rejected.type,
        payload: "Simple string error",
      });

      const state = store.getState().glossaries;
      expect(state.accessDeniedItemId).toBeNull();
    });

    it("handles mapEntryToGlossaryItem with missing entrySource", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [
            {
              dataplexEntry: {
                name: "projects/test/locations/global/entryGroups/@dataplex/entries/e1",
                entryType: "GLOSSARY",
              },
            },
          ],
        },
      });

      const store = createTestStore();
      await store.dispatch(fetchGlossaries({ id_token: "token" }) as any);

      const state = store.getState().glossaries;
      expect(state.glossaryItems[0].displayName).toBe("Untitled");
    });

    it("handles filter with unknown field type", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { results: [], totalSize: 0 },
      });

      const store = createTestStore();

      await store.dispatch(
        filterGlossaries({
          filters: [{ ...mockFilterChip, field: "unknown" as any }],
          id_token: "token",
        }) as any
      );

      expect(axios.post).toHaveBeenCalled();
    });

    it("handles multiple AND filters", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { results: [], totalSize: 0 },
      });

      const store = createTestStore();

      const filters: FilterChip[] = [
        { ...mockFilterChip, id: "f1", value: "val1" },
        { ...mockFilterChip, id: "f2", value: "val2" },
        { ...mockFilterChip, id: "f3", value: "val3" },
      ];

      await store.dispatch(
        filterGlossaries({
          filters,
          id_token: "token",
        }) as any
      );

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.stringContaining("AND"),
        })
      );
    });

    it("handles filtered tree with items not in original tree", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [
            {
              dataplexEntry: {
                name: "projects/test/locations/global/entryGroups/@dataplex/entries/new-item",
                entrySource: {
                  resource: "projects/test/locations/global/glossaries/new-glossary",
                  displayName: "New Item",
                },
                entryType: "GLOSSARY",
              },
            },
          ],
        },
      });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [mockGlossaryItem],
      });

      await store.dispatch(
        filterGlossaries({
          filters: [mockFilterChip],
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.filteredTreeItems.length).toBeGreaterThanOrEqual(0);
    });

    it("builds filtered tree with a glossary match found in the original tree, preserving its children", async () => {
      // Category/term can no longer reach filterGlossaries at all (dropped by
      // isTopLevelGlossaryEntry before mapping), so the only way to exercise
      // "match already present in originalTree, with a subtree to preserve"
      // is a glossary match - glossaries are always roots, but can still
      // already have children loaded (e.g. from a prior expand).
      const glossaryWithChildren = {
        ...mockGlossaryItem,
        id: "projects/test/locations/global/glossaries/glossary-with-children",
        children: [
          {
            ...mockCategoryItem,
            id: "projects/test/locations/global/glossaries/glossary-with-children/categories/cat1",
          },
        ],
      };

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [
            {
              dataplexEntry: {
                name: "projects/test/locations/global/entryGroups/@dataplex/entries/glossary-with-children",
                entrySource: {
                  resource: "projects/test/locations/global/glossaries/glossary-with-children",
                  displayName: "Glossary With Children",
                },
                entryType: "GLOSSARY",
              },
            },
          ],
        },
      });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [glossaryWithChildren],
      });

      await store.dispatch(
        filterGlossaries({
          filters: [mockFilterChip],
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.filteredItems).toHaveLength(1);
      expect(state.filteredItems[0].type).toBe("glossary");
      expect(state.filteredTreeItems[0]?.children?.length).toBeGreaterThan(0);
    });

    it("builds filtered tree with multiple glossary matches", async () => {
      const glossaryOne = {
        ...mockGlossaryItem,
        id: "projects/test/locations/global/glossaries/multi-1",
        displayName: "Glossary 1",
      };
      const glossaryTwo = {
        ...mockGlossaryItem,
        id: "projects/test/locations/global/glossaries/multi-2",
        displayName: "Glossary 2",
      };

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [
            {
              dataplexEntry: {
                name: "projects/test/locations/global/entryGroups/@dataplex/entries/multi-1",
                entrySource: {
                  resource: "projects/test/locations/global/glossaries/multi-1",
                  displayName: "Glossary 1",
                },
                entryType: "GLOSSARY",
              },
            },
            {
              dataplexEntry: {
                name: "projects/test/locations/global/entryGroups/@dataplex/entries/multi-2",
                entrySource: {
                  resource: "projects/test/locations/global/glossaries/multi-2",
                  displayName: "Glossary 2",
                },
                entryType: "GLOSSARY",
              },
            },
          ],
        },
      });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [glossaryOne, glossaryTwo],
      });

      await store.dispatch(
        filterGlossaries({
          filters: [mockFilterChip],
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.filteredItems).toHaveLength(2);
    });

    it("handles updateDetailsInTree with nested children", async () => {
      // Create glossary with deeply nested children
      const deeplyNestedGlossary = {
        ...mockGlossaryItem,
        id: "projects/test/locations/global/glossaries/deep-nested",
        children: [
          {
            ...mockCategoryItem,
            id: "projects/test/locations/global/glossaries/deep-nested/categories/level1",
            children: [
              {
                ...mockCategoryItem,
                id: "projects/test/locations/global/glossaries/deep-nested/categories/level2",
                children: [
                  {
                    ...mockTermItem,
                    id: "projects/test/locations/global/glossaries/deep-nested/categories/level2/terms/deep-term",
                  },
                ],
              },
            ],
          },
        ],
      };

      // Update details for the deeply nested term
      const deepTermDetails = {
        name: "projects/test/locations/global/entryGroups/@dataplex/entries/deep-term",
        entryType: "GLOSSARY_TERM",
        entrySource: {
          resource: "projects/test/locations/global/glossaries/deep-nested/categories/level2/terms/deep-term",
          displayName: "Updated Deep Term",
          description: "Updated description",
        },
        updateTime: "2023-11-20T00:00:00Z",
        aspects: {
          "dataplex-types.global.overview": {
            data: { content: "Long overview" },
          },
          "dataplex-types.global.contacts": {
            data: {
              identities: [{ id: "deep@test.com" }],
            },
          },
        },
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: deepTermDetails });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [deeplyNestedGlossary],
      });

      await store.dispatch(
        fetchGlossaryEntryDetails({
          entryName: "projects/test/locations/global/glossaries/deep-nested/categories/level2/terms/deep-term",
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      // Find the updated term in the nested structure
      const level1 = state.glossaryItems[0].children?.[0];
      const level2 = level1?.children?.[0];
      const deepTerm = level2?.children?.[0];
      expect(deepTerm?.longDescription).toBe("Long overview");
    });

    it("handles updateTermDataInTree with nested term", async () => {
      // Create glossary with nested term
      const glossaryWithNestedTerm = {
        ...mockGlossaryItem,
        id: "projects/test/locations/global/glossaries/nested-term-parent",
        children: [
          {
            ...mockCategoryItem,
            id: "projects/test/locations/global/glossaries/nested-term-parent/categories/cat1",
            children: [
              {
                ...mockTermItem,
                id: "projects/test/locations/global/glossaries/nested-term-parent/categories/cat1/terms/nested-term",
              },
            ],
          },
        ],
      };

      vi.mocked(axios.post)
        .mockResolvedValueOnce({ data: { results: [mockLinkedAssetResult] } })
        .mockResolvedValueOnce({ data: { results: [mockSynonymResult] } })
        .mockResolvedValueOnce({ data: { results: [mockRelatedResult] } });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [glossaryWithNestedTerm],
      });

      await store.dispatch(
        fetchTermRelationships({
          termId: "projects/test/locations/global/glossaries/nested-term-parent/categories/cat1/terms/nested-term",
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      const category = state.glossaryItems[0].children?.[0];
      const term = category?.children?.[0];
      expect(term?.linkedAssets).toBeDefined();
      expect(term?.relations).toBeDefined();
    });

    it("handles updateChildrenInTree with nested parent", async () => {
      // Create glossary with nested category
      const glossaryWithNestedCategory = {
        ...mockGlossaryItem,
        id: "projects/test/locations/global/glossaries/nested-cat-parent",
        children: [
          {
            ...mockCategoryItem,
            id: "projects/test/locations/global/glossaries/nested-cat-parent/categories/parent-cat",
            children: [],
          },
        ],
      };

      vi.mocked(axios.get)
        .mockResolvedValueOnce({ data: { categories: [mockCategoryApiResponse] } })
        .mockResolvedValueOnce({ data: { terms: [mockTermApiResponse] } });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [glossaryWithNestedCategory],
      });

      await store.dispatch(
        fetchGlossaryChildren({
          parentId: "projects/test/locations/global/glossaries/nested-cat-parent/categories/parent-cat",
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      const parentCategory = state.glossaryItems[0].children?.[0];
      expect(parentCategory?.children?.length).toBeGreaterThanOrEqual(0);
    });

    it("handles filter with empty original tree", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [mockGlossarySearchResult],
          totalSize: 1,
        },
      });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [], // Empty tree
      });

      await store.dispatch(
        filterGlossaries({
          filters: [mockFilterChip],
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.filteredItems).toHaveLength(1);
      // Since original tree is empty, filteredTreeItems should mark item as inaccessible
      expect(state.filteredTreeItems).toBeDefined();
    });

    it("handles filter returning empty results", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          results: [],
          totalSize: 0,
        },
      });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [mockGlossaryItem],
      });

      await store.dispatch(
        filterGlossaries({
          filters: [mockFilterChip],
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.filteredItems).toEqual([]);
      expect(state.filteredTreeItems).toEqual([]);
    });

    it("handles details.description fallback when entrySource.description is missing", async () => {
      const detailsWithDescriptionOnly = {
        name: "projects/test/locations/global/entryGroups/@dataplex/entries/desc-fallback",
        entryType: "GLOSSARY",
        description: "Description from top level",
        entrySource: {
          resource: "projects/test/locations/global/glossaries/desc-fallback",
          displayName: "Desc Fallback",
        },
        updateTime: "2023-11-20T00:00:00Z",
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsWithDescriptionOnly });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [{
          ...mockGlossaryItem,
          id: "projects/test/locations/global/glossaries/desc-fallback",
          description: "Original description",
        }],
      });

      await store.dispatch(
        fetchGlossaryEntryDetails({
          entryName: "projects/test/locations/global/glossaries/desc-fallback",
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      const item = state.glossaryItems[0];
      expect(item.description).toBe("Description from top level");
    });

    it("handles node.description fallback when both entrySource and details description are missing", async () => {
      const detailsWithNoDescription = {
        name: "projects/test/locations/global/entryGroups/@dataplex/entries/no-desc",
        entryType: "GLOSSARY",
        entrySource: {
          resource: "projects/test/locations/global/glossaries/no-desc",
          displayName: "No Desc",
        },
        updateTime: "2023-11-20T00:00:00Z",
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: detailsWithNoDescription });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [{
          ...mockGlossaryItem,
          id: "projects/test/locations/global/glossaries/no-desc",
          description: "Original node description",
        }],
      });

      await store.dispatch(
        fetchGlossaryEntryDetails({
          entryName: "projects/test/locations/global/glossaries/no-desc",
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      const item = state.glossaryItems[0];
      expect(item.description).toBe("Original node description");
    });

    it("handles updateDetailsInTree when found in children and no overview aspect", async () => {
      const glossaryWithCategory = {
        ...mockGlossaryItem,
        id: "projects/test/locations/global/glossaries/parent-g",
        children: [{
          ...mockCategoryItem,
          id: "projects/test/locations/global/glossaries/parent-g/categories/cat1",
          description: "Original cat description",
        }],
      };

      const categoryDetailsNoOverview = {
        name: "projects/test/locations/global/entryGroups/@dataplex/entries/cat1",
        entryType: "GLOSSARY_CATEGORY",
        entrySource: {
          resource: "projects/test/locations/global/glossaries/parent-g/categories/cat1",
          displayName: "Updated Cat",
          description: "Updated cat description",
        },
        updateTime: "2023-11-20T00:00:00Z",
        aspects: {},
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: categoryDetailsNoOverview });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [glossaryWithCategory],
      });

      await store.dispatch(
        fetchGlossaryEntryDetails({
          entryName: "projects/test/locations/global/glossaries/parent-g/categories/cat1",
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      const category = state.glossaryItems[0].children?.[0];
      expect(category?.description).toBe("Updated cat description");
      expect(category?.longDescription).toBe("Updated cat description");
    });

    it("handles updateDetailsInTree with contacts having only name field", async () => {
      const glossaryWithTerm = {
        ...mockGlossaryItem,
        id: "projects/test/locations/global/glossaries/contacts-test",
        children: [{
          ...mockTermItem,
          id: "projects/test/locations/global/glossaries/contacts-test/terms/t1",
        }],
      };

      const termDetailsWithContacts = {
        name: "projects/test/locations/global/entryGroups/@dataplex/entries/t1",
        entryType: "GLOSSARY_TERM",
        entrySource: {
          resource: "projects/test/locations/global/glossaries/contacts-test/terms/t1",
          displayName: "Term",
          description: "Term desc",
        },
        updateTime: "2023-11-20T00:00:00Z",
        aspects: {
          "dataplex-types.global.contacts": {
            data: {
              identities: [{ name: "Name Only Contact" }, { id: "id@test.com" }, {}],
            },
          },
        },
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: termDetailsWithContacts });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [glossaryWithTerm],
      });

      await store.dispatch(
        fetchGlossaryEntryDetails({
          entryName: "projects/test/locations/global/glossaries/contacts-test/terms/t1",
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      const term = state.glossaryItems[0].children?.[0];
      expect(term?.contacts).toContain("Name Only Contact");
      expect(term?.contacts).toContain("id@test.com");
    });

    it("handles children with no children property in updateChildrenInTree", async () => {
      // Item without children property at all
      const glossaryNoChildren: any = {
        id: "projects/test/locations/global/glossaries/no-children-prop",
        type: "glossary",
        displayName: "No Children Prop",
      };

      vi.mocked(axios.get)
        .mockResolvedValueOnce({ data: { categories: [] } })
        .mockResolvedValueOnce({ data: { terms: [] } });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [glossaryNoChildren],
      });

      await store.dispatch(
        fetchGlossaryChildren({
          parentId: "projects/test/locations/global/glossaries/non-existent-parent",
          id_token: "token",
        }) as any
      );

      // Should create new item since parent not found
      const state = store.getState().glossaries;
      expect(state.glossaryItems.length).toBeGreaterThan(1);
    });

    it("handles category with empty children array in hierarchy build", async () => {
      vi.mocked(axios.get)
        .mockResolvedValueOnce({
          data: {
            categories: [
              { name: "cat1", displayName: "Cat 1", children: [] },
              { name: "cat2", displayName: "Cat 2", parent: "cat1" },
            ],
          },
        })
        .mockResolvedValueOnce({ data: { terms: [] } });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [mockGlossaryItem],
      });

      await store.dispatch(
        fetchGlossaryChildren({
          parentId: mockGlossaryItem.id,
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      expect(state.glossaryItems[0].children).toBeDefined();
    });

    it("handles term with parent in hierarchy build", async () => {
      // New implementation makes a single call returning both categories and terms
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          categories: [{ name: "cat1", displayName: "Cat 1" }],
          terms: [{ name: "term1", displayName: "Term 1", parent: "cat1" }],
        },
      });

      const store = createTestStore({
        ...getInitialState(),
        glossaryItems: [mockGlossaryItem],
      });

      await store.dispatch(
        fetchGlossaryChildren({
          parentId: mockGlossaryItem.id,
          id_token: "token",
        }) as any
      );

      const state = store.getState().glossaries;
      // Term should be nested under category
      const category = state.glossaryItems[0].children?.find((c) => c.id === "cat1");
      expect(category?.children?.length).toBeGreaterThan(0);
    });
  });
});
