import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockShowNotification = vi.fn();
vi.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

import { useAppVersionCheck } from './useAppVersionCheck';

const setMeta = (name: string, content: string) => {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const serverReturns = (body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => body } as Response);

const setVisibility = (state: 'visible' | 'hidden') =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });

const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

describe('useAppVersionCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    mockShowNotification.mockReset();
    setMeta('app-build-time', '1000');
    setMeta('app-deploy-id', '1000-abc');
    setVisibility('visible');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does nothing when the deployment is unchanged', async () => {
    serverReturns({ buildTime: '1000', deployId: '1000-abc' });
    const reload = vi.fn();
    renderHook(() => useAppVersionCheck({ reload, disabled: false }));
    await flush();
    expect(reload).not.toHaveBeenCalled();
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('notifies and reloads a visible tab after the delay', async () => {
    serverReturns({ buildTime: '2000', deployId: '2000-abc' });
    const reload = vi.fn();
    renderHook(() => useAppVersionCheck({ reload, disabled: false, reloadDelayMs: 5000 }));
    await flush();
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.stringContaining('new version'), 'info', 5000, expect.objectContaining({ label: 'Reload now' }),
    );
    expect(reload).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('"Reload now" reloads immediately', async () => {
    serverReturns({ buildTime: '2000', deployId: '2000-abc' });
    const reload = vi.fn();
    renderHook(() => useAppVersionCheck({ reload, disabled: false }));
    await flush();
    act(() => { mockShowNotification.mock.calls[0][3].onClick(); });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads a hidden tab right away', async () => {
    setVisibility('hidden');
    serverReturns({ buildTime: '1000', deployId: '1000-newenv' });
    const reload = vi.fn();
    renderHook(() => useAppVersionCheck({ reload, disabled: false }));
    await flush();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('checks again on the interval and when the tab becomes visible', async () => {
    const fetchSpy = serverReturns({ buildTime: '1000', deployId: '1000-abc' });
    renderHook(() => useAppVersionCheck({ reload: vi.fn(), disabled: false, intervalMs: 60_000 }));
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    vi.setSystemTime(Date.now() + 31_000); // past the event throttle
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('does not reload again for a deployment it just reloaded for (loop guard)', async () => {
    sessionStorage.setItem('app-version:last-reload', JSON.stringify({ deployId: '2000-abc', at: Date.now() }));
    serverReturns({ buildTime: '2000', deployId: '2000-abc' });
    const reload = vi.fn();
    renderHook(() => useAppVersionCheck({ reload, disabled: false }));
    await flush();
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores an older build served during a rollout', async () => {
    serverReturns({ buildTime: '500', deployId: '500-abc' });
    const reload = vi.fn();
    renderHook(() => useAppVersionCheck({ reload, disabled: false }));
    await flush();
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(reload).not.toHaveBeenCalled();
  });

  it('is inert for unstamped builds and when disabled', async () => {
    const fetchSpy = serverReturns({ buildTime: '2000', deployId: '2000-abc' });
    setMeta('app-build-time', '__APP_BUILD_TIME__');
    renderHook(() => useAppVersionCheck({ reload: vi.fn(), disabled: false }));
    setMeta('app-build-time', '1000');
    renderHook(() => useAppVersionCheck({ reload: vi.fn(), disabled: true }));
    await flush();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('checks immediately when an /assets script fails to load', async () => {
    const fetchSpy = serverReturns({ buildTime: '1000', deployId: '1000-abc' });
    renderHook(() => useAppVersionCheck({ reload: vi.fn(), disabled: false }));
    await flush();
    const script = document.createElement('script');
    script.src = '/assets/index-abcdefgh.js';
    document.body.appendChild(script);
    await act(async () => { script.dispatchEvent(new Event('error')); });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    script.remove();
  });
});
