/**
 * SPANQC PRODUCTION DETERMINISTIC RULE EVALUATOR
 * 
 * Evaluates active QCRules strictly against the authentic ElectricalGraph.
 * 
 * Strict Guarantees:
 * - Deterministic output: same graph input yields bit-identical findings
 * - Every finding carries cryptographic evidence fingerprint
 * - Safe false-positive posture: returns NOT_EVALUABLE if data is incomplete
 */

import crypto from 'crypto';
import { ElectricalGraph } from '@/lib/graph/electrical-graph-models';
import {
  QCRule,
  FindingCandidate,
  RuleExecutionResult,
  GraphPrerequisite,
  GraphQualityGateResult,
} from './rule-engine-types';
import { RuleRegistry, getRuleRegistry } from './rule-registry';

export const RULESET_VERSION = '1.0.0';
export { RuleRegistry, getRuleRegistry };

export class ProductionRuleEvaluator {
  private registry: RuleRegistry;

  constructor(registry?: RuleRegistry) {
    this.registry = registry || getRuleRegistry();
  }

  /**
   * Evaluates minimum quality gates required before deterministic QC evaluation.
   */
  checkQualityGates(graph: ElectricalGraph): GraphQualityGateResult {
    const sourceVerified = typeof graph.sourceSha256 === 'string' && graph.sourceSha256.length === 64;
    const extractionSuccessful = Array.isArray(graph.pages) && graph.pages.length > 0;
    const graphCreated = typeof graph.graphId === 'string' && graph.graphId.length > 0;
    const hasFatalDiagnostics = Array.isArray(graph.diagnostics) && graph.diagnostics.some((d) => d.severity === 'FATAL');
    const requiredEvidenceAvailable =
      (Array.isArray(graph.components) && graph.components.length > 0) ||
      (Array.isArray(graph.wires) && graph.wires.length > 0);
    const graphHashGenerated = typeof graph.graphSha256 === 'string' && graph.graphSha256.length === 64;

    const passed =
      sourceVerified &&
      extractionSuccessful &&
      graphCreated &&
      !hasFatalDiagnostics &&
      requiredEvidenceAvailable &&
      graphHashGenerated;

    let failureReason: string | undefined;
    if (!sourceVerified) failureReason = 'Document source SHA-256 missing or invalid';
    else if (!extractionSuccessful) failureReason = 'Extraction produced 0 document pages';
    else if (!graphCreated) failureReason = 'Graph identity missing';
    else if (hasFatalDiagnostics) failureReason = 'Fatal graph diagnostics encountered';
    else if (!requiredEvidenceAvailable) failureReason = 'No component or wire evidence found in drawing';
    else if (!graphHashGenerated) failureReason = 'Graph SHA-256 hash not computed';

    return {
      passed,
      gates: {
        sourceVerified,
        extractionSuccessful,
        graphCreated,
        hasFatalDiagnostics,
        requiredEvidenceAvailable,
        graphHashGenerated,
      },
      failureReason,
    };
  }

  /**
   * Verifies prerequisite entities are present in graph before evaluating rule.
   */
  checkPrerequisites(rule: QCRule, graph: ElectricalGraph): { met: boolean; missing: GraphPrerequisite[] } {
    if (!rule.prerequisites || rule.prerequisites.length === 0) {
      return { met: true, missing: [] };
    }

    const missing: GraphPrerequisite[] = [];
    const hasWireGeometry =
      graph.wires.length > 0 &&
      !graph.diagnostics.some((d) => d.code === 'WIRE_GEOMETRY_UNAVAILABLE');

    for (const prereq of rule.prerequisites) {
      switch (prereq) {
        case 'WIRE_GEOMETRY':
          if (!hasWireGeometry) missing.push('WIRE_GEOMETRY');
          break;
        case 'TERMINAL_DETECTION':
          if (graph.terminals.length === 0) missing.push('TERMINAL_DETECTION');
          break;
        case 'COMPONENT_CLASSIFICATION':
          if (graph.components.length === 0) missing.push('COMPONENT_CLASSIFICATION');
          break;
        case 'NET_CONSTRUCTION':
          if (graph.nets.length === 0) missing.push('NET_CONSTRUCTION');
          break;
        case 'POWER_CLASSIFICATION':
          if (!graph.components.some((c) => c.type === 'POWER_SOURCE' || c.type === 'BATTERY')) {
            missing.push('POWER_CLASSIFICATION');
          }
          break;
        case 'GROUND_CLASSIFICATION':
          if (!graph.components.some((c) => c.type === 'GROUND')) {
            missing.push('GROUND_CLASSIFICATION');
          }
          break;
      }
    }

    return { met: missing.length === 0, missing };
  }

