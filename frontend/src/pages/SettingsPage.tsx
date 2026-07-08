import { useEffect, useState } from 'react';
import { fetchModels } from '../api/client';
import { formatStopInput, parseStopInput, type AppSettings } from '../lib/settings';
import type { ReasoningEffort } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  onChange: (partial: Partial<AppSettings>) => void;
  onReset: () => void;
}

export function SettingsPage({ settings, onChange, onReset }: SettingsPageProps) {
  const [models, setModels] = useState<string[]>([]);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadModels = async () => {
      try {
        const response = await fetchModels(settings.apiBaseUrl);
        if (active) {
          setModels(response.map((model) => model.id));
          setModelError(null);
        }
      } catch {
        if (active) {
          setModelError('Could not load models from server');
        }
      }
    };

    void loadModels();

    return () => {
      active = false;
    };
  }, [settings.apiBaseUrl]);

  return (
    <section className="settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <button type="button" onClick={onReset}>
          Reset defaults
        </button>
      </header>

      <div className="settings-grid">
        <fieldset>
          <legend>Connection</legend>
          <label>
            API base URL
            <input
              type="text"
              value={settings.apiBaseUrl}
              placeholder="(empty = use dev proxy)"
              onChange={(event) => onChange({ apiBaseUrl: event.target.value })}
            />
          </label>
          <label>
            Model
            <select
              value={settings.model}
              onChange={(event) => onChange({ model: event.target.value })}
            >
              {!models.includes(settings.model) ? (
                <option value={settings.model}>{settings.model}</option>
              ) : null}
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
          {modelError ? <p className="field-hint field-hint--error">{modelError}</p> : null}
        </fieldset>

        <fieldset>
          <legend>Generation</legend>
          <label>
            Temperature
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={settings.temperature}
              onChange={(event) => onChange({ temperature: Number(event.target.value) })}
            />
            <span>{settings.temperature.toFixed(1)}</span>
          </label>
          <label>
            Max output tokens
            <input
              type="number"
              min={1}
              max={settings.serverDeployment.maxModelLen}
              value={settings.maxTokens}
              onChange={(event) => onChange({ maxTokens: Number(event.target.value) })}
            />
          </label>
          <label>
            Top P
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.topP}
              onChange={(event) => onChange({ topP: Number(event.target.value) })}
            />
            <span>{settings.topP.toFixed(2)}</span>
          </label>
          <label>
            Frequency penalty
            <input
              type="range"
              min={-2}
              max={2}
              step={0.1}
              value={settings.frequencyPenalty}
              onChange={(event) => onChange({ frequencyPenalty: Number(event.target.value) })}
            />
            <span>{settings.frequencyPenalty.toFixed(1)}</span>
          </label>
          <label>
            Presence penalty
            <input
              type="range"
              min={-2}
              max={2}
              step={0.1}
              value={settings.presencePenalty}
              onChange={(event) => onChange({ presencePenalty: Number(event.target.value) })}
            />
            <span>{settings.presencePenalty.toFixed(1)}</span>
          </label>
          <label>
            Stop sequences (comma-separated)
            <input
              type="text"
              value={formatStopInput(settings.stop)}
              onChange={(event) => onChange({ stop: parseStopInput(event.target.value) })}
            />
          </label>
          <label>
            Seed (optional)
            <input
              type="number"
              value={settings.seed ?? ''}
              placeholder="Random"
              onChange={(event) =>
                onChange({
                  seed: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.stream}
              onChange={(event) => onChange({ stream: event.target.checked })}
            />
            Stream responses
          </label>
        </fieldset>

        <fieldset>
          <legend>GLM 5.2 reasoning</legend>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.chatTemplateKwargs.enable_thinking}
              onChange={(event) =>
                onChange({
                  chatTemplateKwargs: {
                    ...settings.chatTemplateKwargs,
                    enable_thinking: event.target.checked,
                  },
                })
              }
            />
            Enable thinking mode
          </label>
          <label>
            Reasoning effort
            <select
              value={settings.chatTemplateKwargs.reasoning_effort}
              disabled={!settings.chatTemplateKwargs.enable_thinking}
              onChange={(event) =>
                onChange({
                  chatTemplateKwargs: {
                    ...settings.chatTemplateKwargs,
                    reasoning_effort: event.target.value as ReasoningEffort,
                  },
                })
              }
            >
              <option value="max">max</option>
              <option value="high">high</option>
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>Server deployment (requires container restart)</legend>
          <p className="field-hint">
            These mirror your <code>.env</code> values. Update <code>.env</code> and restart vLLM to
            apply.
          </p>
          <label>
            Tensor parallel size
            <input
              type="number"
              min={1}
              value={settings.serverDeployment.tensorParallelSize}
              onChange={(event) =>
                onChange({
                  serverDeployment: {
                    ...settings.serverDeployment,
                    tensorParallelSize: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label>
            GPU memory utilization
            <input
              type="range"
              min={0.5}
              max={0.99}
              step={0.01}
              value={settings.serverDeployment.gpuMemoryUtilization}
              onChange={(event) =>
                onChange({
                  serverDeployment: {
                    ...settings.serverDeployment,
                    gpuMemoryUtilization: Number(event.target.value),
                  },
                })
              }
            />
            <span>{settings.serverDeployment.gpuMemoryUtilization.toFixed(2)}</span>
          </label>
          <label>
            KV cache dtype
            <input
              type="text"
              value={settings.serverDeployment.kvCacheDtype}
              onChange={(event) =>
                onChange({
                  serverDeployment: {
                    ...settings.serverDeployment,
                    kvCacheDtype: event.target.value,
                  },
                })
              }
            />
          </label>
          <label>
            Max concurrent sequences
            <input
              type="number"
              min={1}
              value={settings.serverDeployment.maxNumSeqs}
              onChange={(event) =>
                onChange({
                  serverDeployment: {
                    ...settings.serverDeployment,
                    maxNumSeqs: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label>
            Max model length
            <input
              type="number"
              min={1024}
              value={settings.serverDeployment.maxModelLen}
              onChange={(event) =>
                onChange({
                  serverDeployment: {
                    ...settings.serverDeployment,
                    maxModelLen: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label>
            MTP speculative tokens
            <input
              type="number"
              min={0}
              value={settings.serverDeployment.mtpSpeculativeTokens}
              onChange={(event) =>
                onChange({
                  serverDeployment: {
                    ...settings.serverDeployment,
                    mtpSpeculativeTokens: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        </fieldset>
      </div>
    </section>
  );
}
