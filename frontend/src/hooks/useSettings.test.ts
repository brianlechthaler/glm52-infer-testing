import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { DEFAULT_SETTINGS } from '../lib/settings';

describe('useSettings', () => {
  it('loads defaults and updates settings', () => {
    localStorage.clear();
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);

    act(() => {
      result.current.updateSettings({ temperature: 0.1 });
    });

    expect(result.current.settings.temperature).toBe(0.1);
    expect(
      JSON.parse(localStorage.getItem('glm52-infer-testing-settings') ?? '{}').temperature,
    ).toBe(0.1);
  });

  it('resets settings to defaults', () => {
    localStorage.clear();
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({ temperature: 0.1 });
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });
});
