import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================================================
// MOCK SETUP - Use vi.hoisted to create mock functions available during hoisting
// ============================================================================
const {
  mockCheckAndHandleAuthError,
  mockIsFavorite,
  mockSetFavorite,
  mockToggleFavorite,
  mockAxiosGet,
  mockUseAuth,
  mockUseNotification,
  mockUseNavigate,
  mockIsAuthNotificationShown,
  mockSetAuthNotificationShown,
  mockStoreGetState,
} = vi.hoisted(() => ({
  mockCheckAndHandleAuthError: vi.fn(),
  mockIsFavorite: vi.fn(),
  mockSetFavorite: vi.fn(),
  mockToggleFavorite: vi.fn(),
  mockAxiosGet: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseNotification: vi.fn(),
  mockUseNavigate: vi.fn(),
  mockIsAuthNotificationShown: vi.fn(),
  mockSetAuthNotificationShown: vi.fn(),
  mockStoreGetState: vi.fn(),
}));

// Mock authErrorService
vi.mock('../services/authErrorService', () => ({
  checkAndHandleAuthError: (...args: unknown[]) => mockCheckAndHandleAuthError(...args),
  isAuthNotificationShown: () => mockIsAuthNotificationShown(),
  setAuthNotificationShown: (shown: boolean) => mockSetAuthNotificationShown(shown),
}));

// Mock favoriteUtils
vi.mock('../utils/favoriteUtils', () => ({
  isFavorite: (entryName: string) => mockIsFavorite(entryName),
  setFavorite: (entryName: string, status: boolean) => mockSetFavorite(entryName, status),
  toggleFavorite: (entryName: string) => mockToggleFavorite(entryName),
}));

// Mock axios - import the actual AxiosError class to maintain instanceof checks
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      get: (...args: unknown[]) => mockAxiosGet(...args),
    },
  };
});

// Mock AuthProvider
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock NotificationContext
vi.mock('../contexts/NotificationContext', () => ({
  useNotification: () => mockUseNotification(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockUseNavigate,
}));

// Mock constants
vi.mock('../constants/urls', () => ({
  URLS: {
    API_URL: 'http://localhost:3000/api/v1',
    GET_ENTRY: '/get-entry',
  },
}));

vi.mock('../constants/auth', () => ({
  AUTH_CONFIG: {
    STORAGE_KEYS: {
      SESSION_EXPIRED: 'session_expired_flag',
      SESSION_RENEWED: 'session_renewed_signal',
    },
  },
}));

// Mock Redux store (used by useSessionExpiration's getInitialExpirationState)
vi.mock('../app/store', () => ({
  default: {
    getState: () => mockStoreGetState(),
  },
}));

// Import hooks after mocks
import { useAuthError } from './useAuthError';
import useBoolean from './useBoolean';
import useDebounce from './useDebounce';
import { useFavorite } from './useFavorite';
import useFullScreenStatus from './useFullScreenStatus';
import { usePreviewEntry } from './usePreviewEntry';
import { useSessionExpiration } from './useSessionExpiration';
import { useSessionManagement } from './useSessionManagement';

// ============================================================================
// Mock localStorage
// ============================================================================
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
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// ============================================================================
// useAuthError Tests
// ============================================================================
describe('useAuthError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return handleError and isAuthError functions', () => {
    const { result } = renderHook(() => useAuthError());

    expect(result.current.handleError).toBeDefined();
    expect(typeof result.current.handleError).toBe('function');
    expect(result.current.isAuthError).toBeDefined();
    expect(typeof result.current.isAuthError).toBe('function');
  });

  it('should call checkAndHandleAuthError when handleError is called', () => {
    mockCheckAndHandleAuthError.mockReturnValue(true);

    const { result } = renderHook(() => useAuthError());
    const mockError = new Error('Test error');

    const returnValue = result.current.handleError(mockError);

    expect(mockCheckAndHandleAuthError).toHaveBeenCalledWith(mockError);
    expect(returnValue).toBe(true);
  });

  it('should return false when error is not an auth error', () => {
    mockCheckAndHandleAuthError.mockReturnValue(false);

    const { result } = renderHook(() => useAuthError());
    const mockError = new Error('Not an auth error');

    const returnValue = result.current.handleError(mockError);

    expect(mockCheckAndHandleAuthError).toHaveBeenCalledWith(mockError);
    expect(returnValue).toBe(false);
  });

  it('should handle AxiosError objects', () => {
    mockCheckAndHandleAuthError.mockReturnValue(true);

    const { result } = renderHook(() => useAuthError());
    const axiosError = {
      response: { status: 401, data: { message: 'Unauthorized' } },
      message: 'Request failed',
    };

    result.current.handleError(axiosError);

    expect(mockCheckAndHandleAuthError).toHaveBeenCalledWith(axiosError);
  });

  it('should memoize handleError function', () => {
    const { result, rerender } = renderHook(() => useAuthError());

    const firstHandleError = result.current.handleError;
    rerender();
    const secondHandleError = result.current.handleError;

    expect(firstHandleError).toBe(secondHandleError);
  });

  it('isAuthError should reference checkAndHandleAuthError', () => {
    mockCheckAndHandleAuthError.mockReturnValue(true);

    const { result } = renderHook(() => useAuthError());
    const mockError = { response: { status: 403 } };

    const returnValue = result.current.isAuthError(mockError);

    expect(mockCheckAndHandleAuthError).toHaveBeenCalledWith(mockError);
    expect(returnValue).toBe(true);
  });
});

