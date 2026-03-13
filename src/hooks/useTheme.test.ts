import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

function mockLocationSearch(search: string): void {
  // jsdom's window.location is non-configurable, use history API to change URL
  window.history.replaceState({}, '', search || '/');
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocationSearch('');
    // Reset the classList to a clean state
    document.documentElement.classList.remove('dark');
  });

  it('should return dark as the default theme', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('should read theme from localStorage', () => {
    localStorage.setItem('theme', 'light');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('should fall back to dark for invalid localStorage value', () => {
    localStorage.setItem('theme', 'blue');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('should update theme and write to localStorage when setTheme is called', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should add dark class to documentElement when theme is dark', () => {
    renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should remove dark class from documentElement when theme is light', () => {
    localStorage.setItem('theme', 'light');

    renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should toggle classList when theme changes from dark to light', () => {
    const { result } = renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.setTheme('light');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should toggle classList when theme changes from light to dark', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => {
      result.current.setTheme('dark');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should read theme from URL params on mount for backward compat', () => {
    mockLocationSearch('?theme=light');

    renderHook(() => useTheme());

    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should not overwrite localStorage from URL if they match', () => {
    localStorage.setItem('theme', 'light');
    mockLocationSearch('?theme=light');

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    renderHook(() => useTheme());

    const themeSetCalls = setItemSpy.mock.calls.filter(
      ([key]) => key === 'theme'
    );
    expect(themeSetCalls).toHaveLength(0);

    setItemSpy.mockRestore();
  });

  it('should ignore invalid URL theme param', () => {
    mockLocationSearch('?theme=blue');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('should return a stable setTheme reference across renders', () => {
    const { result, rerender } = renderHook(() => useTheme());

    const firstSetTheme = result.current.setTheme;
    rerender();

    expect(result.current.setTheme).toBe(firstSetTheme);
  });
});
