import { renderHook, act } from '@testing-library/react';
import { useLocale } from './useLocale';

function mockLocationSearch(search: string): void {
  // jsdom's window.location is non-configurable, use history API to change URL
  window.history.replaceState({}, '', search || '/');
}

describe('useLocale', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocationSearch('');

    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      writable: true,
      configurable: true,
    });
  });

  it('should return en as the default locale', () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe('en');
  });

  it('should read locale from localStorage', () => {
    localStorage.setItem('locale', 'zh');

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe('zh');
  });

  it('should fall back to en for invalid localStorage value', () => {
    localStorage.setItem('locale', 'fr');

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe('en');
  });

  it('should update locale and write to localStorage when setLocale is called', () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe('en');

    act(() => {
      result.current.setLocale('zh');
    });

    expect(result.current.locale).toBe('zh');
    expect(localStorage.getItem('locale')).toBe('zh');
  });

  it('should return correct English translation via t()', () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current.t('common.appName')).toBe('CodePrism');
  });

  it('should return correct Chinese translation after locale switch', () => {
    localStorage.setItem('locale', 'zh');

    const { result } = renderHook(() => useLocale());

    const translated = result.current.t('common.appName');
    expect(translated).toBe('CodePrism');
    expect(typeof translated).toBe('string');
  });

  it('should return the key itself for missing translation keys', () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current.t('nonexistent.key.here')).toBe('nonexistent.key.here');
  });

  it('should update t() results when locale changes', () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current.t('common.loading')).toBe('Loading...');

    act(() => {
      result.current.setLocale('zh');
    });

    expect(result.current.t('common.loading')).not.toBe('Loading...');
  });

  it('should read locale from URL params on mount for backward compat', () => {
    mockLocationSearch('?lang=zh');

    renderHook(() => useLocale());

    expect(localStorage.getItem('locale')).toBe('zh');
  });

  it('should not overwrite localStorage from URL if they match', () => {
    localStorage.setItem('locale', 'zh');
    mockLocationSearch('?lang=zh');

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    renderHook(() => useLocale());

    const localeSetCalls = setItemSpy.mock.calls.filter(
      ([key]) => key === 'locale'
    );
    expect(localeSetCalls).toHaveLength(0);

    setItemSpy.mockRestore();
  });

  it('should ignore invalid URL lang param and fall back to browser detection', () => {
    mockLocationSearch('?lang=fr');

    renderHook(() => useLocale());

    // Browser detection kicks in for en-US
    expect(localStorage.getItem('locale')).toBe('en');
  });

  it('should detect Chinese browser language when no stored locale', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'zh-CN',
      writable: true,
      configurable: true,
    });

    renderHook(() => useLocale());

    expect(localStorage.getItem('locale')).toBe('zh');
  });

  it('should detect English browser language when no stored locale', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      writable: true,
      configurable: true,
    });

    renderHook(() => useLocale());

    expect(localStorage.getItem('locale')).toBe('en');
  });

  it('should not run browser detection if locale is already in localStorage', () => {
    localStorage.setItem('locale', 'en');
    Object.defineProperty(navigator, 'language', {
      value: 'zh-TW',
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useLocale());

    // Locale should remain 'en' despite Chinese browser language
    expect(result.current.locale).toBe('en');
  });

  it('should return a stable setLocale reference across renders', () => {
    const { result, rerender } = renderHook(() => useLocale());

    const firstSetLocale = result.current.setLocale;
    rerender();

    expect(result.current.setLocale).toBe(firstSetLocale);
  });

  it('should return a new t reference when locale changes', () => {
    const { result } = renderHook(() => useLocale());

    const firstT = result.current.t;

    act(() => {
      result.current.setLocale('zh');
    });

    const secondT = result.current.t;

    // t is memoized with locale as dependency, so it should change
    expect(firstT).not.toBe(secondT);
  });
});
