import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  settingsToRequest,
  mergeSettings,
  STORAGE_KEY,
} from './settings';

describe('settings', () => {
  it('provides sensible defaults', () => {
    expect(DEFAULT_SETTINGS.model).toBe('glm-5.2');
    expect(DEFAULT_SETTINGS.stream).toBe(true);
    expect(DEFAULT_SETTINGS.chatTemplateKwargs.enable_thinking).toBe(true);
  });

  it('persists settings to localStorage', () => {
    const custom = mergeSettings(DEFAULT_SETTINGS, { temperature: 0.2 });
    saveSettings(custom);
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(loadSettings().temperature).toBe(0.2);
  });

  it('returns defaults when storage is empty', () => {
    localStorage.clear();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults when storage is invalid json', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges partial updates', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      maxTokens: 1024,
      chatTemplateKwargs: { enable_thinking: false, reasoning_effort: 'high' },
    });
    expect(merged.maxTokens).toBe(1024);
    expect(merged.chatTemplateKwargs.enable_thinking).toBe(false);
    expect(merged.temperature).toBe(DEFAULT_SETTINGS.temperature);
  });

  it('maps settings to API request body', () => {
    const request = settingsToRequest(DEFAULT_SETTINGS, [{ role: 'user', content: 'hello' }]);
    expect(request.model).toBe('glm-5.2');
    expect(request.stream).toBe(true);
    expect(request.messages).toEqual([{ role: 'user', content: 'hello' }]);
    expect(request.chat_template_kwargs.enable_thinking).toBe(true);
  });

  it('omits stop when empty and seed when null', () => {
    const request = settingsToRequest(mergeSettings(DEFAULT_SETTINGS, { stop: [], seed: null }), [
      { role: 'user', content: 'hi' },
    ]);
    expect(request.stop).toBeUndefined();
    expect(request.seed).toBeUndefined();
  });

  it('includes stop and seed when set', () => {
    const request = settingsToRequest(
      mergeSettings(DEFAULT_SETTINGS, { stop: ['END'], seed: 42 }),
      [{ role: 'user', content: 'hi' }],
    );
    expect(request.stop).toEqual(['END']);
    expect(request.seed).toBe(42);
  });
});
