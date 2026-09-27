import {
  AIProvider,
  AIProviderType,
  AICompletionOptions,
  AICompletionResult,
  AIStructuredResult,
  AIVisionOptions,
  AIVisionResult,
  AIEngineeringFinding,
} from '../types';

export class MockAIProvider implements AIProvider {
  public readonly name = 'Deterministic Engineering Engine';
  public readonly providerType: AIProviderType = 'mock';

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async complete(prompt: string, _options?: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const text = `Deterministic analysis completed for prompt length ${prompt.length}.`;
    return {
      text,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: 25,
        totalTokens: Math.ceil(prompt.length / 4) + 25,
      },
      latencyMs: Date.now() - startTime,
      model: 'deterministic-rules-v1',
      provider: 'mock',
      costPaise: 0,
    };
  }

  public async completeStructured<T>(
    prompt: string,
    _schema: any,
    _options?: AICompletionOptions
  ): Promise<AIStructuredResult<T>> {
    const startTime = Date.now();
    const mockData = {} as T;
    return {
      data: mockData,
      rawText: JSON.stringify(mockData),
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: 30,
        totalTokens: Math.ceil(prompt.length / 4) + 30,
      },
      latencyMs: Date.now() - startTime,
      model: 'deterministic-rules-v1',
      provider: 'mock',
      costPaise: 0,
    };
  }

  public async analyzeVision(
    prompt: string,
    imageBase64OrUrl: string,
    options?: AIVisionOptions
  ): Promise<AIVisionResult> {
    const startTime = Date.now();
    const standard = options?.standardName || 'IPC-WHMA-A-620';
    const isUl508a = standard.toUpperCase().includes('508');

    const findings: AIEngineeringFinding[] = isUl508a
      ? [
          {
            title: 'Inadequate Branch Circuit Protection for VFD Drive',
            description: 'VFD-01 input terminals connected to 50A breaker exceeding manufacturer recommended 30A semiconductor fuse.',
            severity: 'CRITICAL',
            confidence: 96,
            standardRef: 'UL 508A §31.1 & NFPA 79 §7.2',
            componentRef: 'CB-01 to VFD-01 Line',
            plainLanguageExplanation: 'Semiconductor power drive components require rapid high-speed fusing to prevent fire in short-circuit conditions.',
            recommendation: 'Replace thermal-magnetic breaker branch with Class J or Class CC 30A fast-acting fuse block.',
            bbox: { x: 28, y: 34, width: 26, height: 18 },
          },
          {
            title: 'Control Circuit Transformer Secondary Neutral Unbonded',
            description: 'Secondary winding neutral of TR-01 (120VAC) lacks bonded chassis connection.',
            severity: 'MAJOR',
            confidence: 91,
            standardRef: 'UL 508A §37.3',
            componentRef: 'TR-01 Secondary Port X2',
            plainLanguageExplanation: 'An ungrounded secondary AC control circuit allows floating potentials, preventing protective devices from clearing phase-to-ground faults.',
            recommendation: 'Install 14 AWG green/yellow bonding jumper from terminal X2 to main panel PE grounding bar.',
            bbox: { x: 55, y: 52, width: 22, height: 16 },
          },
          {
            title: 'Emergency Stop Category 0 Actuator Contact Redundancy',
            description: 'E-Stop circuit ES-01 uses single NC contact instead of dual-channel safety relay inputs.',
            severity: 'CRITICAL',
            confidence: 94,
            standardRef: 'NFPA 79 §9.2.5.4 & ISO 13849-1',
            componentRef: 'ES-01 Contact Block',
            plainLanguageExplanation: 'Emergency stop buttons must use dual-channel positively-guided contacts to guarantee trip in single-fault contact weld scenarios.',
            recommendation: 'Reconfigure to dual-channel safety relay input (SR-01 Ch1 & Ch2).',
            bbox: { x: 72, y: 22, width: 20, height: 15 },
          },
        ]
      : [
          {
            title: 'Conductor Ampacity Mismatch on High Current Branch',
            description: 'Detected 22 AWG conductor routed to 10A terminal block TB-12; exceeds standard continuous ampacity threshold.',
            severity: 'CRITICAL',
            confidence: 95,
            standardRef: 'IPC/WHMA-A-620 §4.2 & Table 4-1',
            componentRef: 'TB-12 Terminal Pin 3',
            plainLanguageExplanation: 'Conductor gauge is undersized for current specification, risking thermal degradation of wire insulation.',
            recommendation: 'Upgrade conductor gauge to minimum 18 AWG with high-temperature Teflon jacket.',
            bbox: { x: 32, y: 38, width: 24, height: 16 },
          },
          {
            title: 'Missing Mechanical Strain Relief at Main Shell Connector',
            description: 'Multi-conductor bundle J-01 enters backshell without rubber grommet or clamp retention collar.',
            severity: 'MAJOR',
            confidence: 89,
            standardRef: 'IPC/WHMA-A-620 §13.1.2',
            componentRef: 'J-01 D38999 Connector Backshell',
            plainLanguageExplanation: 'Cable harness lacks strain relief at connector interface, transferring mechanical vibration directly to crimp terminals.',
            recommendation: 'Specify heat-shrinkable strain relief boot with hot-melt adhesive backing.',
            bbox: { x: 62, y: 44, width: 20, height: 17 },
          },
          {
            title: 'Terminal Crimp Insulation Inspection Gap Exceeds Tolerance',
            description: 'Insulation barrel crimp on terminal Lug-4 leaves > 2.0mm exposed conductor before wire seal.',
            severity: 'MINOR',
            confidence: 84,
            standardRef: 'IPC-A-620 §5.1.3 (Class 3)',
            componentRef: 'Lug-4 Ring Terminal',
            plainLanguageExplanation: 'Excessive insulation clearance exposes bare conductor to moisture entry and potential shorting.',
            recommendation: 'Adjust wire strip length to 4.5mm +/- 0.5mm per manufacturer application specification.',
            bbox: { x: 44, y: 66, width: 18, height: 14 },
          },
        ];

    const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
    const majorCount = findings.filter((f) => f.severity === 'MAJOR').length;
    const minorCount = findings.filter((f) => f.severity === 'MINOR').length;
    const totalFailed = findings.length;
    const executed = 142;
    const passed = executed - totalFailed;

    return {
      overallResult: totalFailed === 0 ? 'PASS' : 'FAIL',
      qualityScore: totalFailed === 0 ? 100 : Math.max(70, 100 - (criticalCount * 12 + majorCount * 6 + minorCount * 2)),
      findings,
      summary: {
        executed,
        passed,
        failed: totalFailed,
        critical: criticalCount,
        major: majorCount,
        minor: minorCount,
      },
      usage: {
        promptTokens: 850,
        completionTokens: 380,
        totalTokens: 1230,
      },
      latencyMs: Date.now() - startTime,
      model: 'deterministic-rules-v1',
      provider: 'mock',
      costPaise: 0,
    };
  }
}
