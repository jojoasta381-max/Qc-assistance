import { ExtractedTextBlock, ExtractedWord, ExtractedLine } from './extraction-models';

export interface OCRResult {
  available: boolean;
  text: string;
  blocks: ExtractedTextBlock[];
  confidence: number;
  providerName: string;
  error?: string;
}

export interface OCRProvider {
  name: string;
  isConfigured(): boolean;
  extractText(imageBuffer: Buffer, pageNumber?: number): Promise<OCRResult>;
}

/**
 * Standard unconfigured or disabled OCR provider.
 * Strictly truthful: NEVER returns synthetic text or fabricated words.
 */
export class TruthfulUnavailableOCRProvider implements OCRProvider {
  name = 'UNAVAILABLE';

  isConfigured(): boolean {
    return false;
  }

  async extractText(_imageBuffer: Buffer, _pageNumber: number = 1): Promise<OCRResult> {
    return {
      available: false,
      text: '',
      blocks: [],
      confidence: 0,
      providerName: this.name,
      error: 'OCR_UNAVAILABLE: No optical character recognition engine configured in this environment.',
    };
  }
}

/**
 * Vision LLM / Multi-modal OCR Provider (e.g. Ollama qwen2.5-vl or configured OCR service)
 */
export class VisionLLMOCRProvider implements OCRProvider {
  name = 'VISION_LLM';
  private endpoint: string;
  private model: string;

  constructor(endpoint?: string, model?: string) {
    this.endpoint = endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.model = model || process.env.VISION_MODEL || 'qwen2.5-vl:3b';
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint);
  }

  async extractText(imageBuffer: Buffer, pageNumber: number = 1): Promise<OCRResult> {
    try {
      const base64Image = imageBuffer.toString('base64');
      const prompt = 'Transcribe all visible engineering text labels, connector IDs, wire tags, pin numbers, and title block text from this electrical schematic page. Return exact text tokens.';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          images: [base64Image],
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          available: false,
          text: '',
          blocks: [],
          confidence: 0,
          providerName: this.name,
          error: `OCR_UNAVAILABLE: Provider responded with HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const rawText = data.response || '';

      const lines = rawText.split('\n').filter((l: string) => l.trim().length > 0);
      const blocks: ExtractedTextBlock[] = lines.map((lineText: string, idx: number) => {
        const words: ExtractedWord[] = lineText.split(/\s+/).map((w, wIdx) => ({
          id: `ocr-p${pageNumber}-w${idx}-${wIdx}`,
          text: w,
          bbox: { x: 50, y: 50 + idx * 30, width: 100, height: 20 },
          confidence: 0.85,
          source: 'ocr',
        }));

        const line: ExtractedLine = {
          id: `ocr-p${pageNumber}-l${idx}`,
          text: lineText,
          words,
          bbox: { x: 50, y: 50 + idx * 30, width: 400, height: 25 },
          confidence: 0.85,
          source: 'ocr',
        };

        return {
          id: `ocr-p${pageNumber}-b${idx}`,
          text: lineText,
          lines: [line],
          bbox: { x: 50, y: 50 + idx * 30, width: 400, height: 25 },
          confidence: 0.85,
          source: 'ocr',
        };
      });

      return {
        available: true,
        text: rawText,
        blocks,
        confidence: 0.85,
        providerName: this.name,
      };
    } catch (err: any) {
      return {
        available: false,
        text: '',
        blocks: [],
        confidence: 0,
        providerName: this.name,
        error: `OCR_UNAVAILABLE: ${err.message}`,
      };
    }
  }
}

let activeOCRProvider: OCRProvider | null = null;

export function getOCRProvider(): OCRProvider {
  if (activeOCRProvider) return activeOCRProvider;

  // In production, check if an OCR provider is explicitly enabled
  if (process.env.ENABLE_OCR === 'true' || process.env.OLLAMA_ENDPOINT) {
    activeOCRProvider = new VisionLLMOCRProvider();
  } else {
    // Truthfully report unavailable without fabricating results
    activeOCRProvider = new TruthfulUnavailableOCRProvider();
  }

  return activeOCRProvider;
}

export function setOCRProviderForTest(provider: OCRProvider | null) {
  activeOCRProvider = provider;
}
