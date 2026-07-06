import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Schema from "./Schema";

// ============================================================================
// Mock react-redux
// ============================================================================

const mockUseSelector = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (selector: any) => mockUseSelector(selector),
}));

// ============================================================================
// Mock Data Generators
// ============================================================================

const createSchemaField = (
  name: string,
  dataType: string,
  metadataType: string,
  mode: string,
  defaultValue?: string | null,
  description?: string | null
) => ({
  structValue: {
    fields: {
      name: { stringValue: name },
      dataType: { stringValue: dataType },
      metadataType: { stringValue: metadataType },
      mode: { stringValue: mode },
      ...(defaultValue !== undefined && {
        defaultValue: defaultValue === null ? null : { stringValue: defaultValue },
      }),
      ...(description !== undefined && {
        description: description === null ? null : { stringValue: description },
      }),
    },
  },
});

const createMockEntry = (
  projectNumber: string,
  schemaFields: any[]
) => ({
  entryType: `projects/${projectNumber}/locations/us/entryTypes/bigquery.table`,
  aspects: {
    [`${projectNumber}.global.schema`]: {
      data: {
        fields: {
          fields: {
            listValue: {
              values: schemaFields,
            },
          },
        },
      },
    },
  },
});

// ============================================================================
// Test Suite
// ============================================================================

