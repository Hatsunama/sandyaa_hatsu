import {
  OpenAICompatibleExecutor,
  OpenAICompatibleProviderProfile,
  OpenAICompatibleModel,
  AgentTask as CompatibleAgentTask,
  AgentResult as CompatibleAgentResult,
  resolveOpenAICompatibleModelId
} from './openai-compatible-executor.js';

export type OpenAIModel = 'mini' | 'standard' | 'codex' | 'frontier';

export interface AgentTask extends Omit<CompatibleAgentTask, 'model'> {
  model?: OpenAIModel;
}

export interface AgentResult extends CompatibleAgentResult {}

const OPENAI_PROVIDER_PROFILE: OpenAICompatibleProviderProfile = {
  providerName: 'OpenAI',
  apiKeyEnv: 'OPENAI_API_KEY',
  baseUrlEnv: 'OPENAI_BASE_URL',
  modelEnvPrefix: 'SANDYAA_OPENAI',
  defaultModel: 'codex',
  modelDefaults: {
    mini: 'gpt-5.4-mini',
    standard: 'gpt-5.5',
    codex: 'gpt-5-codex',
    frontier: 'gpt-5.5'
  },
  missingApiKeyMessage: 'OPENAI_API_KEY environment variable is required for OpenAI provider'
};

export class OpenAIExecutor {
  private delegate: OpenAICompatibleExecutor;

  constructor(apiKey?: string, model?: OpenAIModel) {
    this.delegate = new OpenAICompatibleExecutor(OPENAI_PROVIDER_PROFILE, apiKey, model);
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    return this.delegate.execute(task as CompatibleAgentTask);
  }
}

export function resolveOpenAIModelId(model: OpenAIModel): string {
  return resolveOpenAICompatibleModelId(model, OPENAI_PROVIDER_PROFILE);
}
