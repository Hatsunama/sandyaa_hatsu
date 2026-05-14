import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

export type OpenAIModel = 'mini' | 'standard' | 'codex' | 'frontier';

export interface AgentTask {
  id?: string;
  type:
    | 'context-building'
    | 'vulnerability-detection'
    | 'poc-generation'
    | 'vulnerability-pattern-extraction'
    | 'regression-detection'
    | 'memory-safety-analysis'
    | 'concurrency-analysis'
    | 'semantic-analysis'
    | 'blast-radius-analysis'
    | 'file-prioritization'
    | 'analysis-planning'
    | 'custom-security-analysis';
  input: any;
  maxTokens?: number;
  model?: OpenAIModel;
}

export interface AgentResult {
  success: boolean;
  output: any;
  error?: string;
  tokensUsed?: number;
  model?: string;
}

export class OpenAIExecutor {
  private client: OpenAI;
  private defaultModel: OpenAIModel;

  constructor(apiKey?: string, model?: OpenAIModel) {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error('OPENAI_API_KEY environment variable is required for OpenAI provider');
    }

    this.client = new OpenAI({
      apiKey: key,
      baseURL: process.env.OPENAI_BASE_URL
    });

    this.defaultModel = model || parseOpenAIModel(process.env.SANDYAA_OPENAI_MODEL) || 'codex';
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const taskId = task.id || uuidv4();
    const tier = task.model || this.defaultModel;
    const model = resolveOpenAIModelId(tier);
    const prompt = this.buildPrompt(task);

