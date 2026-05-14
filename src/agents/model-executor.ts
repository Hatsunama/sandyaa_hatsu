/**
 * Multi-Provider Model Executor
 *
 * Supports Claude, Gemini, and OpenAI/Codex:
 * - Primary provider: Claude, Gemini, OpenAI, or auto
 * - Automatic fallback on rate limits
 * - Model selection per provider
 * - Lazy provider initialization so selecting OpenAI does not require Claude Code
 */

import {
  ClaudeExecutor,
  AgentTask as ClaudeTask
} from './agent-executor.js';

import {
  GeminiExecutor,
  AgentTask as GeminiTask
} from './gemini-executor.js';

import {
  OpenAIExecutor,
  AgentTask as OpenAITask
} from './openai-executor.js';

import {
  GrokExecutor,
  AgentTask as GrokTask
} from './grok-executor.js';

import {
  OllamaExecutor,
  AgentTask as OllamaTask
} from './ollama-executor.js';

import {
  IntelligentProviderSelector,
  TaskCharacteristics
} from '../utils/intelligent-provider-selector.js';

import chalk from 'chalk';

export type Provider = 'claude' | 'gemini' | 'openai' | 'grok' | 'ollama';

export type ClaudeModel = 'haiku' | 'sonnet' | 'opus';
export type GeminiModel = 'flash' | 'pro' | 'ultra';
export type OpenAIModel = 'mini' | 'standard' | 'codex' | 'frontier';
export type GrokModel = 'mini' | 'standard' | 'grok' | 'frontier';
export type OllamaModel = 'local' | 'mini' | 'standard' | 'codex';

export interface ProviderConfig {
  primary: Provider | 'auto';
  fallback: Provider | 'none';
  autoSwitch: boolean;
  intelligentSelection?: boolean;
  models?: {
    claude?: ClaudeModel;
    gemini?: GeminiModel;
    openai?: OpenAIModel;
    grok?: GrokModel;
    ollama?: OllamaModel;
  };
}

export interface AgentTask {
  id?: string;
  type: string;
  input: any;
  maxTokens?: number;
  model?: string;
}

export interface AgentResult {
  success: boolean;
  output: any;
  error?: string;
  tokensUsed?: number;
  model?: string;
  provider?: Provider;
}

export class ModelExecutor {
  private claudeExecutor?: ClaudeExecutor;
  private geminiExecutor?: GeminiExecutor;
  private openaiExecutor?: OpenAIExecutor;
  private grokExecutor?: GrokExecutor;
  private ollamaExecutor?: OllamaExecutor;

  private config: ProviderConfig;
  private currentProvider: Provider;
  private rateLimitTracker: Map<Provider, number> = new Map();
  private intelligentSelector: IntelligentProviderSelector;
  private targetPath?: string;

  constructor(config?: ProviderConfig) {
    this.config = config || {
      primary: 'openai',
      fallback: 'gemini',
      autoSwitch: true,
      intelligentSelection: true,
      models: {
        openai: 'codex',
        claude: 'sonnet',
        gemini: 'pro'
      }
    };

    this.intelligentSelector = new IntelligentProviderSelector();

    if (this.config.primary === 'auto') {
      this.currentProvider = 'openai';
    } else {
      this.currentProvider = this.config.primary as Provider;
    }

    console.log(chalk.cyan('\n  [PROVIDER CONFIG]'));
    console.log(chalk.cyan('  Mode: ' + (this.config.intelligentSelection ? 'INTELLIGENT AUTO-SELECT' : 'STATIC')));
    console.log(chalk.cyan('  Primary: ' + this.config.primary.toUpperCase()));
    console.log(chalk.cyan('  Current: ' + this.currentProvider.toUpperCase()));
    console.log(chalk.cyan('  Fallback: ' + this.config.fallback.toUpperCase()));
    console.log(chalk.cyan('  Auto-Switch: ' + (this.config.autoSwitch ? 'ENABLED' : 'DISABLED')));

    if (this.config.models?.openai) {
      console.log(chalk.cyan('  OpenAI Model: ' + this.config.models.openai));
    }

    if (this.config.models?.claude) {
      console.log(chalk.cyan('  Claude Model: ' + this.config.models.claude));
    }

    if (this.config.models?.gemini) {
      console.log(chalk.cyan('  Gemini Model: ' + this.config.models.gemini));
    }

    console.log('');
  }

