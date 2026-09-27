export type AIProviderType = 'ollama' | 'anthropic' | 'openai' | 'gemini' | 'mock';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
}

export interface AICompletionResult {
  text: string;
  usage: TokenUsage;
  latencyMs: number;
  model: string;
  provider: AIProviderType;
  costPaise: number;
}

export interface AIStructuredResult<T> {
  data: T;
  rawText: string;
  usage: TokenUsage;
  latencyMs: number;
  model: string;
  provider: AIProviderType;
  costPaise: number;
}

export interface AIBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIEngineeringFinding {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  confidence: number; // 0 to 100
  standardRef: string;
  componentRef?: string;
  plainLanguageExplanation?: string;
  recommendation: string;
  bbox?: AIBoundingBox;
}

export interface AIVisionResult {
  overallResult: 'PASS' | 'FAIL';
  qualityScore: number;
  findings: AIEngineeringFinding[];
  summary: {
    executed: number;
    passed: number;
    failed: number;
    critical: number;
    major: number;
    minor: number;
  };
  usage: TokenUsage;
  latencyMs: number;
  model: string;
  provider: AIProviderType;
  costPaise: number;
}

export interface AIVisionOptions extends AICompletionOptions {
  standardName?: string;
  diagramCategory?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly providerType: AIProviderType;
  isAvailable(): Promise<boolean>;
  complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult>;
  completeStructured<T>(prompt: string, schema: any, options?: AICompletionOptions): Promise<AIStructuredResult<T>>;
  analyzeVision(prompt: string, imageBase64OrUrl: string, options?: AIVisionOptions): Promise<AIVisionResult>;
}