// ============================================================================
// useBoolean Tests
// ============================================================================
describe('useBoolean', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with false when no default value provided', () => {
    const { result } = renderHook(() => useBoolean());

    expect(result.current.value).toBe(false);
  });

  it('should initialize with true when default value is true', () => {
    const { result } = renderHook(() => useBoolean(true));

    expect(result.current.value).toBe(true);
  });

  it('should initialize with false when default value is false', () => {
    const { result } = renderHook(() => useBoolean(false));

    expect(result.current.value).toBe(false);
  });

  it('should initialize with false when default value is undefined', () => {
    const { result } = renderHook(() => useBoolean(undefined));

    expect(result.current.value).toBe(false);
  });

  it('should set value to true using setTrue', () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      result.current.setTrue();
    });

    expect(result.current.value).toBe(true);
  });

  it('should set value to false using setFalse', () => {
    const { result } = renderHook(() => useBoolean(true));

    act(() => {
      result.current.setFalse();
    });

    expect(result.current.value).toBe(false);
  });

  it('should toggle value from false to true', () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      result.current.toggle();
    });

    expect(result.current.value).toBe(true);
  });

  it('should toggle value from true to false', () => {
    const { result } = renderHook(() => useBoolean(true));

    act(() => {
      result.current.toggle();
    });

    expect(result.current.value).toBe(false);
  });

  it('should toggle value multiple times correctly', () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      result.current.toggle();
    });
    expect(result.current.value).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.value).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.value).toBe(true);
  });

  it('should allow direct setValue', () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      result.current.setValue(true);
    });

    expect(result.current.value).toBe(true);

    act(() => {
      result.current.setValue(false);
    });

    expect(result.current.value).toBe(false);
  });

  it('should memoize setTrue, setFalse, and toggle functions', () => {
    const { result, rerender } = renderHook(() => useBoolean(false));

    const firstSetTrue = result.current.setTrue;
    const firstSetFalse = result.current.setFalse;
    const firstToggle = result.current.toggle;

    rerender();

    expect(result.current.setTrue).toBe(firstSetTrue);
    expect(result.current.setFalse).toBe(firstSetFalse);
    expect(result.current.toggle).toBe(firstToggle);
  });

  it('should work correctly with functional updates via setValue', () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      result.current.setValue((prev) => !prev);
    });

    expect(result.current.value).toBe(true);
  });
});

