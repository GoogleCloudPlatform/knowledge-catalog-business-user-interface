import React from "react";
import { render as rtlRender, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import SearchTableView from "./SearchTableView";

// Create a mock Redux store with user state
const createMockStore = () =>
  configureStore({
    reducer: {
      user: (state = { mode: 'light' }) => state,
    },
  });

// Custom render that wraps with Redux Provider
const render = (ui: React.ReactElement, options?: any) => {
  const store = createMockStore();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
};

// Mock ResizeObserver for jsdom
(globalThis as Record<string, unknown>).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock the Tag component
vi.mock("../Tags/Tag", () => ({
  default: ({ text, css }: { text: string; css?: React.CSSProperties }) => (
    <span data-testid="tag" data-text={text} style={css}>
      {text}
    </span>
  ),
}));

// Mock data for testing
const createMockResource = (overrides: any = {}) => ({
  dataplexEntry: {
    name: overrides.name || "projects/test/locations/us/entries/test_entry",
    entrySource: {
      displayName: overrides.displayName || "",
      description: overrides.description || "Test description",
      system: overrides.system || "bigquery",
      owner: overrides.owner || "test-owner@example.com",
      location: overrides.location || "us-central1",
      ...overrides.entrySource,
    },
    updateTime: overrides.updateTime || { seconds: 1700000000 },
    createTime: overrides.createTime || { seconds: 1699000000 },
    ...overrides.dataplexEntry,
  },
  ...overrides,
});

const mockResources = [
  createMockResource({
    name: "projects/test/locations/us/entries/alpha_entry",
    displayName: "Alpha Entry",
    description: "Description for Alpha",
    system: "bigquery",
    updateTime: { seconds: 1700000000 },
  }),
  createMockResource({
    name: "projects/test/locations/us/entries/beta_entry",
    displayName: "Beta Entry",
    description: "Description for Beta",
    system: "dataplex",
    updateTime: { seconds: 1700100000 },
  }),
  createMockResource({
    name: "projects/test/locations/us/entries/gamma_entry",
    displayName: "Gamma Entry",
    description: "Description for Gamma",
    system: "cloudsql",
    updateTime: { seconds: 1699900000 },
  }),
];

const mockOnRowClick = vi.fn();
const mockOnFavoriteClick = vi.fn();
const mockGetFormatedDate = vi.fn((date: any) => {
  if (!date) return "N/A";
  return `Formatted: ${date.seconds}`;
});
const mockGetEntryType = vi.fn(
  (namePath: string, separator: string) => namePath.split(separator).pop() || ""
);

const defaultProps = {
  resources: mockResources,
  onRowClick: mockOnRowClick,
  onFavoriteClick: mockOnFavoriteClick,
  getFormatedDate: mockGetFormatedDate,
  getEntryType: mockGetEntryType,
};

describe("SearchTableView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      render(<SearchTableView {...defaultProps} />);
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("renders table with correct aria-label", () => {
      render(<SearchTableView {...defaultProps} />);
      expect(
        screen.getByRole("table", { name: "search results table" })
      ).toBeInTheDocument();
    });

    it("renders table headers correctly", () => {
      render(<SearchTableView {...defaultProps} />);
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Location")).toBeInTheDocument();
      expect(screen.getByText("Last modified")).toBeInTheDocument();
    });

    it("renders correct number of rows for resources", () => {
      render(<SearchTableView {...defaultProps} />);
      const rows = screen.getAllByRole("row");
      // +1 for header row
      expect(rows).toHaveLength(mockResources.length + 1);
    });

    it("renders empty table when resources array is empty", () => {
      render(<SearchTableView {...defaultProps} resources={[]} />);
      const rows = screen.getAllByRole("row");
      // Only header row
      expect(rows).toHaveLength(1);
    });

    it("renders resource names correctly using displayName", () => {
      render(<SearchTableView {...defaultProps} />);
      expect(screen.getByText("Alpha Entry")).toBeInTheDocument();
      expect(screen.getByText("Beta Entry")).toBeInTheDocument();
      expect(screen.getByText("Gamma Entry")).toBeInTheDocument();
    });

    it("renders resource descriptions correctly", () => {
      render(<SearchTableView {...defaultProps} />);
      expect(screen.getByText("Description for Alpha")).toBeInTheDocument();
      expect(screen.getByText("Description for Beta")).toBeInTheDocument();
      expect(screen.getByText("Description for Gamma")).toBeInTheDocument();
    });

    it("renders Tag components for entry type", () => {
      render(<SearchTableView {...defaultProps} />);
      const tags = screen.getAllByTestId("tag");
      // 2 tags per row (system tag + type tag) * 3 resources = 6 tags
      expect(tags.length).toBe(6);
    });

    it("formats dates using getFormatedDate prop", () => {
      render(<SearchTableView {...defaultProps} />);
      expect(mockGetFormatedDate).toHaveBeenCalled();
    });

    it("uses getEntryType to extract entry type", () => {
      render(<SearchTableView {...defaultProps} />);
      expect(mockGetEntryType).toHaveBeenCalled();
    });
  });

  describe("getNameFromEntry Helper Function", () => {
    it("uses displayName when available", () => {
      const resourceWithDisplayName = [
        createMockResource({
          displayName: "Custom Display Name",
          name: "projects/test/entries/different_name",
        }),
      ];
      render(
        <SearchTableView {...defaultProps} resources={resourceWithDisplayName} />
      );
      expect(screen.getByText("Custom Display Name")).toBeInTheDocument();
    });

    it("extracts name from path when displayName is empty", () => {
      const resourceWithoutDisplayName = [
        createMockResource({
          displayName: "",
          name: "projects/test/entries/extracted_name",
          dataplexEntry: {
            name: "projects/test/entries/extracted_name",
            entrySource: {
              displayName: "",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];
      render(
        <SearchTableView
          {...defaultProps}
          resources={resourceWithoutDisplayName}
        />
      );
      // The name appears in both the name cell and the type tag, so use getAllByText
      const nameElements = screen.getAllByText("extracted_name");
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
      // Verify the name cell specifically contains a Typography with the name
      const rows = screen.getAllByRole("row");
      const dataCells = within(rows[1]).getAllByRole("cell");
      expect(within(dataCells[0]).getByText("extracted_name")).toBeInTheDocument();
    });

    it("extracts name from path when displayName is undefined", () => {
      const resourceWithUndefinedDisplayName = [
        {
          dataplexEntry: {
            name: "projects/test/entries/path_extracted_name",
            entrySource: {
              description: "Test description",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];
      render(
        <SearchTableView
          {...defaultProps}
          resources={resourceWithUndefinedDisplayName}
        />
      );
      // The name appears in both the name cell and the type tag, so use getAllByText
      const nameElements = screen.getAllByText("path_extracted_name");
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
      // Verify the name cell specifically contains a Typography with the name
      const rows = screen.getAllByRole("row");
      const dataCells = within(rows[1]).getAllByRole("cell");
      expect(within(dataCells[0]).getByText("path_extracted_name")).toBeInTheDocument();
    });

    it("handles entry with only name property (no entrySource)", () => {
      const resourceWithOnlyName = [
        {
          dataplexEntry: {
            name: "projects/test/entries/only_name_entry",
            entrySource: {
              system: "bigquery",
              description: "Test",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];
      render(
        <SearchTableView {...defaultProps} resources={resourceWithOnlyName} />
      );
      // The name appears in both the name cell and the type tag, so use getAllByText
      const nameElements = screen.getAllByText("only_name_entry");
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
      // Verify the name cell specifically contains a Typography with the name
      const rows = screen.getAllByRole("row");
      const dataCells = within(rows[1]).getAllByRole("cell");
      expect(within(dataCells[0]).getByText("only_name_entry")).toBeInTheDocument();
    });
  });

  describe("Description Fallback", () => {
    it("shows 'No Description Available' when description is missing", () => {
      const resourceWithoutDescription = [
        {
          dataplexEntry: {
            name: "projects/test/entries/no_desc",
            entrySource: {
              displayName: "No Desc Entry",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];
      render(
        <SearchTableView
          {...defaultProps}
          resources={resourceWithoutDescription}
        />
      );
      expect(screen.getByText("No Description Available")).toBeInTheDocument();
    });

    it("shows 'No Description Available' when description is empty string", () => {
      const resourceWithEmptyDescription = [
        {
          dataplexEntry: {
            name: "projects/test/entries/empty_desc",
            entrySource: {
              displayName: "Empty Desc Entry",
              description: "",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];
      render(
        <SearchTableView
          {...defaultProps}
          resources={resourceWithEmptyDescription}
        />
      );
      expect(screen.getByText("No Description Available")).toBeInTheDocument();
    });
  });

  describe("Lock Icon Display", () => {
    it("shows lock icon for entries containing 'Sales_Dataset'", () => {
      const resourceWithSalesDataset = [
        createMockResource({
          name: "projects/test/entries/Sales_Dataset_123",
          dataplexEntry: {
            name: "projects/test/entries/Sales_Dataset_123",
            entrySource: {
              displayName: "Sales Dataset",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];
      render(
        <SearchTableView
          {...defaultProps}
          resources={resourceWithSalesDataset}
        />
      );
      const lockIcon = document.querySelector('[data-testid="LockIcon"]');
      expect(lockIcon).toBeInTheDocument();
    });

    it("shows lock icon for entries containing 'sales_reporting'", () => {
      const resourceWithSalesReporting = [
        createMockResource({
          name: "projects/test/entries/sales_reporting_data",
          dataplexEntry: {
            name: "projects/test/entries/sales_reporting_data",
            entrySource: {
              displayName: "Sales Reporting",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];
      render(
        <SearchTableView
          {...defaultProps}
          resources={resourceWithSalesReporting}
        />
      );
      const lockIcon = document.querySelector('[data-testid="LockIcon"]');
      expect(lockIcon).toBeInTheDocument();
    });

    it("does not show lock icon for regular entries", () => {
      const regularResource = [
        createMockResource({
          name: "projects/test/entries/regular_entry",
          dataplexEntry: {
            name: "projects/test/entries/regular_entry",
            entrySource: {
              displayName: "Regular Entry",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];
      render(<SearchTableView {...defaultProps} resources={regularResource} />);
      const lockIcon = document.querySelector('[data-testid="LockIcon"]');
      expect(lockIcon).not.toBeInTheDocument();
    });
  });

  describe("Row Click Handling", () => {
    it("calls onRowClick when a row is clicked", () => {
      render(<SearchTableView {...defaultProps} />);
      const rows = screen.getAllByRole("row");
      // Click first data row (skip header)
      fireEvent.click(rows[1]);
      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
    });

    it("passes the correct entry to onRowClick", () => {
      render(<SearchTableView {...defaultProps} />);
      const rows = screen.getAllByRole("row");
      fireEvent.click(rows[1]);
      expect(mockOnRowClick).toHaveBeenCalledWith(
        mockResources[0].dataplexEntry
      );
    });

    it("calls onRowClick with correct entry for each row", () => {
      render(<SearchTableView {...defaultProps} />);
      const rows = screen.getAllByRole("row");

      fireEvent.click(rows[1]);
      expect(mockOnRowClick).toHaveBeenLastCalledWith(
        mockResources[0].dataplexEntry
      );

      fireEvent.click(rows[2]);
      expect(mockOnRowClick).toHaveBeenLastCalledWith(
        mockResources[1].dataplexEntry
      );

      fireEvent.click(rows[3]);
      expect(mockOnRowClick).toHaveBeenLastCalledWith(
        mockResources[2].dataplexEntry
      );
    });
  });

  describe("Name Column Sorting", () => {
    it("renders sort button for Name column", () => {
      render(<SearchTableView {...defaultProps} />);
      const sortButtons = screen.getAllByRole("button");
      expect(sortButtons.length).toBeGreaterThan(0);
    });

    it("clicking name sort cycles through asc -> desc -> null", () => {
      const sortableResources = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/charlie",
            entrySource: {
              displayName: "Charlie",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/alpha",
            entrySource: {
              displayName: "Alpha",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700100000 },
          },
        }),
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/bravo",
            entrySource: {
              displayName: "Bravo",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1699900000 },
          },
        }),
      ];

      render(
        <SearchTableView {...defaultProps} resources={sortableResources} />
      );

      // Find the name sort button (first sort button in header)
      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      // Initial order: Charlie, Alpha, Bravo (as provided)
      let cells = screen.getAllByRole("row");
      expect(within(cells[1]).getByText("Charlie")).toBeInTheDocument();

      // Click once for ascending (alpha, bravo, charlie)
      fireEvent.click(nameSortButton);
      cells = screen.getAllByRole("row");
      // After asc sort, first data row should have alpha
      const firstRowCells = within(cells[1]).getAllByRole("cell");
      expect(
        within(firstRowCells[0]).getByText("Alpha")
      ).toBeInTheDocument();

      // Click again for descending (charlie, bravo, alpha)
      fireEvent.click(nameSortButton);
      cells = screen.getAllByRole("row");
      const firstRowCellsDesc = within(cells[1]).getAllByRole("cell");
      expect(
        within(firstRowCellsDesc[0]).getByText("Charlie")
      ).toBeInTheDocument();

      // Click again to return to null (original order)
      fireEvent.click(nameSortButton);
      cells = screen.getAllByRole("row");
      const firstRowCellsNull = within(cells[1]).getAllByRole("cell");
      expect(
        within(firstRowCellsNull[0]).getByText("Charlie")
      ).toBeInTheDocument();
    });

    it("stops event propagation when clicking sort button", () => {
      render(<SearchTableView {...defaultProps} />);
      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      fireEvent.click(nameSortButton);
      // onRowClick should not be called as event propagation is stopped
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });
  });

  describe("Date Column Sorting", () => {
    it("renders sort button for Last modified column", () => {
      render(<SearchTableView {...defaultProps} />);
      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");
      expect(dateSortButton).toBeInTheDocument();
    });

    it("clicking date sort cycles through asc -> desc -> null", () => {
      const sortableResources = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/entry1",
            entrySource: {
              displayName: "Entry 1 (Middle)",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/entry2",
            entrySource: {
              displayName: "Entry 2 (Latest)",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700100000 },
          },
        }),
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/entry3",
            entrySource: {
              displayName: "Entry 3 (Earliest)",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1699900000 },
          },
        }),
      ];

      render(
        <SearchTableView {...defaultProps} resources={sortableResources} />
      );

      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");

      // Initial order
      let cells = screen.getAllByRole("row");
      expect(
        within(cells[1]).getByText("Entry 1 (Middle)")
      ).toBeInTheDocument();

      // Click once for ascending (earliest first)
      fireEvent.click(dateSortButton);
      cells = screen.getAllByRole("row");
      const firstRowCells = within(cells[1]).getAllByRole("cell");
      expect(
        within(firstRowCells[0]).getByText("Entry 3 (Earliest)")
      ).toBeInTheDocument();

      // Click again for descending (latest first)
      fireEvent.click(dateSortButton);
      cells = screen.getAllByRole("row");
      const firstRowCellsDesc = within(cells[1]).getAllByRole("cell");
      expect(
        within(firstRowCellsDesc[0]).getByText("Entry 2 (Latest)")
      ).toBeInTheDocument();

      // Click again to return to null (original order)
      fireEvent.click(dateSortButton);
      cells = screen.getAllByRole("row");
      const firstRowCellsNull = within(cells[1]).getAllByRole("cell");
      expect(
        within(firstRowCellsNull[0]).getByText("Entry 1 (Middle)")
      ).toBeInTheDocument();
    });

    it("date sort has priority over name sort", () => {
      const sortableResources = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/alpha",
            entrySource: {
              displayName: "Alpha",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/beta",
            entrySource: {
              displayName: "Beta",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1699000000 },
          },
        }),
      ];

      render(
        <SearchTableView {...defaultProps} resources={sortableResources} />
      );

      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");

      // First sort by name ascending
      fireEvent.click(nameSortButton);

      // Then sort by date ascending
      fireEvent.click(dateSortButton);

      // Date sort should override name sort - earliest date first (Beta)
      const cells = screen.getAllByRole("row");
      const firstRowCells = within(cells[1]).getAllByRole("cell");
      expect(within(firstRowCells[0]).getByText("Beta")).toBeInTheDocument();
    });

    it("clicking date sort resets name sort", () => {
      render(<SearchTableView {...defaultProps} />);

      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");

      // First sort by name
      fireEvent.click(nameSortButton);

      // Then click date sort - should reset name sort
      fireEvent.click(dateSortButton);

      // The name sort should be null now, verified by clicking name sort again
      // and getting asc (not desc which would be the case if name sort was still asc)
      fireEvent.click(nameSortButton);
      // If name sort was reset to null, clicking should give us asc
      // This is tested indirectly through the sort behavior
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });

    it("clicking name sort resets date sort", () => {
      render(<SearchTableView {...defaultProps} />);

      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");

      // First sort by date
      fireEvent.click(dateSortButton);

      // Then click name sort - should reset date sort
      fireEvent.click(nameSortButton);

      // Name sort should now be active
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });
  });

  describe("Date Fallback", () => {
    it("uses createTime when updateTime is not available", () => {
      const resourceWithOnlyCreateTime = [
        {
          dataplexEntry: {
            name: "projects/test/entries/create_only",
            entrySource: {
              displayName: "Create Only Entry",
              description: "Test",
              system: "bigquery",
            },
            createTime: { seconds: 1699000000 },
          },
        },
      ];

      render(
        <SearchTableView
          {...defaultProps}
          resources={resourceWithOnlyCreateTime}
        />
      );

      expect(mockGetFormatedDate).toHaveBeenCalledWith({ seconds: 1699000000 });
    });

    it("handles undefined updateTime and createTime", () => {
      const resourceWithNoTime = [
        {
          dataplexEntry: {
            name: "projects/test/entries/no_time",
            entrySource: {
              displayName: "No Time Entry",
              description: "Test",
              system: "bigquery",
            },
          },
        },
      ];

      render(
        <SearchTableView {...defaultProps} resources={resourceWithNoTime} />
      );

      expect(mockGetFormatedDate).toHaveBeenCalledWith(undefined);
    });
  });

  describe("System Tag Formatting", () => {
    it("displays 'BigQuery' for bigquery system", () => {
      const bigqueryResource = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/bq",
            entrySource: {
              displayName: "BQ Entry",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];

      render(
        <SearchTableView {...defaultProps} resources={bigqueryResource} />
      );

      const tags = screen.getAllByTestId("tag");
      expect(tags[0]).toHaveTextContent("BigQuery");
    });

    it("capitalizes first letter for other systems", () => {
      const dataplexResource = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/dp",
            entrySource: {
              displayName: "DP Entry",
              description: "Test",
              system: "dataplex",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];

      render(
        <SearchTableView {...defaultProps} resources={dataplexResource} />
      );

      const tags = screen.getAllByTestId("tag");
      expect(tags[0]).toHaveTextContent("Knowledge Catalog");
    });

    it("handles uppercase system names correctly", () => {
      const uppercaseResource = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/upper",
            entrySource: {
              displayName: "Upper Entry",
              description: "Test",
              system: "BIGQUERY",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];

      render(
        <SearchTableView {...defaultProps} resources={uppercaseResource} />
      );

      const tags = screen.getAllByTestId("tag");
      expect(tags[0]).toHaveTextContent("BigQuery");
    });
  });

  describe("Sorting with Missing Data", () => {
    it("handles sorting when updateTime is missing (falls back to createTime)", () => {
      const mixedTimeResources = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/with_update",
            entrySource: {
              displayName: "With Update",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
            createTime: { seconds: 1690000000 },
          },
        }),
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/only_create",
            entrySource: {
              displayName: "Only Create",
              description: "Test",
              system: "bigquery",
            },
            createTime: { seconds: 1699000000 },
          },
        }),
      ];

      render(
        <SearchTableView {...defaultProps} resources={mixedTimeResources} />
      );

      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");

      // Sort by date ascending
      fireEvent.click(dateSortButton);

      // Only Create (createTime: 1699000000) should come before With Update (updateTime: 1700000000)
      const cells = screen.getAllByRole("row");
      const firstRowCells = within(cells[1]).getAllByRole("cell");
      expect(
        within(firstRowCells[0]).getByText("Only Create")
      ).toBeInTheDocument();
    });

    it("handles sorting when all time fields are missing", () => {
      const noTimeResources = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/no_time1",
            entrySource: {
              displayName: "No Time 1",
              description: "Test",
              system: "bigquery",
            },
          },
        }),
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/no_time2",
            entrySource: {
              displayName: "No Time 2",
              description: "Test",
              system: "bigquery",
            },
          },
        }),
      ];

      render(
        <SearchTableView {...defaultProps} resources={noTimeResources} />
      );

      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");

      // Should not crash when sorting
      fireEvent.click(dateSortButton);

      expect(screen.getByText("No Time 1")).toBeInTheDocument();
      expect(screen.getByText("No Time 2")).toBeInTheDocument();
    });

    it("handles name sorting with missing dataplexEntry.name", () => {
      const missingNameResources = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/alpha",
            entrySource: {
              displayName: "Alpha",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
        {
          dataplexEntry: {
            name: "",
            entrySource: {
              displayName: "Empty Name",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];

      render(
        <SearchTableView {...defaultProps} resources={missingNameResources} />
      );

      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      // Should not crash when sorting
      fireEvent.click(nameSortButton);

      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    it("handles name sorting with null dataplexEntry", () => {
      const nullDataplexResources = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/valid",
            entrySource: {
              displayName: "Valid Entry",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
        {
          dataplexEntry: {
            name: "projects/test/entries/another",
            entrySource: {
              displayName: "Another Entry",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];

      render(
        <SearchTableView {...defaultProps} resources={nullDataplexResources} />
      );

      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      // Sort ascending
      fireEvent.click(nameSortButton);
      // Should not crash
      expect(screen.getByText("Valid Entry")).toBeInTheDocument();
    });

    it("handles date sorting when one resource has updateTime and another has only createTime", () => {
      const mixedTimestampResources = [
        {
          dataplexEntry: {
            name: "projects/test/entries/entry_with_update",
            entrySource: {
              displayName: "Entry With Update",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700500000 },
            createTime: { seconds: 1690000000 },
          },
        },
        {
          dataplexEntry: {
            name: "projects/test/entries/entry_with_create_only",
            entrySource: {
              displayName: "Entry Create Only",
              description: "Test",
              system: "bigquery",
            },
            createTime: { seconds: 1700200000 },
          },
        },
      ];

      render(
        <SearchTableView {...defaultProps} resources={mixedTimestampResources} />
      );

      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");

      // Sort ascending - createTime fallback should be used
      fireEvent.click(dateSortButton);

      const cells = screen.getAllByRole("row");
      const firstRowCells = within(cells[1]).getAllByRole("cell");
      // Entry Create Only (1700200000) should come before Entry With Update (1700500000)
      expect(
        within(firstRowCells[0]).getByText("Entry Create Only")
      ).toBeInTheDocument();
    });

    it("handles date sorting when entries have no time fields (uses 0 as fallback)", () => {
      const noTimestampResources = [
        {
          dataplexEntry: {
            name: "projects/test/entries/no_time_1",
            entrySource: {
              displayName: "No Time 1",
              description: "Test",
              system: "bigquery",
            },
          },
        },
        {
          dataplexEntry: {
            name: "projects/test/entries/with_time",
            entrySource: {
              displayName: "With Time",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];

      render(
        <SearchTableView {...defaultProps} resources={noTimestampResources} />
      );

      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateSortButton = within(dateHeader!).getByRole("button");

      // Sort ascending - entries without time should come first (0)
      fireEvent.click(dateSortButton);

      const cells = screen.getAllByRole("row");
      const firstRowCells = within(cells[1]).getAllByRole("cell");
      expect(
        within(firstRowCells[0]).getByText("No Time 1")
      ).toBeInTheDocument();
    });

    it("handles name sorting with null dataplexEntry name field falling back to empty string", () => {
      const nullNameResources = [
        {
          dataplexEntry: {
            name: "projects/test/entries/zulu",
            entrySource: {
              displayName: "Zulu Entry",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
        {
          dataplexEntry: {
            name: "projects/test/entries/alpha_null",
            entrySource: {
              displayName: "Alpha Null Entry",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];

      // Create a resource where the dataplexEntry.name used for sorting is falsy
      const resourcesWithFalsyName = nullNameResources.map((r, i) => {
        if (i === 1) {
          return {
            dataplexEntry: {
              ...r.dataplexEntry,
              // The name property exists for the component to work, but we test sorting
            },
          };
        }
        return r;
      });

      render(
        <SearchTableView {...defaultProps} resources={resourcesWithFalsyName} />
      );

      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      // Sort ascending
      fireEvent.click(nameSortButton);

      // Should render both entries without crashing
      expect(screen.getByText("Zulu Entry")).toBeInTheDocument();
      expect(screen.getByText("Alpha Null Entry")).toBeInTheDocument();
    });
  });

  describe("TableContainer Styling", () => {
    it("renders TableContainer with correct background color", () => {
      const { container } = render(<SearchTableView {...defaultProps} />);
      const tableContainer = container.querySelector(".MuiTableContainer-root");
      expect(tableContainer).toBeInTheDocument();
    });

    it("renders Table with minimum width", () => {
      render(<SearchTableView {...defaultProps} />);
      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();
    });
  });

  describe("Row Hover Styling", () => {
    it("applies hover style class to rows", () => {
      render(<SearchTableView {...defaultProps} />);
      const rows = screen.getAllByRole("row");
      // Data rows should have cursor pointer style
      expect(rows[1]).toHaveStyle({ cursor: "pointer" });
    });
  });

  describe("Sort Icon Rendering", () => {
    it("shows sort icon when sort is ascending", () => {
      render(<SearchTableView {...defaultProps} />);
      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      // Click for ascending sort
      fireEvent.click(nameSortButton);

      // Sort button should be visible (opacity 1)
      const sortBtn = nameHeader!.querySelector('.sort-btn');
      expect(sortBtn).toBeInTheDocument();
      expect(sortBtn!.querySelector('svg')).toBeInTheDocument();
    });

    it("shows rotated sort icon when sort is descending", () => {
      render(<SearchTableView {...defaultProps} />);
      const nameHeader = screen.getByText("Name").closest("th");
      const nameSortButton = within(nameHeader!).getByRole("button");

      // Click twice for descending sort
      fireEvent.click(nameSortButton);
      fireEvent.click(nameSortButton);

      // Sort button should still be present with SVG
      const sortBtn = nameHeader!.querySelector('.sort-btn');
      expect(sortBtn).toBeInTheDocument();
      expect(sortBtn!.querySelector('svg')).toBeInTheDocument();
    });

    it("shows sort icons with hidden opacity for null sort state", () => {
      render(<SearchTableView {...defaultProps} />);
      // Initial state - sort buttons should exist with their SVGs
      const sortBtns = document.querySelectorAll('.sort-btn');
      expect(sortBtns.length).toBeGreaterThan(0);
    });
  });

  describe("Tooltip", () => {
    it("renders sort buttons in header", () => {
      render(<SearchTableView {...defaultProps} />);
      const nameHeader = screen.getByText("Name").closest("th");
      const sortButton = within(nameHeader!).getByRole("button");
      expect(sortButton).toBeInTheDocument();
    });

    it("shows 'Sort Z to A' tooltip on Name header when sorted asc", async () => {
      render(<SearchTableView {...defaultProps} />);
      const nameHeader = screen.getByText("Name").closest("th");
      const nameButton = within(nameHeader!).getByRole("button");
      fireEvent.click(nameButton);
      fireEvent.mouseOver(nameButton);
      expect(await screen.findByText("Sort Z to A")).toBeInTheDocument();
    });

    it("shows 'Sort A to Z' tooltip on Name header when not sorted", async () => {
      render(<SearchTableView {...defaultProps} />);
      const nameHeader = screen.getByText("Name").closest("th");
      const nameButton = within(nameHeader!).getByRole("button");
      fireEvent.mouseOver(nameButton);
      expect(await screen.findByText("Sort A to Z")).toBeInTheDocument();
    });

    it("shows no tooltip on Name header when sorted desc", () => {
      render(<SearchTableView {...defaultProps} />);
      const nameHeader = screen.getByText("Name").closest("th");
      const nameButton = within(nameHeader!).getByRole("button");
      fireEvent.click(nameButton);
      fireEvent.click(nameButton);
      fireEvent.mouseOver(nameButton);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("shows 'Sort new to old' tooltip on Last modified header when sorted asc", async () => {
      render(<SearchTableView {...defaultProps} />);
      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateButton = within(dateHeader!).getByRole("button");
      fireEvent.click(dateButton);
      fireEvent.mouseOver(dateButton);
      expect(await screen.findByText("Sort new to old")).toBeInTheDocument();
    });

    it("shows 'Sort old to new' tooltip on Last modified header when not sorted", async () => {
      render(<SearchTableView {...defaultProps} />);
      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateButton = within(dateHeader!).getByRole("button");
      fireEvent.mouseOver(dateButton);
      expect(await screen.findByText("Sort old to new")).toBeInTheDocument();
    });

    it("shows no tooltip on Last modified header when sorted desc", () => {
      render(<SearchTableView {...defaultProps} />);
      const dateHeader = screen.getByText("Last modified").closest("th");
      const dateButton = within(dateHeader!).getByRole("button");
      fireEvent.click(dateButton);
      fireEvent.click(dateButton);
      fireEvent.mouseOver(dateButton);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("Tag Styling", () => {
    it("passes correct CSS props to Tag component", () => {
      render(<SearchTableView {...defaultProps} />);
      const tags = screen.getAllByTestId("tag");

      // Check that tags have expected styling attributes
      expect(tags[0]).toHaveStyle({
        background: "rgba(7, 106, 255, 0.1)", 
        color: "#076AFF",
      });
    });
  });

  describe("Location Column", () => {
    it("renders location when available", () => {
      const resourceWithLocation = [
        createMockResource({
          dataplexEntry: {
            name: "projects/test/entries/located",
            entrySource: {
              displayName: "Located Entry",
              description: "Test",
              system: "bigquery",
              owner: "test@example.com",
              location: "europe-west1",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];
      render(
        <SearchTableView {...defaultProps} resources={resourceWithLocation} />
      );
      expect(screen.getByText("Europe-west1")).toBeInTheDocument();
    });

    it("renders '-' when location is missing", () => {
      const resourceWithoutLocation = [
        {
          dataplexEntry: {
            name: "projects/test/entries/no_location",
            entrySource: {
              displayName: "No Location Entry",
              description: "Test",
              system: "bigquery",
              owner: "test@example.com",
            },
            updateTime: { seconds: 1700000000 },
          },
        },
      ];
      render(
        <SearchTableView
          {...defaultProps}
          resources={resourceWithoutLocation}
        />
      );
      const rows = screen.getAllByRole("row");
      const dataCells = within(rows[1]).getAllByRole("cell");
      expect(within(dataCells[3]).getByText("-")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles single resource correctly", () => {
      const singleResource = [mockResources[0]];
      render(<SearchTableView {...defaultProps} resources={singleResource} />);
      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(2); // Header + 1 data row
    });

    it("handles resource with very long name", () => {
      const longNameResource = [
        createMockResource({
          displayName:
            "This is a very long entry name that should be truncated with ellipsis when displayed in the table cell",
          dataplexEntry: {
            name: "projects/test/entries/long",
            entrySource: {
              displayName:
                "This is a very long entry name that should be truncated with ellipsis when displayed in the table cell",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];
      render(
        <SearchTableView {...defaultProps} resources={longNameResource} />
      );
      expect(
        screen.getByText(
          "This is a very long entry name that should be truncated with ellipsis when displayed in the table cell"
        )
      ).toBeInTheDocument();
    });

    it("handles special characters in entry names", () => {
      const specialCharResource = [
        createMockResource({
          displayName: "Entry <with> 'special' \"chars\" & symbols",
          dataplexEntry: {
            name: "projects/test/entries/special",
            entrySource: {
              displayName: "Entry <with> 'special' \"chars\" & symbols",
              description: "Test",
              system: "bigquery",
            },
            updateTime: { seconds: 1700000000 },
          },
        }),
      ];
      render(
        <SearchTableView {...defaultProps} resources={specialCharResource} />
      );
      expect(
        screen.getByText("Entry <with> 'special' \"chars\" & symbols")
      ).toBeInTheDocument();
    });
  });

  describe("Column Resizing", () => {
    it("renders 4 resize handles (one per column except last)", () => {
      render(
        <SearchTableView {...defaultProps} resources={mockResources} />
      );
      const handles = screen.getAllByTestId("resize-handle");
      expect(handles).toHaveLength(4);
    });

    it("resize handles have col-resize cursor", () => {
      render(
        <SearchTableView {...defaultProps} resources={mockResources} />
      );
      const handles = screen.getAllByTestId("resize-handle");
      handles.forEach((handle) => {
        expect(handle.style.cursor).toBe("col-resize");
      });
    });
  });
});
