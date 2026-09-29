import { buildElectricalGraphFromExtraction } from '@/lib/graph/graph-builder';
import { extractElectricalTokens } from '@/lib/ingestion/token-extractor';
import { extractDrawingZones } from '@/lib/ingestion/bounds-extractor';
import { evaluateIpc620Rules, IpcAcceptanceClass } from '@/lib/rules/ipc-620-engine';
import { evaluateUl508aRules } from '@/lib/rules/ul-508a-engine';
import { evaluateCustomSopRules, TenantCustomRuleConfig } from '@/lib/rules/custom-sop-engine';
import { QCReport, Discrepancy, StandardPreset, QCSummary } from '@/types/qc';
import { STANDARDS_RULE_REGISTRY } from '@/lib/rules/standards-registry';

export interface EvaluationOptions {
  acceptanceClass?: IpcAcceptanceClass;
  ambientTempC?: number;
  bundleWireCount?: number;
  mainBreakerAmps?: number;
  markedPanelSccrKa?: number;
  wireDuctWidthMm?: number;
  wireDuctHeightMm?: number;
  tenantRules?: TenantCustomRuleConfig[];
}

/**
 * Deterministic Rule Evaluation Orchestrator
 * Evaluates schematics using physical, electrical, and standards equations.
 */
export async function runDeterministicQcInspection(
  diagramName: string,
  diagramCategory = 'Wiring Harness',
  standard: StandardPreset = 'IPC-WHMA-A-620',
  options: EvaluationOptions = {}
): Promise<QCReport> {
  const startTime = Date.now();

  // 1. Ingestion: Extract optical electrical tokens and drawing boundaries
  const { tokens, wireTable } = extractElectricalTokens(diagramName);
  const zones = extractDrawingZones(diagramName);

  // 2. Topology: Construct topological electrical netlist graph
  const graph = buildElectricalGraphFromExtraction(diagramName, tokens, wireTable);

  // 3. Dispatch to standard-specific deterministic engines
  const discrepancies: Discrepancy[] = [];

  if (standard === 'IPC-WHMA-A-620' || standard === 'IPC-A-610') {
    const ipcDiscrepancies = evaluateIpc620Rules(graph, {
      acceptanceClass: options.acceptanceClass || 'CLASS_3',
      ambientTempC: options.ambientTempC || 35,
      bundleWireCount: options.bundleWireCount || 4,
    });
    discrepancies.push(...ipcDiscrepancies);
  } else if (standard === 'UL-508A') {
    const ulDiscrepancies = evaluateUl508aRules(graph, {
      mainBreakerAmps: options.mainBreakerAmps || 100,
      markedPanelSccrKa: options.markedPanelSccrKa || 65,
      wireDuctWidthMm: options.wireDuctWidthMm || 60,
      wireDuctHeightMm: options.wireDuctHeightMm || 80,
    });
    discrepancies.push(...ulDiscrepancies);
  } else if (standard === 'CUSTOMER-SOP') {
    const sopDiscrepancies = evaluateCustomSopRules(
      graph,
      zones.titleBlockMetadata,
      options.tenantRules
    );
    discrepancies.push(...sopDiscrepancies);
  } else {
    // Default / ISO: Run general electrical rule checks
    const defaultDiscrepancies = evaluateIpc620Rules(graph, {
      acceptanceClass: 'CLASS_2',
      ambientTempC: 30,
      bundleWireCount: 3,
    });
    discrepancies.push(...defaultDiscrepancies);
  }

  // 4. Calculate deterministic metrics from authoritative registry
  const critical = discrepancies.filter((d) => d.severity === 'CRITICAL').length;
  const major = discrepancies.filter((d) => d.severity === 'MAJOR').length;
  const minor = discrepancies.filter((d) => d.severity === 'MINOR').length;

  const relevantRules = STANDARDS_RULE_REGISTRY.filter(
    (r) => r.standard === standard || standard === 'ISO-1219' || r.standard === 'CUSTOMER-SOP'
  );
  const totalChecksExecuted = relevantRules.length > 0 ? relevantRules.length : STANDARDS_RULE_REGISTRY.length;
  const failed = discrepancies.length;
  const passed = Math.max(0, totalChecksExecuted - failed);
  const na = 0;

  // Mathematical scoring model: 100 - (15 * crit + 8 * major + 3 * minor)
  const scorePenalty = critical * 15 + major * 8 + minor * 3;
  const qualityScore = Math.max(0, Math.min(100, 100 - scorePenalty));

  const overallResult: 'PASS' | 'FAIL' = critical > 0 || major > 2 ? 'FAIL' : 'PASS';

  const summary: QCSummary = {
    executed: totalChecksExecuted,
    passed,
    failed,
    na,
    critical,
    major,
    minor,
  };

  const reportId = `QC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  return {
    id: reportId,
    diagramName,
    diagramCategory,
    standard,
    timestamp: new Date().toISOString(),
    overallResult,
    qualityScore,
    summary,
    discrepancies,
    inspectedBy: `Deterministic Rules Engine (${standard})`,
    modelUsed: `Deterministic Rules Engine v2.4`,
    executionTimeMs: Date.now() - startTime,
  };
}