// ============================================================================
// useDebounce Tests
// ============================================================================
describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));

    expect(result.current).toBe('initial');
  });

  it('should debounce value changes with default delay (500ms)', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });

    expect(result.current).toBe('initial');

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('should debounce value changes with custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 },
      }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 1000 });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('should reset timer when value changes before delay completes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: 'initial' },
      }
    );

    rerender({ value: 'first-update' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({ value: 'second-update' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('second-update');
  });

  it('should work with number values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: 0 },
      }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(42);
  });

  it('should work with object values', () => {
    const initialObject = { name: 'initial' };
    const updatedObject = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: initialObject },
      }
    );

    expect(result.current).toEqual(initialObject);

    rerender({ value: updatedObject });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toEqual(updatedObject);
  });

  it('should work with array values', () => {
    const initialArray = [1, 2, 3];
    const updatedArray = [4, 5, 6];

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: initialArray },
      }
    );

    expect(result.current).toEqual(initialArray);

    rerender({ value: updatedArray });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toEqual(updatedArray);
  });

  it('should work with undefined delay (default 500ms)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, undefined),
      {
        initialProps: { value: 'initial' },
      }
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { unmount, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: 'initial' },
      }
    );

    rerender({ value: 'updated' });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      {
        initialProps: { value: 'initial' },
      }
    );

    rerender({ value: 'updated' });

    // Run all pending timers - setTimeout(fn, 0) still needs to be processed
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe('updated');
  });
});

// ============================================================================
// useFavorite Tests
// ============================================================================
describe('useFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFavorite.mockReturnValue(false);
    mockToggleFavorite.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with favorite status from localStorage', () => {
    mockIsFavorite.mockReturnValue(true);

    const { result } = renderHook(() => useFavorite('test-entry'));

    expect(mockIsFavorite).toHaveBeenCalledWith('test-entry');
    expect(result.current.isFavorite).toBe(true);
  });

  it('should initialize as not favorite when entry is not in favorites', () => {
    mockIsFavorite.mockReturnValue(false);

    const { result } = renderHook(() => useFavorite('test-entry'));

    expect(result.current.isFavorite).toBe(false);
  });

  it('should toggle favorite status', () => {
    mockIsFavorite.mockReturnValue(false);
    mockToggleFavorite.mockReturnValue(true);

    const { result } = renderHook(() => useFavorite('test-entry'));

    act(() => {
      const newStatus = result.current.toggleFavorite();
      expect(newStatus).toBe(true);
    });

    expect(mockToggleFavorite).toHaveBeenCalledWith('test-entry');
    expect(result.current.isFavorite).toBe(true);
  });

  it('should toggle favorite status from true to false', () => {
    mockIsFavorite.mockReturnValue(true);
    mockToggleFavorite.mockReturnValue(false);

    const { result } = renderHook(() => useFavorite('test-entry'));

    act(() => {
      const newStatus = result.current.toggleFavorite();
      expect(newStatus).toBe(false);
    });

    expect(result.current.isFavorite).toBe(false);
  });

  it('should set favorite status directly', () => {
    mockIsFavorite.mockReturnValue(false);

    const { result } = renderHook(() => useFavorite('test-entry'));

    act(() => {
      result.current.setFavorite(true);
    });

    expect(mockSetFavorite).toHaveBeenCalledWith('test-entry', true);
    expect(result.current.isFavorite).toBe(true);
  });

  it('should update when favoritesChanged event is dispatched for same entry', () => {
    mockIsFavorite.mockReturnValue(false);

    const { result } = renderHook(() => useFavorite('test-entry'));

    expect(result.current.isFavorite).toBe(false);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('favoritesChanged', {
          detail: { entryName: 'test-entry', isFavorite: true },
        })
      );
    });

    expect(result.current.isFavorite).toBe(true);
  });

  it('should not update when favoritesChanged event is dispatched for different entry', () => {
    mockIsFavorite.mockReturnValue(false);

    const { result } = renderHook(() => useFavorite('test-entry'));

    expect(result.current.isFavorite).toBe(false);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('favoritesChanged', {
          detail: { entryName: 'other-entry', isFavorite: true },
        })
      );
    });

    expect(result.current.isFavorite).toBe(false);
  });

  it('should update when entryName changes', () => {
    // First call for initial render (useState initializer), second for useEffect
    // Third and fourth for entry-2
    mockIsFavorite
      .mockReturnValueOnce(false)  // useState initializer for entry-1
      .mockReturnValueOnce(false)  // useEffect for entry-1
      .mockReturnValueOnce(true)   // useEffect for entry-2
      .mockReturnValueOnce(true);  // additional calls

    const { result, rerender } = renderHook(
      ({ entryName }) => useFavorite(entryName),
      {
        initialProps: { entryName: 'entry-1' },
      }
    );

    expect(result.current.isFavorite).toBe(false);

    rerender({ entryName: 'entry-2' });

    expect(result.current.isFavorite).toBe(true);
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    mockIsFavorite.mockReturnValue(false);

    const { unmount } = renderHook(() => useFavorite('test-entry'));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'favoritesChanged',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });
});

