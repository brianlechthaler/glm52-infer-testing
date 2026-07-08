import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { DEFAULT_SETTINGS, mergeSettings } from '../lib/settings';
import * as client from '../api/client';

describe('SettingsPage seed input', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('sets seed from numeric input', () => {
    vi.spyOn(client, 'fetchModels').mockResolvedValue([{ id: 'glm-5.2' }]);
    const onChange = vi.fn();

    render(<SettingsPage settings={DEFAULT_SETTINGS} onChange={onChange} onReset={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Random'), { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith({ seed: 42 });
  });

  it('clears seed when input is emptied', () => {
    vi.spyOn(client, 'fetchModels').mockResolvedValue([{ id: 'glm-5.2' }]);
    const onChange = vi.fn();

    render(
      <SettingsPage
        settings={mergeSettings(DEFAULT_SETTINGS, { seed: 7 })}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('7'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ seed: null });
  });

  it('cleans up model fetch on unmount', () => {
    vi.spyOn(client, 'fetchModels').mockResolvedValue([{ id: 'glm-5.2' }]);

    const { unmount } = render(
      <SettingsPage settings={DEFAULT_SETTINGS} onChange={vi.fn()} onReset={vi.fn()} />,
    );

    unmount();
    expect(client.fetchModels).toHaveBeenCalled();
  });

  it('keeps custom model option when not returned by server', async () => {
    vi.spyOn(client, 'fetchModels').mockResolvedValue([{ id: 'glm-5.2' }]);

    render(
      <SettingsPage
        settings={mergeSettings(DEFAULT_SETTINGS, { model: 'custom-model' })}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(await screen.findByRole('option', { name: 'custom-model' })).toBeInTheDocument();
  });
});
