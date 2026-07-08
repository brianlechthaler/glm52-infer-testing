import { useCallback, useState } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS, loadSettings, mergeSettings, saveSettings } from '../lib/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = mergeSettings(current, partial);
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings };
}