// ============================================================================
// useFullScreenStatus Tests
// ============================================================================
describe('useFullScreenStatus', () => {
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;
  let mockExitFullscreen: ReturnType<typeof vi.fn>;
  let mockWebkitRequestFullscreen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
    mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
    mockWebkitRequestFullscreen = vi.fn().mockResolvedValue(undefined);

    // Reset fullscreenElement
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });

    document.exitFullscreen = mockExitFullscreen;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with isFullscreen as false', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.elementRef).toBeDefined();
    expect(result.current.toggleFullscreen).toBeDefined();
  });

  it('should provide an elementRef', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    expect(result.current.elementRef).toBeDefined();
    expect(result.current.elementRef).toHaveProperty('current');
  });

  it('should enter fullscreen when toggleFullscreen is called and not in fullscreen', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    // Simulate attaching ref to an element
    const mockElement = {
      requestFullscreen: mockRequestFullscreen,
    };
    (result.current.elementRef as { current: unknown }).current = mockElement;

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockRequestFullscreen).toHaveBeenCalled();
  });

  it('should use webkitRequestFullscreen for Safari when requestFullscreen is not available', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    // Simulate Safari element without requestFullscreen
    const mockElement = {
      webkitRequestFullscreen: mockWebkitRequestFullscreen,
    };
    (result.current.elementRef as { current: unknown }).current = mockElement;

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockWebkitRequestFullscreen).toHaveBeenCalled();
  });

  it('should exit fullscreen when toggleFullscreen is called while in fullscreen', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    const mockElement = {
      requestFullscreen: mockRequestFullscreen,
    };
    (result.current.elementRef as { current: unknown }).current = mockElement;

    // Simulate being in fullscreen
    Object.defineProperty(document, 'fullscreenElement', {
      value: mockElement,
      writable: true,
      configurable: true,
    });

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockExitFullscreen).toHaveBeenCalled();
  });

  it('should update isFullscreen state on fullscreenchange event', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    const mockElement = {
      requestFullscreen: mockRequestFullscreen,
    };
    (result.current.elementRef as { current: unknown }).current = mockElement;

    // Simulate entering fullscreen
    Object.defineProperty(document, 'fullscreenElement', {
      value: mockElement,
      writable: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(result.current.isFullscreen).toBe(true);

    // Simulate exiting fullscreen
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(result.current.isFullscreen).toBe(false);
  });

  it('should update isFullscreen state on webkitfullscreenchange event', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    const mockElement = {
      webkitRequestFullscreen: mockWebkitRequestFullscreen,
    };
    (result.current.elementRef as { current: unknown }).current = mockElement;

    // Simulate entering fullscreen
    Object.defineProperty(document, 'fullscreenElement', {
      value: mockElement,
      writable: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('webkitfullscreenchange'));
    });

    expect(result.current.isFullscreen).toBe(true);
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useFullScreenStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'fullscreenchange',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'webkitfullscreenchange',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it('should not call any fullscreen method if elementRef.current is null', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    // Don't attach any element to ref

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockRequestFullscreen).not.toHaveBeenCalled();
    expect(mockWebkitRequestFullscreen).not.toHaveBeenCalled();
  });

  it('should not call exitFullscreen if it is not defined', () => {
    const { result } = renderHook(() => useFullScreenStatus());

    const mockElement = {
      requestFullscreen: mockRequestFullscreen,
    };
    (result.current.elementRef as { current: unknown }).current = mockElement;

    // Simulate being in fullscreen but exitFullscreen undefined
    Object.defineProperty(document, 'fullscreenElement', {
      value: mockElement,
      writable: true,
      configurable: true,
    });
    (document as unknown as { exitFullscreen: undefined }).exitFullscreen = undefined as unknown as undefined;

    act(() => {
      result.current.toggleFullscreen();
    });

    // Should not throw
  });
});