  setTargetPath(targetPath: string): void {
    this.targetPath = targetPath;

    if (this.claudeExecutor) {
      this.claudeExecutor.setTargetPath(targetPath);
    }
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    let selectedProvider = this.currentProvider;
    let selectedModel: string | undefined;
    let selectionReasoning = 'Using configured provider';

    if (this.config.intelligentSelection && this.config.primary === 'auto') {
      const characteristics: TaskCharacteristics = {
        type: task.type,
        complexity: this.estimateComplexity(task),
        requiresDeepReasoning: this.requiresDeepReasoning(task.type),
        requiresCodeGeneration: task.type.includes('poc') || task.type.includes('generation'),
        requiresLongContext: (task.input?.files?.length || 0) > 10,
        estimatedTokens: this.estimateTokens(task),
        isCostSensitive: false
      };

      const recommendation = this.intelligentSelector.selectProvider(characteristics);

      selectedProvider = recommendation.provider as Provider;
      selectedModel = recommendation.model;
      selectionReasoning = recommendation.reasoning;

      console.log(chalk.magenta('  [INTELLIGENT SELECT] ' + selectedProvider.toUpperCase() + ' (' + selectedModel + ')'));
      console.log(chalk.gray('  Reason: ' + selectionReasoning));
    }

    const modelName = selectedModel || this.getConfiguredModelName(selectedProvider);

    console.log(chalk.blue('  [EXECUTING] ' + selectedProvider.toUpperCase() + ' (' + modelName + ')...'));

    const result = await this.executeWithProvider(selectedProvider, task, selectedModel);

    if (!result.success && this.isRateLimitError(result.error) && this.config.autoSwitch) {
      console.log(chalk.yellow('  [RATE LIMIT] Switching to fallback provider...'));

      this.trackRateLimit(selectedProvider);

      if (this.config.fallback !== 'none') {
        const fallbackResult = await this.executeWithProvider(
          this.config.fallback as Provider,
          task,
          selectedModel
        );

        return {
          ...fallbackResult,
          provider: this.config.fallback as Provider
        };
      }
    }

    return {
      ...result,
      provider: selectedProvider
    };
  }

  private async executeWithProvider(
    provider: Provider,
    task: AgentTask,
    selectedModel?: string
  ): Promise<AgentResult> {
    switch (provider) {
      case 'claude':
        return this.executeWithClaude(task, selectedModel);
      case 'gemini':
        return this.executeWithGemini(task, selectedModel);
      case 'openai':
        return this.executeWithOpenAI(task, selectedModel);
      case 'grok':
        return this.executeWithGrok(task, selectedModel);
      case 'ollama':
        return this.executeWithOllama(task, selectedModel);
      default:
        return {
          success: false,
          output: null,
          error: 'Unsupported provider: ' + provider
        };
    }
  }

  private async executeWithClaude(
    task: AgentTask,
    selectedModel?: string
  ): Promise<AgentResult> {
    let model: ClaudeModel | undefined;

    if (selectedModel) {
      model = selectedModel as ClaudeModel;
    } else if (task.model) {
      model = task.model as ClaudeModel;
    } else if (this.config.models?.claude) {
      model = this.config.models.claude;
    }

    const claudeTask = {
      ...task,
      model: model as 'haiku' | 'sonnet' | 'opus'
    } as ClaudeTask;

    const result = await this.getClaudeExecutor().execute(claudeTask);

    return {
      ...result,
      provider: 'claude'
    };
  }

  private async executeWithGemini(
    task: AgentTask,
    selectedModel?: string
  ): Promise<AgentResult> {
    let model: GeminiModel | undefined;

    if (selectedModel) {
      model = selectedModel as GeminiModel;
    } else if (task.model) {
      model = task.model as GeminiModel;
    } else if (this.config.models?.gemini) {
      model = this.config.models.gemini;
    }

    const geminiTask = {
      ...task,
      model: model as 'flash' | 'pro' | 'ultra'
    } as GeminiTask;

    const result = await this.getGeminiExecutor().execute(geminiTask);

    return {
      ...result,
      provider: 'gemini'
    };
  }

  private async executeWithOpenAI(
    task: AgentTask,
    selectedModel?: string
  ): Promise<AgentResult> {
    let model: OpenAIModel | undefined;

    if (selectedModel) {
      model = selectedModel as OpenAIModel;
    } else if (task.model) {
      model = task.model as OpenAIModel;
    } else if (this.config.models?.openai) {
      model = this.config.models.openai;
    }

    const openaiTask = {
      ...task,
      model: model as 'mini' | 'standard' | 'codex' | 'frontier'
    } as OpenAITask;

    const result = await this.getOpenAIExecutor().execute(openaiTask);

    return {
      ...result,
      provider: 'openai'
    };
  }

  private async executeWithGrok(
    task: AgentTask,
    selectedModel?: string
  ): Promise<AgentResult> {
    let model: GrokModel | undefined;

    if (selectedModel) {
      model = selectedModel as GrokModel;
    } else if (task.model) {
      model = task.model as GrokModel;
    } else if (this.config.models?.grok) {
      model = this.config.models.grok;
    }

    const grokTask = {
      ...task,
      model: model as 'mini' | 'standard' | 'grok' | 'frontier'
    } as GrokTask;

    const result = await this.getGrokExecutor().execute(grokTask);

    return {
      ...result,
      provider: 'grok'
    };
  }