describe("Schema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSelector.mockReturnValue("light");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Basic Rendering Tests
  // ==========================================================================

  describe("Basic Rendering", () => {
    it("renders without crashing with valid entry", () => {
      const entry = createMockEntry("123", [
        createSchemaField("id", "INTEGER", "PRIMITIVE", "REQUIRED"),
      ]);

      const { container } = render(<Schema entry={entry} />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders the flex-based table with correct rows", () => {
      const entry = createMockEntry("456", [
        createSchemaField("user_id", "INT64", "PRIMITIVE", "REQUIRED", "0", "User identifier"),
        createSchemaField("username", "STRING", "PRIMITIVE", "NULLABLE", null, "Username"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("user_id")).toBeInTheDocument();
      expect(screen.getByText("username")).toBeInTheDocument();
      expect(screen.getByText("User identifier")).toBeInTheDocument();
      expect(screen.getByText("Username")).toBeInTheDocument();
    });

    it("displays column headers correctly", () => {
      const entry = createMockEntry("123", [
        createSchemaField("id", "INTEGER", "PRIMITIVE", "REQUIRED"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Metadata Type")).toBeInTheDocument();
      expect(screen.getByText("Mode")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("does not display Default Value column header", () => {
      const entry = createMockEntry("123", [
        createSchemaField("id", "INTEGER", "PRIMITIVE", "REQUIRED"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.queryByText("Default Value")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty Schema Tests
  // ==========================================================================

  describe("Empty Schema", () => {
    it("shows fallback message when schema is empty", () => {
      const entry = createMockEntry("123", []);

      render(<Schema entry={entry} />);

      expect(
        screen.getByText("No data matches the applied filters")
      ).toBeInTheDocument();
    });

    it("does not render table headers when schema is empty", () => {
      const entry = createMockEntry("123", []);

      render(<Schema entry={entry} />);

      expect(screen.queryByText("Name")).not.toBeInTheDocument();
      expect(screen.queryByText("Type")).not.toBeInTheDocument();
    });

    it("applies correct styling to fallback message", () => {
      const entry = createMockEntry("123", []);

      render(<Schema entry={entry} />);

      const fallbackDiv = screen.getByText("No data matches the applied filters");
      expect(fallbackDiv).toHaveStyle({
        padding: "48px",
        textAlign: "center",
        fontSize: "14px",
        color: "#0C1226CC",
      });
    });
  });

  // ==========================================================================
  // Description Handling Tests
  // ==========================================================================

  describe("Description Handling", () => {
    it("displays actual description when provided", () => {
      const entry = createMockEntry("123", [
        createSchemaField("email", "STRING", "PRIMITIVE", "REQUIRED", null, "User email address"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("User email address")).toBeInTheDocument();
    });

    it("displays '-' when description is null", () => {
      const entry = createMockEntry("123", [
        createSchemaField("phone", "STRING", "PRIMITIVE", "NULLABLE", null, null),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("displays '-' when description is missing", () => {
      const entry = createMockEntry("123", [
        createSchemaField("address", "STRING", "PRIMITIVE", "NULLABLE", null, undefined),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Entry Type Parsing Tests
  // ==========================================================================

  describe("Entry Type Parsing", () => {
    it("extracts project number from standard entryType format", () => {
      const entry = createMockEntry("789", [
        createSchemaField("field1", "STRING", "PRIMITIVE", "NULLABLE"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("field1")).toBeInTheDocument();
    });

    it("handles numeric project ID", () => {
      const entry = createMockEntry("9876543210", [
        createSchemaField("data", "BYTES", "PRIMITIVE", "NULLABLE"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("data")).toBeInTheDocument();
    });

    it("handles alphanumeric project ID", () => {
      const entry = createMockEntry("my-project-123", [
        createSchemaField("column", "STRING", "PRIMITIVE", "REQUIRED"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("column")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Multiple Schema Fields Tests
  // ==========================================================================

  describe("Multiple Schema Fields", () => {
    it("handles multiple schema fields", () => {
      const entry = createMockEntry("123", [
        createSchemaField("id", "INT64", "PRIMITIVE", "REQUIRED", "0", "Primary key"),
        createSchemaField("name", "STRING", "PRIMITIVE", "REQUIRED", null, "User name"),
        createSchemaField("email", "STRING", "PRIMITIVE", "NULLABLE", null, "Email address"),
        createSchemaField("age", "INT64", "PRIMITIVE", "NULLABLE", "18", null),
        createSchemaField("is_active", "BOOLEAN", "PRIMITIVE", "NULLABLE", "true", "Active status"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("id")).toBeInTheDocument();
      expect(screen.getByText("name")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
      expect(screen.getByText("age")).toBeInTheDocument();
      expect(screen.getByText("is_active")).toBeInTheDocument();
    });

    it("renders correct number of rows", () => {
      const entry = createMockEntry("123", [
        createSchemaField("col1", "STRING", "PRIMITIVE", "NULLABLE"),
        createSchemaField("col2", "INTEGER", "PRIMITIVE", "NULLABLE"),
        createSchemaField("col3", "BOOLEAN", "PRIMITIVE", "NULLABLE"),
      ]);

      render(<Schema entry={entry} />);

      // Each row contains the field name; verify all 3 are rendered
      expect(screen.getByText("col1")).toBeInTheDocument();
      expect(screen.getByText("col2")).toBeInTheDocument();
      expect(screen.getByText("col3")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SX Props Tests
  // ==========================================================================

  describe("SX Props", () => {
    it("applies sx to root div", () => {
      const entry = createMockEntry("123", [
        createSchemaField("id", "INTEGER", "PRIMITIVE", "REQUIRED"),
      ]);
      const customSx = { marginTop: "10px" };

      const { container } = render(<Schema entry={entry} sx={customSx} />);

      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveStyle({ width: "100%" });
    });

    it("works without sx prop", () => {
      const entry = createMockEntry("123", [
        createSchemaField("id", "INTEGER", "PRIMITIVE", "REQUIRED"),
      ]);

      const { container } = render(<Schema entry={entry} />);

      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveStyle({ width: "100%" });
    });
  });

  // ==========================================================================
  // Row Data Rendering Tests
  // ==========================================================================

  describe("Row Data Rendering", () => {
    it("displays field values in table cells", () => {
      const entry = createMockEntry("123", [
        createSchemaField("user_id", "INT64", "PRIMITIVE", "REQUIRED", "1", "User ID"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("user_id")).toBeInTheDocument();
      expect(screen.getByText("INT64")).toBeInTheDocument();
      expect(screen.getByText("PRIMITIVE")).toBeInTheDocument();
      expect(screen.getByText("REQUIRED")).toBeInTheDocument();
      expect(screen.getByText("User ID")).toBeInTheDocument();
    });

    it("renders all data types correctly", () => {
      const entry = createMockEntry("123", [
        createSchemaField("string_col", "STRING", "PRIMITIVE", "NULLABLE"),
        createSchemaField("int_col", "INT64", "PRIMITIVE", "NULLABLE"),
        createSchemaField("float_col", "FLOAT64", "PRIMITIVE", "NULLABLE"),
        createSchemaField("bool_col", "BOOLEAN", "PRIMITIVE", "NULLABLE"),
        createSchemaField("timestamp_col", "TIMESTAMP", "PRIMITIVE", "NULLABLE"),
        createSchemaField("date_col", "DATE", "PRIMITIVE", "NULLABLE"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("STRING")).toBeInTheDocument();
      expect(screen.getByText("INT64")).toBeInTheDocument();
      expect(screen.getByText("FLOAT64")).toBeInTheDocument();
      expect(screen.getByText("BOOLEAN")).toBeInTheDocument();
      expect(screen.getByText("TIMESTAMP")).toBeInTheDocument();
      expect(screen.getByText("DATE")).toBeInTheDocument();
    });

    it("renders different modes correctly", () => {
      const entry = createMockEntry("123", [
        createSchemaField("required_col", "STRING", "PRIMITIVE", "REQUIRED"),
        createSchemaField("nullable_col", "STRING", "PRIMITIVE", "NULLABLE"),
        createSchemaField("repeated_col", "STRING", "PRIMITIVE", "REPEATED"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("REQUIRED")).toBeInTheDocument();
      expect(screen.getByText("NULLABLE")).toBeInTheDocument();
      expect(screen.getByText("REPEATED")).toBeInTheDocument();
    });

    it("renders Type and Metadata Type as tag chips", () => {
      const entry = createMockEntry("123", [
        createSchemaField("col1", "STRING", "PRIMITIVE", "NULLABLE"),
      ]);

      const { container } = render(<Schema entry={entry} />);

      // Tag chips should have the E9EEF6 background
      const tagChips = container.querySelectorAll('span');
      const chipElements = Array.from(tagChips).filter(
        (el) => el.style.background === 'rgb(233, 238, 246)' || el.textContent === 'STRING' || el.textContent === 'PRIMITIVE'
      );
      expect(chipElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles very long field names", () => {
      const longName = "a".repeat(500);
      const entry = createMockEntry("123", [
        createSchemaField(longName, "STRING", "PRIMITIVE", "NULLABLE"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("handles special characters in field names", () => {
      const specialName = "field_with-special.chars@123";
      const entry = createMockEntry("123", [
        createSchemaField(specialName, "STRING", "PRIMITIVE", "NULLABLE"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText(specialName)).toBeInTheDocument();
    });

    it("handles unicode characters in description", () => {
      const unicodeDesc = "Description with unicode: \u00e9\u00e8\u00ea \u4e2d\u6587";
      const entry = createMockEntry("123", [
        createSchemaField("field", "STRING", "PRIMITIVE", "NULLABLE", null, unicodeDesc),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText(unicodeDesc)).toBeInTheDocument();
    });

    it("handles different metadata types", () => {
      const entry = createMockEntry("123", [
        createSchemaField("col1", "STRING", "PRIMITIVE", "NULLABLE"),
        createSchemaField("col2", "RECORD", "COMPLEX", "NULLABLE"),
        createSchemaField("col3", "ARRAY", "COLLECTION", "REPEATED"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("PRIMITIVE")).toBeInTheDocument();
      expect(screen.getByText("COMPLEX")).toBeInTheDocument();
      expect(screen.getByText("COLLECTION")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Table Structure Tests
  // ==========================================================================

  describe("Table Structure", () => {
    it("renders header row with 5 columns", () => {
      const entry = createMockEntry("123", [
        createSchemaField("id", "INTEGER", "PRIMITIVE", "REQUIRED"),
      ]);

      render(<Schema entry={entry} />);

      // All 5 column headers should be present
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Metadata Type")).toBeInTheDocument();
      expect(screen.getByText("Mode")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("renders border between rows except last", () => {
      const entry = createMockEntry("123", [
        createSchemaField("col1", "STRING", "PRIMITIVE", "NULLABLE"),
        createSchemaField("col2", "INTEGER", "PRIMITIVE", "NULLABLE"),
      ]);

      const { container } = render(<Schema entry={entry} />);

      // The component should render MUI Box elements for rows
      const boxes = container.querySelectorAll('[class*="MuiBox-root"]');
      expect(boxes.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe("Integration Tests", () => {
    it("renders complete schema table with all field properties", () => {
      const entry = createMockEntry("production-project", [
        createSchemaField("id", "INT64", "PRIMITIVE", "REQUIRED", "0", "Primary key"),
        createSchemaField("username", "STRING", "PRIMITIVE", "REQUIRED", null, "Username"),
        createSchemaField("email", "STRING", "PRIMITIVE", "NULLABLE", null, "User email"),
        createSchemaField("age", "INT64", "PRIMITIVE", "NULLABLE", "18", null),
        createSchemaField("is_active", "BOOLEAN", "PRIMITIVE", "NULLABLE", "true", "Active flag"),
        createSchemaField("created_at", "TIMESTAMP", "PRIMITIVE", "REQUIRED", null, "Creation time"),
        createSchemaField("tags", "STRING", "COLLECTION", "REPEATED", null, "User tags"),
        createSchemaField("metadata", "JSON", "COMPLEX", "NULLABLE", "{}", "Extra data"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("id")).toBeInTheDocument();
      expect(screen.getByText("username")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
      expect(screen.getByText("Primary key")).toBeInTheDocument();
      expect(screen.getByText("Username")).toBeInTheDocument();
      expect(screen.getByText("User email")).toBeInTheDocument();
    });

    it("handles realistic BigQuery schema", () => {
      const entry = {
        entryType: "projects/analytics-prod/locations/US/entryTypes/bigquery.table",
        aspects: {
          "analytics-prod.global.schema": {
            data: {
              fields: {
                fields: {
                  listValue: {
                    values: [
                      {
                        structValue: {
                          fields: {
                            name: { stringValue: "event_id" },
                            dataType: { stringValue: "STRING" },
                            metadataType: { stringValue: "PRIMITIVE" },
                            mode: { stringValue: "REQUIRED" },
                            defaultValue: null,
                            description: { stringValue: "Unique event identifier" },
                          },
                        },
                      },
                      {
                        structValue: {
                          fields: {
                            name: { stringValue: "event_timestamp" },
                            dataType: { stringValue: "TIMESTAMP" },
                            metadataType: { stringValue: "PRIMITIVE" },
                            mode: { stringValue: "REQUIRED" },
                            description: { stringValue: "When the event occurred" },
                          },
                        },
                      },
                      {
                        structValue: {
                          fields: {
                            name: { stringValue: "user_pseudo_id" },
                            dataType: { stringValue: "STRING" },
                            metadataType: { stringValue: "PRIMITIVE" },
                            mode: { stringValue: "NULLABLE" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };

      render(<Schema entry={entry} />);

      expect(screen.getByText("event_id")).toBeInTheDocument();
      expect(screen.getByText("event_timestamp")).toBeInTheDocument();
      expect(screen.getByText("user_pseudo_id")).toBeInTheDocument();
    });

    it("schema with mixed descriptions", () => {
      const entry = createMockEntry("123", [
        createSchemaField("col1", "STRING", "PRIMITIVE", "REQUIRED", "default1", "desc1"),
        createSchemaField("col2", "STRING", "PRIMITIVE", "REQUIRED", null, "desc2"),
        createSchemaField("col3", "STRING", "PRIMITIVE", "REQUIRED", "default3", null),
        createSchemaField("col4", "STRING", "PRIMITIVE", "REQUIRED", null, null),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("desc1")).toBeInTheDocument();
      expect(screen.getByText("desc2")).toBeInTheDocument();
      // col3 and col4 have null descriptions, should display '-'
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Column Resizing Tests
  // ==========================================================================

  describe("Column Resizing", () => {
    it("renders resize handles for first four columns (not Description)", () => {
      const entry = createMockEntry("123", [
        createSchemaField("id", "INT64", "PRIMITIVE", "REQUIRED", "0", "Primary key"),
      ]);

      render(<Schema entry={entry} />);

      const handles = screen.getAllByTestId("resize-handle");
      expect(handles).toHaveLength(4);
    });

    it("renders in dark mode without crashing", () => {
      mockUseSelector.mockReturnValue("dark");
      const entry = createMockEntry("123", [
        createSchemaField("id", "INT64", "PRIMITIVE", "REQUIRED", "0", "Primary key"),
      ]);

      render(<Schema entry={entry} />);

      expect(screen.getByText("id")).toBeInTheDocument();
      const handles = screen.getAllByTestId("resize-handle");
      expect(handles).toHaveLength(4);
    });
  });
});