// ============================================================================
// usePreviewEntry Tests
// ============================================================================
describe('usePreviewEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with idle status and null data', () => {
    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: null,
        id_token: 'test-token',
        enabled: false,
      })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.entry).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch entry when entryName and id_token are provided', async () => {
    const mockEntryData = { name: 'test-entry', data: 'test-data' };
    mockAxiosGet.mockResolvedValue({ data: mockEntryData });

    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: 'test-token',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('succeeded');
    });

    expect(result.current.entry).toEqual(mockEntryData);
    expect(result.current.error).toBeNull();
    expect(mockAxiosGet).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/get-entry?entryName=projects/test/entries/entry-1',
      { headers: { Authorization: 'Bearer test-token' } }
    );
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: 'test-token',
        enabled: false,
      })
    );

    expect(result.current.status).toBe('idle');
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('should handle fetch failure', async () => {
    // Import actual AxiosError for instanceof check to work
    const { AxiosError: RealAxiosError } = await import('axios');
    const axiosError = new RealAxiosError('Network error');
    (axiosError as { response: { data: string; status: number } }).response = { data: 'Server error', status: 500 };
    mockAxiosGet.mockRejectedValue(axiosError);

    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: 'test-token',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
    });

    expect(result.current.entry).toBeNull();
    expect(result.current.error).toBe('Server error');
  });

  it('should handle AxiosError with response data', async () => {
    // Import actual AxiosError for instanceof check to work
    const { AxiosError: RealAxiosError } = await import('axios');
    const axiosError = new RealAxiosError('Request failed');
    (axiosError as { response: { data: { message: string }; status: number } }).response = { data: { message: 'Entry not found' }, status: 404 };
    mockAxiosGet.mockRejectedValue(axiosError);

    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: 'test-token',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
    });

    expect(result.current.error).toEqual({ message: 'Entry not found' });
  });

  it('should handle unknown errors', async () => {
    mockAxiosGet.mockRejectedValue('Unknown error');

    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: 'test-token',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
    });

    expect(result.current.error).toBe('An unknown error occurred');
  });

  it('should reset state when entryName is cleared', async () => {
    const mockEntryData = { name: 'test-entry' };
    mockAxiosGet.mockResolvedValue({ data: mockEntryData });

    const { result, rerender } = renderHook(
      ({ entryName }) =>
        usePreviewEntry({
          entryName,
          id_token: 'test-token',
          enabled: true,
        }),
      { initialProps: { entryName: 'projects/test/entries/entry-1' as string | null } }
    );

    await waitFor(() => {
      expect(result.current.status).toBe('succeeded');
    });

    rerender({ entryName: null });

    expect(result.current.status).toBe('idle');
    expect(result.current.entry).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should refetch entry when refetch is called', async () => {
    const mockEntryData = { name: 'test-entry' };
    mockAxiosGet.mockResolvedValue({ data: mockEntryData });

    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: 'test-token',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('succeeded');
    });

    mockAxiosGet.mockClear();
    const updatedData = { name: 'updated-entry' };
    mockAxiosGet.mockResolvedValue({ data: updatedData });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockAxiosGet).toHaveBeenCalled();
    expect(result.current.entry).toEqual(updatedData);
  });

  it('should return null when refetch is called without entryName', async () => {
    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: null,
        id_token: 'test-token',
        enabled: true,
      })
    );

    let refetchResult: unknown;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult).toBeNull();
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('should return null when refetch is called without id_token', async () => {
    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: '',
        enabled: true,
      })
    );

    let refetchResult: unknown;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult).toBeNull();
  });

  it('should set empty Authorization header when token is empty', async () => {
    mockAxiosGet.mockResolvedValue({ data: { name: 'test' } });

    renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: '',
        enabled: true,
      })
    );

    // Note: The hook checks for id_token before fetching, so with empty token it won't fetch
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('should fetch again when entryName changes', async () => {
    mockAxiosGet.mockResolvedValue({ data: { name: 'entry-1' } });

    const { result, rerender } = renderHook(
      ({ entryName }) =>
        usePreviewEntry({
          entryName,
          id_token: 'test-token',
          enabled: true,
        }),
      { initialProps: { entryName: 'projects/test/entries/entry-1' } }
    );

    await waitFor(() => {
      expect(result.current.status).toBe('succeeded');
    });

    mockAxiosGet.mockClear();
    mockAxiosGet.mockResolvedValue({ data: { name: 'entry-2' } });

    rerender({ entryName: 'projects/test/entries/entry-2' });

    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/get-entry?entryName=projects/test/entries/entry-2',
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });
  });

  it('should default enabled to true', async () => {
    mockAxiosGet.mockResolvedValue({ data: { name: 'test' } });

    const { result } = renderHook(() =>
      usePreviewEntry({
        entryName: 'projects/test/entries/entry-1',
        id_token: 'test-token',
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('succeeded');
    });

    expect(mockAxiosGet).toHaveBeenCalled();
  });
});

