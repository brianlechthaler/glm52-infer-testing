import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from './SettingsPage';
import { DEFAULT_SETTINGS, mergeSettings } from '../lib/settings';
import * as client from '../api/client';

describe('SettingsPage controls', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('updates all tunable fields', async () => {
    vi.spyOn(client, 'fetchModels').mockResolvedValue([{ id: 'glm-5.2' }]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    const settings = mergeSettings(DEFAULT_SETTINGS, {
      chatTemplateKwargs: { enable_thinking: true, reasoning_effort: 'max' },
    });

    render(<SettingsPage settings={settings} onChange={onChange} onReset={vi.fn()} />);

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '0.5' } });
    fireEvent.change(screen.getByDisplayValue('4096'), { target: { value: '2048' } });
    fireEvent.change(sliders[1], { target: { value: '0.8' } });
    fireEvent.change(sliders[2], { target: { value: '0.2' } });
    fireEvent.change(sliders[3], { target: { value: '0.3' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Stop sequences/i }), {
      target: { value: 'END,STOP' },
    });
    await user.click(screen.getByRole('checkbox', { name: 'Stream responses' }));
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText('Tensor parallel size'), { target: { value: '4' } });
    fireEvent.change(sliders[4], { target: { value: '0.9' } });
    fireEvent.change(screen.getByLabelText('KV cache dtype'), { target: { value: 'auto' } });
    fireEvent.change(screen.getByLabelText('Max concurrent sequences'), {
      target: { value: '16' },
    });
    fireEvent.change(screen.getByLabelText('Max model length'), { target: { value: '131072' } });
    fireEvent.change(screen.getByLabelText('MTP speculative tokens'), { target: { value: '3' } });

    expect(onChange).toHaveBeenCalled();
  });
});
