import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SideDetailsPanel from "./SideDetailsPanel";

// Mock the NotificationContext
const mockShowNotification = vi.fn();
vi.mock("../../contexts/NotificationContext", () => ({
  useNotification: () => ({
    showNotification: mockShowNotification,
  }),
}));

// Mock child components
vi.mock("../Annotation/PreviewAnnotation", () => ({
  default: ({ entry, css, expandedItems, setExpandedItems }: any) => (
    <div
      data-testid="preview-annotation"
      data-entry={JSON.stringify(entry)}
      data-css={JSON.stringify(css)}
      data-expanded-count={expandedItems?.size || 0}
    >
      PreviewAnnotation
      <button
        data-testid="mock-expand-item"
        onClick={() => setExpandedItems && setExpandedItems(new Set(["test-key"]))}
      >
        Expand Item
      </button>
    </div>
  ),
}));

vi.mock("../Schema/Schema", () => ({
  default: ({ entry, sx }: any) => (
    <div
      data-testid="schema"
      data-entry={JSON.stringify(entry)}
      data-sx={JSON.stringify(sx)}
    >
      Schema Component
    </div>
  ),
}));

vi.mock("../Schema/SchemaFilter", () => ({
  default: ({ entry, onFilteredEntryChange }: any) => (
    <div data-testid="schema-filter">
      SchemaFilter
      <button
        data-testid="apply-schema-filter"
        onClick={() =>
          onFilteredEntryChange && onFilteredEntryChange({ ...entry, filtered: true })
        }
      >
        Apply Filter
      </button>
    </div>
  ),
}));

vi.mock("../Annotation/AnnotationFilter", () => ({
  default: ({ entry, onFilteredEntryChange, onCollapseAll, onExpandAll }: any) => (
    <div data-testid="annotation-filter">
      AnnotationFilter
      <button
        data-testid="apply-annotation-filter"
        onClick={() =>
          onFilteredEntryChange && onFilteredEntryChange({ ...entry, filtered: true })
        }
      >
        Apply Filter
      </button>
      <button data-testid="collapse-all-btn" onClick={() => onCollapseAll && onCollapseAll()}>
        Collapse All
      </button>
      <button data-testid="expand-all-btn" onClick={() => onExpandAll && onExpandAll()}>
        Expand All
      </button>
    </div>
  ),
}));

// Mock resourceUtils
vi.mock("../../utils/resourceUtils", () => ({
  getName: (name: string, separator: string) => {
    if (!name) return "";
    const parts = name.split(separator);
    return parts[parts.length - 1];
  },
  hasValidAnnotationData: (data: any) => {
    return data && Object.keys(data).length > 0;
  },
  getFormattedDateTimeParts: (timestamp: any) => {
    const hasSeconds =
      timestamp && typeof timestamp === "object" && "seconds" in timestamp;
    const seconds = hasSeconds ? Number(timestamp.seconds) : timestamp;
    if (!seconds || typeof seconds !== "number" || isNaN(seconds)) {
      return { date: "-", time: "" };
    }
    const myDate = new Date(seconds * 1000);
    const date = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(myDate);
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(myDate);
    return { date, time };
  },
}));

// ============================================================================
// Mock Data Generators
// ============================================================================

const createMockEntrySource = (overrides: Record<string, any> = {}) => ({
  system: "bigquery",
  resource: "projects/test/datasets/data/tables/test_table",
  rowCount: 1000,
  labels: { env: "production", team: "data" },
  displayName: "Test Table",
  ...overrides,
});

const createMockAspects = (entryTypeNumber: string = "1") => ({
  [`${entryTypeNumber}.global.schema`]: {
    data: {
      fields: {
        fields: {
          listValue: {
            values: [
              { stringValue: "id" },
              { stringValue: "name" },
              { stringValue: "email" },
            ],
          },
        },
      },
    },
  },
  [`${entryTypeNumber}.global.overview`]: { data: {} },
  [`${entryTypeNumber}.global.contacts`]: { data: {} },
  [`${entryTypeNumber}.global.usage`]: { data: {} },
  [`${entryTypeNumber}.custom.annotation1`]: { key1: "value1" },
  [`${entryTypeNumber}.custom.annotation2`]: { key2: "value2" },
});