    try {
      const response = await this.client.responses.create({
        model,
        input: [
          {
            role: 'system',
            content: this.buildSystemPrompt(task.type)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_output_tokens: task.maxTokens
      } as any);

      const outputText = extractOutputText(response);
      const output = parseJSONResponse(outputText);

      return {
        success: true,
        output,
        tokensUsed: getTokenUsage(response),
        model
      };
    } catch (error: any) {
      return {
        success: false,
        output: null,
        error: sanitizeErrorMessage(
          `OpenAI execution error for task ${taskId}: ${error?.message || String(error)}`
        ),
        model
      };
    }
  }

  private buildSystemPrompt(taskType: string): string {
    return [
      'You are Sandyaa, an autonomous security code-audit agent.',
      'Analyze only the target code and facts provided in the user prompt.',
      'Do not invent files, functions, routes, exploitability, or line numbers.',
      'Prefer uncertainty over hallucination.',
      'Return only valid JSON. No markdown. No prose outside JSON.',
      `Current task type: ${taskType}`
    ].join('\n');
  }

  private buildPrompt(task: AgentTask): string {
    switch (task.type) {
      case 'context-building':
        return this.buildContextPrompt(task.input);
      case 'vulnerability-detection':
        return this.buildDetectionPrompt(task.input);
      case 'poc-generation':
        return this.buildPOCPrompt(task.input);
      case 'vulnerability-pattern-extraction':
        return this.buildPatternExtractionPrompt(task.input);
      case 'regression-detection':
        return this.buildRegressionPrompt(task.input);
      case 'memory-safety-analysis':
        return this.buildMemorySafetyPrompt(task.input);
      case 'concurrency-analysis':
        return this.buildConcurrencyPrompt(task.input);
      case 'semantic-analysis':
        return this.buildSemanticPrompt(task.input);
      case 'blast-radius-analysis':
        return this.buildBlastRadiusPrompt(task.input);
      case 'file-prioritization':
        return this.buildFilePrioritizationPrompt(task.input);
      case 'analysis-planning':
        return this.buildAnalysisPlanningPrompt(task.input);
      case 'custom-security-analysis':
        return this.buildCustomSecurityPrompt(task.input);
      default:
        return JSON.stringify(task.input, null, 2);
    }
  }

  private buildContextPrompt(input: any): string {
    return `
Build security-analysis context for the supplied files.

Input:
${JSON.stringify(input, null, 2)}

Return JSON exactly shaped as:
{
  "files": [
    {
      "path": "string",
      "purpose": "string",
      "securityRelevant": true,
      "analysisStrategy": "string",
      "entryPoints": ["string"],
      "trustBoundaries": ["string"],
      "sensitiveOperations": ["string"]
    }
  ],
  "entryPoints": ["string"],
  "trustBoundaries": ["string"],
  "summary": "string"
}
`.trim();
  }

  private buildDetectionPrompt(input: any): string {
    return `
Detect real, exploitable security vulnerabilities from the supplied context.

Input:
${JSON.stringify(input, null, 2)}

Return JSON:
{
  "vulnerabilities": [
    {
      "id": "string",
      "type": "string",
      "severity": "critical|high|medium|low",
      "confidence": 0.0,
      "location": { "file": "string", "line": 0, "function": "string" },
      "description": "string",
      "evidence": ["string"],
      "exploitability": { "score": 0.0, "reasoning": "string" },
      "fix": "string",
      "needsManualReview": false
    }
  ]
}
`.trim();
  }

  private buildPOCPrompt(input: any): string {
    return `
Generate a safe defensive proof-of-concept explanation for the supplied vulnerability.

Input:
${JSON.stringify(input, null, 2)}

Return JSON:
{
  "poc": {
    "title": "string",
    "summary": "string",
    "preconditions": ["string"],
    "steps": ["string"],
    "expectedImpact": "string",
    "safetyNotes": ["string"],
    "validationCommand": "string",
    "validated": false
  }
}

Safety rules:
- Do not include destructive payloads.
- Do not include credential theft, persistence, evasion, or real-world targeting.
- Prefer local reproduction steps and defensive validation.
`.trim();
  }

  private buildPatternExtractionPrompt(input: any): string {
    return `
Extract reusable vulnerability patterns from these findings/context.

Input:
${JSON.stringify(input, null, 2)}

Return JSON:
{
  "patterns": [
    {
      "name": "string",
      "description": "string",
      "signals": ["string"],
      "antiSignals": ["string"],
      "exampleFiles": ["string"],
      "recommendedChecks": ["string"]
    }
  ]
}
`.trim();
  }

  private buildRegressionPrompt(input: any): string {
    return `
Analyze whether the supplied vulnerability appears to be a regression.

Input:
${JSON.stringify(input, null, 2)}

Return JSON:
{
  "regressions": [
    {
      "vulnerabilityId": "string",
      "isRegression": true,
      "similarity": 0.0,
      "originalFix": { "commit": "string", "summary": "string" },
      "reasoning": "string"
    }
  ]
}
`.trim();
  }

  private buildMemorySafetyPrompt(input: any): string {
    return this.buildFindingsPrompt('Analyze memory safety risks in the supplied code/context.', input);
  }

  private buildConcurrencyPrompt(input: any): string {
    return this.buildFindingsPrompt('Analyze concurrency, race-condition, async-ordering, and shared-state risks.', input);
  }

  private buildSemanticPrompt(input: any): string {
    return this.buildFindingsPrompt('Analyze semantic security issues, authorization bypasses, trust-boundary mistakes, validation gaps, and unsafe assumptions.', input);
  }

  private buildCustomSecurityPrompt(input: any): string {
    return this.buildFindingsPrompt('Perform the requested custom security analysis.', input);
  }

  private buildFindingsPrompt(instruction: string, input: any): string {
    return `
${instruction}

Input:
${JSON.stringify(input, null, 2)}

Return JSON:
{
  "findings": [
    {
      "type": "string",
      "severity": "critical|high|medium|low",
      "location": { "file": "string", "line": 0 },
      "description": "string",
      "evidence": ["string"],
      "fix": "string"
    }
  ],
  "summary": "string"
}
`.trim();
  }

  private buildBlastRadiusPrompt(input: any): string {
    const { vulnerability, context, callSites } = input || {};

    return `
Map blast radius for this vulnerability.

Vulnerability:
${JSON.stringify(vulnerability, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Known call sites:
${JSON.stringify(callSites || [], null, 2)}

Return JSON:
{
  "affectedFiles": ["string"],
  "callSites": [
    {
      "file": "string",
      "line": 0,
      "function": "string",
      "reason": "string"
    }
  ],
  "entryPoints": ["string"],
  "impactSummary": "string",
  "callSiteCount": 0
}
`.trim();
  }

  private buildFilePrioritizationPrompt(input: any): string {
    return `
Prioritize files for security review.

Input:
${JSON.stringify(input, null, 2)}

Return JSON:
{
  "files": [
    {
      "path": "string",
      "priority": 0,
      "reason": "string",
      "riskSignals": ["string"]
    }
  ]
}
`.trim();
  }

  private buildAnalysisPlanningPrompt(input: any): string {
    return `
Create a compact security analysis plan for the supplied target files.

Input:
${JSON.stringify(input, null, 2)}

Return JSON exactly shaped as:
{
  "analyses": [
    {
      "name": "descriptive-unique-strategy-name",
      "description": "exactly what to analyze and what to look for",
      "justification": "why this target code needs this analysis",
      "targetFiles": ["optional-relative-file-path"]
    }
  ],
  "reasoning": "overall strategy rationale based only on the supplied target files",
  "focusAreas": ["specific high-priority files, components, APIs, or patterns"]
}

Rules:
- Return only valid JSON.
- Do not return markdown.
- Do not use plan/rationale keys.
- The top-level analyses field is required and must be an array.
- Keep the response compact.
- Use only files and facts from the input.
`.trim();
  }
}

export function resolveOpenAIModelId(model: OpenAIModel): string {
  switch (model) {
    case 'mini':
      return process.env.SANDYAA_OPENAI_MINI_MODEL || 'gpt-5.4-mini';
    case 'standard':
      return process.env.SANDYAA_OPENAI_STANDARD_MODEL || 'gpt-5.5';
    case 'codex':
      return process.env.SANDYAA_OPENAI_CODEX_MODEL || 'gpt-5-codex';
    case 'frontier':
      return process.env.SANDYAA_OPENAI_FRONTIER_MODEL || 'gpt-5.5';
    default:
      return process.env.SANDYAA_OPENAI_CODEX_MODEL || 'gpt-5-codex';
  }
}

function extractOutputText(response: any): string {
  if (typeof response?.output_text === 'string') {
    return response.output_text;
  }

  const chunks: string[] = [];

  if (Array.isArray(response?.output)) {
    for (const item of response.output) {
      if (Array.isArray(item?.content)) {
        for (const content of item.content) {
          if (typeof content?.text === 'string') {
            chunks.push(content.text);
          }
        }
      }
    }
  }

  if (chunks.length > 0) {
    return chunks.join('\n');
  }

  return JSON.stringify(response);
}

function parseJSONResponse(text: string): any {
  const cleaned = stripMarkdownFences(text.trim());

  try {
    return JSON.parse(cleaned);
  } catch {
    const extracted = extractFirstBalancedJSON(cleaned);

    if (!extracted) {
      throw new Error(`OpenAI response did not contain parseable JSON: ${cleaned.slice(0, 500)}`);
    }

    return JSON.parse(extracted);
  }
}

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : text;
}

function extractFirstBalancedJSON(text: string): string | null {
  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');

  let start = -1;
  let open = '';
  let close = '';

  if (objectStart === -1 && arrayStart === -1) {
    return null;
  }

  if (objectStart !== -1 && (arrayStart === -1 || objectStart < arrayStart)) {
    start = objectStart;
    open = '{';
    close = '}';
  } else {
    start = arrayStart;
    open = '[';
    close = ']';
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function getTokenUsage(response: any): number | undefined {
  const usage = response?.usage;

  if (!usage) {
    return undefined;
  }

  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const total = usage.total_tokens || input + output;

  return typeof total === 'number' ? total : undefined;
}

function parseOpenAIModel(value?: string): OpenAIModel | undefined {
  if (
    value === 'mini' ||
    value === 'standard' ||
    value === 'codex' ||
    value === 'frontier'
  ) {
    return value;
  }

  return undefined;
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_\-]{10,}/g, 'sk-REDACTED')
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer REDACTED')
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"',\s]+/gi, 'api_key=REDACTED')
    .slice(0, 1000);
}