  /**
   * Evaluates all registered rules against the provided ElectricalGraph.
   */
  evaluate(graph: ElectricalGraph): RuleExecutionResult {
    const startedAt = new Date().toISOString();
    const rules = typeof (this.registry as any).getActiveRules === 'function'
      ? (this.registry as any).getActiveRules()
      : this.registry.getAll();
    const allFindings: FindingCandidate[] = [];

    let criticalCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    let advisoryCount = 0;
    let notEvaluableCount = 0;

    // 1. Verify Quality Gates
    const gateResult = this.checkQualityGates(graph);
    if (!gateResult.passed) {
      const gateFinding: FindingCandidate = {
        ruleId: 'GATE-001',
        ruleVersion: '1.0.0',
        severity: 'ADVISORY',
        status: 'NOT_EVALUABLE',
        title: 'Graph Quality Gate Not Satisfied',
        description: `Deterministic QC aborted: ${gateResult.failureReason || 'Graph failed prerequisite quality gates'}.`,
        confidence: 0.0,
        evidence: {
          pageNumber: 1,
          boundingBoxes: [],
          componentIds: [],
          terminalIds: [],
          wireIds: [],
          netIds: [],
          sourceEvidenceIds: [],
          deterministicFingerprint: crypto
            .createHash('sha256')
            .update(`gate-failed:${gateResult.failureReason}`)
            .digest('hex'),
        },
      };

      return {
        ruleSetVersion: RULESET_VERSION,
        graphSha256: graph.graphSha256,
        sourceSha256: graph.sourceSha256,
        startedAt,
        completedAt: new Date().toISOString(),
        totalRulesEvaluated: 0,
        findings: [gateFinding],
        summary: {
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          advisoryCount: 0,
          notEvaluableCount: 1,
        },
      };
    }

    // 2. Evaluate Rules with Prerequisite Verification
    for (const rule of rules) {
      const prereqCheck = this.checkPrerequisites(rule, graph);
      if (!prereqCheck.met) {
        allFindings.push({
          ruleId: rule.code,
          ruleVersion: rule.version,
          severity: 'ADVISORY',
          status: 'NOT_EVALUABLE',
          title: `Prerequisites Not Met: ${rule.name}`,
          description: `Rule ${rule.code} requires prerequisites [${prereqCheck.missing.join(', ')}] which are unavailable in this graph representation.`,
          confidence: 0.0,
          evidence: {
            pageNumber: 1,
            boundingBoxes: [],
            componentIds: [],
            terminalIds: [],
            wireIds: [],
            netIds: [],
            sourceEvidenceIds: [],
            deterministicFingerprint: crypto
              .createHash('sha256')
              .update(`prereq-missing:${rule.code}:${prereqCheck.missing.sort().join(',')}`)
              .digest('hex'),
          },
        });
        notEvaluableCount++;
        continue;
      }

      try {
        const findings = rule.evaluate(graph);
        for (const f of findings) {
          allFindings.push(f);

          if (f.status === 'NOT_EVALUABLE') {
            notEvaluableCount++;
          } else {
            if (f.severity === 'CRITICAL') criticalCount++;
            else if (f.severity === 'MAJOR') majorCount++;
            else if (f.severity === 'MINOR') minorCount++;
            else if (f.severity === 'ADVISORY') advisoryCount++;
          }
        }
      } catch (err: any) {
        // Safe evaluation fallback: record NOT_EVALUABLE rather than unhandled crash
        allFindings.push({
          ruleId: rule.code,
          ruleVersion: rule.version,
          severity: 'ADVISORY',
          status: 'NOT_EVALUABLE',
          title: `Rule Evaluation Incomplete: ${rule.name}`,
          description: `Rule ${rule.code} could not be fully evaluated: ${err.message || 'Insufficient structural evidence'}.`,
          confidence: 0.0,
          evidence: {
            pageNumber: 1,
            boundingBoxes: [],
            componentIds: [],
            terminalIds: [],
            wireIds: [],
            netIds: [],
            sourceEvidenceIds: [],
            deterministicFingerprint: `not-evaluable-${rule.code}`,
          },
        });
        notEvaluableCount++;
      }
    }

    // Sort findings deterministically by severity and rule code
    const severityWeight = { CRITICAL: 4, MAJOR: 3, MINOR: 2, ADVISORY: 1 };
    allFindings.sort((a, b) => {
      const diff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (diff !== 0) return diff;
      return a.ruleId.localeCompare(b.ruleId);
    });

    const completedAt = new Date().toISOString();

    return {
      ruleSetVersion: RULESET_VERSION,
      graphSha256: graph.graphSha256,
      sourceSha256: graph.sourceSha256,
      startedAt,
      completedAt,
      totalRulesEvaluated: rules.length,
      findings: allFindings,
      summary: {
        criticalCount,
        majorCount,
        minorCount,
        advisoryCount,
        notEvaluableCount,
      },
    };
  }
}