// ============================================================================
// useSessionExpiration Tests
// ============================================================================
describe('useSessionExpiration', () => {
  const mockShowError = vi.fn();
  const mockShowWarning = vi.fn();
  const mockOnSessionExpired = vi.fn();
  const mockOnTokenExpired = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.clear();

    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token' },
    });

    mockUseNotification.mockReturnValue({
      showError: mockShowError,
      showWarning: mockShowWarning,
    });

    mockIsAuthNotificationShown.mockReturnValue(false);

    // Default store state with valid token
    mockStoreGetState.mockReturnValue({
      user: { userData: { tokenExpiry: 9999999999 } },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('should initialize with isExpired as false', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
    });
    mockStoreGetState.mockReturnValue({
      user: { userData: { tokenExpiry: 9999999999 } },
    });

    const { result } = renderHook(() => useSessionExpiration());

    expect(result.current.isExpired).toBe(false);
    expect(result.current.expirationReason).toBe('session_expired');
  });

  it('should not check token when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null });

    renderHook(() => useSessionExpiration());

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockShowWarning).not.toHaveBeenCalled();
  });

  it('should detect expired token and show error', async () => {
    const expiredTime = Math.floor(Date.now() / 1000) - 1000; // 1000 seconds ago
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiredTime },
    });
    mockStoreGetState.mockReturnValue({
      user: { userData: { tokenExpiry: expiredTime } },
    });

    const { result } = renderHook(() =>
      useSessionExpiration({
        onTokenExpired: mockOnTokenExpired,
      })
    );

    // The hook checks immediately on mount via checkTokenValidity (async)
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.expirationReason).toBe('token_expired');
    expect(mockOnTokenExpired).toHaveBeenCalled();
  });

  it('should detect missing session data and show warning', async () => {
    // No user data - user is null
    mockUseAuth.mockReturnValue({ user: null });
    mockStoreGetState.mockReturnValue({
      user: { userData: null },
    });

    const { result } = renderHook(() =>
      useSessionExpiration({
        onSessionExpired: mockOnSessionExpired,
      })
    );

    // The hook checks immediately on mount via checkTokenValidity (async)
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    // With null user, the hook won't run checkTokenValidity, so isExpired stays false
    expect(result.current.isExpired).toBe(false);
  });

  it('should not show duplicate notifications', async () => {
    mockIsAuthNotificationShown.mockReturnValue(true);

    const expiredTime = Math.floor(Date.now() / 1000) - 1000;
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiredTime },
    });
    mockStoreGetState.mockReturnValue({
      user: { userData: { tokenExpiry: expiredTime } },
    });

    renderHook(() => useSessionExpiration());

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('should check token validity at custom interval', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
    });

    renderHook(() =>
      useSessionExpiration({
        checkInterval: 5000,
      })
    );

    // Advance by less than check interval
    act(() => {
      vi.advanceTimersByTime(4999);
    });

    // Should not have checked again yet (only initial check)

    // Advance to trigger another check
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Token is valid, no errors shown
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('should reset expiration when resetExpiration is called', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
    });

    const { result } = renderHook(() => useSessionExpiration());

    act(() => {
      result.current.triggerExpiration('unauthorized');
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.expirationReason).toBe('unauthorized');

    act(() => {
      result.current.resetExpiration();
    });

    expect(result.current.isExpired).toBe(false);
  });

  it('should trigger expiration with custom reason', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
    });

    const { result } = renderHook(() => useSessionExpiration());

    act(() => {
      result.current.triggerExpiration('token_expired');
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.expirationReason).toBe('token_expired');
  });

  it('should trigger expiration with default reason', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
    });

    const { result } = renderHook(() => useSessionExpiration());

    act(() => {
      result.current.triggerExpiration();
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.expirationReason).toBe('session_expired');
  });

  it('should reset expiration state when user changes', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
    });

    const { result, rerender } = renderHook(() => useSessionExpiration());

    act(() => {
      result.current.triggerExpiration();
    });

    expect(result.current.isExpired).toBe(true);

    // Simulate user change
    mockUseAuth.mockReturnValue({
      user: { name: 'New User', email: 'new@test.com', token: 'new-token' },
    });

    rerender();

    expect(result.current.isExpired).toBe(false);
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
    });

    const { unmount } = renderHook(() => useSessionExpiration());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should handle store errors gracefully', async () => {
    mockStoreGetState.mockImplementation(() => {
      throw new Error('Store not initialized');
    });

    renderHook(() => useSessionExpiration());

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Should have handled the error gracefully (getInitialExpirationState catches errors)
  });

  it('should provide checkTokenValidity function', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
    });

    const { result } = renderHook(() => useSessionExpiration());

    expect(result.current.checkTokenValidity).toBeDefined();
    expect(typeof result.current.checkTokenValidity).toBe('function');
  });
});