  private async executeWithOllama(
    task: AgentTask,
    selectedModel?: string
  ): Promise<AgentResult> {
    let model: OllamaModel | undefined;

    if (selectedModel) {
      model = selectedModel as OllamaModel;
    } else if (task.model) {
      model = task.model as OllamaModel;
    } else if (this.config.models?.ollama) {
      model = this.config.models.ollama;
    }

    const ollamaTask = {
      ...task,
      model: model as 'local' | 'mini' | 'standard' | 'codex'
    } as OllamaTask;

    const result = await this.getOllamaExecutor().execute(ollamaTask);

    return {
      ...result,
      provider: 'ollama'
    };
  }

  private getClaudeExecutor(): ClaudeExecutor {
    if (!this.claudeExecutor) {
      this.claudeExecutor = new ClaudeExecutor();

      if (this.targetPath) {
        this.claudeExecutor.setTargetPath(this.targetPath);
      }
    }

    return this.claudeExecutor;
  }

  private getGeminiExecutor(): GeminiExecutor {
    if (!this.geminiExecutor) {
      this.geminiExecutor = new GeminiExecutor();
    }

    return this.geminiExecutor;
  }

  private getOpenAIExecutor(): OpenAIExecutor {
    if (!this.openaiExecutor) {
      this.openaiExecutor = new OpenAIExecutor();
    }

    return this.openaiExecutor;
  }

  private getGrokExecutor(): GrokExecutor {
    if (!this.grokExecutor) {
      this.grokExecutor = new GrokExecutor();
    }

    return this.grokExecutor;
  }

  private getOllamaExecutor(): OllamaExecutor {
    if (!this.ollamaExecutor) {
      this.ollamaExecutor = new OllamaExecutor();
    }

    return this.ollamaExecutor;
  }

  private isRateLimitError(error?: string): boolean {
    if (!error) {
      return false;
    }

    const rateLimitKeywords = [
      'rate limit',
      'too many requests',
      '429',
      'quota exceeded',
      'rate_limit_error',
      'overloaded',
      'temporarily unavailable',
      'service unavailable'
    ];

    return rateLimitKeywords.some(keyword =>
      error.toLowerCase().includes(keyword)
    );
  }

  private trackRateLimit(provider: Provider): void {
    const current = this.rateLimitTracker.get(provider) || 0;
    this.rateLimitTracker.set(provider, current + 1);
  }

  switchProvider(provider: Provider): void {
    this.currentProvider = provider;
    console.log('[PROVIDER] Manually switched to ' + provider);
  }

  getCurrentProvider(): Provider {
    return this.currentProvider;
  }

  getRateLimitCount(provider: Provider): number {
    return this.rateLimitTracker.get(provider) || 0;
  }

  private estimateComplexity(task: AgentTask): 'low' | 'medium' | 'high' {
    const highComplexityTasks = [
      'vulnerability-detection',
      'memory-safety-analysis',
      'concurrency-analysis',
      'semantic-analysis',
      'custom-security-analysis'
    ];

    const lowComplexityTasks = [
      'file-prioritization',
      'regression-detection'
    ];

    if (highComplexityTasks.includes(task.type)) {
      return 'high';
    }

    if (lowComplexityTasks.includes(task.type)) {
      return 'low';
    }

    return 'medium';
  }

  private requiresDeepReasoning(taskType: string): boolean {
    const deepReasoningTasks = [
      'vulnerability-detection',
      'memory-safety-analysis',
      'concurrency-analysis',
      'semantic-analysis',
      'poc-generation',
      'custom-security-analysis',
      'blast-radius-analysis'
    ];

    return deepReasoningTasks.includes(taskType);
  }

  private estimateTokens(task: AgentTask): number {
    let estimate = 1000;

    if (task.input?.files) {
      estimate += task.input.files.length * 500;
    }

    if (task.input?.fileContents) {
      const contentLength = JSON.stringify(task.input.fileContents).length;
      estimate += Math.floor(contentLength / 4);
    }

    if (task.maxTokens) {
      estimate += task.maxTokens;
    }

    return estimate;
  }

  private getConfiguredModelName(provider: Provider): string {
    if (provider === 'claude') {
      return this.config.models?.claude || 'default';
    }

    if (provider === 'gemini') {
      return this.config.models?.gemini || 'default';
    }

    if (provider === 'grok') {
      return this.config.models?.grok || 'default';
    }

    if (provider === 'ollama') {
      return this.config.models?.ollama || 'default';
    }

    return this.config.models?.openai || 'default';
  }
}
