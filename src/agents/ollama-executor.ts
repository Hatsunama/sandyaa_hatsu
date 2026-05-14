import {
  OpenAICompatibleExecutor,
  OpenAICompatibleProviderProfile,
  OpenAICompatibleModel,
  AgentTask as CompatibleAgentTask,
  AgentResult as CompatibleAgentResult,
  resolveOpenAICompatibleModelId
} from './openai-compatible-executor.js';

export type OllamaModel = 'local' | 'mini' | 'standard' | 'codex';

export interface AgentTask extends Omit<CompatibleAgentTask, 'model'> {
  model?: OllamaModel;
}

export interface AgentResult extends CompatibleAgentResult {}

const OLLAMA_PROVIDER_PROFILE: OpenAICompatibleProviderProfile = {
  providerName: 'Ollama',
  apiKeyEnv: 'OLLAMA_API_KEY',
  baseUrlEnv: 'OLLAMA_BASE_URL',
  defaultBaseUrl: 'http://localhost:11434/v1',
  defaultApiKey: 'ollama',
  modelEnvPrefix: 'SANDYAA_OLLAMA',
  defaultModel: 'local',
  modelDefaults: {
    local: 'qwen3-coder:480b-cloud',
    mini: 'qwen3-coder:30b',
    standard: 'qwen3-coder:480b-cloud',
    codex: 'qwen3-coder:480b-cloud'
  },
  missingApiKeyMessage: 'OLLAMA_API_KEY is optional for Ollama; defaultApiKey should have been used'
};

export class OllamaExecutor {
  private delegate: OpenAICompatibleExecutor;

  constructor(apiKey?: string, model?: OllamaModel) {
    this.delegate = new OpenAICompatibleExecutor(OLLAMA_PROVIDER_PROFILE, apiKey, model);
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    return this.delegate.execute(task as CompatibleAgentTask);
  }
}

export function resolveOllamaModelId(model: OllamaModel): string {
  return resolveOpenAICompatibleModelId(model, OLLAMA_PROVIDER_PROFILE);
}
