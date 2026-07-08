import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { DEFAULT_SETTINGS } from '../lib/settings';
import * as client from '../api/client';

describe('SettingsPage fetch lifecycle', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('ignores model fetch results after unmount', async () => {
    let resolveModels: (value: Array<{ id: string }>) => void = () => undefined;
    vi.spyOn(client, 'fetchModels').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveModels = resolve;
        }),
    );

    const { unmount } = render(
      <SettingsPage settings={DEFAULT_SETTINGS} onChange={vi.fn()} onReset={vi.fn()} />,
    );

    unmount();
    resolveModels([{ id: 'late-model' }]);
    expect(client.fetchModels).toHaveBeenCalled();
  });
});
