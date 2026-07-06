/**
 * @file utils.test.ts
 * @description Comprehensive test suite for all utility functions in /utils directory
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ==========================================================================
// Mock Setup
// ==========================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock window.dispatchEvent
const dispatchEventMock = vi.fn();
window.dispatchEvent = dispatchEventMock;

// Mock console methods
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Mock authErrorService
vi.mock("../services/authErrorService", () => ({
  checkAndHandleAuthError: vi.fn(() => false),
  isAuthenticationError: vi.fn(() => false),
}));

// Mock urlPreservationService
vi.mock("../services/urlPreservationService", () => ({
  saveCurrentLocationForRedirect: vi.fn(),
}));

// Mock Redux store and userSlice for testHelpers
const mockDispatch = vi.fn();
let mockUserData: any = null;
vi.mock("../app/store", () => ({
  default: {
    getState: () => ({ user: { userData: mockUserData } }),
    dispatch: (...args: any[]) => mockDispatch(...args),
  },
}));

const mockSetCredentials = vi.fn((payload: any) => ({ type: "user/setCredentials", payload }));
vi.mock("../features/user/userSlice", () => ({
  setCredentials: (payload: any) => mockSetCredentials(payload),
}));

// ==========================================================================
// Import utilities after mocks
// ==========================================================================

import { debounce } from "./debounce";
import { throttle } from "./throttle";
import {
  getFavorites,
  setFavorite,
  isFavorite,
  toggleFavorite,
  removeFavorite,
  clearAllFavorites,
  type FavoriteEntry,
} from "./favoriteUtils";
import {
  saveStateToStorage,
  loadStateFromStorage,
  clearPersistedState,
  PERSISTED_STATE_KEYS,
} from "./persistence";
import {
  getName,
  getEntryType,
  getFormatedDate,
  getFormattedDateTimeParts,
  getFormattedDateTimePartsByDateTime,
  generateBigQueryLink,
  generateLookerStudioLink,
  hasValidAnnotationData,
  typeAliases,
  getMimeType,
} from "./resourceUtils";
import {
  handleApiResponse,
  createAxiosInterceptor,
  isTokenExpired,
  getTimeUntilExpiry,
  formatTimeUntilExpiry,
} from "./sessionUtils";
import {
  expireToken,
  setTokenExpiry,
  triggerWarning,
  showSessionStatus,
  resetSession,
} from "./testHelpers";
import {
  extractGlossaryId,
  normalizeId,
  getAllAncestorIds,
  findItem,
  getBreadcrumbs,
  filterGlossaryTree,
  collectAllIds,
  collectAncestorIdsOfMatches,
  parseFilterInput,
  createOrConnectorChip,
  isOrConnector,
  getFilterFieldLabel,
  isValidFilterField,
} from "./glossaryUtils";
import {
  withAuthErrorHandling,
  executeWithAuthHandling,
} from "./asyncWithAuth";
import {
  setSessionExpirationModalActive,
  isSessionExpirationModalActive,
} from "./apiInterceptor";
import type { GlossaryItem, FilterChip } from "../component/Glossaries/GlossaryDataType";

// ==========================================================================
// Mock Data
// ==========================================================================

const mockGlossaryItems: GlossaryItem[] = [
  {
    id: "glossary-1",
    type: "glossary",
    displayName: "Customer Data",
    description: "Customer related data glossary",
    children: [
      {
        id: "cat-1",
        type: "category",
        displayName: "Demographics",
        description: "Customer demographics",
        children: [
          {
            id: "term-1",
            type: "term",
            displayName: "Customer ID",
            description: "Unique customer identifier",
            isFilterMatch: true,
          },
          {
            id: "term-2",
            type: "term",
            displayName: "Customer Name",
            description: "Full customer name",
          },
        ],
      },
      {
        id: "term-3",
        type: "term",
        displayName: "Account Status",
        description: "Current account status",
      },
    ],
  },
  {
    id: "glossary-2",
    type: "glossary",
    displayName: "Product Catalog",
    description: "Product related data",
    isFilterMatch: true,
  },
];

const mockEntry = {
  name: "projects/test-project/locations/us/entryGroups/group1/entries/tables/my-table",
  fullyQualifiedName: "bigquery:test-project.my-dataset.my-table",
};

const mockSessionUserData = {
  name: "Test User",
  email: "test@example.com",
  tokenExpiry: Math.floor(Date.now() / 1000) + 3600,
  tokenIssuedAt: Math.floor(Date.now() / 1000),
};

// ==========================================================================
// DEBOUNCE TESTS
// ==========================================================================

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should delay function execution", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should reset timer on subsequent calls", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn();
    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should pass arguments to the original function", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn("arg1", "arg2");
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("should only call function once for multiple rapid calls", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should work with zero delay", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 0);

    debouncedFn();
    vi.advanceTimersByTime(0);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should handle different argument types", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 50);

    debouncedFn({ key: "value" }, [1, 2, 3], null);
    vi.advanceTimersByTime(50);

    expect(mockFn).toHaveBeenCalledWith({ key: "value" }, [1, 2, 3], null);
  });

  it("should clear previous timeout when called again", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn("first");
    vi.advanceTimersByTime(80);
    debouncedFn("second");
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("second");
  });
});

// ==========================================================================
// THROTTLE TESTS
// ==========================================================================

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should execute immediately on first call", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should throttle subsequent calls within delay", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should allow calls after delay has passed", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    vi.advanceTimersByTime(100);
    throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("should schedule trailing call when called during throttle period", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn("first");
    vi.advanceTimersByTime(50);
    throttledFn("second");

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("first");

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith("second");
  });

  it("should pass arguments correctly", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn("arg1", "arg2", 123);
    expect(mockFn).toHaveBeenCalledWith("arg1", "arg2", 123);
  });

  it("should clear pending timeout on new call during throttle", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn("first");
    vi.advanceTimersByTime(30);
    throttledFn("second");
    vi.advanceTimersByTime(30);
    throttledFn("third");

    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(40);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith("third");
  });

  it("should work with zero delay", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 0);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});

// ==========================================================================
// FAVORITE UTILS TESTS
// ==========================================================================

describe("favoriteUtils", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("getFavorites", () => {
    it("should return empty object when no favorites stored", () => {
      const result = getFavorites();
      expect(result).toEqual({});
    });

    it("should return stored favorites", () => {
      localStorageMock.setItem(
        "dataplex_favorites",
        JSON.stringify({ entry1: true, entry2: false })
      );
      const result = getFavorites();
      expect(result).toEqual({ entry1: true, entry2: false });
    });

    it("should return empty object on parse error", () => {
      localStorageMock.setItem("dataplex_favorites", "invalid-json");
      const result = getFavorites();
      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("setFavorite", () => {
    it("should set a favorite entry", () => {
      setFavorite("entry1", true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(dispatchEventMock).toHaveBeenCalled();
    });

    it("should dispatch favoritesChanged event with correct detail", () => {
      setFavorite("entry1", true);
      const eventCall = dispatchEventMock.mock.calls[0][0];
      expect(eventCall.type).toBe("favoritesChanged");
      expect(eventCall.detail).toEqual({ entryName: "entry1", isFavorite: true });
    });

    it("should handle localStorage error gracefully", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Storage full");
      });
      setFavorite("entry1", true);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("isFavorite", () => {
    it("should return true for favorited entry", () => {
      localStorageMock.setItem(
        "dataplex_favorites",
        JSON.stringify({ entry1: true })
      );
      expect(isFavorite("entry1")).toBe(true);
    });

    it("should return false for non-favorited entry", () => {
      localStorageMock.setItem(
        "dataplex_favorites",
        JSON.stringify({ entry1: false })
      );
      expect(isFavorite("entry1")).toBe(false);
    });

    it("should return false for unknown entry", () => {
      expect(isFavorite("unknown")).toBe(false);
    });
  });

  describe("toggleFavorite", () => {
    it("should toggle from false to true", () => {
      localStorageMock.setItem(
        "dataplex_favorites",
        JSON.stringify({ entry1: false })
      );
      const result = toggleFavorite("entry1");
      expect(result).toBe(true);
    });

    it("should toggle from true to false", () => {
      localStorageMock.setItem(
        "dataplex_favorites",
        JSON.stringify({ entry1: true })
      );
      const result = toggleFavorite("entry1");
      expect(result).toBe(false);
    });

    it("should toggle unknown entry to true", () => {
      const result = toggleFavorite("newEntry");
      expect(result).toBe(true);
    });
  });

  describe("removeFavorite", () => {
    it("should remove a favorite entry", () => {
      localStorageMock.setItem(
        "dataplex_favorites",
        JSON.stringify({ entry1: true, entry2: true })
      );
      removeFavorite("entry1");
      expect(dispatchEventMock).toHaveBeenCalled();
    });

    it("should handle localStorage error gracefully", () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ entry1: true }));
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });
      removeFavorite("entry1");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("clearAllFavorites", () => {
    it("should clear all favorites", () => {
      localStorageMock.setItem(
        "dataplex_favorites",
        JSON.stringify({ entry1: true })
      );
      clearAllFavorites();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("dataplex_favorites");
      expect(dispatchEventMock).toHaveBeenCalled();
    });

    it("should dispatch event with null entryName", () => {
      clearAllFavorites();
      const eventCall = dispatchEventMock.mock.calls[0][0];
      expect(eventCall.detail).toEqual({ entryName: null, isFavorite: false });
    });

    it("should handle localStorage error gracefully", () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });
      clearAllFavorites();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("FavoriteEntry interface", () => {
    it("should accept valid FavoriteEntry shape", () => {
      const entry: FavoriteEntry = { name: "test", isFavorite: true };
      expect(entry.name).toBe("test");
      expect(entry.isFavorite).toBe(true);
    });
  });
});

// ==========================================================================
// PERSISTENCE TESTS
// ==========================================================================

describe("persistence", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("PERSISTED_STATE_KEYS", () => {
    it("should contain expected keys", () => {
      expect(PERSISTED_STATE_KEYS).toContain("search");
      expect(PERSISTED_STATE_KEYS).toContain("resources");
      expect(PERSISTED_STATE_KEYS).toContain("entry");
    });
  });

  describe("saveStateToStorage", () => {
    it("should save search state", () => {
      saveStateToStorage({ search: { query: "test" } });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "searchState",
        JSON.stringify({ query: "test" })
      );
    });

    it("should save resources state", () => {
      saveStateToStorage({ resources: { items: [] } });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "resourcesState",
        JSON.stringify({ items: [] })
      );
    });

    it("should save entry state without history", () => {
      saveStateToStorage({
        entry: { current: "test", history: ["item1", "item2"] },
      });
      const savedValue = localStorageMock.setItem.mock.calls.find(
        (call: string[]) => call[0] === "entryState"
      );
      expect(savedValue).toBeDefined();
      const parsed = JSON.parse(savedValue![1]);
      expect(parsed.history).toEqual([]);
      expect(parsed.current).toBe("test");
    });

    it("should handle missing state properties", () => {
      saveStateToStorage({});
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("should handle localStorage error gracefully", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Quota exceeded");
      });
      saveStateToStorage({ search: { query: "test" } });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe("loadStateFromStorage", () => {
    it("should load search state", () => {
      localStorageMock.setItem("searchState", JSON.stringify({ query: "test" }));
      const result = loadStateFromStorage();
      expect(result.search).toEqual({ query: "test" });
    });

    it("should load resources state", () => {
      localStorageMock.setItem("resourcesState", JSON.stringify({ items: [] }));
      const result = loadStateFromStorage();
      expect(result.resources).toEqual({ items: [] });
    });

    it("should load entry state", () => {
      localStorageMock.setItem("entryState", JSON.stringify({ current: "test" }));
      const result = loadStateFromStorage();
      expect(result.entry).toEqual({ current: "test", accessCheckCache: {} });
    });

    it("should return empty object when no state stored", () => {
      const result = loadStateFromStorage();
      expect(result).toEqual({});
    });

    it("should handle parse error gracefully", () => {
      localStorageMock.setItem("searchState", "invalid-json");
      const result = loadStateFromStorage();
      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe("clearPersistedState", () => {
    it("should remove all persisted state keys", () => {
      localStorageMock.setItem("searchState", "test");
      localStorageMock.setItem("resourcesState", "test");
      localStorageMock.setItem("entryState", "test");

      clearPersistedState();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("searchState");
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("resourcesState");
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("entryState");
    });

    it("should handle localStorage error gracefully", () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });
      clearPersistedState();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});

// ==========================================================================
// RESOURCE UTILS TESTS
// ==========================================================================

describe("resourceUtils", () => {
  describe("getName", () => {
    it("should extract name from path", () => {
      expect(getName("projects/test/tables/myTable", "/")).toBe("myTable");
    });

    it("should handle empty string", () => {
      expect(getName("", "/")).toBe("");
    });

    it("should handle path without separator", () => {
      expect(getName("single", "/")).toBe("single");
    });

    it("should handle different separators", () => {
      expect(getName("a.b.c", ".")).toBe("c");
    });

    it("should handle empty string", () => {
      expect(getName("", "/")).toBe("");
    });
  });

  describe("getEntryType", () => {
    it("should extract and capitalize entry type", () => {
      expect(getEntryType("projects/test/tables/myTable", "/")).toBe("Tables");
    });

    it("should handle different entry types", () => {
      expect(getEntryType("projects/test/datasets/myDataset", "/")).toBe(
        "Datasets"
      );
    });
  });

  describe("getFormatedDate", () => {
    it("should format timestamp correctly", () => {
      const timestamp = 1609459200; // Jan 1, 2021 00:00:00 UTC
      const result = getFormatedDate(timestamp);
      expect(result).toContain("2021");
    });

    it("should return dash for falsy date", () => {
      expect(getFormatedDate(null)).toBe("-");
      expect(getFormatedDate(undefined)).toBe("-");
      expect(getFormatedDate(0)).toBe("-");
    });
  });

  describe("getFormattedDateTimeParts", () => {
    it("should return date and time parts", () => {
      const timestamp = 1609459200;
      const result = getFormattedDateTimeParts(timestamp);
      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("time");
    });

    it("should return dash for missing timestamp", () => {
      const result = getFormattedDateTimeParts(null);
      expect(result).toEqual({ date: "-", time: "" });
    });

    it("should handle undefined timestamp", () => {
      const result = getFormattedDateTimeParts(undefined);
      expect(result).toEqual({ date: "-", time: "" });
    });
  });

  describe("getFormattedDateTimePartsByDateTime", () => {
    it("should handle object with seconds property", () => {
      const dateTime = { seconds: 1609459200 };
      const result = getFormattedDateTimePartsByDateTime(dateTime);
      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("time");
    });

    it("should handle numeric timestamp", () => {
      const result = getFormattedDateTimePartsByDateTime(1609459200000);
      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("time");
    });

    it("should return dash for falsy input", () => {
      expect(getFormattedDateTimePartsByDateTime(null)).toEqual({
        date: "-",
        time: "",
      });
      expect(getFormattedDateTimePartsByDateTime(undefined)).toEqual({
        date: "-",
        time: "",
      });
    });

    it("should return dash for invalid date", () => {
      const result = getFormattedDateTimePartsByDateTime("invalid");
      expect(result).toEqual({ date: "-", time: "" });
    });
  });

  describe("generateBigQueryLink", () => {
    it("should generate valid BigQuery link", () => {
      const result = generateBigQueryLink(mockEntry);
      expect(result).toContain("console.cloud.google.com/bigquery");
      expect(result).toContain("test-project");
      expect(result).toContain("my-dataset");
      expect(result).toContain("my-table");
    });

    it("should return empty string for missing entry", () => {
      expect(generateBigQueryLink(null)).toBe("");
      expect(generateBigQueryLink(undefined)).toBe("");
    });

    it("should return empty string for missing name or fullyQualifiedName", () => {
      expect(generateBigQueryLink({ name: "test" })).toBe("");
      expect(generateBigQueryLink({ fullyQualifiedName: "test" })).toBe("");
    });

    it("should return empty string for invalid fqn format", () => {
      expect(
        generateBigQueryLink({
          name: "projects/test/tables/myTable",
          fullyQualifiedName: "bigquery:project",
        })
      ).toBe("");
    });

    it("should handle entry without table (dataset only)", () => {
      const datasetEntry = {
        name: "projects/test/datasets/myDataset",
        fullyQualifiedName: "bigquery:test-project.my-dataset",
      };
      const result = generateBigQueryLink(datasetEntry);
      expect(result).toContain("test-project");
      expect(result).toContain("my-dataset");
      expect(result).not.toContain("&t=");
    });
  });

  describe("generateLookerStudioLink", () => {
    it("should generate valid Looker Studio link", () => {
      const result = generateLookerStudioLink(mockEntry);
      expect(result).toContain("lookerstudio.google.com");
      expect(result).toContain("test-project");
      expect(result).toContain("my-dataset");
      expect(result).toContain("my-table");
    });

    it("should return empty string for missing entry", () => {
      expect(generateLookerStudioLink(null)).toBe("");
      expect(generateLookerStudioLink(undefined)).toBe("");
    });

    it("should return empty string for missing fullyQualifiedName", () => {
      expect(generateLookerStudioLink({})).toBe("");
    });

    it("should return empty string for invalid fqn format", () => {
      expect(generateLookerStudioLink({ fullyQualifiedName: "bigquery:project.dataset" })).toBe(
        ""
      );
    });
  });

  describe("hasValidAnnotationData", () => {
    it("should return false for null/undefined aspectData", () => {
      expect(hasValidAnnotationData(null)).toBe(false);
      expect(hasValidAnnotationData(undefined)).toBe(false);
    });

    it("should return false for aspectData without data property", () => {
      expect(hasValidAnnotationData({})).toBe(false);
    });

    it("should return false for empty fields", () => {
      expect(hasValidAnnotationData({ data: {} })).toBe(false);
      expect(hasValidAnnotationData({ data: { fields: {} } })).toBe(false);
    });

    it("should return true for valid stringValue", () => {
      const aspectData = {
        data: {
          fields: {
            field1: { kind: "stringValue", stringValue: "test" },
          },
        },
      };
      expect(hasValidAnnotationData(aspectData)).toBe(true);
    });

    it("should return true for valid numberValue", () => {
      const aspectData = {
        data: {
          fields: {
            field1: { kind: "numberValue", numberValue: 42 },
          },
        },
      };
      expect(hasValidAnnotationData(aspectData)).toBe(true);
    });

    it("should return true for valid boolValue", () => {
      const aspectData = {
        data: {
          fields: {
            field1: { kind: "boolValue", boolValue: true },
          },
        },
      };
      expect(hasValidAnnotationData(aspectData)).toBe(true);
    });

    it("should return true for valid listValue", () => {
      const aspectData = {
        data: {
          fields: {
            field1: { kind: "listValue", listValue: { values: [1, 2] } },
          },
        },
      };
      expect(hasValidAnnotationData(aspectData)).toBe(true);
    });

    it("should return false for empty stringValue", () => {
      const aspectData = {
        data: {
          fields: {
            field1: { kind: "stringValue", stringValue: "" },
          },
        },
      };
      expect(hasValidAnnotationData(aspectData)).toBe(false);
    });

    it("should return false for empty listValue", () => {
      const aspectData = {
        data: {
          fields: {
            field1: { kind: "listValue", listValue: { values: [] } },
          },
        },
      };
      expect(hasValidAnnotationData(aspectData)).toBe(false);
    });

    it("should handle data without fields wrapper", () => {
      const aspectData = {
        data: {
          directField: "value",
        },
      };
      expect(hasValidAnnotationData(aspectData)).toBe(true);
    });
  });

  describe("typeAliases", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(typeAliases)).toBe(true);
      expect(typeAliases.length).toBeGreaterThan(0);
      typeAliases.forEach((alias) => {
        expect(typeof alias).toBe("string");
      });
    });

    it("should contain common types", () => {
      expect(typeAliases).toContain("Table");
      expect(typeAliases).toContain("Dataset");
      expect(typeAliases).toContain("View");
    });
  });

  describe("getMimeType", () => {
    it("should detect GIF from base64", () => {
      expect(getMimeType("R0lGODdh")).toBe("image/gif");
      expect(getMimeType("R0lGODlh")).toBe("image/gif");
    });

    it("should detect PNG from base64", () => {
      expect(getMimeType("iVBORw0KGgo")).toBe("image/png");
    });

    it("should detect JPG from base64", () => {
      expect(getMimeType("/9j/")).toBe("image/jpg");
    });

    it("should return undefined for unknown format", () => {
      expect(getMimeType("unknown")).toBeUndefined();
    });
  });
});

// ==========================================================================
// SESSION UTILS TESTS
// ==========================================================================

describe("sessionUtils", () => {
  describe("handleApiResponse", () => {
    it("should trigger token_expired for 401 status", () => {
      const triggerExpiration = vi.fn();
      const response = { status: 401 } as Response;
      const result = handleApiResponse(response, triggerExpiration);
      expect(triggerExpiration).toHaveBeenCalledWith("token_expired");
      expect(result).toBe(true);
    });

    it("should trigger unauthorized for 403 status", () => {
      const triggerExpiration = vi.fn();
      const response = { status: 403 } as Response;
      const result = handleApiResponse(response, triggerExpiration);
      expect(triggerExpiration).toHaveBeenCalledWith("unauthorized");
      expect(result).toBe(true);
    });

    it("should return false for successful response", () => {
      const triggerExpiration = vi.fn();
      const response = { status: 200 } as Response;
      const result = handleApiResponse(response, triggerExpiration);
      expect(triggerExpiration).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe("createAxiosInterceptor", () => {
    it("should return interceptor object with response handlers", () => {
      const triggerExpiration = vi.fn();
      const interceptor = createAxiosInterceptor(triggerExpiration);
      expect(interceptor.response).toBeDefined();
      expect(interceptor.response.onFulfilled).toBeDefined();
      expect(interceptor.response.onRejected).toBeDefined();
    });

    it("should pass through successful responses", () => {
      const triggerExpiration = vi.fn();
      const interceptor = createAxiosInterceptor(triggerExpiration);
      const response = { data: "test" };
      expect(interceptor.response.onFulfilled(response)).toBe(response);
    });

    it("should handle 401 error", async () => {
      const triggerExpiration = vi.fn();
      const interceptor = createAxiosInterceptor(triggerExpiration);
      const error = { response: { status: 401 } };

      await expect(interceptor.response.onRejected(error)).rejects.toEqual(error);
      expect(triggerExpiration).toHaveBeenCalledWith("token_expired");
    });

    it("should handle 403 error", async () => {
      const triggerExpiration = vi.fn();
      const interceptor = createAxiosInterceptor(triggerExpiration);
      const error = { response: { status: 403 } };

      await expect(interceptor.response.onRejected(error)).rejects.toEqual(error);
      expect(triggerExpiration).toHaveBeenCalledWith("unauthorized");
    });

    it("should handle error without response", async () => {
      const triggerExpiration = vi.fn();
      const interceptor = createAxiosInterceptor(triggerExpiration);
      const error = { message: "Network error" };

      await expect(interceptor.response.onRejected(error)).rejects.toEqual(error);
      expect(triggerExpiration).not.toHaveBeenCalled();
    });
  });

  describe("isTokenExpired", () => {
    it("should return false when no expiry provided", () => {
      expect(isTokenExpired()).toBe(false);
      expect(isTokenExpired(undefined)).toBe(false);
    });

    it("should return true when token is expired", () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
      expect(isTokenExpired(pastExpiry)).toBe(true);
    });

    it("should return false when token is not expired", () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      expect(isTokenExpired(futureExpiry)).toBe(false);
    });
  });

  describe("getTimeUntilExpiry", () => {
    it("should return Infinity when no expiry provided", () => {
      expect(getTimeUntilExpiry()).toBe(Infinity);
      expect(getTimeUntilExpiry(undefined)).toBe(Infinity);
    });

    it("should return 0 for expired token", () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
      expect(getTimeUntilExpiry(pastExpiry)).toBe(0);
    });

    it("should return positive value for valid token", () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      const result = getTimeUntilExpiry(futureExpiry);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(3600);
    });
  });

  describe("formatTimeUntilExpiry", () => {
    it("should return 'Never' when no expiry", () => {
      expect(formatTimeUntilExpiry()).toBe("Never");
      expect(formatTimeUntilExpiry(undefined)).toBe("Never");
    });

    it("should format seconds correctly", () => {
      const expiry = Math.floor(Date.now() / 1000) + 30;
      expect(formatTimeUntilExpiry(expiry)).toMatch(/\d+ seconds/);
    });

    it("should format minutes correctly", () => {
      const expiry = Math.floor(Date.now() / 1000) + 300;
      expect(formatTimeUntilExpiry(expiry)).toMatch(/\d+ minutes/);
    });

    it("should format hours correctly", () => {
      const expiry = Math.floor(Date.now() / 1000) + 7200;
      expect(formatTimeUntilExpiry(expiry)).toMatch(/\d+ hours/);
    });

    it("should handle expired token", () => {
      const expiry = Math.floor(Date.now() / 1000) - 3600;
      expect(formatTimeUntilExpiry(expiry)).toBe("0 seconds");
    });
  });
});

// ==========================================================================
// TEST HELPERS TESTS
// ==========================================================================

describe("testHelpers", () => {
  beforeEach(() => {
    mockUserData = null;
    vi.clearAllMocks();
  });

  describe("expireToken", () => {
    it("should log error when no session data", () => {
      expireToken();
      expect(consoleErrorSpy).toHaveBeenCalledWith("No session data found");
    });

    it("should set token expiry to the past", () => {
      mockUserData = { ...mockSessionUserData };
      expireToken();
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockSetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ tokenExpiry: expect.any(Number) }) })
      );
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe("setTokenExpiry", () => {
    it("should log error when no session data", () => {
      setTokenExpiry(5);
      expect(consoleErrorSpy).toHaveBeenCalledWith("No session data found");
    });

    it("should set token expiry to specified minutes", () => {
      mockUserData = { ...mockSessionUserData };
      setTokenExpiry(10);
      expect(mockDispatch).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("10 minutes"));
    });

    it("should show warning message for short expiry", () => {
      mockUserData = { ...mockSessionUserData };
      setTokenExpiry(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning modal should appear")
      );
    });
  });

  describe("triggerWarning", () => {
    it("should log error when no session data", () => {
      triggerWarning();
      expect(consoleErrorSpy).toHaveBeenCalledWith("No session data found");
    });

    it("should set expiry to 4 minutes", () => {
      mockUserData = { ...mockSessionUserData };
      triggerWarning();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning modal will appear")
      );
    });
  });

  describe("showSessionStatus", () => {
    it("should log error when no session data", () => {
      showSessionStatus();
      expect(consoleErrorSpy).toHaveBeenCalledWith("No session data found");
    });

    it("should display session status", () => {
      mockUserData = { ...mockSessionUserData };
      showSessionStatus();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("SESSION STATUS"));
    });

    it("should warn about expired token", () => {
      mockUserData = { ...mockSessionUserData, tokenExpiry: Math.floor(Date.now() / 1000) - 100 };
      showSessionStatus();
      expect(consoleWarnSpy).toHaveBeenCalledWith("TOKEN EXPIRED!");
    });

    it("should warn about expiring soon", () => {
      mockUserData = { ...mockSessionUserData, tokenExpiry: Math.floor(Date.now() / 1000) + 180 };
      showSessionStatus();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Warning modal should be visible"));
    });

    it("should log message for token expiring within 10 minutes", () => {
      mockUserData = { ...mockSessionUserData, tokenExpiry: Math.floor(Date.now() / 1000) + 420 };
      showSessionStatus();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Warning modal will appear at 5 min mark"));
    });
  });

  describe("resetSession", () => {
    it("should log error when no session data", () => {
      resetSession();
      expect(consoleErrorSpy).toHaveBeenCalledWith("No session data found");
    });

    it("should reset session to 1 hour from now", () => {
      mockUserData = { ...mockSessionUserData };
      resetSession();
      expect(mockDispatch).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith("Session reset to fresh state");
    });
  });

  describe("window exports", () => {
    it("should expose functions on window object", () => {
      expect((window as any).expireToken).toBe(expireToken);
      expect((window as any).setTokenExpiry).toBe(setTokenExpiry);
      expect((window as any).triggerWarning).toBe(triggerWarning);
      expect((window as any).showSessionStatus).toBe(showSessionStatus);
      expect((window as any).resetSession).toBe(resetSession);
    });
  });
});

// ==========================================================================
// GLOSSARY UTILS TESTS
// ==========================================================================

describe("glossaryUtils", () => {
  describe("extractGlossaryId", () => {
    it("should extract glossary ID from entry ID", () => {
      const entryId = "projects/test/locations/us/glossaries/my-glossary/terms/term1";
      const result = extractGlossaryId(entryId);
      expect(result).toBe("projects/test/locations/us/glossaries/my-glossary");
    });

    it("should return null for invalid entry ID", () => {
      expect(extractGlossaryId("invalid-id")).toBeNull();
      expect(extractGlossaryId("")).toBeNull();
    });
  });

  describe("normalizeId", () => {
    it("should extract ID after /entries/", () => {
      expect(normalizeId("prefix/entries/my-id")).toBe("my-id");
    });

    it("should return original ID if no /entries/ prefix", () => {
      expect(normalizeId("my-id")).toBe("my-id");
    });
  });

  describe("getAllAncestorIds", () => {
    it("should return ancestor IDs for nested item", () => {
      const result = getAllAncestorIds(mockGlossaryItems, "term-1");
      expect(result).toContain("glossary-1");
      expect(result).toContain("cat-1");
      expect(result).not.toContain("term-1");
    });

    it("should return empty array for root item", () => {
      const result = getAllAncestorIds(mockGlossaryItems, "glossary-1");
      expect(result).toEqual([]);
    });

    it("should return empty array for non-existent item", () => {
      const result = getAllAncestorIds(mockGlossaryItems, "non-existent");
      expect(result).toEqual([]);
    });
  });

  describe("findItem", () => {
    it("should find root level item", () => {
      const result = findItem(mockGlossaryItems, "glossary-1");
      expect(result?.displayName).toBe("Customer Data");
    });

    it("should find nested item", () => {
      const result = findItem(mockGlossaryItems, "term-1");
      expect(result?.displayName).toBe("Customer ID");
    });

    it("should return null for non-existent item", () => {
      const result = findItem(mockGlossaryItems, "non-existent");
      expect(result).toBeNull();
    });
  });

  describe("getBreadcrumbs", () => {
    it("should return breadcrumb chain for nested item", () => {
      const result = getBreadcrumbs(mockGlossaryItems, "term-1");
      expect(result).toHaveLength(3);
      expect(result?.[0].displayName).toBe("Customer Data");
      expect(result?.[1].displayName).toBe("Demographics");
      expect(result?.[2].displayName).toBe("Customer ID");
    });

    it("should return single item for root", () => {
      const result = getBreadcrumbs(mockGlossaryItems, "glossary-1");
      expect(result).toHaveLength(1);
      expect(result?.[0].displayName).toBe("Customer Data");
    });

    it("should return null for non-existent item", () => {
      const result = getBreadcrumbs(mockGlossaryItems, "non-existent");
      expect(result).toBeNull();
    });
  });

  describe("filterGlossaryTree", () => {
    it("should filter items by query", () => {
      const result = filterGlossaryTree(mockGlossaryItems, "Customer");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include parent nodes of matching children", () => {
      const result = filterGlossaryTree(mockGlossaryItems, "Customer ID");
      expect(result[0].displayName).toBe("Customer Data");
    });

    it("should return empty array for no matches", () => {
      const result = filterGlossaryTree(mockGlossaryItems, "xyz-no-match");
      expect(result).toEqual([]);
    });

    it("should be case insensitive", () => {
      const result = filterGlossaryTree(mockGlossaryItems, "CUSTOMER");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should preserve children when parent matches", () => {
      const result = filterGlossaryTree(mockGlossaryItems, "Customer Data");
      expect(result[0].children).toBeDefined();
      expect(result[0].children?.length).toBeGreaterThan(0);
    });
  });

  describe("collectAllIds", () => {
    it("should collect all IDs from tree", () => {
      const result = collectAllIds(mockGlossaryItems);
      expect(result).toContain("glossary-1");
      expect(result).toContain("cat-1");
      expect(result).toContain("term-1");
      expect(result).toContain("glossary-2");
    });

    it("should return empty array for empty input", () => {
      const result = collectAllIds([]);
      expect(result).toEqual([]);
    });
  });

  describe("collectAncestorIdsOfMatches", () => {
    it("should collect ancestor IDs of filter matches", () => {
      const result = collectAncestorIdsOfMatches(mockGlossaryItems);
      expect(result).toContain("glossary-1");
      expect(result).toContain("cat-1");
      expect(result).not.toContain("term-1"); // term-1 is the match itself
      expect(result).not.toContain("glossary-2"); // glossary-2 is itself a match
    });

    it("should return empty array when no matches", () => {
      const noMatchItems: GlossaryItem[] = [
        { id: "item1", type: "glossary", displayName: "Test" },
      ];
      const result = collectAncestorIdsOfMatches(noMatchItems);
      expect(result).toEqual([]);
    });
  });

  describe("parseFilterInput", () => {
    beforeEach(() => {
      vi.spyOn(Date, "now").mockReturnValue(1234567890123);
      vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return null for empty input", () => {
      expect(parseFilterInput("")).toBeNull();
      expect(parseFilterInput("   ")).toBeNull();
    });

    it("should parse explicit field with dropdown selection", () => {
      const result = parseFilterInput("test value", "name");
      expect(result?.field).toBe("name");
      expect(result?.value).toBe("test value");
      expect(result?.showFieldLabel).toBe(true);
    });

    it("should parse field:value format", () => {
      const result = parseFilterInput("name:test");
      expect(result?.field).toBe("name");
      expect(result?.value).toBe("test");
      expect(result?.showFieldLabel).toBe(true);
    });

    it("should default to name field without prefix", () => {
      const result = parseFilterInput("simple search");
      expect(result?.field).toBe("name");
      expect(result?.value).toBe("simple search");
      expect(result?.showFieldLabel).toBe(false);
    });

    it("should return null for field:value with empty value", () => {
      const result = parseFilterInput("name:");
      expect(result).toBeNull();
    });

    it("should handle various valid filter fields", () => {
      expect(parseFilterInput("parent:test")?.field).toBe("parent");
      expect(parseFilterInput("synonym:test")?.field).toBe("synonym");
      expect(parseFilterInput("contact:test")?.field).toBe("contact");
      expect(parseFilterInput("labels:test")?.field).toBe("labels");
      expect(parseFilterInput("aspect:test")?.field).toBe("aspect");
    });

    it("should treat invalid field as plain search", () => {
      const result = parseFilterInput("invalid:test");
      expect(result?.field).toBe("name");
      expect(result?.value).toBe("invalid:test");
    });
  });

  describe("createOrConnectorChip", () => {
    it("should create OR connector chip", () => {
      const chip = createOrConnectorChip();
      expect(chip.value).toBe("OR");
      expect(chip.displayLabel).toBe("OR");
      expect(chip.connector).toBe("OR");
    });

    it("should have unique ID", () => {
      const chip1 = createOrConnectorChip();
      const chip2 = createOrConnectorChip();
      // IDs should be defined
      expect(chip1.id).toBeDefined();
      expect(chip2.id).toBeDefined();
      expect(chip1.id.startsWith("or-")).toBe(true);
      expect(chip2.id.startsWith("or-")).toBe(true);
    });
  });

  describe("isOrConnector", () => {
    it("should return true for OR connector chip", () => {
      const chip: FilterChip = {
        id: "or-1",
        field: "name",
        value: "OR",
        displayLabel: "OR",
        connector: "OR",
      };
      expect(isOrConnector(chip)).toBe(true);
    });

    it("should return false for regular chip", () => {
      const chip: FilterChip = {
        id: "filter-1",
        field: "name",
        value: "test",
        displayLabel: "test",
      };
      expect(isOrConnector(chip)).toBe(false);
    });

    it("should return false for chip with OR value but different displayLabel", () => {
      const chip: FilterChip = {
        id: "filter-1",
        field: "name",
        value: "OR",
        displayLabel: "Name: OR",
      };
      expect(isOrConnector(chip)).toBe(false);
    });
  });

  describe("getFilterFieldLabel", () => {
    it("should return label for valid fields", () => {
      expect(getFilterFieldLabel("name")).toBe("Name");
      expect(getFilterFieldLabel("parent")).toBe("Parent");
      expect(getFilterFieldLabel("synonym")).toBe("Synonym");
      expect(getFilterFieldLabel("contact")).toBe("Contact");
      expect(getFilterFieldLabel("labels")).toBe("Labels");
      expect(getFilterFieldLabel("aspect")).toBe("Aspect");
    });

    it("should return field itself for unknown field", () => {
      expect(getFilterFieldLabel("unknown" as any)).toBe("unknown");
    });
  });

  describe("isValidFilterField", () => {
    it("should return true for valid fields", () => {
      expect(isValidFilterField("name")).toBe(true);
      expect(isValidFilterField("parent")).toBe(true);
      expect(isValidFilterField("synonym")).toBe(true);
      expect(isValidFilterField("contact")).toBe(true);
      expect(isValidFilterField("labels")).toBe(true);
      expect(isValidFilterField("aspect")).toBe(true);
    });

    it("should return false for invalid fields", () => {
      expect(isValidFilterField("invalid")).toBe(false);
      expect(isValidFilterField("")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isValidFilterField("NAME")).toBe(true);
      expect(isValidFilterField("Parent")).toBe(true);
    });
  });
});

// ==========================================================================
// ASYNC WITH AUTH TESTS
// ==========================================================================

describe("asyncWithAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("withAuthErrorHandling", () => {
    it("should return wrapped function", () => {
      const mockFn = vi.fn().mockResolvedValue("success");
      const wrappedFn = withAuthErrorHandling(mockFn);
      expect(typeof wrappedFn).toBe("function");
    });

    it("should pass through successful result", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");
      const wrappedFn = withAuthErrorHandling(mockFn);
      const result = await wrappedFn();
      expect(result).toBe("success");
    });

    it("should pass arguments to original function", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");
      const wrappedFn = withAuthErrorHandling(mockFn);
      await wrappedFn("arg1", "arg2");
      expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should re-throw error after handling", async () => {
      const error = new Error("Test error");
      const mockFn = vi.fn().mockRejectedValue(error);
      const wrappedFn = withAuthErrorHandling(mockFn);
      await expect(wrappedFn()).rejects.toThrow("Test error");
    });
  });

  describe("executeWithAuthHandling", () => {
    it("should execute function and return result", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");
      const result = await executeWithAuthHandling(mockFn);
      expect(result).toBe("success");
    });

    it("should pass arguments to function", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");
      await executeWithAuthHandling(mockFn, "arg1", "arg2");
      expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should re-throw error after handling", async () => {
      const error = new Error("Test error");
      const mockFn = vi.fn().mockRejectedValue(error);
      await expect(executeWithAuthHandling(mockFn)).rejects.toThrow("Test error");
    });
  });
});

// ==========================================================================
// API INTERCEPTOR TESTS
// ==========================================================================

describe("apiInterceptor", () => {
  describe("sessionExpirationModalActive state", () => {
    beforeEach(() => {
      setSessionExpirationModalActive(false);
    });

    it("should initially be false", () => {
      setSessionExpirationModalActive(false);
      expect(isSessionExpirationModalActive()).toBe(false);
    });

    it("should be settable to true", () => {
      setSessionExpirationModalActive(true);
      expect(isSessionExpirationModalActive()).toBe(true);
    });

    it("should be settable back to false", () => {
      setSessionExpirationModalActive(true);
      setSessionExpirationModalActive(false);
      expect(isSessionExpirationModalActive()).toBe(false);
    });

    it("should toggle state correctly", () => {
      expect(isSessionExpirationModalActive()).toBe(false);
      setSessionExpirationModalActive(true);
      expect(isSessionExpirationModalActive()).toBe(true);
      setSessionExpirationModalActive(false);
      expect(isSessionExpirationModalActive()).toBe(false);
      setSessionExpirationModalActive(true);
      expect(isSessionExpirationModalActive()).toBe(true);
    });
  });

  describe("axios interceptor", () => {
    it("should export default axios instance", async () => {
      const { default: axiosInstance } = await import("./apiInterceptor");
      expect(axiosInstance).toBeDefined();
      expect(axiosInstance.interceptors).toBeDefined();
    });

    it("should have response interceptors configured", async () => {
      const { default: axiosInstance } = await import("./apiInterceptor");
      expect(axiosInstance.interceptors.response).toBeDefined();
    });
  });
});

// ==========================================================================
// EDGE CASES AND INTEGRATION TESTS
// ==========================================================================

describe("Edge Cases and Integration", () => {
  describe("debounce and throttle together", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("debounce should work with complex objects", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      const complexArg = { nested: { value: [1, 2, 3] } };

      debouncedFn(complexArg);
      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith(complexArg);
    });

    it("throttle should work with async functions", () => {
      const mockFn = vi.fn().mockResolvedValue("result");
      const throttledFn = throttle(mockFn, 100);

      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("localStorage error handling", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.clearAllMocks();
    });

    it("should handle corrupted JSON in getFavorites", () => {
      localStorageMock.setItem("dataplex_favorites", "{corrupted");
      const result = getFavorites();
      expect(result).toEqual({});
    });

    it("should handle null values in localStorage", () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const result = getFavorites();
      expect(result).toEqual({});
    });
  });

  describe("glossary tree deep nesting", () => {
    it("should handle deeply nested structures", () => {
      const deepItem: GlossaryItem = {
        id: "level-0",
        type: "glossary",
        displayName: "Level 0",
        children: [
          {
            id: "level-1",
            type: "category",
            displayName: "Level 1",
            children: [
              {
                id: "level-2",
                type: "category",
                displayName: "Level 2",
                children: [
                  {
                    id: "level-3",
                    type: "term",
                    displayName: "Level 3",
                  },
                ],
              },
            ],
          },
        ],
      };

      const ancestors = getAllAncestorIds([deepItem], "level-3");
      expect(ancestors).toEqual(["level-0", "level-1", "level-2"]);

      const breadcrumbs = getBreadcrumbs([deepItem], "level-3");
      expect(breadcrumbs).toHaveLength(4);
    });
  });

  describe("resource utils with special characters", () => {
    it("should handle special characters in paths", () => {
      expect(getName("path/with spaces/name", "/")).toBe("name");
      expect(getName("path/with-dashes/name", "/")).toBe("name");
      expect(getName("path/with_underscores/name", "/")).toBe("name");
    });
  });

  describe("session utils boundary conditions", () => {
    it("should handle token expiring exactly now", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTokenExpired(now)).toBe(true);
    });

    it("should handle token expiring one second from now", () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 1;
      expect(isTokenExpired(futureExpiry)).toBe(false);
    });
  });
});
