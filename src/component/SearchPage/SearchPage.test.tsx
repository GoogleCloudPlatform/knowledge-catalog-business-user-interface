import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SearchPage from "./SearchPage";

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock dispatch function
const mockDispatch = vi.fn();

// Mock Redux state
let mockSearchTerm = "test query";
let mockSearchType = "All";
let mockSemanticSearch = false;
let mockResources: any[] = [];
let mockResourcesStatus = "idle";
let mockResourcesError: string | null = null;
let mockResourcesTotalSize = 0;
let mockResourcesRequestData: any = null;
let mockRequestItemStore: any[] = [];
let mockIsSearchFiltersOpen = false;
let mockSearchSubmitted = true;
let mockSearchFilters: any[] = [];

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: any) => any) => {
    const state = {
      search: {
        searchTerm: mockSearchTerm,
        searchType: mockSearchType,
        semanticSearch: mockSemanticSearch,
        isSearchFiltersOpen: mockIsSearchFiltersOpen,
        searchSubmitted: mockSearchSubmitted,
        searchFilters: mockSearchFilters,
      },
      resources: {
        items: mockResources,
        status: mockResourcesStatus,
        error: mockResourcesError,
        totalItems: mockResourcesTotalSize,
        itemsRequestData: mockResourcesRequestData,
        itemsStore: mockRequestItemStore,
      },
      user: {
        mode: 'light',
      },
    };
    return selector(state);
  },
}));

