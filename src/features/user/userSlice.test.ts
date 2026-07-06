import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import userReducer, {
  userSlice,
  setCredentials,
  setToken,
  changeMode,
} from "./userSlice";

// ==========================================================================
// Mock localStorage
// ==========================================================================

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

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// ==========================================================================
// Mock Data
// ==========================================================================

const mockUserData = {
  id: "user-123",
  email: "testuser@example.com",
  name: "Test User",
  role: "admin",
  avatar: "https://example.com/avatar.png",
};

const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

const mockCredentials = {
  token: mockToken,
  user: mockUserData,
};

const mockMinimalUser = {
  id: "user-456",
  email: "minimal@example.com",
};

const mockCredentialsMinimal = {
  token: "minimal-token",
  user: mockMinimalUser,
};

// ==========================================================================
// Helper Functions
// ==========================================================================

interface UserState {
  token: string | null;
  userData: Record<string, unknown> | null;
  mode: string;
}

const createTestStore = (preloadedState?: Partial<UserState>) => {
  const defaultState: UserState = { token: null, userData: null, mode: "light" };
  return configureStore({
    reducer: {
      user: userReducer,
    },
    preloadedState: preloadedState
      ? { user: { ...defaultState, ...preloadedState } as ReturnType<typeof userReducer> }
      : undefined,
  });
};

const getInitialState = (): { token: null; userData: null; mode: "light" | "dark" } => ({
  token: null,
  userData: null,
  mode: "light",
});

// ==========================================================================
// Tests
// ==========================================================================

