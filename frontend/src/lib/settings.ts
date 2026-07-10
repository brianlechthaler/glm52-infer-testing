import type { AppSettings, ChatCompletionRequest, MessageRole } from '../types';

export const STORAGE_KEY = 'glm52-infer-testing-settings';

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: '',
  model: 'glm-5.2',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stop: [],
  stream: true,
  seed: null,
  chatTemplateKwargs: {
    enable_thinking: true,
    reasoning_effort: 'max',
  },
  serverDeployment: {
    tensorParallelSize: 8,
    gpuMemoryUtilization: 0.95,
    kvCacheDtype: 'fp8_e4m3',
    maxNumSeqs: 32,
    maxModelLen: 655360,
    mtpSpeculativeTokens: 0,
  },
};

export function mergeSettings(current: AppSettings, partial: Partial<AppSettings>): AppSettings {
  return {
    ...current,
    ...partial,
    chatTemplateKwargs: {
      ...current.chatTemplateKwargs,
      ...partial.chatTemplateKwargs,
    },
    serverDeployment: {
      ...current.serverDeployment,
      ...partial.serverDeployment,
    },
  };
}

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return mergeSettings(DEFAULT_SETTINGS, parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function settingsToRequest(
  settings: AppSettings,
  messages: Array<{ role: MessageRole; content: string }>,
): ChatCompletionRequest {
  const request: ChatCompletionRequest = {
    model: settings.model,
    messages,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    top_p: settings.topP,
    frequency_penalty: settings.frequencyPenalty,
    presence_penalty: settings.presencePenalty,
    stream: settings.stream,
    chat_template_kwargs: settings.chatTemplateKwargs,
  };

  if (settings.stop.length > 0) {
    request.stop = settings.stop;
  }

  if (settings.seed !== null) {
    request.seed = settings.seed;
  }

  return request;
}

export function parseStopInput(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatStopInput(stop: string[]): string {
  return stop.join(', ');
}
