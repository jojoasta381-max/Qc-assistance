import { LLMConfig, QCReport, StandardPreset, Discrepancy } from '@/types/qc';
import { SAMPLE_DIAGRAMS } from '@/data/samples';
import { isProduction } from '@/lib/config/app-mode';
import { STANDARDS_RULE_REGISTRY } from '@/lib/rules/standards-registry';
import { DEFAULT_LLM_CONFIG } from '@/lib/config/llm-config';

export { DEFAULT_LLM_CONFIG };

function isIPv4(str: string): boolean {
  const parts = str.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

// Security Check: Guard against SSRF (Server-Side Request Forgery)
export function validateLLMEndpoint(endpoint: string): { valid: boolean; reason?: string } {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, reason: 'Invalid protocol. Only http:// and https:// are permitted.' };
    }
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }
    
    // Prohibit localhost and cloud metadata
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data'
    ) {
      return { valid: false, reason: 'Access to loopback, local, or cloud metadata endpoints is strictly blocked.' };
    }

    // Decimal encoded IP (e.g. 2130706433 = 127.0.0.1, 2852039166 = 169.254.169.254)
    if (/^\d+$/.test(hostname)) {
      const num = parseInt(hostname, 10);
      if (!isNaN(num) && num >= 0 && num <= 4294967295) {
        hostname = `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
      }
    }

    // IPv6 loopback and private checks
    if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1' || hostname === '::') {
      return { valid: false, reason: 'IPv6 loopback/unspecified is strictly blocked.' };
    }
    if (hostname.startsWith('::ffff:')) {
      const v4Part = hostname.substring(7);
      if (isIPv4(v4Part)) {
        hostname = v4Part;
      } else {
        return { valid: false, reason: 'IPv4-mapped IPv6 is prohibited.' };
      }
    }
    if (hostname.startsWith('fc') || hostname.startsWith('fd') || /^fe[89ab]/.test(hostname)) {
      return { valid: false, reason: 'Private or link-local IPv6 address is prohibited.' };
    }

    // Check IPv4 private and reserved ranges
    if (isIPv4(hostname)) {
      const parts = hostname.split('.').map((p) => parseInt(p, 10));
      const [a, b] = parts;
      if (a === 0 || a === 127 || (a === 169 && b === 254)) {
        return { valid: false, reason: 'Loopback and link-local addresses are prohibited.' };
      }
      if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
        return { valid: false, reason: 'RFC1918 private network addresses are prohibited.' };
      }
      if (a >= 224) {
        return { valid: false, reason: 'Multicast and reserved addresses are prohibited.' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Malformed endpoint URL.' };
  }
}

export async function validateLLMEndpointAsync(endpoint: string): Promise<{ valid: boolean; reason?: string }> {
  const { validateSsrfEndpoint } = await import('@/lib/security/ssrf-validator');
  const result = await validateSsrfEndpoint(endpoint);
  return { valid: result.safe, reason: result.reason };
}


export async function checkOllamaStatus(endpoint: string): Promise<{ online: boolean; models: string[]; error?: string }> {
  const validation = validateLLMEndpoint(endpoint);
  if (!validation.valid) {
    return { online: false, models: [], error: `Security Warning: ${validation.reason}` };
  }

  const asyncValidation = await validateLLMEndpointAsync(endpoint);
  if (!asyncValidation.valid) {
    return { online: false, models: [], error: `Security Warning: ${asyncValidation.reason}` };
  }

  try {
    const res = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2000), // 2s timeout
    });
    if (res.ok) {
      const data = await res.json();
      const models = (data.models || []).map((m: { name: string }) => m.name);
      return { online: true, models };
    }
    return { online: false, models: [], error: `Status ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return { online: false, models: [], error: msg };
  }
}