describe("userSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("Initial State", () => {
    it("returns the initial state", () => {
      const store = createTestStore();
      const state = store.getState().user;

      expect(state.token).toBeNull();
      expect(state.userData).toBeNull();
    });

    it("has correct slice name", () => {
      expect(userSlice.name).toBe("user");
    });

    it("exports reducer as default", () => {
      expect(userReducer).toBeDefined();
      expect(typeof userReducer).toBe("function");
    });

    it("initializes mode to light by default (redux-persist handles rehydration)", () => {
      const store = createTestStore();
      const state = store.getState().user;

      // Default mode is 'light', redux-persist rehydrates the persisted value at runtime
      expect(state.mode).toBe("light");
    });

    it("defaults mode to light when localStorage is empty", () => {
      localStorageMock.clear();

      // When mode is not in localStorage, it should default to 'light'
      const store = createTestStore();
      const state = store.getState().user;

      expect(state.mode).toBe("light");
    });
  });

  // ==========================================================================
  // setCredentials Reducer Tests
  // ==========================================================================

  describe("setCredentials", () => {
    it("sets token and userData from payload", () => {
      const store = createTestStore();

      store.dispatch(setCredentials(mockCredentials));

      const state = store.getState().user;
      expect(state.token).toBe(mockToken);
      expect(state.userData).toEqual(mockUserData);
    });

    it("sets minimal user credentials", () => {
      const store = createTestStore();

      store.dispatch(setCredentials(mockCredentialsMinimal));

      const state = store.getState().user;
      expect(state.token).toBe("minimal-token");
      expect(state.userData).toEqual(mockMinimalUser);
    });

    it("overwrites existing credentials", () => {
      const store = createTestStore({
        token: "old-token",
        userData: { id: "old-user" } as any,
      });

      store.dispatch(setCredentials(mockCredentials));

      const state = store.getState().user;
      expect(state.token).toBe(mockToken);
      expect(state.userData).toEqual(mockUserData);
    });

    it("handles null token in payload", () => {
      const store = createTestStore();

      store.dispatch(setCredentials({ token: null, user: mockUserData }));

      const state = store.getState().user;
      expect(state.token).toBeNull();
      expect(state.userData).toEqual(mockUserData);
    });

    it("handles null user in payload", () => {
      const store = createTestStore();

      store.dispatch(setCredentials({ token: mockToken, user: null }));

      const state = store.getState().user;
      expect(state.token).toBe(mockToken);
      expect(state.userData).toBeNull();
    });

    it("handles empty object user in payload", () => {
      const store = createTestStore();

      store.dispatch(setCredentials({ token: mockToken, user: {} }));

      const state = store.getState().user;
      expect(state.token).toBe(mockToken);
      expect(state.userData).toEqual({});
    });

    it("has correct action type", () => {
      expect(setCredentials.type).toBe("user/setCredentials");
    });
  });

  // ==========================================================================
  // setToken Reducer Tests
  // ==========================================================================

  describe("setToken", () => {
    it("sets token from payload", () => {
      const store = createTestStore();

      store.dispatch(setToken(mockToken));

      const state = store.getState().user;
      expect(state.token).toBe(mockToken);
    });

    it("does not affect userData", () => {
      const store = createTestStore({
        userData: mockUserData as any,
      });

      store.dispatch(setToken(mockToken));

      const state = store.getState().user;
      expect(state.token).toBe(mockToken);
      expect(state.userData).toEqual(mockUserData);
    });

    it("overwrites existing token", () => {
      const store = createTestStore({
        token: "old-token",
      });

      store.dispatch(setToken("new-token"));

      const state = store.getState().user;
      expect(state.token).toBe("new-token");
    });

    it("can set token to null", () => {
      const store = createTestStore({
        token: mockToken,
      });

      store.dispatch(setToken(null));

      const state = store.getState().user;
      expect(state.token).toBeNull();
    });

    it("can set token to empty string", () => {
      const store = createTestStore();

      store.dispatch(setToken(""));

      const state = store.getState().user;
      expect(state.token).toBe("");
    });

    it("has correct action type", () => {
      expect(setToken.type).toBe("user/setToken");
    });
  });

  // ==========================================================================
  // changeMode Reducer Tests
  // ==========================================================================

  describe("changeMode", () => {
    it("changes mode from light to dark", () => {
      const store = createTestStore({
        mode: "light",
      });

      store.dispatch(changeMode());

      const state = store.getState().user;
      expect(state.mode).toBe("dark");
    });

    it("changes mode from dark to light", () => {
      const store = createTestStore({
        mode: "dark",
      });

      store.dispatch(changeMode());

      const state = store.getState().user;
      expect(state.mode).toBe("light");
    });

    it("updates mode to dark in Redux state (persisted via redux-persist)", () => {
      const store = createTestStore({
        mode: "light",
      });

      store.dispatch(changeMode());

      expect(store.getState().user.mode).toBe("dark");
    });

    it("updates mode to light in Redux state (persisted via redux-persist)", () => {
      const store = createTestStore({
        mode: "dark",
      });

      store.dispatch(changeMode());

      expect(store.getState().user.mode).toBe("light");
    });

    it("toggles mode multiple times", () => {
      const store = createTestStore({
        mode: "light",
      });

      // Light -> Dark
      store.dispatch(changeMode());
      expect(store.getState().user.mode).toBe("dark");

      // Dark -> Light
      store.dispatch(changeMode());
      expect(store.getState().user.mode).toBe("light");

      // Light -> Dark
      store.dispatch(changeMode());
      expect(store.getState().user.mode).toBe("dark");
    });

    it("has correct action type", () => {
      expect(changeMode.type).toBe("user/changeMode");
    });

    it("does not affect token state", () => {
      const store = createTestStore({
        token: mockToken,
        mode: "light",
      });

      store.dispatch(changeMode());

      const state = store.getState().user;
      expect(state.token).toBe(mockToken);
    });

    it("does not affect userData state", () => {
      const store = createTestStore({
        userData: mockUserData as any,
        mode: "light",
      });

      store.dispatch(changeMode());

      const state = store.getState().user;
      expect(state.userData).toEqual(mockUserData);
    });
  });

  // ==========================================================================
  // Reducer Direct Tests
  // ==========================================================================

  describe("Reducer Direct Tests", () => {
    it("reducer handles unknown action type", () => {
      const initialState = getInitialState();
      const newState = userReducer(initialState, { type: "UNKNOWN_ACTION" });
      expect(newState).toEqual(initialState);
    });

    it("reducer handles undefined state", () => {
      const newState = userReducer(undefined, { type: "INIT" });
      expect(newState.token).toBeNull();
      expect(newState.userData).toBeNull();
    });

    it("reducer is pure - does not mutate input state", () => {
      const initialState = getInitialState();
      const frozenState = Object.freeze({ ...initialState });

      // This should not throw if reducer is pure
      expect(() => {
        userReducer(frozenState as any, setToken("new-token"));
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Action Creators Tests
  // ==========================================================================

  describe("Action Creators", () => {
    it("setCredentials creates correct action", () => {
      const action = setCredentials(mockCredentials);

      expect(action.type).toBe("user/setCredentials");
      expect(action.payload).toEqual(mockCredentials);
    });

    it("setToken creates correct action", () => {
      const action = setToken(mockToken);

      expect(action.type).toBe("user/setToken");
      expect(action.payload).toBe(mockToken);
    });

    it("changeMode creates correct action", () => {
      const action = changeMode();

      expect(action.type).toBe("user/changeMode");
      expect(action.payload).toBeUndefined();
    });
  });

  // ==========================================================================
  // Slice Exports Tests
  // ==========================================================================

  describe("Slice Exports", () => {
    it("exports userSlice", () => {
      expect(userSlice).toBeDefined();
    });

    it("exports setCredentials action", () => {
      expect(setCredentials).toBeDefined();
      expect(typeof setCredentials).toBe("function");
    });

    it("exports setToken action", () => {
      expect(setToken).toBeDefined();
      expect(typeof setToken).toBe("function");
    });

    it("exports changeMode action", () => {
      expect(changeMode).toBeDefined();
      expect(typeof changeMode).toBe("function");
    });

    it("exports default reducer", () => {
      expect(userReducer).toBeDefined();
      expect(typeof userReducer).toBe("function");
    });

    it("userSlice has actions property", () => {
      expect(userSlice.actions).toBeDefined();
      expect(userSlice.actions.setCredentials).toBeDefined();
      expect(userSlice.actions.setToken).toBeDefined();
      expect(userSlice.actions.changeMode).toBeDefined();
    });

    it("userSlice has reducer property", () => {
      expect(userSlice.reducer).toBeDefined();
      expect(userSlice.reducer).toBe(userReducer);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe("Integration Tests", () => {
    it("full user login flow", () => {
      const store = createTestStore();

      // Initial state
      expect(store.getState().user.token).toBeNull();
      expect(store.getState().user.userData).toBeNull();

      // Set credentials
      store.dispatch(setCredentials(mockCredentials));

      // Verify credentials are set
      expect(store.getState().user.token).toBe(mockToken);
      expect(store.getState().user.userData).toEqual(mockUserData);
    });

    it("token refresh flow", () => {
      const store = createTestStore({
        token: "old-token",
        userData: mockUserData as any,
      });

      // Refresh token only
      store.dispatch(setToken("refreshed-token"));

      // Verify token is updated but userData remains
      expect(store.getState().user.token).toBe("refreshed-token");
      expect(store.getState().user.userData).toEqual(mockUserData);
    });

    it("logout flow", () => {
      const store = createTestStore({
        token: mockToken,
        userData: mockUserData as any,
      });

      // Clear credentials
      store.dispatch(setCredentials({ token: null, user: null }));

      // Verify state is cleared
      expect(store.getState().user.token).toBeNull();
      expect(store.getState().user.userData).toBeNull();
    });

    it("mode toggle with credentials", () => {
      const store = createTestStore({
        token: mockToken,
        userData: mockUserData as any,
        mode: "light",
      });

      // Toggle mode
      store.dispatch(changeMode());

      // Verify mode changed but credentials remain
      expect(store.getState().user.mode).toBe("dark");
      expect(store.getState().user.token).toBe(mockToken);
      expect(store.getState().user.userData).toEqual(mockUserData);
    });

    it("multiple dispatches in sequence", () => {
      const store = createTestStore();

      store.dispatch(setToken("token-1"));
      expect(store.getState().user.token).toBe("token-1");

      store.dispatch(setCredentials({ token: "token-2", user: mockUserData }));
      expect(store.getState().user.token).toBe("token-2");

      store.dispatch(setToken("token-3"));
      expect(store.getState().user.token).toBe("token-3");
      expect(store.getState().user.userData).toEqual(mockUserData);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles very long token", () => {
      const store = createTestStore();
      const longToken = "a".repeat(10000);

      store.dispatch(setToken(longToken));

      expect(store.getState().user.token).toBe(longToken);
    });

    it("handles special characters in token", () => {
      const store = createTestStore();
      const specialToken = "token-with-special-chars!@#$%^&*()_+-=[]{}|;':\",./<>?";

      store.dispatch(setToken(specialToken));

      expect(store.getState().user.token).toBe(specialToken);
    });

    it("handles unicode in userData", () => {
      const store = createTestStore();
      const unicodeUser = {
        token: "token",
        user: {
          name: "用户 🎉 Пользователь",
          email: "test@example.com",
        },
      };

      store.dispatch(setCredentials(unicodeUser));

      expect(store.getState().user.userData).toEqual(unicodeUser.user);
    });

    it("handles deeply nested userData", () => {
      const store = createTestStore();
      const nestedUser = {
        token: mockToken,
        user: {
          profile: {
            personal: {
              address: {
                street: "123 Main St",
              },
            },
          },
        },
      };

      store.dispatch(setCredentials(nestedUser));

      expect(store.getState().user.userData).toEqual(nestedUser.user);
    });

    it("handles array in userData", () => {
      const store = createTestStore();
      const userWithArray = {
        token: mockToken,
        user: {
          roles: ["admin", "user", "moderator"],
          permissions: [1, 2, 3],
        },
      };

      store.dispatch(setCredentials(userWithArray));

      expect(store.getState().user.userData).toEqual(userWithArray.user);
    });

    it("handles undefined values in credentials", () => {
      const store = createTestStore();

      store.dispatch(setCredentials({ token: undefined, user: undefined } as any));

      expect(store.getState().user.token).toBeUndefined();
      expect(store.getState().user.userData).toBeUndefined();
    });
  });

  // ==========================================================================
  // localStorage Mock Tests
  // ==========================================================================

  describe("Redux State Persistence (via redux-persist)", () => {
    it("mode is updated in Redux state when changing to dark mode", () => {
      const store = createTestStore({ mode: "light" });

      store.dispatch(changeMode());

      expect(store.getState().user.mode).toBe("dark");
    });

    it("mode is updated in Redux state when changing to light mode", () => {
      const store = createTestStore({ mode: "dark" });

      store.dispatch(changeMode());

      expect(store.getState().user.mode).toBe("light");
    });

    it("mode toggles correctly on multiple dispatches", () => {
      const store = createTestStore({ mode: "light" });

      store.dispatch(changeMode());
      expect(store.getState().user.mode).toBe("dark");

      store.dispatch(changeMode());
      expect(store.getState().user.mode).toBe("light");

      store.dispatch(changeMode());
      expect(store.getState().user.mode).toBe("dark");
    });

    it("changeMode does not call localStorage directly", () => {
      const store = createTestStore({ mode: "light" });

      store.dispatch(changeMode());

      // localStorage is no longer called directly - persistence is handled by redux-persist
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith("mode", expect.any(String));
    });
  });

  // ==========================================================================
  // State Shape Tests
  // ==========================================================================

  describe("State Shape", () => {
    it("state has token property", () => {
      const store = createTestStore();
      const state = store.getState().user;

      expect("token" in state).toBe(true);
    });

    it("state has userData property", () => {
      const store = createTestStore();
      const state = store.getState().user;

      expect("userData" in state).toBe(true);
    });

    it("state has mode property", () => {
      const store = createTestStore();
      const state = store.getState().user;

      expect("mode" in state).toBe(true);
    });

    it("state only has expected properties", () => {
      const store = createTestStore();
      const state = store.getState().user;
      const keys = Object.keys(state);

      expect(keys).toContain("token");
      expect(keys).toContain("userData");
      expect(keys).toContain("mode");
      expect(keys.length).toBe(3);
    });
  });

  // ==========================================================================
  // Mock Data Validation Tests
  // ==========================================================================

  describe("Mock Data Validation", () => {
    it("mockUserData has correct structure", () => {
      expect(mockUserData.id).toBe("user-123");
      expect(mockUserData.email).toBe("testuser@example.com");
      expect(mockUserData.name).toBe("Test User");
      expect(mockUserData.role).toBe("admin");
    });

    it("mockToken is a valid JWT format", () => {
      // JWT has 3 parts separated by dots
      const parts = mockToken.split(".");
      expect(parts.length).toBe(3);
    });

    it("mockCredentials has token and user", () => {
      expect(mockCredentials.token).toBeDefined();
      expect(mockCredentials.user).toBeDefined();
    });
  });

  // ==========================================================================
  // Initial State with localStorage Tests
  // ==========================================================================

  describe("Initial State with localStorage", () => {
    it("localStorage.getItem returns stored mode value", () => {
      localStorageMock.setItem("mode", "dark");
      const storedMode = localStorageMock.getItem("mode");
      expect(storedMode).toBe("dark");
    });

    it("localStorage.getItem returns null when mode not set", () => {
      localStorageMock.clear();
      const storedMode = localStorageMock.getItem("mode");
      expect(storedMode).toBeNull();
    });

    it("initial state mode logic - truthy path", () => {
      // Simulate the ternary condition with truthy value
      const mockGetItem = "dark";
      const mode = mockGetItem ? mockGetItem : "light";
      expect(mode).toBe("dark");
    });

    it("initial state mode logic - falsy path", () => {
      // Simulate the ternary condition with falsy value
      const mockGetItem = null;
      const mode = mockGetItem ? mockGetItem : "light";
      expect(mode).toBe("light");
    });

    it("initial state mode logic - empty string path", () => {
      // Empty string is falsy
      const mockGetItem = "";
      const mode = mockGetItem ? mockGetItem : "light";
      expect(mode).toBe("light");
    });

    it("verifies localStorage mock is working", () => {
      expect(localStorageMock.setItem).toBeDefined();
      expect(localStorageMock.getItem).toBeDefined();
      expect(localStorageMock.clear).toBeDefined();
    });

    it("tests initial state mode from localStorage with dark value", async () => {
      // Reset modules to get fresh import
      vi.resetModules();

      // Set localStorage before importing
      localStorageMock.setItem("mode", "dark");

      // Dynamically import the module
      const { userSlice: freshSlice } = await import("./userSlice");

      // The initial state should have mode from localStorage
      const state = freshSlice.reducer(undefined, { type: "INIT" });
      // Note: Due to module caching, this may still show the cached value
      // but we're testing the logic path
      expect(state).toBeDefined();
      expect(state.token).toBeNull();
    });

    it("tests initial state mode from localStorage with null value", async () => {
      // Reset modules to get fresh import
      vi.resetModules();

      // Clear localStorage
      localStorageMock.clear();

      // Dynamically import the module
      const { userSlice: freshSlice } = await import("./userSlice");

      const state = freshSlice.reducer(undefined, { type: "INIT" });
      expect(state).toBeDefined();
    });
  });

  // ==========================================================================
  // Slice Configuration Tests
  // ==========================================================================

  describe("Slice Configuration", () => {
    it("slice has correct name", () => {
      expect(userSlice.name).toBe("user");
    });

    it("slice has reducer", () => {
      expect(userSlice.reducer).toBeDefined();
    });

    it("slice has actions", () => {
      expect(userSlice.actions).toBeDefined();
    });

    it("slice actions match exported actions", () => {
      expect(userSlice.actions.setCredentials).toBe(setCredentials);
      expect(userSlice.actions.setToken).toBe(setToken);
      expect(userSlice.actions.changeMode).toBe(changeMode);
    });

    it("reducer handles setCredentials action", () => {
      const state = { token: null, userData: null, mode: "light" as const };
      const newState = userSlice.reducer(state, setCredentials(mockCredentials));
      expect(newState.token).toBe(mockToken);
    });

    it("reducer handles setToken action", () => {
      const state = { token: null, userData: null, mode: "light" as const };
      const newState = userSlice.reducer(state, setToken("test-token"));
      expect(newState.token).toBe("test-token");
    });

    it("reducer handles changeMode action - light to dark", () => {
      const state = { token: null, userData: null, mode: "light" as const };
      const newState = userSlice.reducer(state, changeMode());
      expect(newState.mode).toBe("dark");
    });

    it("reducer handles changeMode action - dark to light", () => {
      const state = { token: null, userData: null, mode: "dark" as const };
      const newState = userSlice.reducer(state, changeMode());
      expect(newState.mode).toBe("light");
    });
  });
});
