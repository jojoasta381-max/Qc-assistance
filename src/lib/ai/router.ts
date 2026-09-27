import {
  AIProvider,
  AIProviderType,
  AIVisionOptions,
  AIVisionResult,
  AICompletionOptions,
  AICompletionResult,
} from './types';
import { MockAIProvider } from './providers/mock-provider';
import { OllamaProvider } from './providers/ollama-provider';
import { prisma } from '@/lib/prisma';

export interface RouteInspectionOptions extends AIVisionOptions {
  tenantId?: string;
  documentVersionId?: string;
  preferredProvider?: AIProviderType;
  promptVersion?: string;
}

export class AIProviderRouter {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private mockProvider: MockAIProvider;

  constructor() {
    this.mockProvider = new MockAIProvider();
    this.providers.set('mock', this.mockProvider);
    this.providers.set('ollama', new OllamaProvider());
  }

  public getProvider(type: AIProviderType): AIProvider {
    return this.providers.get(type) || this.mockProvider;
  }

  /**
   * Routes vision inspection to primary provider with automatic resilient fallback
   */
  public async routeVisionInspection(
    prompt: string,
    imageBase64OrUrl: string,
    options?: RouteInspectionOptions
  ): Promise<AIVisionResult & { aiRunId?: string; fallbackUsed: boolean }> {
    const preferred = options?.preferredProvider || (process.env.DEFAULT_AI_PROVIDER as AIProviderType) || 'ollama';
    let activeProvider = this.providers.get(preferred) || this.mockProvider;
    let fallbackUsed = false;

    // Check availability of preferred provider
    const isPreferredAvailable = await activeProvider.isAvailable().catch(() => false);
    if (!isPreferredAvailable && preferred !== 'mock') {
      activeProvider = this.mockProvider;
      fallbackUsed = true;
    }

    let result: AIVisionResult;
    try {
      result = await activeProvider.analyzeVision(prompt, imageBase64OrUrl, options);
    } catch (err) {
      console.warn(`[AI Router] ${activeProvider.name} failed, activating fallback:`, err);
      activeProvider = this.mockProvider;
      fallbackUsed = true;
      result = await activeProvider.analyzeVision(prompt, imageBase64OrUrl, options);
    }

    // Persist AiRun record if tenantId and documentVersionId are provided
    let aiRunId: string | undefined;
    if (options?.tenantId && options?.documentVersionId) {
      try {
        const aiRun = await prisma.aiRun.create({
          data: {
            tenantId: options.tenantId,
            documentVersionId: options.documentVersionId,
            provider: result.provider,
            model: result.model,
            promptVersion: options.promptVersion || '1.3.0-multimodal',
            inputHash: `hash_${Date.now()}_${prompt.length}`,
            latencyMs: result.latencyMs,
            tokenUsage: JSON.stringify(result.usage),
            costMinorUnits: result.costPaise,
          },
        });
        aiRunId = aiRun.id;
      } catch (dbErr) {
        console.warn('[AI Router] Failed to persist AiRun audit telemetry:', dbErr);
      }
    }

    return {
      ...result,
      aiRunId,
      fallbackUsed,
    };
  }

  /**
   * Routes standard text/completion tasks
   */
  public async routeCompletion(
    prompt: string,
    options?: AICompletionOptions & { preferredProvider?: AIProviderType }
  ): Promise<AICompletionResult> {
    const preferred = options?.preferredProvider || 'ollama';
    const provider = this.providers.get(preferred) || this.mockProvider;

    try {
      if (await provider.isAvailable()) {
        return await provider.complete(prompt, options);
      }
    } catch {
      // Fallback
    }

    return await this.mockProvider.complete(prompt, options);
  }
}

export const aiRouter = new AIProviderRouter();
