import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from './SettingsPage';
import { DEFAULT_SETTINGS } from '../lib/settings';
import * as client from '../api/client';

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads models and updates settings', async () => {
    vi.spyOn(client, 'fetchModels').mockResolvedValue([{ id: 'glm-5.2' }, { id: 'other' }]);
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<SettingsPage settings={DEFAULT_SETTINGS} onChange={onChange} onReset={vi.fn()} />);

    expect(await screen.findByDisplayValue('glm-5.2')).toBeInTheDocument();

    await user.selectOptions(screen.getByDisplayValue('glm-5.2'), 'other');
    expect(onChange).toHaveBeenCalledWith({ model: 'other' });

    fireEvent.change(screen.getByPlaceholderText('(empty = use dev proxy)'), {
      target: { value: 'http://api' },
    });
    expect(onChange).toHaveBeenCalledWith({ apiBaseUrl: 'http://api' });
  });

  it('shows model load errors and updates generation settings', async () => {
    vi.spyOn(client, 'fetchModels').mockRejectedValue(new Error('down'));
    const onChange = vi.fn();
    const onReset = vi.fn();
    const user = userEvent.setup();

    render(<SettingsPage settings={DEFAULT_SETTINGS} onChange={onChange} onReset={onReset} />);

    expect(await screen.findByText('Could not load models from server')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Reset defaults' })[0]);
    expect(onReset).toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox', { name: 'Enable thinking mode' }));
    expect(onChange).toHaveBeenCalledWith({
      chatTemplateKwargs: {
        enable_thinking: false,
        reasoning_effort: 'max',
      },
    });
  });
});