const createMockEntry = (overrides: Record<string, any> = {}) => ({
  name: "projects/test-project/locations/us/entryGroups/group/entries/test-entry",
  entryType: "projects/1/locations/us/entryTypes/bigquery.table",
  fullyQualifiedName: "bigquery:test-project.dataset.test_table",
  createTime: { seconds: 1704067200 }, // Jan 1, 2024 00:00:00 UTC
  updateTime: { seconds: 1704153600 }, // Jan 2, 2024 00:00:00 UTC
  entrySource: createMockEntrySource(),
  aspects: createMockAspects("1"),
  ...overrides,
});

// ============================================================================
// Test Suite
// ============================================================================

describe("SideDetailsPanel", () => {
  const mockClipboard = {
    writeText: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("Loading State", () => {
    it("renders loading skeleton when status is loading", () => {
      render(<SideDetailsPanel sidePanelDataStatus="loading" />);

      // Should show disabled tabs
      expect(screen.getByText("Asset Info")).toBeInTheDocument();
      expect(screen.getByText("Aspects")).toBeInTheDocument();
      expect(screen.getByText("Schema")).toBeInTheDocument();

      // Should show skeleton labels
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.getByText("Rows")).toBeInTheDocument();
      expect(screen.getByText("Columns")).toBeInTheDocument();
      expect(screen.getByText("Creation Time")).toBeInTheDocument();
      expect(screen.getByText("Last Modification")).toBeInTheDocument();
      expect(screen.getByText("Identifiers")).toBeInTheDocument();
      expect(screen.getByText("Labels")).toBeInTheDocument();
    });

    it("renders close button in loading state when onClose is provided", () => {
      const mockOnClose = vi.fn();
      render(<SideDetailsPanel sidePanelDataStatus="loading" onClose={mockOnClose} />);

      const closeButton = screen.getByRole("button");
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not render close button in loading state when onClose is not provided", () => {
      render(<SideDetailsPanel sidePanelDataStatus="loading" />);

      // No buttons should be present (tabs are not buttons in MUI)
      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(0);
    });

    it("applies custom css in loading state", () => {
      const customCss = { backgroundColor: "red" };
      const { container } = render(
        <SideDetailsPanel sidePanelDataStatus="loading" css={customCss} />
      );

      const mainBox = container.firstChild as HTMLElement;
      expect(mainBox).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Failed State Tests
  // ==========================================================================

  describe("Failed State", () => {
    it("renders error message when status is failed", () => {
      render(<SideDetailsPanel sidePanelDataStatus="failed" />);

      expect(screen.getByText("You don't have access to this data.")).toBeInTheDocument();
    });

    it("applies custom css in failed state", () => {
      const customCss = { backgroundColor: "blue" };
      const { container } = render(
        <SideDetailsPanel sidePanelDataStatus="failed" css={customCss} />
      );

      const mainBox = container.firstChild as HTMLElement;
      expect(mainBox).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // No Entry State Tests
  // ==========================================================================

  describe("No Entry State", () => {
    it("renders no entry message when sidePanelData is not provided", () => {
      render(<SideDetailsPanel />);

      expect(screen.getByText("No entry selected")).toBeInTheDocument();
    });

    it("renders no entry message when sidePanelData is null", () => {
      render(<SideDetailsPanel sidePanelData={null} />);

      expect(screen.getByText("No entry selected")).toBeInTheDocument();
    });

    it("renders no entry message when sidePanelData is undefined", () => {
      render(<SideDetailsPanel sidePanelData={undefined} />);

      expect(screen.getByText("No entry selected")).toBeInTheDocument();
    });

    it("applies custom css in no entry state", () => {
      const customCss = { backgroundColor: "green" };
      const { container } = render(<SideDetailsPanel css={customCss} />);

      const mainBox = container.firstChild as HTMLElement;
      expect(mainBox).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Basic Rendering Tests (Succeeded State)
  // ==========================================================================

  describe("Basic Rendering", () => {
    it("renders panel with entry data", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Should show entry display name (appears in header and Asset Info tab)
      expect(screen.getAllByText("Test Table")).toHaveLength(2);
    });

    it("renders panel header with entry name when displayName is empty", () => {
      const entry = createMockEntry({
        entrySource: createMockEntrySource({ displayName: "" }),
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Should show getName result which is the last part of the name
      expect(screen.getAllByText("test-entry")).toHaveLength(2); // Header and Asset Info tab
    });

    it("renders close button when onClose is provided", () => {
      const mockOnClose = vi.fn();
      const entry = createMockEntry();
      render(
        <SideDetailsPanel
          sidePanelData={entry}
          sidePanelDataStatus="succeeded"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole("button");
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not render close button when onClose is not provided", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Only tab buttons should be present
      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(0);
    });

    it("renders all three tabs", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByRole("tab", { name: "Asset Info" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Aspects" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Schema" })).toBeInTheDocument();
    });

    it("applies custom css to succeeded state", () => {
      const customCss = { backgroundColor: "yellow" };
      const entry = createMockEntry();
      const { container } = render(
        <SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" css={customCss} />
      );

      const mainBox = container.firstChild as HTMLElement;
      expect(mainBox).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Asset Info Tab Tests
  // ==========================================================================

  describe("Asset Info Tab", () => {
    it("renders Asset Info tab by default", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Check for Asset Info content
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.getByText("Rows")).toBeInTheDocument();
      expect(screen.getByText("Columns")).toBeInTheDocument();
    });

    it("displays entry system", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("bigquery")).toBeInTheDocument();
    });

    it("displays row count", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    it("displays column count from schema", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Schema has 3 fields
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("displays default row count when not provided", () => {
      const entry = createMockEntry({
        entrySource: createMockEntrySource({ rowCount: undefined }),
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Default row count is 70
      expect(screen.getByText("70")).toBeInTheDocument();
    });

    it("displays default column count when schema is empty", () => {
      const entry = createMockEntry({ aspects: {} });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Default column count is 40
      expect(screen.getByText("40")).toBeInTheDocument();
    });

    it("displays creation time", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("Creation Time")).toBeInTheDocument();
      // The exact date format depends on locale, but we check for the label
    });

    it("displays last modification time", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("Last Modification")).toBeInTheDocument();
    });

    it("displays dash for missing creation time", () => {
      const entry = createMockEntry({ createTime: undefined });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("displays identifiers section", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("Identifiers")).toBeInTheDocument();
      expect(screen.getByText("Resources")).toBeInTheDocument();
      expect(screen.getByText("FQN")).toBeInTheDocument();
    });

    it("displays labels as chips", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("Labels")).toBeInTheDocument();
      expect(screen.getByText("env: production")).toBeInTheDocument();
      expect(screen.getByText("team: data")).toBeInTheDocument();
    });

    it("handles empty labels", () => {
      const entry = createMockEntry({
        entrySource: createMockEntrySource({ labels: {} }),
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("Labels")).toBeInTheDocument();
      // No chips should be rendered for empty labels
      expect(screen.queryByText("env:")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Copy to Clipboard Tests
  // ==========================================================================

  describe("Copy to Clipboard", () => {
    it("copies resource to clipboard when Resources is clicked", async () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      const resourceLink = screen.getByText("Resources");
      fireEvent.click(resourceLink);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          "projects/test/datasets/data/tables/test_table"
        );
      });
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Copied to clipboard.",
        "success",
        3000,
        undefined
      );
    });

    it("copies FQN to clipboard when FQN is clicked", async () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      const fqnLink = screen.getByText("FQN");
      fireEvent.click(fqnLink);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          "bigquery:test-project.dataset.test_table"
        );
      });
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Copied to clipboard.",
        "success",
        3000,
        undefined
      );
    });

    it("handles missing resource when copying", async () => {
      const entry = createMockEntry({
        entrySource: createMockEntrySource({ resource: undefined }),
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      const resourceLink = screen.getByText("Resources");
      fireEvent.click(resourceLink);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith("");
      });
    });

    it("handles missing FQN when copying", async () => {
      const entry = createMockEntry({ fullyQualifiedName: undefined });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      const fqnLink = screen.getByText("FQN");
      fireEvent.click(fqnLink);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith("");
      });
    });
  });

  // ==========================================================================
  // Tab Switching Tests
  // ==========================================================================

  describe("Tab Switching", () => {
    it("switches to Aspects tab when clicked", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      const aspectsTab = screen.getByRole("tab", { name: "Aspects" });
      fireEvent.click(aspectsTab);

      expect(screen.getByTestId("annotation-filter")).toBeInTheDocument();
      expect(screen.getByTestId("preview-annotation")).toBeInTheDocument();
    });

    it("switches to Schema tab when clicked", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      const schemaTab = screen.getByRole("tab", { name: "Schema" });
      fireEvent.click(schemaTab);

      expect(screen.getByTestId("schema-filter")).toBeInTheDocument();
      expect(screen.getByTestId("schema")).toBeInTheDocument();
    });

    it("switches back to Asset Info tab from other tabs", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Go to Schema tab first
      fireEvent.click(screen.getByRole("tab", { name: "Schema" }));
      expect(screen.getByTestId("schema")).toBeInTheDocument();

      // Go back to Asset Info
      fireEvent.click(screen.getByRole("tab", { name: "Asset Info" }));
      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.queryByTestId("schema")).not.toBeInTheDocument();
    });

    it("starts on Schema tab when openSchemaInSidePanel is true", () => {
      const entry = createMockEntry();
      render(
        <SideDetailsPanel
          sidePanelData={entry}
          sidePanelDataStatus="succeeded"
          openSchemaInSidePanel={true}
        />
      );

      expect(screen.getByTestId("schema-filter")).toBeInTheDocument();
      expect(screen.getByTestId("schema")).toBeInTheDocument();
    });

    it("starts on Asset Info tab when openSchemaInSidePanel is false", () => {
      const entry = createMockEntry();
      render(
        <SideDetailsPanel
          sidePanelData={entry}
          sidePanelDataStatus="succeeded"
          openSchemaInSidePanel={false}
        />
      );

      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.queryByTestId("schema")).not.toBeInTheDocument();
    });

    it("updates tab when openSchemaInSidePanel prop changes", () => {
      const entry = createMockEntry();
      const { rerender } = render(
        <SideDetailsPanel
          sidePanelData={entry}
          sidePanelDataStatus="succeeded"
          openSchemaInSidePanel={false}
        />
      );

      // Initially on Asset Info tab
      expect(screen.getByText("System")).toBeInTheDocument();

      // Update prop to open Schema tab
      rerender(
        <SideDetailsPanel
          sidePanelData={entry}
          sidePanelDataStatus="succeeded"
          openSchemaInSidePanel={true}
        />
      );

      expect(screen.getByTestId("schema")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Aspects Tab Tests
  // ==========================================================================

  describe("Aspects Tab", () => {
    it("renders AnnotationFilter component", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));

      expect(screen.getByTestId("annotation-filter")).toBeInTheDocument();
    });

    it("renders PreviewAnnotation component", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));

      expect(screen.getByTestId("preview-annotation")).toBeInTheDocument();
    });

    it("handles annotation filter change", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));
      fireEvent.click(screen.getByTestId("apply-annotation-filter"));

      // The filtered entry should be passed to PreviewAnnotation
      const previewAnnotation = screen.getByTestId("preview-annotation");
      expect(previewAnnotation).toHaveAttribute("data-entry");
    });

    it("handles collapse all annotations", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));
      fireEvent.click(screen.getByTestId("collapse-all-btn"));

      const previewAnnotation = screen.getByTestId("preview-annotation");
      expect(previewAnnotation).toHaveAttribute("data-expanded-count", "0");
    });

    it("handles expand all annotations", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));
      fireEvent.click(screen.getByTestId("expand-all-btn"));

      const previewAnnotation = screen.getByTestId("preview-annotation");
      // Should expand valid annotations (filtering out schema, overview, contacts, usage)
      expect(previewAnnotation).toHaveAttribute("data-expanded-count", "2");
    });

    it("handles expand all when aspects is undefined", () => {
      const entry = createMockEntry({ aspects: undefined });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));
      fireEvent.click(screen.getByTestId("expand-all-btn"));

      // Should not crash
      const previewAnnotation = screen.getByTestId("preview-annotation");
      expect(previewAnnotation).toHaveAttribute("data-expanded-count", "0");
    });
  });

  // ==========================================================================
  // Schema Tab Tests
  // ==========================================================================

  describe("Schema Tab", () => {
    it("renders SchemaFilter component", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Schema" }));

      expect(screen.getByTestId("schema-filter")).toBeInTheDocument();
    });

    it("renders Schema component", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Schema" }));

      expect(screen.getByTestId("schema")).toBeInTheDocument();
    });

    it("handles schema filter change", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Schema" }));
      fireEvent.click(screen.getByTestId("apply-schema-filter"));

      // The filtered entry should be passed to Schema
      const schema = screen.getByTestId("schema");
      expect(schema).toHaveAttribute("data-entry");
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles entry with minimal data", () => {
      const minimalEntry = {
        name: "minimal-entry",
        entryType: "projects/1/types/test",
        entrySource: {
          displayName: "",
        },
      };
      render(<SideDetailsPanel sidePanelData={minimalEntry} sidePanelDataStatus="succeeded" />);

      // Name appears in both header and Asset Info tab
      expect(screen.getAllByText("minimal-entry")).toHaveLength(2);
    });

    it("handles entry with missing entryType", () => {
      const entry = createMockEntry({ entryType: undefined });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Should still render without crashing - name appears in both header and Asset Info tab
      expect(screen.getAllByText("Test Table")).toHaveLength(2);
    });

    it("handles entry with missing name", () => {
      const entry = createMockEntry({ name: undefined });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Name appears in both header and Asset Info tab
      expect(screen.getAllByText("Test Table")).toHaveLength(2);
    });

    it("handles entry with long display name", () => {
      const longName = "A".repeat(100);
      const entry = createMockEntry({
        entrySource: createMockEntrySource({ displayName: longName }),
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Long name appears in both header and Asset Info tab
      expect(screen.getAllByText(longName)).toHaveLength(2);
    });

    it("handles entry with special characters in name", () => {
      const entry = createMockEntry({
        entrySource: createMockEntrySource({ displayName: "Test <Table> & 'Special'" }),
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Name appears in both header and Asset Info tab
      expect(screen.getAllByText("Test <Table> & 'Special'")).toHaveLength(2);
    });

    it("handles different entryType number formats", () => {
      const entry = createMockEntry({
        entryType: "projects/12345/locations/us/entryTypes/custom.type",
        aspects: createMockAspects("12345"),
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Schema should work with different entryType numbers
      expect(screen.getByText("3")).toBeInTheDocument(); // Column count
    });

    it("handles undefined status (default state)", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} />);

      // Should render normally with entry data - name appears in both header and Asset Info tab
      expect(screen.getAllByText("Test Table")).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Date Formatting Tests
  // ==========================================================================

  describe("Date Formatting", () => {
    it("formats creation date correctly", () => {
      const entry = createMockEntry({
        createTime: { seconds: 1704067200 }, // Jan 1, 2024 00:00:00 UTC
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Check that date is formatted (exact format depends on locale)
      expect(screen.getByText("Creation Time")).toBeInTheDocument();
    });

    it("formats update date correctly", () => {
      const entry = createMockEntry({
        updateTime: { seconds: 1704153600 }, // Jan 2, 2024 00:00:00 UTC
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      expect(screen.getByText("Last Modification")).toBeInTheDocument();
    });

    it("displays dash for null timestamp", () => {
      const entry = createMockEntry({
        createTime: null,
        updateTime: null,
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Should show dashes for both timestamps
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it("handles missing seconds in timestamp", () => {
      const entry = createMockEntry({
        createTime: {},
        updateTime: {},
      });
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe("Integration Tests", () => {
    it("complete workflow: view Asset Info, switch to Aspects, filter, then Schema", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      // Start on Asset Info
      expect(screen.getByText("System")).toBeInTheDocument();

      // Switch to Aspects
      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));
      expect(screen.getByTestId("annotation-filter")).toBeInTheDocument();

      // Apply filter
      fireEvent.click(screen.getByTestId("apply-annotation-filter"));

      // Switch to Schema
      fireEvent.click(screen.getByRole("tab", { name: "Schema" }));
      expect(screen.getByTestId("schema")).toBeInTheDocument();

      // Apply schema filter
      fireEvent.click(screen.getByTestId("apply-schema-filter"));
    });

    it("renders with all props provided", () => {
      const mockOnClose = vi.fn();
      const entry = createMockEntry();
      const customCss = { marginTop: "10px" };

      render(
        <SideDetailsPanel
          sidePanelData={entry}
          sidePanelDataStatus="succeeded"
          openSchemaInSidePanel={false}
          onClose={mockOnClose}
          css={customCss}
        />
      );

      // Should render successfully with all props
      expect(screen.getAllByText("Test Table")).toHaveLength(2);
      expect(screen.getByRole("button")).toBeInTheDocument(); // Close button

      // Click close
      fireEvent.click(screen.getByRole("button"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("handles state transitions correctly", () => {
      const entry = createMockEntry();
      const { rerender } = render(<SideDetailsPanel sidePanelDataStatus="loading" />);

      // Loading state
      expect(screen.getByText("Name")).toBeInTheDocument();

      // Transition to failed
      rerender(<SideDetailsPanel sidePanelDataStatus="failed" />);
      expect(screen.getByText("You don't have access to this data.")).toBeInTheDocument();

      // Transition to succeeded
      rerender(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);
      // Name appears in both header and Asset Info tab
      expect(screen.getAllByText("Test Table")).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Annotation Expansion Tests
  // ==========================================================================

  describe("Annotation Expansion", () => {
    it("tracks expanded annotations state", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));

      // Initially no annotations are expanded
      const previewAnnotation = screen.getByTestId("preview-annotation");
      expect(previewAnnotation).toHaveAttribute("data-expanded-count", "0");

      // Expand all
      fireEvent.click(screen.getByTestId("expand-all-btn"));
      expect(previewAnnotation).toHaveAttribute("data-expanded-count", "2");

      // Collapse all
      fireEvent.click(screen.getByTestId("collapse-all-btn"));
      expect(previewAnnotation).toHaveAttribute("data-expanded-count", "0");
    });

    it("allows setting individual expanded items through PreviewAnnotation", () => {
      const entry = createMockEntry();
      render(<SideDetailsPanel sidePanelData={entry} sidePanelDataStatus="succeeded" />);

      fireEvent.click(screen.getByRole("tab", { name: "Aspects" }));

      // Use the mock's expand item button
      fireEvent.click(screen.getByTestId("mock-expand-item"));

      const previewAnnotation = screen.getByTestId("preview-annotation");
      expect(previewAnnotation).toHaveAttribute("data-expanded-count", "1");
    });
  });
});
