export type ReasoningEffort = 'max' | 'high';

export interface ChatTemplateKwargs {
  enable_thinking: boolean;
  reasoning_effort: ReasoningEffort;
}

export interface ChatSettings {
  apiBaseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stop: string[];
  stream: boolean;
  seed: number | null;
  chatTemplateKwargs: ChatTemplateKwargs;
}

export interface ServerDeploymentInfo {
  tensorParallelSize: number;
  gpuMemoryUtilization: number;
  kvCacheDtype: string;
  maxNumSeqs: number;
  maxModelLen: number;
  mtpSpeculativeTokens: number;
}

export interface AppSettings extends ChatSettings {
  serverDeployment: ServerDeploymentInfo;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
}

export interface StreamDelta {
  content?: string;
  reasoning?: string;
  done: boolean;
  usage?: {
    completionTokens?: number;
    promptTokens?: number;
    totalTokens?: number;
  };
}

export interface TokenRateSnapshot {
  tokensPerSecond: number;
  totalTokens: number;
  elapsedSeconds: number;
}

export interface ModelsResponse {
  data: Array<{ id: string }>;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: MessageRole; content: string }>;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  stop?: string[];
  stream: boolean;
  seed?: number;
  chat_template_kwargs: ChatTemplateKwargs;
}