export async function runAIQualityInspection(
  diagramName: string,
  diagramCategory: string,
  standard: StandardPreset,
  imagePayload: string, // SVG key or base64 data URI
  config: LLMConfig = DEFAULT_LLM_CONFIG
): Promise<QCReport> {
  const startTime = Date.now();

  // In production mode, check if we have a real AI provider configured and reachable
  if (config.provider === 'ollama' && config.endpoint) {
    const endpointCheck = validateLLMEndpoint(config.endpoint);
    if (!endpointCheck.valid) {
      throw new Error(`[AI Engine] Security validation failed for AI endpoint: ${endpointCheck.reason}`);
    }

    try {
      const ollamaRes = await fetch(`${config.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.modelName,
          prompt: `${config.customPrompt}\n\nStandard to check: ${standard}\nDiagram Name: ${diagramName}\nDiagram Category: ${diagramCategory}\n\nAnalyze this schematic and return JSON with overallResult (PASS/FAIL), qualityScore, summary, and discrepancies list with coordinates.`,
          format: 'json',
          stream: false,
          options: {
            temperature: config.temperature,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json();
        const parsed = JSON.parse(ollamaData.response);
        const discrepancies: Discrepancy[] = parsed.discrepancies || [];
        const ruleCount = STANDARDS_RULE_REGISTRY.length;
        const failedCount = discrepancies.length;
        const passedCount = Math.max(0, ruleCount - failedCount);

        return {
          id: `QC-${Date.now().toString().slice(-6)}`,
          diagramName,
          diagramCategory,
          standard,
          timestamp: new Date().toISOString(),
          overallResult: parsed.overallResult || (discrepancies.length > 0 ? 'FAIL' : 'PASS'),
          qualityScore: parsed.qualityScore ?? (failedCount === 0 ? 100 : Math.max(50, 100 - failedCount * 12)),
          summary: {
            executed: ruleCount,
            passed: passedCount,
            failed: failedCount,
            na: 0,
            critical: discrepancies.filter((d: Discrepancy) => d.severity === 'CRITICAL').length,
            major: discrepancies.filter((d: Discrepancy) => d.severity === 'MAJOR').length,
            minor: discrepancies.filter((d: Discrepancy) => d.severity === 'MINOR').length,
          },
          discrepancies,
          inspectedBy: `OpenSource LLM (${config.modelName})`,
          modelUsed: `Ollama / ${config.modelName}`,
          executionTimeMs: Date.now() - startTime,
          customImageDataUri: imagePayload,
        };
      }
    } catch (err) {
      if (isProduction()) {
        throw new Error(
          `[AI Engine] Production AI model (${config.modelName}) at ${config.endpoint} is unreachable or timed out: ${
            err instanceof Error ? err.message : String(err)
          }. Mock fallback is prohibited in PRODUCTION mode.`
        );
      }
    }
  }

  // In PRODUCTION mode, fail closed if live AI provider was not reachable
  if (isProduction()) {
    throw new Error(
      '[AI Engine] Production AI inspection requires an active, reachable AI provider. Mock and sample fallbacks are disabled in PRODUCTION mode.'
    );
  }

  // DEMO/TEST ONLY: Deterministic sample lookup
  const matchedSample = SAMPLE_DIAGRAMS.find(
    (s) => s.svgKey === imagePayload || s.id === imagePayload || s.name.toLowerCase() === diagramName.toLowerCase()
  );

  if (matchedSample) {
    const reportCopy = JSON.parse(JSON.stringify(matchedSample.sampleReport)) as QCReport;
    reportCopy.id = `QC-${Date.now().toString().slice(-6)}`;
    reportCopy.timestamp = new Date().toISOString();
    reportCopy.standard = standard;
    reportCopy.executionTimeMs = Date.now() - startTime;
    reportCopy.modelUsed = `Demo Engine (${config.modelName})`;
    return reportCopy;
  }

  // DEMO/TEST ONLY: Deterministic fallback discrepancies without Math.random()
  const customDiscrepancies: Discrepancy[] = [
    {
      id: 'D-301',
      title: `Wire Sizing Rule Violation under ${standard}`,
      description: `Detected 24 AWG wire routed to primary 12V bus branch without inline fuse protection.`,
      severity: 'CRITICAL',
      confidence: 94,
      standardRef: standard === 'UL-508A' ? 'UL 508A §15.1' : 'IPC/WHMA-A-620 §4.2',
      componentRef: 'Custom Schematic Line L-01 to J1-4',
      plainLanguageExplanation:
        'Conductor current-carrying capacity does not match the upstream power source rating, creating risk of overheating and insulation breakdown.',
      recommendation: 'Increase wire gauge to minimum 18 AWG or incorporate 3A fast-acting inline fuse.',
      bbox: { x: 30, y: 35, width: 25, height: 18 },
      status: 'UNREVIEWED',
    },
    {
      id: 'D-302',
      title: 'Missing Reference Designator Annotation',
      description: 'Connector symbol in quadrant B2 lacks unique component reference designator.',
      severity: 'MINOR',
      confidence: 82,
      standardRef: 'IPC-620 §3.1 & IEEE 315',
      componentRef: 'Quadrant B2 Multi-Pin Header',
      plainLanguageExplanation:
        'Component reference designator tag is omitted, preventing automated pick-and-place and harness assembly validation.',
      recommendation: 'Assign unique designator (e.g. CN-04) per drawing numbering schema.',
      bbox: { x: 65, y: 48, width: 18, height: 15 },
      status: 'UNREVIEWED',
    },
  ];

  const totalFailed = customDiscrepancies.length;
  const executed = STANDARDS_RULE_REGISTRY.length;
  const passed = Math.max(0, executed - totalFailed);

  return {
    id: `QC-${Date.now().toString().slice(-6)}`,
    diagramName,
    diagramCategory: diagramCategory || 'Custom Wiring Schematic (Demo)',
    standard,
    timestamp: new Date().toISOString(),
    overallResult: 'FAIL',
    qualityScore: 78,
    summary: {
      executed,
      passed,
      failed: totalFailed,
      na: 0,
      critical: customDiscrepancies.filter((d) => d.severity === 'CRITICAL').length,
      major: customDiscrepancies.filter((d) => d.severity === 'MAJOR').length,
      minor: customDiscrepancies.filter((d) => d.severity === 'MINOR').length,
    },
    discrepancies: customDiscrepancies,
    inspectedBy: `Demo QC Engine (${config.modelName})`,
    modelUsed: `Demo Engine (${config.modelName})`,
    executionTimeMs: Date.now() - startTime,
    customImageDataUri: imagePayload,
  };
}