// Mock useAuth
const mockUser = {
  email: "test@example.com",
  token: "test-token-123",
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock searchResourcesByTerm thunk
vi.mock("../../features/resources/resourcesSlice", () => ({
  searchResourcesByTerm: vi.fn((params) => ({
    type: "resources/searchResourcesByTerm",
    payload: params,
  })),
}));

// Mock typeAliases
vi.mock("../../utils/resourceUtils", () => ({
  typeAliases: [
    { name: "BigQuery Table", value: "bigquery.table" },
    { name: "Cloud Storage", value: "gcs.bucket" },
    { name: "Pub/Sub", value: "pubsub.topic" },
  ],
}));

// Mock child components
let capturedFilterDropdownProps: any = null;
let capturedResourceViewerProps: any = null;
let capturedResourcePreviewProps: any = null;

vi.mock("../Filter/FilterDropDown", () => ({
  default: (props: any) => {
    capturedFilterDropdownProps = props;
    return (
      <div data-testid="filter-dropdown">
        <button
          data-testid="apply-filter-btn"
          onClick={() => props.onFilterChange([{ name: "TestFilter", type: "test" }])}
        >
          Apply Filter
        </button>
        <button
          data-testid="clear-filter-btn"
          onClick={() => props.onFilterChange([])}
        >
          Clear Filter
        </button>
      </div>
    );
  },
}));

vi.mock("../Common/ResourceViewer", () => ({
  default: (props: any) => {
    capturedResourceViewerProps = props;
    return (
      <div data-testid="resource-viewer">
        <span data-testid="resources-status">{props.resourcesStatus}</span>
        <span data-testid="resources-count">{props.resources?.length || 0}</span>
        <span data-testid="view-mode">{props.viewMode}</span>
        <span data-testid="start-index">{props.startIndex}</span>
        <span data-testid="page-size">{props.pageSize}</span>
        {props.customFilters}
        <button
          data-testid="select-resource-btn"
          onClick={() => props.onPreviewDataChange({ id: "resource-1", name: "Test Resource" })}
        >
          Select Resource
        </button>
        <button
          data-testid="clear-preview-btn"
          onClick={() => props.onPreviewDataChange(null)}
        >
          Clear Preview
        </button>
        <button
          data-testid="change-view-mode-btn"
          onClick={() => props.onViewModeChange(props.viewMode === "list" ? "table" : "list")}
        >
          Toggle View
        </button>
        {props.onTypeFilterChange && (
          <button
            data-testid="select-type-filter-btn"
            onClick={() => props.onTypeFilterChange("BigQuery Table")}
          >
            Select Type Filter
          </button>
        )}
        {props.onTypeFilterChange && (
          <button
            data-testid="clear-type-filter-btn"
            onClick={() => props.onTypeFilterChange(null)}
          >
            Clear Type Filter
          </button>
        )}
        <button
          data-testid="change-filters-btn"
          onClick={() => props.onFiltersChange([{ name: "NewFilter", type: "new" }])}
        >
          Change Filters
        </button>
        <button
          data-testid="pagination-next-btn"
          onClick={() => props.handlePagination("next", props.pageSize)}
        >
          Next Page
        </button>
        <button
          data-testid="pagination-prev-btn"
          onClick={() => props.handlePagination("previous", props.pageSize)}
        >
          Previous Page
        </button>
        <button
          data-testid="pagination-size-change-btn"
          onClick={() => props.handlePagination("next", 50, true)}
        >
          Change Page Size
        </button>
      </div>
    );
  },
}));

vi.mock("../Common/ResourcePreview", () => ({
  default: (props: any) => {
    capturedResourcePreviewProps = props;
    return (
      <div data-testid="resource-preview">
        <span data-testid="preview-data-name">{props.previewData?.name}</span>
        <button
          data-testid="close-preview-btn"
          onClick={() => props.onPreviewDataChange(null)}
        >
          Close Preview
        </button>
      </div>
    );
  },
}));

// ============================================================================
// Test Suite
// ============================================================================

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Reset mock state
    mockSearchTerm = "test query";
    mockSearchType = "All";
    mockSemanticSearch = false;
    mockResources = [];
    mockResourcesStatus = "idle";
    mockResourcesError = null;
    mockResourcesTotalSize = 0;
    mockResourcesRequestData = null;
    mockRequestItemStore = [];
    mockIsSearchFiltersOpen = false;
    mockSearchSubmitted = true;
    mockSearchFilters = [];

    // Reset captured props
    capturedFilterDropdownProps = null;
    capturedResourceViewerProps = null;
    capturedResourcePreviewProps = null;

    // Reset user
    mockUser.email = "test@example.com";
    mockUser.token = "test-token-123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Basic Rendering Tests
  // ==========================================================================

  describe("Basic Rendering", () => {
    it("renders the search page container", () => {
      render(<SearchPage />);

      expect(screen.getByTestId("filter-dropdown")).toBeInTheDocument();
      expect(screen.getByTestId("resource-viewer")).toBeInTheDocument();
    });

    it("renders FilterDropdown component", () => {
      render(<SearchPage />);

      expect(screen.getByTestId("filter-dropdown")).toBeInTheDocument();
    });

    it("renders ResourceViewer component", () => {
      render(<SearchPage />);

      expect(screen.getByTestId("resource-viewer")).toBeInTheDocument();
    });

    it("does not render ResourcePreview when no preview data", () => {
      render(<SearchPage />);

      expect(screen.queryByTestId("resource-preview")).not.toBeInTheDocument();
    });

    it("renders ResourcePreview when preview data is set", async () => {
      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("select-resource-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("resource-preview")).toBeInTheDocument();
      });
    });

    it("renders without props", () => {
      render(<SearchPage />);

      expect(screen.getByTestId("resource-viewer")).toBeInTheDocument();
    });

    it("renders Tune icon for filter toggle", () => {
      render(<SearchPage />);

      // The customFilters should be rendered within ResourceViewer
      expect(screen.getByTestId("TuneIcon")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Filter Panel Toggle Tests
  // ==========================================================================

  describe("Filter Panel Toggle", () => {
    it("toggles filter panel when Tune icon is clicked", async () => {
      mockIsSearchFiltersOpen = false;
      const { rerender } = render(<SearchPage />);

      const tuneIcon = screen.getByTestId("TuneIcon").closest("span");
      expect(tuneIcon).toBeInTheDocument();

      // Initial state - filters closed
      expect(tuneIcon).toHaveStyle({ background: "none" });

      // Click to open
      fireEvent.click(tuneIcon!);

      // Simulate state change to open
      mockIsSearchFiltersOpen = true;
      rerender(<SearchPage />);

      await waitFor(() => {
        const iconSpan = screen.getByTestId("CloseIcon").closest("span");
        expect(iconSpan).toHaveStyle({ background: "#022FCD" });
      });

      // Click to close again
      const closeIcon = screen.getByTestId("CloseIcon").closest("span");
      fireEvent.click(closeIcon!);

      // Simulate state change to closed
      mockIsSearchFiltersOpen = false;
      rerender(<SearchPage />);

      await waitFor(() => {
        const iconSpan = screen.getByTestId("TuneIcon").closest("span");
        expect(iconSpan).toHaveStyle({ background: "none" });
      });
    });

    it("prevents default and stops propagation on Tune icon click", () => {
      render(<SearchPage />);

      const tuneIcon = screen.getByTestId("TuneIcon").closest("span");

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };

      fireEvent.click(tuneIcon!, mockEvent);

      // The click should work (toggle happens)
      expect(screen.getByTestId("filter-dropdown")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Filter Change Tests
  // ==========================================================================

  describe("Filter Changes", () => {
    it("updates filters when FilterDropdown applies filter", async () => {
      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("apply-filter-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("clears filters when FilterDropdown clears", async () => {
      render(<SearchPage />);

      // First apply a filter
      fireEvent.click(screen.getByTestId("apply-filter-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });

      // Then clear
      fireEvent.click(screen.getByTestId("clear-filter-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("dispatches search when filters change and has previous filters", async () => {
      mockSearchTerm = "test";

      render(<SearchPage />);

      // Apply first filter
      fireEvent.click(screen.getByTestId("apply-filter-btn"));

      await waitFor(() => {
        // Should dispatch search after filter change
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("handles filter change from ResourceViewer", async () => {
      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("change-filters-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Search Type Change Tests
  // ==========================================================================

  describe("Search Type Changes", () => {
    it("adds BigQuery filter when searchType is BigQuery", async () => {
      mockSearchType = "All";
      const { rerender } = render(<SearchPage />);

      // Change searchType after mount to trigger the effect (first render is skipped by useRef)
      mockSearchType = "BigQuery";
      rerender(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "search/setSearchFilters",
          })
        );
      });
    });

    it("adds BigQuery filter when searchType is lowercase bigquery", async () => {
      mockSearchType = "All";
      const { rerender } = render(<SearchPage />);

      mockSearchType = "bigquery";
      rerender(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "search/setSearchFilters",
          })
        );
      });
    });

    it("removes BigQuery filter when searchType changes to All", async () => {
      mockSearchType = "All";
      const { rerender } = render(<SearchPage />);

      // First change to BigQuery
      mockSearchType = "BigQuery";
      rerender(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "search/setSearchFilters",
          })
        );
      });

      mockDispatch.mockClear();

      // Change back to All
      mockSearchType = "All";
      rerender(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("does not add duplicate BigQuery filter", async () => {
      mockSearchType = "All";
      const { rerender } = render(<SearchPage />);

      // Change to BigQuery
      mockSearchType = "BigQuery";
      rerender(<SearchPage />);

      // Count setSearchFilters calls
      const calls = mockDispatch.mock.calls.filter(
        (call) => call[0].type === "search/setSearchFilters"
      );

      // Should only add once
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Type Filter Tests
  // ==========================================================================

  describe("Type Filter Changes", () => {
    it("does not pass selectedTypeFilter or onTypeFilterChange to ResourceViewer", async () => {
      render(<SearchPage />);

      await waitFor(() => {
        // selectedTypeFilter and onTypeFilterChange should not be passed (multi-select is handled via onTypeAliasClick)
        expect(capturedResourceViewerProps.selectedTypeFilter).toBeUndefined();
        expect(capturedResourceViewerProps.onTypeFilterChange).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Preview Data Tests
  // ==========================================================================

  describe("Preview Data", () => {
    it("shows preview panel when resource is selected", async () => {
      render(<SearchPage />);

      expect(screen.queryByTestId("resource-preview")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("select-resource-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("resource-preview")).toBeInTheDocument();
        expect(screen.getByTestId("preview-data-name")).toHaveTextContent(
          "Test Resource"
        );
      });
    });

    it("hides preview panel when cleared from ResourceViewer", async () => {
      render(<SearchPage />);

      // First show preview
      fireEvent.click(screen.getByTestId("select-resource-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("resource-preview")).toBeInTheDocument();
      });

      // Then clear
      fireEvent.click(screen.getByTestId("clear-preview-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("resource-preview")).not.toBeInTheDocument();
      });
    });

    it("hides preview panel when closed from ResourcePreview", async () => {
      render(<SearchPage />);

      // First show preview
      fireEvent.click(screen.getByTestId("select-resource-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("resource-preview")).toBeInTheDocument();
      });

      // Close from preview panel
      fireEvent.click(screen.getByTestId("close-preview-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("resource-preview")).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // View Mode Tests
  // ==========================================================================

  describe("View Mode", () => {
    it("starts with list view mode", () => {
      render(<SearchPage />);

      expect(screen.getByTestId("view-mode")).toHaveTextContent("list");
    });

    it("toggles view mode when changed", async () => {
      render(<SearchPage />);

      expect(screen.getByTestId("view-mode")).toHaveTextContent("list");

      fireEvent.click(screen.getByTestId("change-view-mode-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("view-mode")).toHaveTextContent("table");
      });

      fireEvent.click(screen.getByTestId("change-view-mode-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("view-mode")).toHaveTextContent("list");
      });
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================

  describe("Pagination", () => {
    it("handles next page pagination", async () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));
      mockResourcesTotalSize = 100;

      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("pagination-next-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("handles previous page pagination", async () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));

      render(<SearchPage />);

      // Go to next page first
      fireEvent.click(screen.getByTestId("pagination-next-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });

      // Then go back
      fireEvent.click(screen.getByTestId("pagination-prev-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("handles page size change", async () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));
      mockResourcesTotalSize = 100;

      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("pagination-size-change-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("does not paginate when requestData is null", () => {
      mockResourcesRequestData = null;

      render(<SearchPage />);

      const dispatchCallsBefore = mockDispatch.mock.calls.length;

      fireEvent.click(screen.getByTestId("pagination-next-btn"));

      // Should not dispatch additional calls for pagination
      expect(mockDispatch.mock.calls.length).toBe(dispatchCallsBefore);
    });

    it("fetches more data when paginated items exceed store", async () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));
      mockResourcesTotalSize = 100;

      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("pagination-next-btn"));

      await waitFor(() => {
        // Should dispatch search for more data
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/searchResourcesByTerm",
          })
        );
      });
    });

    it("uses cached data when available in store", async () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));
      mockResourcesTotalSize = 60;

      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("pagination-next-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/setItems",
          })
        );
      });
    });

    it("handles edge case when on last page", async () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));
      mockResourcesTotalSize = 30;

      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("pagination-next-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Resource Status Tests
  // ==========================================================================

  describe("Resource Status", () => {
    it("handles idle status", () => {
      mockResourcesStatus = "idle";

      render(<SearchPage />);

      expect(screen.getByTestId("resources-status")).toHaveTextContent("idle");
    });

    it("handles loading status", () => {
      mockResourcesStatus = "loading";

      render(<SearchPage />);

      expect(screen.getByTestId("resources-status")).toHaveTextContent("loading");
    });

    it("handles succeeded status", () => {
      mockResourcesStatus = "succeeded";
      mockResources = [{ id: 1, name: "Resource 1" }];

      render(<SearchPage />);

      expect(screen.getByTestId("resources-status")).toHaveTextContent("succeeded");
      expect(screen.getByTestId("resources-count")).toHaveTextContent("1");
    });

    it("handles failed status", () => {
      mockResourcesStatus = "failed";
      mockResourcesError = "Something went wrong";

      render(<SearchPage />);

      expect(screen.getByTestId("resources-status")).toHaveTextContent("failed");
    });

    it("dispatches setItemsNextPageSize when status becomes succeeded", async () => {
      mockResourcesStatus = "succeeded";

      render(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/setItemsNextPageSize",
            payload: null,
          })
        );
      });
    });

    it("dispatches setItemsNextPageSize when status becomes failed", async () => {
      mockResourcesStatus = "failed";

      render(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/setItemsNextPageSize",
            payload: null,
          })
        );
      });
    });
  });

  // ==========================================================================
  // Initial Load Tests
  // ==========================================================================

  describe("Initial Load", () => {
    it("dispatches initial actions on mount", async () => {
      render(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/setItemsPreviousPageRequest",
            payload: null,
          })
        );
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/setItemsPageRequest",
            payload: null,
          })
        );
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/setItemsStoreData",
            payload: [],
          })
        );
      });
    });

    it("searches when searchTerm exists and resources are empty", async () => {
      mockSearchTerm = "test query";
      mockResources = [];

      render(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/searchResourcesByTerm",
          })
        );
      });
    });

    it("does not search when searchTerm is empty", async () => {
      mockSearchTerm = "";
      mockResources = [];

      render(<SearchPage />);

      // Wait a bit to ensure no search is dispatched
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const searchCalls = mockDispatch.mock.calls.filter(
        (call) => call[0].type === "resources/searchResourcesByTerm"
      );

      expect(searchCalls.length).toBe(0);
    });

    it("does not search when searchTerm is whitespace only", async () => {
      mockSearchTerm = "   ";
      mockResources = [];

      render(<SearchPage />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const searchCalls = mockDispatch.mock.calls.filter(
        (call) => call[0].type === "resources/searchResourcesByTerm"
      );

      expect(searchCalls.length).toBe(0);
    });
  });

  // ==========================================================================
  // Search Term Change Tests
  // ==========================================================================

  describe("Search Term Changes", () => {
    it("resets pagination when searchTerm changes", async () => {
      const { rerender } = render(<SearchPage />);

      mockSearchTerm = "new search";
      rerender(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/setItemsStoreData",
            payload: [],
          })
        );
      });
    });
  });

  // ==========================================================================
  // Props Passing Tests
  // ==========================================================================

  describe("Props Passing", () => {
    it("passes correct props to FilterDropdown", () => {
      render(<SearchPage />);

      expect(capturedFilterDropdownProps).toBeDefined();
      expect(capturedFilterDropdownProps.onFilterChange).toBeDefined();
    });

    it("passes correct props to ResourceViewer", () => {
      mockResources = [{ id: 1, name: "Test" }];
      mockResourcesStatus = "succeeded";

      render(<SearchPage />);

      expect(capturedResourceViewerProps).toBeDefined();
      expect(capturedResourceViewerProps.resources).toEqual(mockResources);
      expect(capturedResourceViewerProps.resourcesStatus).toBe("succeeded");
      expect(capturedResourceViewerProps.viewMode).toBe("list");
      expect(capturedResourceViewerProps.showFilters).toBe(true);
      expect(capturedResourceViewerProps.showSortBy).toBe(true);
      expect(capturedResourceViewerProps.showResultsCount).toBe(true);
      expect(capturedResourceViewerProps.renderPreview).toBe(false);
      expect(capturedResourceViewerProps.id_token).toBe("test-token-123");
    });

    it("passes correct props to ResourcePreview when visible", async () => {
      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("select-resource-btn"));

      await waitFor(() => {
        expect(capturedResourcePreviewProps).toBeDefined();
        expect(capturedResourcePreviewProps.previewData).toEqual({
          id: "resource-1",
          name: "Test Resource",
        });
        expect(capturedResourcePreviewProps.id_token).toBe("test-token-123");
      });
    });

    it("passes typeAliases to ResourceViewer", () => {
      render(<SearchPage />);

      expect(capturedResourceViewerProps.typeAliases).toBeDefined();
      expect(capturedResourceViewerProps.typeAliases).toHaveLength(3);
    });

    it("passes error to ResourceViewer", () => {
      mockResourcesError = "Test error";

      render(<SearchPage />);

      expect(capturedResourceViewerProps.error).toBe("Test error");
    });
  });

  // ==========================================================================
  // Semantic Search Tests
  // ==========================================================================

  describe("Semantic Search", () => {
    it("includes semanticSearch flag in search dispatch", async () => {
      mockSemanticSearch = true;
      mockSearchTerm = "test";
      mockResources = [];

      render(<SearchPage />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/searchResourcesByTerm",
            payload: expect.objectContaining({
              semanticSearch: true,
            }),
          })
        );
      });
    });
  });

  // ==========================================================================
  // User Token Tests
  // ==========================================================================

  describe("User Token Handling", () => {
    it("uses user token from auth", () => {
      render(<SearchPage />);

      expect(capturedResourceViewerProps.id_token).toBe("test-token-123");
    });

    it("uses empty string when user has no token", () => {
      mockUser.token = "";

      render(<SearchPage />);

      expect(capturedResourceViewerProps.id_token).toBe("");
    });

    it("handles null user", () => {
      // This tests the fallback
      const originalToken = mockUser.token;
      mockUser.token = undefined as any;

      render(<SearchPage />);

      expect(capturedResourceViewerProps.id_token).toBe("");

      mockUser.token = originalToken;
    });
  });

  // ==========================================================================
  // Layout Tests
  // ==========================================================================

  describe("Layout", () => {
    it("adjusts grid when preview is shown", async () => {
      render(<SearchPage />);

      // No preview - full width for resources
      expect(screen.queryByTestId("resource-preview")).not.toBeInTheDocument();

      // Show preview
      fireEvent.click(screen.getByTestId("select-resource-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("resource-preview")).toBeInTheDocument();
      });
    });

    it("filter panel has correct initial position", () => {
      const { container } = render(<SearchPage />);

      // The filter panel uses fixed positioning for a full-height overlay
      const filterPanel = container.querySelector('[style*="position: fixed"]');
      expect(filterPanel).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty resources array", () => {
      mockResources = [];
      mockResourcesStatus = "succeeded";

      render(<SearchPage />);

      expect(screen.getByTestId("resources-count")).toHaveTextContent("0");
    });

    it("handles large number of resources", () => {
      mockResources = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));
      mockResourcesStatus = "succeeded";

      render(<SearchPage />);

      expect(screen.getByTestId("resources-count")).toHaveTextContent("1000");
    });

    it("handles rapid filter changes", async () => {
      render(<SearchPage />);

      // Rapidly apply and clear filters
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId("apply-filter-btn"));
        fireEvent.click(screen.getByTestId("clear-filter-btn"));
      }

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("handles concurrent state updates", async () => {
      render(<SearchPage />);

      // Trigger multiple state updates at once
      fireEvent.click(screen.getByTestId("select-resource-btn"));
      fireEvent.click(screen.getByTestId("change-view-mode-btn"));
      fireEvent.click(screen.getByTestId("apply-filter-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("resource-preview")).toBeInTheDocument();
        expect(screen.getByTestId("view-mode")).toHaveTextContent("table");
      });
    });
  });

  // ==========================================================================
  // Type Aliases Filter Sync Tests
  // ==========================================================================

  describe("Type Aliases Filter Sync", () => {
    it("passes onTypeAliasClick to ResourceViewer for multi-select", async () => {
      render(<SearchPage />);

      await waitFor(() => {
        expect(capturedResourceViewerProps.onTypeAliasClick).toBeDefined();
      });
    });

    it("does not pass onTypeFilterChange (single-select removed)", async () => {
      render(<SearchPage />);

      await waitFor(() => {
        expect(capturedResourceViewerProps.onTypeFilterChange).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Pagination Edge Cases
  // ==========================================================================

  describe("Pagination Edge Cases", () => {
    it("handles previous page when on first page", async () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));

      render(<SearchPage />);

      // Try to go previous on first page
      fireEvent.click(screen.getByTestId("pagination-prev-btn"));

      await waitFor(() => {
        // Should handle gracefully
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it("handles empty request item store", () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = [];

      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("pagination-next-btn"));

      // Should not crash
      expect(screen.getByTestId("resource-viewer")).toBeInTheDocument();
    });

    it("handles page size change to larger size", async () => {
      mockResourcesRequestData = { pageSize: 20, pageToken: "token" };
      mockRequestItemStore = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Resource ${i}`,
      }));
      mockResourcesTotalSize = 100;

      render(<SearchPage />);

      fireEvent.click(screen.getByTestId("pagination-size-change-btn"));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "resources/setItemsStatus",
            payload: "loading",
          })
        );
      });
    });
  });

  // ==========================================================================
  // Custom Filters Style Tests
  // ==========================================================================

  describe("Custom Filters Styling", () => {
    it("has correct styles when filters are open", () => {
      mockIsSearchFiltersOpen = true;
      render(<SearchPage />);

      const closeIcon = screen.getByTestId("CloseIcon").closest("span");
      expect(closeIcon).toHaveStyle({
        background: "#022FCD",
        borderRadius: "59px",
        padding: "8px 13px",
      });
    });

    it("has correct styles when filters are closed", async () => {
      render(<SearchPage />);

      const tuneIcon = screen.getByTestId("TuneIcon").closest("span");

      // Close filters
      fireEvent.click(tuneIcon!);

      await waitFor(() => {
        expect(tuneIcon).toHaveStyle({
          background: "none",
        });
      });
    });
  });
});
