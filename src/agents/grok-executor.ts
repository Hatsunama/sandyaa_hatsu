import {
  OpenAICompatibleExecutor,
  OpenAICompatibleProviderProfile,
  OpenAICompatibleModel,
  AgentTask as CompatibleAgentTask,
  AgentResult as CompatibleAgentResult,
  resolveOpenAICompatibleModelId
} from './openai-compatible-executor.js';

export type GrokModel = 'mini' | 'standard' | 'grok' | 'frontier';

export interface AgentTask extends Omit<CompatibleAgentTask, 'model'> {
  model?: GrokModel;
}

export interface AgentResult extends CompatibleAgentResult {}

const GROK_PROVIDER_PROFILE: OpenAICompatibleProviderProfile = {
  providerName: 'Grok',
  apiKeyEnv: 'XAI_API_KEY',
  baseUrlEnv: 'XAI_BASE_URL',
  defaultBaseUrl: 'https://api.x.ai/v1',
  modelEnvPrefix: 'SANDYAA_GROK',
  defaultModel: 'grok',
  modelDefaults: {
    mini: 'grok-3-mini',
    standard: 'grok-3',
    grok: 'grok-4',
    frontier: 'grok-4'
  },
  missingApiKeyMessage: 'XAI_API_KEY environment variable is required for Grok provider'
};

export class GrokExecutor {
  private delegate: OpenAICompatibleExecutor;

  constructor(apiKey?: string, model?: GrokModel) {
    this.delegate = new OpenAICompatibleExecutor(GROK_PROVIDER_PROFILE, apiKey, model);
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    return this.delegate.execute(task as CompatibleAgentTask);
  }
}

export function resolveGrokModelId(model: GrokModel): string {
  return resolveOpenAICompatibleModelId(model, GROK_PROVIDER_PROFILE);
}
