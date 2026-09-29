/**
 * SPANQC DETERMINISTIC QC RULE ENGINE TYPES (Phase 4)
 * 
 * Strict Invariants:
 * - Rules consume ONLY the auditable ElectricalGraph.
 * - Zero reliance on filenames, templates, or synthetic state.
 * - Every finding contains traceable source evidence bounding boxes.
 * - Safe False-Positive handling: prefers NOT_EVALUABLE over fabricated verdicts.
 */

import { ElectricalGraph, NormalizedBoundingBox } from '@/lib/graph/electrical-graph-models';

export type FindingSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'ADVISORY';
export type FindingEvaluationStatus = 'VIOLATION' | 'PASS' | 'NOT_EVALUABLE';

export interface FindingEvidence {
  pageNumber: number;
  boundingBoxes: NormalizedBoundingBox[];
  componentIds: string[];
  terminalIds: string[];
  wireIds: string[];
  netIds: string[];
  sourceEvidenceIds: string[];
  deterministicFingerprint: string;
}

export interface FindingCandidate {
  ruleId: string;
  ruleVersion: string;
  severity: FindingSeverity;
  status: FindingEvaluationStatus;
  title: string;
  description: string;
  confidence: number;
  evidence: FindingEvidence;
}

export type GraphPrerequisite =
  | 'WIRE_GEOMETRY'
  | 'TERMINAL_DETECTION'
  | 'COMPONENT_CLASSIFICATION'
  | 'NET_CONSTRUCTION'
  | 'POWER_CLASSIFICATION'
  | 'GROUND_CLASSIFICATION';

export interface GraphQualityGateResult {
  passed: boolean;
  gates: {
    sourceVerified: boolean;
    extractionSuccessful: boolean;
    graphCreated: boolean;
    hasFatalDiagnostics: boolean;
    requiredEvidenceAvailable: boolean;
    graphHashGenerated: boolean;
  };
  failureReason?: string;
}

export interface QCRule {
  id: string;
  code: string;
  version: string;
  name: string;
  description: string;
  severity: FindingSeverity;
  standardClause?: string;
  prerequisites?: GraphPrerequisite[];
  evaluate(graph: ElectricalGraph): FindingCandidate[];
}

export interface RuleExecutionResult {
  ruleSetVersion: string;
  graphSha256: string;
  sourceSha256: string;
  startedAt: string;
  completedAt: string;
  totalRulesEvaluated: number;
  findings: FindingCandidate[];
  summary: {
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    advisoryCount: number;
    notEvaluableCount: number;
  };
}