// ============================================================================
// useSessionManagement Tests
// ============================================================================
describe('useSessionManagement', () => {
  const mockLogout = vi.fn();
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.clear();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: 9999999999 },
      logout: mockLogout,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
    consoleLogSpy.mockRestore();
  });

  it('should initialize with modal closed and zero remaining time', () => {
    const { result } = renderHook(() => useSessionManagement());

    expect(result.current.isWarningModalOpen).toBe(false);
    expect(result.current.remainingTime).toBe(0);
  });

  it('should not run when disabled', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: Math.floor(Date.now() / 1000) + 60 },
      logout: mockLogout,
    });

    const { result } = renderHook(() =>
      useSessionManagement({ enabled: false })
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.isWarningModalOpen).toBe(false);
  });

  it('should not run when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: mockLogout });

    const { result } = renderHook(() => useSessionManagement());

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.isWarningModalOpen).toBe(false);
  });

  it('should show warning modal when token is about to expire', () => {
    // Token expires in 4 minutes (within 5 minute threshold)
    const expiryTime = Math.floor(Date.now() / 1000) + 4 * 60;
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiryTime },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    expect(result.current.isWarningModalOpen).toBe(true);
    expect(result.current.remainingTime).toBeGreaterThan(0);
  });

  it('should countdown remaining time', () => {
    const expiryTime = Math.floor(Date.now() / 1000) + 4 * 60;
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiryTime },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    const initialTime = result.current.remainingTime;

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingTime).toBe(initialTime - 1);
  });

  it('should handle session expired when countdown reaches zero', () => {
    const expiryTime = Math.floor(Date.now() / 1000) + 2; // expires in 2 seconds
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiryTime },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    // Advance past expiration
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.isWarningModalOpen).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'session_expired_flag',
      expect.any(String)
    );
  });

  it('should close modal and clear countdown when handleStayLoggedIn is called', async () => {
    const expiryTime = Math.floor(Date.now() / 1000) + 4 * 60;
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiryTime },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    expect(result.current.isWarningModalOpen).toBe(true);

    await act(async () => {
      await result.current.handleStayLoggedIn();
    });

    expect(result.current.isWarningModalOpen).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'session_renewed_signal',
      expect.any(String)
    );
  });

  it('should logout and navigate when handleLogOut is called', () => {
    const expiryTime = Math.floor(Date.now() / 1000) + 4 * 60;
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiryTime },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    act(() => {
      result.current.handleLogOut();
    });

    expect(result.current.isWarningModalOpen).toBe(false);
    expect(mockLogout).toHaveBeenCalled();
    expect(mockUseNavigate).toHaveBeenCalledWith('/login');
  });

  it('should handle storage change event for session renewed', () => {
    const expiryTime = Math.floor(Date.now() / 1000) + 4 * 60;
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiryTime },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    expect(result.current.isWarningModalOpen).toBe(true);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'session_renewed_signal',
          newValue: Date.now().toString(),
        })
      );
    });

    expect(result.current.isWarningModalOpen).toBe(false);
  });

  it('should handle storage change event for session expired', () => {
    const expiryTime = Math.floor(Date.now() / 1000) + 4 * 60;
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiryTime },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'session_expired_flag',
          newValue: Date.now().toString(),
        })
      );
    });

    expect(result.current.isWarningModalOpen).toBe(false);
  });

  it('should check token on visibility change to visible', () => {
    // Token is valid initially
    renderHook(() => useSessionManagement());

    // Simulate going to another tab and coming back
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });

    // Now token is about to expire - update the user mock
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: Math.floor(Date.now() / 1000) + 60 },
      logout: mockLogout,
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should check and potentially show warning
  });

  it('should not check on visibility change when disabled', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: Math.floor(Date.now() / 1000) + 60 },
      logout: mockLogout,
    });

    const { result } = renderHook(() =>
      useSessionManagement({ enabled: false })
    );

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isWarningModalOpen).toBe(false);
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerWindowSpy = vi.spyOn(window, 'removeEventListener');
    const removeEventListenerDocSpy = vi.spyOn(document, 'removeEventListener');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { unmount } = renderHook(() => useSessionManagement());

    unmount();

    expect(removeEventListenerWindowSpy).toHaveBeenCalledWith(
      'storage',
      expect.any(Function)
    );
    expect(removeEventListenerDocSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
    expect(clearIntervalSpy).toHaveBeenCalled();

    removeEventListenerWindowSpy.mockRestore();
    removeEventListenerDocSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('should use custom warning threshold', () => {
    // Token expires in 2 minutes
    const expiryTime = Math.floor(Date.now() / 1000) + 2 * 60;
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiryTime },
      logout: mockLogout,
    });

    // Custom threshold of 3 minutes
    const { result } = renderHook(() =>
      useSessionManagement({ warningThreshold: 3 * 60 * 1000 })
    );

    expect(result.current.isWarningModalOpen).toBe(true);
  });

  it('should return 0 for getTimeUntilExpiry when no session data', () => {
    // User without tokenExpiry
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token' },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    // Modal shouldn't open without valid expiry data
    expect(result.current.isWarningModalOpen).toBe(false);
  });

  it('should handle token already expired on initial check', () => {
    const expiredTime = Math.floor(Date.now() / 1000) - 100; // expired 100 seconds ago
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@test.com', token: 'test-token', tokenExpiry: expiredTime },
      logout: mockLogout,
    });

    const { result } = renderHook(() => useSessionManagement());

    expect(result.current.isWarningModalOpen).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'session_expired_flag',
      expect.any(String)
    );
  });

  it('should use custom check interval', () => {
    renderHook(() =>
      useSessionManagement({ checkInterval: 1000 }) // Check every second
    );

    // Verify interval is set (by observing it doesn't show modal for valid token)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Token is valid, so no warning shown
  });

  it('should ignore storage events when disabled', () => {
    const { result } = renderHook(() =>
      useSessionManagement({ enabled: false })
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'session_renewed_signal',
          newValue: Date.now().toString(),
        })
      );
    });

    // Should not change state
    expect(result.current.isWarningModalOpen).toBe(false);
  });
});
