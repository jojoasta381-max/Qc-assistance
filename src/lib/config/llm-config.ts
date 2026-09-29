import { LLMConfig } from '@/types/qc';
import { DEFAULT_VALIDATED_PROMPT } from '@/data/samples';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'ollama',
  endpoint: 'http://localhost:11434',
  modelName: 'qwen2.5-vl:3b',
  temperature: 0.1,
  customPrompt: DEFAULT_VALIDATED_PROMPT,
};
